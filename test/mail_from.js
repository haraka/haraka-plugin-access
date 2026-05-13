'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

describe('mail_from_access', function () {
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
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(
            this.connection.transaction.results.get('access').msg.length,
          )
          resolve()
        },
        this.connection,
        [new Address('<list@unknown.com>')],
      )
    })
  })

  it('whitelisted addr', async function () {
    this.plugin.list.white.mail['list@harakamail.com'] = true
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(
            this.connection.transaction.results.get('access').pass.length,
          )
          resolve()
        },
        this.connection,
        [new Address('<list@harakamail.com>')],
      )
    })
  })

  it('blacklisted addr', async function () {
    this.plugin.list.black.mail['list@badmail.com'] = true
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(DENY, rc)
          assert.ok(
            this.connection.transaction.results.get('access').fail.length,
          )
          resolve()
        },
        this.connection,
        [new Address('<list@badmail.com>')],
      )
    })
  })

  it('blacklisted domain', async function () {
    const black = ['.*@spam.com']
    this.plugin.list_re.black.mail = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(DENY, rc)
          assert.ok(
            this.connection.transaction.results.get('access').fail.length,
          )
          resolve()
        },
        this.connection,
        [new Address('<bad@spam.com>')],
      )
    })
  })

  it('blacklisted domain, white addr', async function () {
    this.plugin.list.white.mail['special@spam.com'] = true
    const black = ['.*@spam.com']
    this.plugin.list_re.black.mail = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(
            this.connection.transaction.results.get('access').pass.length,
          )
          resolve()
        },
        this.connection,
        [new Address('<special@spam.com>')],
      )
    })
  })

  it('skips null sender', async function () {
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
        (rc) => {
          assert.equal(rc, undefined)
          const r = this.connection.transaction.results.get('access')
          assert.ok(r.skip.length)
          resolve()
        },
        this.connection,
        [new Address('<>')],
      )
    })
  })

  it('returns next() when check.mail is false', async function () {
    this.plugin.cfg.check.mail = false
    await new Promise((resolve) => {
      this.plugin.mail_from_access(
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
