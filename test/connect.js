'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const fixtures = require('haraka-test-fixtures')

// constructs a plugin once at module load so the haraka-constants globals
// (DENY, DENYDISCONNECT, OK, ...) are installed before the cases table below
// is evaluated.
new fixtures.plugin('access')

const runHook = (plugin, method, ...args) =>
  new Promise((resolve) =>
    plugin[method]((rc, msg) => resolve({ rc, msg }), ...args),
  )

describe('rdns_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
    connection.remote.ip = '1.1.1.1'
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
      const { rc, msg } = await runHook(plugin, 'rdns_access', connection)
      assert.equal(rc, c.expect.rc)
      if (c.expect.msg !== undefined) assert.equal(msg, c.expect.msg)
      assert.ok(connection.results.get('access')[c.expect.bucket].length)
    })
  }

  it('returns next() when check.conn is false', async () => {
    plugin.cfg.check.conn = false
    const { rc } = await runHook(plugin, 'rdns_access', connection)
    assert.equal(rc, undefined)
  })
})
