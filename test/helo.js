'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const fixtures = require('haraka-test-fixtures')

describe('helo_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    connection = fixtures.connection.createConnection()
  })

  it('no list', async () => {
    plugin.cfg.check.helo = true
    await new Promise((resolve) => {
      plugin.helo_access(
        (rc) => {
          const r = connection.results.get('access')
          assert.equal(undefined, rc)
          assert.ok(r && r.msg && r.msg.length)
          resolve()
        },
        connection,
        'host.example.com',
      )
    })
  })

  it('blacklisted regex', async () => {
    const black = ['.*spam.com']
    plugin.list_re.black.helo = [new RegExp(`^(${black.join('|')})$`, 'i')]
    plugin.cfg.check.helo = true
    await new Promise((resolve) => {
      plugin.helo_access(
        (rc) => {
          assert.equal(DENY, rc)
          const r = connection.results.get('access')
          assert.ok(r && r.fail && r.fail.length)
          resolve()
        },
        connection,
        'bad.spam.com',
      )
    })
  })

  it('returns next() when check.helo is false', async () => {
    plugin.cfg.check.helo = false
    await new Promise((resolve) => {
      plugin.helo_access(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        connection,
        'host.example.com',
      )
    })
  })
})
