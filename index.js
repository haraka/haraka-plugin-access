// access plugin

const tlds = require('haraka-tld')
const haddr = require('address-rfc2822')
const net_utils = require('haraka-net-utils')
const utils = require('haraka-utils')

exports.register = function () {
  this.init_config() // init this.cfg
  this.init_lists()
  this.load_access_ini() // update with *.ini settings

  for (const c of ['black', 'white']) {
    for (const p in this.cfg[c]) {
      this.load_file(c, p)
    }
    for (const p in this.cfg.re[c]) {
      this.load_re_file(c, p)
    }
  }

  if (this.cfg.check.conn) {
    this.register_hook('connect', 'rdns_access')
  }
  if (this.cfg.check.helo) {
    this.register_hook('helo', 'helo_access')
    this.register_hook('ehlo', 'helo_access')
  }
  if (this.cfg.check.mail) {
    this.register_hook('mail', 'mail_from_access')
  }
  if (this.cfg.check.rcpt) {
    this.register_hook('rcpt', 'rcpt_to_access')
  }

  if (this.cfg.check.any) {
    this.load_domain_file('domain', 'any')
    for (const hook of ['connect', 'helo', 'ehlo', 'mail', 'rcpt']) {
      this.register_hook(hook, 'any')
    }
    this.register_hook('data_post', 'data_any')
  }
}

exports.init_config = function () {
  this.cfg = {
    deny_msg: {
      conn: 'You are not allowed to connect',
      helo: 'That HELO is not allowed to connect',
      mail: 'That sender cannot send mail here',
      rcpt: 'That recipient is not allowed',
    },
    domain: {
      any: 'access.domains',
    },
    white: {
      conn: 'connect.rdns_access.whitelist',
      mail: 'mail_from.access.whitelist',
      rcpt: 'rcpt_to.access.whitelist',
    },
    black: {
      conn: 'connect.rdns_access.blacklist',
      mail: 'mail_from.access.blacklist',
      rcpt: 'rcpt_to.access.blacklist',
    },
    re: {
      black: {
        conn: 'connect.rdns_access.blacklist_regex',
        mail: 'mail_from.access.blacklist_regex',
        rcpt: 'rcpt_to.access.blacklist_regex',
        helo: 'helo.checks.regexps',
      },
      white: {
        conn: 'connect.rdns_access.whitelist_regex',
        mail: 'mail_from.access.whitelist_regex',
        rcpt: 'rcpt_to.access.whitelist_regex',
      },
    },
  }
}

exports.load_access_ini = function () {
  const cfg = this.config.get(
    'access.ini',
    {
      booleans: [
        '+check.any',
        '+check.conn',
        '-check.helo',
        '+check.mail',
        '+check.rcpt',
        '-rcpt.accept',
      ],
    },
    () => {
      this.load_access_ini()
    },
  )

  this.cfg.check = cfg.check
  if (cfg.deny_msg) {
    let p
    for (p in this.cfg.deny_msg) {
      if (cfg.deny_msg[p]) {
        this.cfg.deny_msg[p] = cfg.deny_msg[p]
      }
    }
  }

  this.cfg.rcpt = cfg.rcpt

  // backwards compatibility
  const mf_cfg = this.config.get('mail_from.access.ini')
  if (mf_cfg && mf_cfg.general && mf_cfg.general.deny_msg) {
    this.cfg.deny_msg.mail = mf_cfg.general.deny_msg
  }
  const rcpt_cfg = this.config.get('rcpt_to.access.ini')
  if (rcpt_cfg && rcpt_cfg.general && rcpt_cfg.general.deny_msg) {
    this.cfg.deny_msg.rcpt = rcpt_cfg.general.deny_msg
  }
  const rdns_cfg = this.config.get('connect.rdns_access.ini')
  if (rdns_cfg && rdns_cfg.general && rdns_cfg.general.deny_msg) {
    this.cfg.deny_msg.conn = rdns_cfg.general.deny_msg
  }
}

exports.init_lists = function () {
  this.list = {
    black: { conn: {}, helo: {}, mail: {}, rcpt: {} },
    white: { conn: {}, helo: {}, mail: {}, rcpt: {} },
    domain: { any: {} },
  }
  this.list_re = {
    black: {},
    white: {},
  }
}

exports.get_domain = function (hook, connection, params) {
  switch (hook) {
    case 'connect':
      if (!connection.remote.host) return
      if (connection.remote.host === 'DNSERROR') return
      if (connection.remote.host === 'Unknown') return
      return connection.remote.host
    case 'helo':
    case 'ehlo':
      if (net_utils.is_ip_literal(params)) return
      return params
    case 'mail':
    case 'rcpt':
      if (params && params[0]) return params[0].host
  }
  return
}

exports.any_whitelist = function (
  connection,
  hook,
  params,
  domain,
  org_domain,
) {
  if (hook === 'mail' || hook === 'rcpt') {
    const email = params[0].address()
    if (email && this.in_list('domain', 'any', `!${email}`)) return true
  }

  if (this.in_list('domain', 'any', `!${org_domain}`)) return true
  if (this.in_list('domain', 'any', `!${domain}`)) return true

  return false
}

exports.any = function (next, connection, params) {
  if (!this.cfg.check.any) return next()

  const hook = connection.hook
  if (!hook) {
    connection.logerror(this, 'hook detection failed')
    return next()
  }

  // step 1: get a domain name from whatever info is available
  const domain = this.get_domain(hook, connection, params)
  if (!domain) {
    connection.logdebug(this, `domain detect failed on hook: ${hook}`)
    return next()
  }
  if (!/\./.test(domain)) {
    connection.results.add(this, {
      fail: `invalid domain: ${domain}`,
      emit: true,
    })
    return next()
  }

  const org_domain = tlds.get_organizational_domain(domain)
  if (!org_domain) {
    connection.loginfo(this, `no org domain from ${domain}`)
    return next()
  }

  const file = this.cfg.domain.any

  // step 2: check for whitelist
  if (this.any_whitelist(connection, hook, params, domain, org_domain)) {
    const whiteResults = {
      pass: `${hook}:${file}`,
      whitelist: true,
      emit: true,
    }
    connection.results.add(this, whiteResults)
    return next()
  }

  // step 3: check for blacklist
  if (this.in_list('domain', 'any', org_domain)) {
    connection.results.add(this, {
      fail: `${file}(${org_domain})`,
      blacklist: true,
      emit: true,
    })
    return next(DENY, 'You are not welcome here.')
  }

  const umsg = hook ? `${hook}:any` : 'any'
  connection.results.add(this, { msg: `unlisted(${umsg})` })
  next()
}

exports.rdns_store_results = function (connection, color, file) {
  switch (color) {
    case 'white':
      connection.results.add(this, { whitelist: true, pass: file, emit: true })
      break
    case 'black':
      connection.results.add(this, { fail: file, emit: true })
      break
  }
}

exports.rdns_is_listed = function (connection, color) {
  const addrs = [connection.remote.ip, connection.remote.host]

  for (let addr of addrs) {
    if (!addr) continue // empty rDNS host
    if (/[\w]/.test(addr)) addr = addr.toLowerCase()

    let file = this.cfg[color].conn
    connection.logdebug(this, `checking ${addr} against ${file}`)

    if (this.in_list(color, 'conn', addr)) {
      this.rdns_store_results(connection, color, file)
      return true
    }

    file = this.cfg.re[color].conn
    connection.logdebug(this, `checking ${addr} against ${file}`)
    if (this.in_re_list(color, 'conn', addr)) {
      this.rdns_store_results(connection, color, file)
      return true
    }
  }

  return false
}

exports.rdns_access = function (next, connection) {
  if (!this.cfg.check.conn) return next()

  if (this.rdns_is_listed(connection, 'white')) return next()

  const deny_msg = `${connection.remote.host} [${connection.remote.ip}] ${this.cfg.deny_msg.conn}`
  if (this.rdns_is_listed(connection, 'black'))
    return next(DENYDISCONNECT, deny_msg)

  connection.results.add(this, { msg: 'unlisted(conn)' })
  next()
}

exports.helo_access = function (next, connection, helo) {
  if (!this.cfg.check.helo) return next()

  const file = this.cfg.re.black.helo
  if (this.in_re_list('black', 'helo', helo)) {
    connection.results.add(this, { fail: file, emit: true })
    return next(DENY, `${helo} ${this.cfg.deny_msg.helo}`)
  }

  connection.results.add(this, { msg: 'unlisted(helo)' })
  next()
}

exports.mail_from_access = function (next, connection, params) {
  if (!this.cfg.check.mail) return next()

  const mail_from = params[0].address()
  if (!mail_from) {
    connection.transaction.results.add(this, {
      skip: 'null sender',
      emit: true,
    })
    return next()
  }

  // address whitelist checks
  let file = this.cfg.white.mail
  connection.logdebug(this, `checking ${mail_from} against ${file}`)
  if (this.in_list('white', 'mail', mail_from)) {
    connection.transaction.results.add(this, { pass: file, emit: true })
    return next()
  }

  file = this.cfg.re.white.mail
  connection.logdebug(this, `checking ${mail_from} against ${file}`)
  if (this.in_re_list('white', 'mail', mail_from)) {
    connection.transaction.results.add(this, { pass: file, emit: true })
    return next()
  }

  // address blacklist checks
  file = this.cfg.black.mail
  if (this.in_list('black', 'mail', mail_from)) {
    connection.transaction.results.add(this, { fail: file, emit: true })
    return next(DENY, `${mail_from} ${this.cfg.deny_msg.mail}`)
  }

  file = this.cfg.re.black.mail
  connection.logdebug(this, `checking ${mail_from} against ${file}`)
  if (this.in_re_list('black', 'mail', mail_from)) {
    connection.transaction.results.add(this, { fail: file, emit: true })
    return next(DENY, `${mail_from} ${this.cfg.deny_msg.mail}`)
  }

  connection.transaction.results.add(this, { msg: 'unlisted(mail)' })
  next()
}

exports.rcpt_to_access = function (next, connection, params) {
  if (!this.cfg.check.rcpt) return next()

  let pass_status = undefined
  if (this.cfg.rcpt.accept) {
    pass_status = OK
  }

  const rcpt_to = params[0].address()

  // address whitelist checks
  if (!rcpt_to) {
    connection.transaction.results.add(this, {
      skip: 'null rcpt',
      emit: true,
    })
    return next()
  }

  let file = this.cfg.white.rcpt
  if (this.in_list('white', 'rcpt', rcpt_to)) {
    connection.transaction.results.add(this, { pass: file, emit: true })
    return next(pass_status)
  }

  file = this.cfg.re.white.rcpt
  if (this.in_re_list('white', 'rcpt', rcpt_to)) {
    connection.transaction.results.add(this, { pass: file, emit: true })
    return next(pass_status)
  }

  // address blacklist checks
  file = this.cfg.black.rcpt
  if (this.in_list('black', 'rcpt', rcpt_to)) {
    connection.transaction.results.add(this, { fail: file, emit: true })
    return next(DENY, `${rcpt_to} ${this.cfg.deny_msg.rcpt}`)
  }

  file = this.cfg.re.black.rcpt
  if (this.in_re_list('black', 'rcpt', rcpt_to)) {
    connection.transaction.results.add(this, { fail: file, emit: true })
    return next(DENY, `${rcpt_to} ${this.cfg.deny_msg.rcpt}`)
  }

  connection.transaction.results.add(this, { msg: 'unlisted(rcpt)' })
  next()
}

exports.data_any = function (next, connection) {
  if (!this.cfg.check.data && !this.cfg.check.any) {
    connection.transaction.results.add(this, { skip: 'data(disabled)' })
    return next()
  }

  const hdr_from = connection.transaction.header.get_decoded('From')
  if (!hdr_from) {
    connection.transaction.results.add(this, { fail: 'data(missing_from)' })
    return next()
  }

  let hdr_addr
  try {
    hdr_addr = haddr.parse(hdr_from)[0]
  } catch (e) {
    connection.transaction.results.add(this, {
      fail: `data(unparsable_from:${hdr_from})`,
    })
    return next()
  }

  if (!hdr_addr) {
    connection.transaction.results.add(this, {
      fail: `data(unparsable_from:${hdr_from})`,
    })
    return next()
  }

  const hdr_dom = tlds.get_organizational_domain(hdr_addr.host())
  if (!hdr_dom) {
    connection.transaction.results.add(this, {
      fail: `data(no_od_from:${hdr_addr})`,
    })
    return next()
  }

  const file = this.cfg.domain.any
  if (this.in_list('domain', 'any', `!${hdr_dom}`)) {
    connection.results.add(this, { pass: file, whitelist: true, emit: true })
    return next()
  }

  if (this.in_list('domain', 'any', hdr_dom)) {
    connection.results.add(this, {
      fail: `${file}(${hdr_dom})`,
      blacklist: true,
      emit: true,
    })
    return next(DENY, 'Email from that domain is not accepted here.')
  }

  connection.results.add(this, { msg: 'unlisted(any)' })
  next()
}

exports.in_list = function (type, phase, address) {
  if (this.list[type][phase] === undefined) {
    console.log(`phase not defined: ${phase}`)
    return false
  }
  if (!address) return false
  if (this.list[type][phase][address.toLowerCase()]) return true
  return false
}

exports.in_re_list = function (type, phase, address) {
  if (!this.list_re[type][phase]) {
    return false
  }
  if (!this.cfg.re[type][phase].source) {
    this.logdebug(`empty file: ${this.cfg.re[type][phase]}`)
  } else {
    this.logdebug(
      `checking ${address} against ` + `${this.cfg.re[type][phase].source}`,
    )
  }
  return this.list_re[type][phase].test(address)
}

exports.load_file = function (type, phase) {
  if (!this.cfg.check[phase]) {
    this.logdebug(`skipping ${this.cfg[type][phase]}`)
    return
  }

  const file_name = this.cfg[type][phase]

  // load config with a self-referential callback
  const list = this.config.get(file_name, 'list', () => {
    this.load_file(type, phase)
  })

  // init the list store, type is white or black
  if (!this.list) this.list = { type: {} }
  if (!this.list[type]) this.list[type] = {}

  // toLower when loading spends a fraction of a second at load time
  // to save millions of seconds during run time.
  const listAsHash = {} // store as hash for speedy lookups
  for (const entry of list) {
    listAsHash[entry.toLowerCase()] = true
  }
  this.list[type][phase] = listAsHash
}

exports.load_re_file = function (type, phase) {
  if (!this.cfg.check[phase]) {
    this.logdebug(`skipping ${this.cfg.re[type][phase]}`)
    return
  }

  const plugin = this
  const regex_list = utils.valid_regexes(
    plugin.config.get(plugin.cfg.re[type][phase], 'list', () => {
      plugin.load_re_file(type, phase)
    }),
  )

  // initialize the list store
  if (!this.list_re) this.list_re = { type: {} }
  if (!this.list_re[type]) this.list_re[type] = {}

  // compile the regexes at the designated location
  this.list_re[type][phase] = new RegExp(`^(${regex_list.join('|')})$`, 'i')
}

exports.load_domain_file = function (type, phase) {
  if (!this.cfg.check[phase]) {
    this.logdebug(`skipping ${this.cfg[type][phase]}`)
    return
  }

  const file_name = this.cfg[type][phase]
  const list = this.config.get(file_name, 'list', () => {
    this.load_domain_file(type, phase)
  })

  // init the list store, if needed
  if (!this.list) this.list = { type: {} }
  if (!this.list[type]) this.list[type] = {}

  // lowercase list items at load (much faster than at run time)
  for (const entry of list) {
    if (entry[0] === '!') {
      // whitelist entry
      this.list[type][phase][entry.toLowerCase()] = true
      continue
    }

    if (/@/.test(entry[0])) {
      // email address
      this.list[type][phase][entry.toLowerCase()] = true
      continue
    }

    const d = tlds.get_organizational_domain(entry)
    if (!d) continue
    this.list[type][phase][d.toLowerCase()] = true
  }
}
