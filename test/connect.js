'use strict'

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')

const {
  assertResult,
  callConnect,
  makeConnection,
  makePlugin,
} = require('haraka-test-fixtures')

describe('rdns_access', () => {
  let plugin, connection
  beforeEach(() => {
    plugin = makePlugin('access', { configDir: __dirname })
    connection = makeConnection({ ip: '1.1.1.1', withTxn: true })
    connection.remote.host = 'host.example.com'
  })

  const denyMsg = 'host.example.com [1.1.1.1] You are not allowed to connect'

  const cases = [
    {
      name: 'no list',
      setup: () => {},
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'whitelist',
      setup: (p) => {
        p.list.white.conn['host.example.com'] = true
      },
      expect: { rc: undefined, bucket: 'pass' },
    },
    {
      name: 'blacklist',
      setup: (p) => {
        p.list.black.conn['host.example.com'] = true
      },
      expect: { rc: DENYDISCONNECT, bucket: 'fail', msg: denyMsg },
    },
    {
      name: 'blacklist regex',
      setup: (p, c) => {
        c.remote.host = 'host.antispam.com'
        p.list_re.black.conn = [new RegExp('^(.*spam.com)$', 'i')]
      },
      expect: {
        rc: DENYDISCONNECT,
        bucket: 'fail',
        msg: 'host.antispam.com [1.1.1.1] You are not allowed to connect',
      },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin, connection)
      const { rc, msg } = await callConnect(plugin, connection)
      assert.equal(rc, c.expect.rc)
      if (c.expect.msg !== undefined) assert.equal(msg, c.expect.msg)
      assertResult(connection, 'access', c.expect.bucket)
    })
  }

  it('returns next() when check.conn is false', async () => {
    plugin.cfg.check.conn = false
    const { rc } = await callConnect(plugin, connection)
    assert.equal(rc, undefined)
  })
})
