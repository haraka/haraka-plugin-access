'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, before, beforeEach } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')
const tlds = require('haraka-tld')

// haraka-tld loads its public suffix and TLD lists asynchronously; any test
// that calls get_organizational_domain must wait for that to finish.
before(async () => {
  await tlds.ready
})

describe('get_domain', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    connection = fixtures.connection.createConnection()
  })

  it('connect: returns remote.host', () => {
    connection.remote.host = 'host.example.com'
    assert.equal(plugin.get_domain('connect', connection), 'host.example.com')
  })

  it('connect: undefined when remote.host is missing', () => {
    connection.remote.host = undefined
    assert.equal(plugin.get_domain('connect', connection), undefined)
  })

  it('connect: undefined when remote.host is DNSERROR', () => {
    connection.remote.host = 'DNSERROR'
    assert.equal(plugin.get_domain('connect', connection), undefined)
  })

  it('connect: undefined when remote.host is Unknown', () => {
    connection.remote.host = 'Unknown'
    assert.equal(plugin.get_domain('connect', connection), undefined)
  })

  it('helo: returns helo string', () => {
    assert.equal(
      plugin.get_domain('helo', connection, 'mail.example.com'),
      'mail.example.com',
    )
  })

  it('ehlo: returns helo string', () => {
    assert.equal(
      plugin.get_domain('ehlo', connection, 'mail.example.com'),
      'mail.example.com',
    )
  })

  it('helo: undefined for IP literal', () => {
    assert.equal(
      plugin.get_domain('helo', connection, '[192.0.2.1]'),
      undefined,
    )
  })

  it('mail: returns sender host', () => {
    const params = [new Address('<user@example.com>')]
    assert.equal(plugin.get_domain('mail', connection, params), 'example.com')
  })

  it('rcpt: returns recipient host', () => {
    const params = [new Address('<user@example.com>')]
    assert.equal(plugin.get_domain('rcpt', connection, params), 'example.com')
  })

  it('unknown hook: returns undefined', () => {
    assert.equal(plugin.get_domain('bogus', connection), undefined)
  })
})

describe('any', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    plugin.cfg.check.any = true
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
  })

  it('returns next() when check.any is false', async () => {
    plugin.cfg.check.any = false
    connection.hook = 'mail'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('returns next() when no hook detected', async () => {
    connection.hook = undefined
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('returns next() when domain detection fails', async () => {
    connection.hook = 'connect'
    connection.remote.host = undefined
    await new Promise((resolve) => {
      plugin.any((rc) => {
        assert.equal(rc, undefined)
        resolve()
      }, connection)
    })
  })

  it('records fail for invalid domain (no dot)', async () => {
    connection.hook = 'helo'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = connection.results.get('access')
          assert.ok(r.fail.length)
          resolve()
        },
        connection,
        'PC-100',
      )
    })
  })

  it('blocks mail from a blacklisted domain', async () => {
    plugin.list.domain.any['example.com'] = true
    connection.hook = 'mail'
    await new Promise((resolve) => {
      plugin.any(
        (rc, msg) => {
          assert.equal(rc, DENY)
          assert.equal(msg, 'You are not welcome here.')
          const r = connection.results.get('access')
          assert.ok(r.fail.length)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blocks rcpt to a blacklisted domain', async () => {
    plugin.list.domain.any['example.com'] = true
    connection.hook = 'rcpt'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, DENY)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blocks on connect when rDNS matches blacklisted org domain', async () => {
    plugin.list.domain.any['example.com'] = true
    connection.hook = 'connect'
    connection.remote.host = 'mail.example.com'
    await new Promise((resolve) => {
      plugin.any((rc) => {
        assert.equal(rc, DENY)
        resolve()
      }, connection)
    })
  })

  it('blocks on helo when helo matches blacklisted org domain', async () => {
    plugin.list.domain.any['example.com'] = true
    connection.hook = 'helo'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, DENY)
          resolve()
        },
        connection,
        'mail.example.com',
      )
    })
  })

  it('whitelist entry !email overrides domain blacklist', async () => {
    plugin.list.domain.any['example.com'] = true
    plugin.list.domain.any['!friend@example.com'] = true
    connection.hook = 'mail'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = connection.results.get('access')
          assert.ok(r.pass.length)
          resolve()
        },
        connection,
        [new Address('<friend@example.com>')],
      )
    })
  })

  it('whitelist entry !host overrides blacklist on connect', async () => {
    plugin.list.domain.any['example.com'] = true
    plugin.list.domain.any['!special.example.com'] = true
    connection.hook = 'connect'
    connection.remote.host = 'special.example.com'
    await new Promise((resolve) => {
      plugin.any((rc) => {
        assert.equal(rc, undefined)
        const r = connection.results.get('access')
        assert.ok(r.pass.length)
        resolve()
      }, connection)
    })
  })

  it('records unlisted msg when domain not in list', async () => {
    connection.hook = 'mail'
    await new Promise((resolve) => {
      plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = connection.results.get('access')
          assert.ok(r.msg.length)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })
})

describe('data_any', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    plugin.cfg.check.any = true
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
  })

  it('fails when From header is missing', async () => {
    await new Promise((resolve) => {
      plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = connection.transaction.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, connection)
    })
  })

  it('fails when From header is unparsable', async () => {
    connection.transaction.add_header('From', '@@@bogus@@@')
    await new Promise((resolve) => {
      plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = connection.transaction.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, connection)
    })
  })

  it('passes when From org domain is whitelisted', async () => {
    plugin.list.domain.any['!example.com'] = true
    connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = connection.results.get('access')
        assert.ok(r.pass.length)
        resolve()
      }, connection)
    })
  })

  it('blocks when From org domain is blacklisted', async () => {
    plugin.list.domain.any['example.com'] = true
    connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      plugin.data_any((rc, msg) => {
        assert.equal(rc, DENY)
        assert.equal(msg, 'Email from that domain is not accepted here.')
        const r = connection.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, connection)
    })
  })

  it('records unlisted msg when From not in list', async () => {
    connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = connection.results.get('access')
        assert.ok(r.msg.length)
        resolve()
      }, connection)
    })
  })
})

describe('load_domain_file', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    plugin.cfg.check.any = true
    plugin.list.domain.any = {}
  })

  it('skips when check.any is disabled', () => {
    plugin.cfg.check.any = false
    plugin.load_domain_file('domain', 'any')
    assert.deepEqual(plugin.list.domain.any, {})
  })

  it('reduces domain entries to organizational domain', () => {
    plugin.load_domain_file('domain', 'any')
    assert.equal(plugin.list.domain.any['spam-central.com'], true)
  })

  it('stores ! whitelist entries verbatim', () => {
    plugin.load_domain_file('domain', 'any')
    assert.equal(plugin.list.domain.any['!special.example.com'], true)
    assert.equal(plugin.list.domain.any['!friend@aol.com'], true)
  })

  it('lowercases entries on load', () => {
    plugin.load_domain_file('domain', 'any')
    assert.equal(plugin.list.domain.any['mixed-case.com'], true)
  })
})
