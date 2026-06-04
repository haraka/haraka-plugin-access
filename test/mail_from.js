'use strict'

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')

const {
  assertResult,
  callHook,
  callMail,
  makeConnection,
  makePlugin,
} = require('haraka-test-fixtures')

describe('mail_from_access', () => {
  let plugin, connection
  beforeEach(() => {
    plugin = makePlugin('access', { configDir: __dirname })
    connection = makeConnection({ withTxn: true })
  })

  const cases = [
    {
      name: 'no lists populated',
      setup: () => {},
      addr: 'list@unknown.com',
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'whitelisted addr',
      setup: (p) => {
        p.list.white.mail['list@harakamail.com'] = true
      },
      addr: 'list@harakamail.com',
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'blacklisted addr',
      setup: (p) => {
        p.list.black.mail['list@badmail.com'] = true
      },
      addr: 'list@badmail.com',
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain',
      setup: (p) => {
        p.list_re.black.mail = [/^(.*@spam.com)$/i]
      },
      addr: 'bad@spam.com',
      expect: { rc: DENY, bucket: 'fail' },
    },
    {
      name: 'blacklisted domain, white addr',
      setup: (p) => {
        p.list.white.mail['special@spam.com'] = true
        p.list_re.black.mail = [/^(.*@spam.com)$/i]
      },
      addr: 'special@spam.com',
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'skips null sender',
      setup: () => {},
      addr: '<>',
      expect: { rc: undefined, bucket: 'skip' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin)
      const { rc } = await callMail(plugin, connection, c.addr)
      assert.equal(rc, c.expect.rc)
      assertResult(connection.transaction, 'access', c.expect.bucket)
    })
  }

  it('skips when params are missing', async () => {
    const { rc } = await callHook(plugin, 'mail_from_access', connection, [])
    assert.equal(rc, undefined)
    assertResult(connection.transaction, 'access', 'skip')
  })

  it('returns next() when check.mail is false', async () => {
    plugin.cfg.check.mail = false
    const { rc } = await callMail(plugin, connection, 'user@example.com')
    assert.equal(rc, undefined)
  })
})
