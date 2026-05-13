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

describe('rcpt_to_access', () => {
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
      params: addr('<user@example.com>'),
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'whitelisted addr',
      setup: (p) => {
        p.list.white.rcpt['user@example.com'] = true
      },
      params: addr('<user@example.com>'),
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelisted addr, case insensitive',
      setup: (p) => {
        p.list.white.rcpt['user@example.com'] = true
      },
      params: addr('<USER@example.com>'),
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelisted addr, accept enabled',
      setup: (p) => {
        p.cfg.rcpt.accept = true
        p.list.white.rcpt['user@example.com'] = true
      },
      params: addr('<user@example.com>'),
      expect: { rc: OK, bucket: 'pass' },
    },
    {
      name: 'regex whitelisted addr, accept enabled',
      setup: (p) => {
        p.cfg.rcpt.accept = true
        p.list_re.white.rcpt = [new RegExp('^user@example.com$', 'i')]
      },
      params: addr('<user@example.com>'),
      expect: { rc: OK, bucket: 'pass' },
    },
    {
      name: 'blacklisted addr',
      setup: (p) => {
        p.list.black.rcpt['user@badmail.com'] = true
      },
      params: addr('<user@badmail.com>'),
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain',
      setup: (p) => {
        p.list_re.black.rcpt = compileRe(['.*@spam.com'])
      },
      params: addr('<bad@spam.com>'),
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain, white addr',
      setup: (p) => {
        p.list.white.rcpt['special@spam.com'] = true
        p.list_re.black.rcpt = compileRe(['.*@spam.com'])
      },
      params: addr('<special@spam.com>'),
      expect: { rc: undefined, bucket: 'pass' },
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
        'rcpt_to_access',
        connection,
        c.params,
      )
      assert.equal(rc, c.expect.rc)
      assert.ok(
        connection.transaction.results.get('access')[c.expect.bucket].length,
      )
    })
  }

  it('returns next() when check.rcpt is false', async () => {
    plugin.cfg.check.rcpt = false
    const { rc } = await runHook(
      plugin,
      'rcpt_to_access',
      connection,
      addr('<user@example.com>'),
    )
    assert.equal(rc, undefined)
  })
})
