'use strict'

const assert = require('node:assert/strict')
const { describe, it, before, beforeEach } = require('node:test')

const { Address } = require('@haraka/email-address')
const { Address: Rfc2821Address } = require('address-rfc2821')
const {
  assertResult,
  callHook,
  makeConnection,
  makePlugin,
} = require('haraka-test-fixtures')
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
    plugin = makePlugin('access', { register: false })
    connection = makeConnection()
  })

  it('connect: returns remote.host', () => {
    connection.remote.host = 'host.example.com'
    assert.equal(plugin.get_domain('connect', connection), 'host.example.com')
  })

  for (const host of [undefined, 'DNSERROR', 'Unknown', 'NXDOMAIN']) {
    it(`connect: undefined when remote.host is ${host}`, () => {
      connection.remote.host = host
      assert.equal(plugin.get_domain('connect', connection), undefined)
    })
  }

  for (const hook of ['helo', 'ehlo']) {
    it(`${hook}: returns helo string`, () => {
      assert.equal(
        plugin.get_domain(hook, connection, 'mail.example.com'),
        'mail.example.com',
      )
    })
  }

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
    plugin = makePlugin('access', { configDir: __dirname })
    plugin.cfg.check.any = true
    connection = makeConnection({ withTxn: true })
  })

  const userAddr = [new Address('<user@example.com>')]

  const cases = [
    {
      name: 'returns next() when check.any is false',
      setup: (p, c) => {
        p.cfg.check.any = false
        c.hook = 'mail'
      },
      args: [userAddr],
      expect: { rc: undefined },
    },
    {
      name: 'returns next() when no hook detected',
      setup: (_, c) => {
        c.hook = undefined
      },
      args: [userAddr],
      expect: { rc: undefined },
    },
    {
      name: 'returns next() when domain detection fails',
      setup: (_, c) => {
        c.hook = 'connect'
        c.remote.host = undefined
      },
      args: [],
      expect: { rc: undefined },
    },
    {
      name: 'records fail for invalid domain (no dot)',
      setup: (_, c) => {
        c.hook = 'helo'
      },
      args: ['PC-100'],
      expect: { rc: undefined, bucket: 'fail' },
    },
    {
      name: 'blocks mail from a blacklisted domain',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        c.hook = 'mail'
      },
      args: [userAddr],
      expect: {
        rc: DENY,
        msg: 'You are not welcome here.',
        bucket: 'fail',
      },
    },
    {
      name: 'blocks rcpt to a blacklisted domain',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        c.hook = 'rcpt'
      },
      args: [userAddr],
      expect: { rc: DENY },
    },
    {
      name: 'blocks on connect when rDNS matches blacklisted org domain',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        c.hook = 'connect'
        c.remote.host = 'mail.example.com'
      },
      args: [],
      expect: { rc: DENY },
    },
    {
      name: 'blocks on helo when helo matches blacklisted org domain',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        c.hook = 'helo'
      },
      args: ['mail.example.com'],
      expect: { rc: DENY },
    },
    {
      name: 'whitelist entry !email overrides domain blacklist',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        p.list.domain.any['!friend@example.com'] = true
        c.hook = 'mail'
      },
      args: [[new Address('<friend@example.com>')]],
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelist entry !email matches legacy address-rfc2821 objects',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        p.list.domain.any['!friend@example.com'] = true
        c.hook = 'mail'
      },
      args: [[new Rfc2821Address('<friend@example.com>')]],
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelist entry !host overrides blacklist on connect',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        p.list.domain.any['!special.example.com'] = true
        c.hook = 'connect'
        c.remote.host = 'special.example.com'
      },
      args: [],
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'records unlisted msg when domain not in list',
      setup: (_, c) => {
        c.hook = 'mail'
      },
      args: [userAddr],
      expect: { rc: undefined, bucket: 'msg' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin, connection)
      const { rc, msg } = await callHook(plugin, 'any', connection, ...c.args)
      assert.equal(rc, c.expect.rc)
      if (c.expect.msg !== undefined) assert.equal(msg, c.expect.msg)
      if (c.expect.bucket) {
        assertResult(connection, 'access', c.expect.bucket)
      }
    })
  }
})

describe('data_any', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = makePlugin('access', { configDir: __dirname })
    plugin.cfg.check.any = true
    connection = makeConnection({ withTxn: true })
  })

  const cases = [
    {
      name: 'fails when From header is missing',
      setup: () => {},
      expect: { rc: undefined, bucket: 'fail', resultsOn: 'transaction' },
    },
    {
      name: 'fails when From header is unparsable',
      setup: (_, c) => c.transaction.add_header('From', '@@@bogus@@@'),
      expect: { rc: undefined, bucket: 'fail', resultsOn: 'transaction' },
    },
    {
      name: 'passes when From org domain is whitelisted',
      setup: (p, c) => {
        p.list.domain.any['!example.com'] = true
        c.transaction.add_header('From', 'user@example.com')
      },
      expect: { rc: undefined, bucket: 'pass', resultsOn: 'connection' },
    },
    {
      name: 'blocks when From org domain is blacklisted',
      setup: (p, c) => {
        p.list.domain.any['example.com'] = true
        c.transaction.add_header('From', 'user@example.com')
      },
      expect: {
        rc: DENY,
        msg: 'Email from that domain is not accepted here.',
        bucket: 'fail',
        resultsOn: 'connection',
      },
    },
    {
      name: 'records unlisted msg when From not in list',
      setup: (_, c) => c.transaction.add_header('From', 'user@example.com'),
      expect: { rc: undefined, bucket: 'msg', resultsOn: 'connection' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin, connection)
      const { rc, msg } = await callHook(plugin, 'data_any', connection)
      assert.equal(rc, c.expect.rc)
      if (c.expect.msg !== undefined) assert.equal(msg, c.expect.msg)
      const source =
        c.expect.resultsOn === 'transaction'
          ? connection.transaction
          : connection
      assertResult(source, 'access', c.expect.bucket)
    })
  }
})

describe('load_domain_file', () => {
  let plugin
  beforeEach(() => {
    plugin = makePlugin('access', { configDir: __dirname })
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
