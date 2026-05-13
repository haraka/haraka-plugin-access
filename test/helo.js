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

describe('helo_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    plugin.cfg.check.helo = true
    connection = fixtures.connection.createConnection()
  })

  const cases = [
    {
      name: 'no list',
      setup: () => {},
      helo: 'host.example.com',
      expect: { rc: undefined, bucket: 'msg' },
    },
    {
      name: 'blacklisted regex',
      setup: (p) => {
        p.list_re.black.helo = [new RegExp('^(.*spam.com)$', 'i')]
      },
      helo: 'bad.spam.com',
      expect: { rc: DENY, bucket: 'fail' },
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      c.setup(plugin)
      const { rc } = await runHook(plugin, 'helo_access', connection, c.helo)
      assert.equal(rc, c.expect.rc)
      const r = connection.results.get('access')
      assert.ok(r?.[c.expect.bucket]?.length)
    })
  }

  it('returns next() when check.helo is false', async () => {
    plugin.cfg.check.helo = false
    const { rc } = await runHook(
      plugin,
      'helo_access',
      connection,
      'host.example.com',
    )
    assert.equal(rc, undefined)
  })
})
