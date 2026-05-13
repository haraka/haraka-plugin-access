'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const fixtures = require('haraka-test-fixtures')

describe('helo_access', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.connection = fixtures.connection.createConnection()
  })

  it('no list', async function () {
    this.plugin.cfg.check.helo = true
    await new Promise((resolve) => {
      this.plugin.helo_access(
        (rc) => {
          const r = this.connection.results.get('access')
          assert.equal(undefined, rc)
          assert.ok(r && r.msg && r.msg.length)
          resolve()
        },
        this.connection,
        'host.example.com',
      )
    })
  })

  it('blacklisted regex', async function () {
    const black = ['.*spam.com']
    this.plugin.list_re.black.helo = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.cfg.check.helo = true
    await new Promise((resolve) => {
      this.plugin.helo_access(
        (rc) => {
          assert.equal(DENY, rc)
          const r = this.connection.results.get('access')
          assert.ok(r && r.fail && r.fail.length)
          resolve()
        },
        this.connection,
        'bad.spam.com',
      )
    })
  })

  it('returns next() when check.helo is false', async function () {
    this.plugin.cfg.check.helo = false
    await new Promise((resolve) => {
      this.plugin.helo_access(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        this.connection,
        'host.example.com',
      )
    })
  })
})
