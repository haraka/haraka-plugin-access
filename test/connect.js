'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const fixtures = require('haraka-test-fixtures')

describe('rdns_access', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.connection = fixtures.connection.createConnection()
    this.connection.init_transaction()
  })

  it('no list', async function () {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    await new Promise((resolve) => {
      this.plugin.rdns_access((rc) => {
        assert.equal(undefined, rc)
        assert.ok(this.connection.results.get('access').msg.length)
        resolve()
      }, this.connection)
    })
  })

  it('whitelist', async function () {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    this.plugin.list.white.conn['host.example.com'] = true
    await new Promise((resolve) => {
      this.plugin.rdns_access((rc) => {
        assert.equal(undefined, rc)
        assert.ok(this.connection.results.get('access').pass.length)
        resolve()
      }, this.connection)
    })
  })

  it('blacklist', async function () {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    this.plugin.list.black.conn['host.example.com'] = true
    await new Promise((resolve) => {
      this.plugin.rdns_access((rc, msg) => {
        assert.equal(DENYDISCONNECT, rc)
        assert.equal(
          'host.example.com [1.1.1.1] You are not allowed to connect',
          msg,
        )
        assert.ok(this.connection.results.get('access').fail.length)
        resolve()
      }, this.connection)
    })
  })

  it('blacklist regex', async function () {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.antispam.com'
    const black = ['.*spam.com']
    this.plugin.list_re.black.conn = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      this.plugin.rdns_access((rc, msg) => {
        assert.equal(DENYDISCONNECT, rc)
        assert.equal(
          'host.antispam.com [1.1.1.1] You are not allowed to connect',
          msg,
        )
        assert.ok(this.connection.results.get('access').fail.length)
        resolve()
      }, this.connection)
    })
  })

  it('returns next() when check.conn is false', async function () {
    this.plugin.cfg.check.conn = false
    await new Promise((resolve) => {
      this.plugin.rdns_access((rc) => {
        assert.equal(rc, undefined)
        resolve()
      }, this.connection)
    })
  })
})
