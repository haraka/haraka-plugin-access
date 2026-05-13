'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const fixtures = require('haraka-test-fixtures')

describe('rdns_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
  })

  it('no list', async () => {
    connection.remote.ip = '1.1.1.1'
    connection.remote.host = 'host.example.com'
    await new Promise((resolve) => {
      plugin.rdns_access((rc) => {
        assert.equal(undefined, rc)
        assert.ok(connection.results.get('access').msg.length)
        resolve()
      }, connection)
    })
  })

  it('whitelist', async () => {
    connection.remote.ip = '1.1.1.1'
    connection.remote.host = 'host.example.com'
    plugin.list.white.conn['host.example.com'] = true
    await new Promise((resolve) => {
      plugin.rdns_access((rc) => {
        assert.equal(undefined, rc)
        assert.ok(connection.results.get('access').pass.length)
        resolve()
      }, connection)
    })
  })

  it('blacklist', async () => {
    connection.remote.ip = '1.1.1.1'
    connection.remote.host = 'host.example.com'
    plugin.list.black.conn['host.example.com'] = true
    await new Promise((resolve) => {
      plugin.rdns_access((rc, msg) => {
        assert.equal(DENYDISCONNECT, rc)
        assert.equal(
          'host.example.com [1.1.1.1] You are not allowed to connect',
          msg,
        )
        assert.ok(connection.results.get('access').fail.length)
        resolve()
      }, connection)
    })
  })

  it('blacklist regex', async () => {
    connection.remote.ip = '1.1.1.1'
    connection.remote.host = 'host.antispam.com'
    const black = ['.*spam.com']
    plugin.list_re.black.conn = black.map((r) => new RegExp(`^(${r})$`, 'i'))
    await new Promise((resolve) => {
      plugin.rdns_access((rc, msg) => {
        assert.equal(DENYDISCONNECT, rc)
        assert.equal(
          'host.antispam.com [1.1.1.1] You are not allowed to connect',
          msg,
        )
        assert.ok(connection.results.get('access').fail.length)
        resolve()
      }, connection)
    })
  })

  it('returns next() when check.conn is false', async () => {
    plugin.cfg.check.conn = false
    await new Promise((resolve) => {
      plugin.rdns_access((rc) => {
        assert.equal(rc, undefined)
        resolve()
      }, connection)
    })
  })
})
