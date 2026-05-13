'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

// constructs a plugin once at module load so the haraka-constants globals
// (DENY, DENYDISCONNECT, OK, ...) are installed before the cases table below
// is evaluated.
new fixtures.plugin('access')

const runHook = (plugin, method, ...args) =>
  new Promise((resolve) =>
    plugin[method]((rc, msg) => resolve({ rc, msg }), ...args),
  )

const addr = (s) => [new Address(s)]
const compileRe = (patterns) => patterns.map((r) => new RegExp(`^(${r})$`, 'i'))

describe('mail_from_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
  })

  const cases = [
    {
      name: 'no lists populated',
      setup: () => {},
      params: addr('<list@unknown.com>'),
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'whitelisted addr',
      setup: (p) => {
        p.list.white.mail['list@harakamail.com'] = true
      },
      params: addr('<list@harakamail.com>'),
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'blacklisted addr',
      setup: (p) => {
        p.list.black.mail['list@badmail.com'] = true
      },
      params: addr('<list@badmail.com>'),
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain',
      setup: (p) => {
        p.list_re.black.mail = compileRe(['.*@spam.com'])
      },
      params: addr('<bad@spam.com>'),
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain, white addr',
      setup: (p) => {
        p.list.white.mail['special@spam.com'] = true
        p.list_re.black.mail = compileRe(['.*@spam.com'])
      },
      params: addr('<special@spam.com>'),
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'skips null sender',
      setup: () => {},
      params: addr('<>'),
      expect: { rc: undefined, bucket: 'skip' },
    },
    {
      name: 'skips when params are missing',
      setup: () => {},
      params: [],
      expect: { rc: undefined, bucket: 'skip' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin)
      const { rc } = await runHook(
        plugin,
        'mail_from_access',
        connection,
        c.params,
      )
      assert.equal(rc, c.expect.rc)
      assert.ok(
        connection.transaction.results.get('access')[c.expect.bucket].length,
      )
    })
  }

  it('returns next() when check.mail is false', async () => {
    plugin.cfg.check.mail = false
    const { rc } = await runHook(
      plugin,
      'mail_from_access',
      connection,
      addr('<user@example.com>'),
    )
    assert.equal(rc, undefined)
  })
})
