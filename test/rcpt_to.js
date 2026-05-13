'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

describe('rcpt_to_access', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.connection = fixtures.connection.createConnection()
    this.connection.init_transaction()
  })

  it('no lists populated', async function () {
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').msg.length)
    }.bind(this)
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('whitelisted addr', async function () {
    let calls = 0
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
      if (++calls == 2) {
        // done
      }
    }.bind(this)
    this.plugin.list.white.rcpt['user@example.com'] = true
    await Promise.all([
      new Promise((resolve) => {
        this.plugin.rcpt_to_access(
          (rc) => {
            cb(rc)
            resolve()
          },
          this.connection,
          [new Address('<user@example.com>')],
        )
      }),
      new Promise((resolve) => {
        this.plugin.rcpt_to_access(
          (rc) => {
            cb(rc)
            resolve()
          },
          this.connection,
          [new Address('<USER@example.com>')],
        )
      }),
    ])
  })

  it('whitelisted addr, accept enabled', async function () {
    const cb = function (rc) {
      assert.equal(OK, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
    }.bind(this)
    this.plugin.cfg.rcpt.accept = true
    this.plugin.list.white.rcpt['user@example.com'] = true
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('regex whitelisted addr, accept enabled', async function () {
    const cb = function (rc) {
      assert.equal(OK, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
    }.bind(this)
    this.plugin.cfg.rcpt.accept = true
    this.plugin.list_re.white.rcpt = new RegExp(`^user@example.com$`, 'i')
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blacklisted addr', async function () {
    const cb = function (rc) {
      assert.equal(DENY, rc)
      assert.ok(this.connection.transaction.results.get('access').fail.length)
    }.bind(this)
    this.plugin.list.black.rcpt['user@badmail.com'] = true
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<user@badmail.com>')],
      )
    })
  })

  it('blacklisted domain', async function () {
    const cb = function (rc) {
      assert.equal(DENY, rc)
      assert.ok(this.connection.transaction.results.get('access').fail.length)
    }.bind(this)
    const black = ['.*@spam.com']
    this.plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<bad@spam.com>')],
      )
    })
  })

  it('blacklisted domain, white addr', async function () {
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
    }.bind(this)
    this.plugin.list.white.rcpt['special@spam.com'] = true
    const black = ['.*@spam.com']
    this.plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          cb(rc)
          resolve()
        },
        this.connection,
        [new Address('<special@spam.com>')],
      )
    })
  })

  it('returns next() when check.rcpt is false', async function () {
    this.plugin.cfg.check.rcpt = false
    await new Promise((resolve) => {
      this.plugin.rcpt_to_access(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        this.connection,
        [new Address('<user@example.com>')],
      )
    })
  })
})
