'use strict'

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')

const {
  assertResult,
  callHook,
  callRcpt,
  makeConnection,
  makePlugin,
} = require('haraka-test-fixtures')

describe('rcpt_to_access', () => {
  let plugin, connection
  beforeEach(() => {
    plugin = makePlugin('access', { configDir: __dirname })
    connection = makeConnection({ withTxn: true })
  })

  const cases = [
    {
      name: 'no lists populated',
      setup: () => {},
      addr: 'user@example.com',
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'whitelisted addr',
      setup: (p) => {
        p.list.white.rcpt['user@example.com'] = true
      },
      addr: 'user@example.com',
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelisted addr, case insensitive',
      setup: (p) => {
        p.list.white.rcpt['user@example.com'] = true
      },
      addr: 'USER@example.com',
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'whitelisted addr, accept enabled',
      setup: (p) => {
        p.cfg.rcpt.accept = true
        p.list.white.rcpt['user@example.com'] = true
      },
      addr: 'user@example.com',
      expect: { rc: OK, bucket: 'pass' },
    },
    {
      name: 'regex whitelisted addr, accept enabled',
      setup: (p) => {
        p.cfg.rcpt.accept = true
        p.list_re.white.rcpt = [/^user@example.com$/i]
      },
      addr: 'user@example.com',
      expect: { rc: OK, bucket: 'pass' },
    },
    {
      name: 'blacklisted addr',
      setup: (p) => {
        p.list.black.rcpt['user@badmail.com'] = true
      },
      addr: 'user@badmail.com',
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain',
      setup: (p) => {
        p.list_re.black.rcpt = [/^(.*@spam.com)$/i]
      },
      addr: 'bad@spam.com',
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain, white addr',
      setup: (p) => {
        p.list.white.rcpt['special@spam.com'] = true
        p.list_re.black.rcpt = [/^(.*@spam.com)$/i]
      },
      addr: 'special@spam.com',
      expect: { rc: undefined, bucket: 'pass' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin)
      const { rc } = await callRcpt(plugin, connection, c.addr)
      assert.equal(rc, c.expect.rc)
      assertResult(connection.transaction, 'access', c.expect.bucket)
    })
  }

  it('skips when params are missing', async () => {
    const { rc } = await callHook(plugin, 'rcpt_to_access', connection, [])
    assert.equal(rc, undefined)
    assertResult(connection.transaction, 'access', 'skip')
  })

  it('returns next() when check.rcpt is false', async () => {
    plugin.cfg.check.rcpt = false
    const { rc } = await callRcpt(plugin, connection, 'user@example.com')
    assert.equal(rc, undefined)
  })
})
