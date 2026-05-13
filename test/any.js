'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

describe('get_domain', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.connection = fixtures.connection.createConnection()
  })

  it('connect: returns remote.host', function () {
    this.connection.remote.host = 'host.example.com'
    assert.equal(
      this.plugin.get_domain('connect', this.connection),
      'host.example.com',
    )
  })

  it('connect: undefined when remote.host is missing', function () {
    this.connection.remote.host = undefined
    assert.equal(this.plugin.get_domain('connect', this.connection), undefined)
  })

  it('connect: undefined when remote.host is DNSERROR', function () {
    this.connection.remote.host = 'DNSERROR'
    assert.equal(this.plugin.get_domain('connect', this.connection), undefined)
  })

  it('connect: undefined when remote.host is Unknown', function () {
    this.connection.remote.host = 'Unknown'
    assert.equal(this.plugin.get_domain('connect', this.connection), undefined)
  })

  it('helo: returns helo string', function () {
    assert.equal(
      this.plugin.get_domain('helo', this.connection, 'mail.example.com'),
      'mail.example.com',
    )
  })

  it('ehlo: returns helo string', function () {
    assert.equal(
      this.plugin.get_domain('ehlo', this.connection, 'mail.example.com'),
      'mail.example.com',
    )
  })

  it('helo: undefined for IP literal', function () {
    assert.equal(
      this.plugin.get_domain('helo', this.connection, '[192.0.2.1]'),
      undefined,
    )
  })

  it('mail: returns sender host', function () {
    const params = [new Address('<user@example.com>')]
    assert.equal(
      this.plugin.get_domain('mail', this.connection, params),
      'example.com',
    )
  })

  it('rcpt: returns recipient host', function () {
    const params = [new Address('<user@example.com>')]
    assert.equal(
      this.plugin.get_domain('rcpt', this.connection, params),
      'example.com',
    )
  })

  it('unknown hook: returns undefined', function () {
    assert.equal(this.plugin.get_domain('bogus', this.connection), undefined)
  })
})

describe('any', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.plugin.cfg.check.any = true
    this.connection = fixtures.connection.createConnection()
    this.connection.init_transaction()
  })

  it('returns next() when check.any is false', async function () {
    this.plugin.cfg.check.any = false
    this.connection.hook = 'mail'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('returns next() when no hook detected', async function () {
    this.connection.hook = undefined
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('returns next() when domain detection fails', async function () {
    this.connection.hook = 'connect'
    this.connection.remote.host = undefined
    await new Promise((resolve) => {
      this.plugin.any((rc) => {
        assert.equal(rc, undefined)
        resolve()
      }, this.connection)
    })
  })

  it('records fail for invalid domain (no dot)', async function () {
    this.connection.hook = 'helo'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = this.connection.results.get('access')
          assert.ok(r.fail.length)
          resolve()
        },
        this.connection,
        'PC-100',
      )
    })
  })

  it('blocks mail from a blacklisted domain', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.connection.hook = 'mail'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc, msg) => {
          assert.equal(rc, DENY)
          assert.equal(msg, 'You are not welcome here.')
          const r = this.connection.results.get('access')
          assert.ok(r.fail.length)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blocks rcpt to a blacklisted domain', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.connection.hook = 'rcpt'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, DENY)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blocks on connect when rDNS matches blacklisted org domain', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.connection.hook = 'connect'
    this.connection.remote.host = 'mail.example.com'
    await new Promise((resolve) => {
      this.plugin.any((rc) => {
        assert.equal(rc, DENY)
        resolve()
      }, this.connection)
    })
  })

  it('blocks on helo when helo matches blacklisted org domain', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.connection.hook = 'helo'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, DENY)
          resolve()
        },
        this.connection,
        'mail.example.com',
      )
    })
  })

  it('whitelist entry !email overrides domain blacklist', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.plugin.list.domain.any['!friend@example.com'] = true
    this.connection.hook = 'mail'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = this.connection.results.get('access')
          assert.ok(r.pass.length)
          resolve()
        },
        this.connection,
        [new Address('<friend@example.com>')],
      )
    })
  })

  it('whitelist entry !host overrides blacklist on connect', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.plugin.list.domain.any['!special.example.com'] = true
    this.connection.hook = 'connect'
    this.connection.remote.host = 'special.example.com'
    await new Promise((resolve) => {
      this.plugin.any((rc) => {
        assert.equal(rc, undefined)
        const r = this.connection.results.get('access')
        assert.ok(r.pass.length)
        resolve()
      }, this.connection)
    })
  })

  it('records unlisted msg when domain not in list', async function () {
    this.connection.hook = 'mail'
    await new Promise((resolve) => {
      this.plugin.any(
        (rc) => {
          assert.equal(rc, undefined)
          const r = this.connection.results.get('access')
          assert.ok(r.msg.length)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })
})

describe('data_any', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.plugin.cfg.check.any = true
    this.connection = fixtures.connection.createConnection()
    this.connection.init_transaction()
  })

  it('fails when From header is missing', async function () {
    await new Promise((resolve) => {
      this.plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = this.connection.transaction.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, this.connection)
    })
  })

  it('fails when From header is unparsable', async function () {
    this.connection.transaction.add_header('From', '@@@bogus@@@')
    await new Promise((resolve) => {
      this.plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = this.connection.transaction.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, this.connection)
    })
  })

  it('passes when From org domain is whitelisted', async function () {
    this.plugin.list.domain.any['!example.com'] = true
    this.connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      this.plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = this.connection.results.get('access')
        assert.ok(r.pass.length)
        resolve()
      }, this.connection)
    })
  })

  it('blocks when From org domain is blacklisted', async function () {
    this.plugin.list.domain.any['example.com'] = true
    this.connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      this.plugin.data_any((rc, msg) => {
        assert.equal(rc, DENY)
        assert.equal(msg, 'Email from that domain is not accepted here.')
        const r = this.connection.results.get('access')
        assert.ok(r.fail.length)
        resolve()
      }, this.connection)
    })
  })

  it('records unlisted msg when From not in list', async function () {
    this.connection.transaction.add_header('From', 'user@example.com')
    await new Promise((resolve) => {
      this.plugin.data_any((rc) => {
        assert.equal(rc, undefined)
        const r = this.connection.results.get('access')
        assert.ok(r.msg.length)
        resolve()
      }, this.connection)
    })
  })
})

describe('load_domain_file', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.plugin.cfg.check.any = true
    this.plugin.list.domain.any = {}
  })

  it('skips when check.any is disabled', function () {
    this.plugin.cfg.check.any = false
    this.plugin.load_domain_file('domain', 'any')
    assert.deepEqual(this.plugin.list.domain.any, {})
  })

  it('reduces domain entries to organizational domain', function () {
    this.plugin.load_domain_file('domain', 'any')
    assert.equal(this.plugin.list.domain.any['spam-central.com'], true)
  })

  it('stores ! whitelist entries verbatim', function () {
    this.plugin.load_domain_file('domain', 'any')
    assert.equal(this.plugin.list.domain.any['!special.example.com'], true)
    assert.equal(this.plugin.list.domain.any['!friend@aol.com'], true)
  })

  it('lowercases entries on load', function () {
    this.plugin.load_domain_file('domain', 'any')
    assert.equal(this.plugin.list.domain.any['mixed-case.com'], true)
  })
})
