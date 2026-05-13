'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

describe('mail_from_access', () => {
  let plugin
  let connection
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
    connection = fixtures.connection.createConnection()
    connection.init_transaction()
  })

  it('no lists populated', async () => {
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(connection.transaction.results.get('access').msg.length)
          resolve()
        },
        connection,
        [new Address('<list@unknown.com>')],
      )
    })
  })

  it('whitelisted addr', async () => {
    plugin.list.white.mail['list@harakamail.com'] = true
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(connection.transaction.results.get('access').pass.length)
          resolve()
        },
        connection,
        [new Address('<list@harakamail.com>')],
      )
    })
  })

  it('blacklisted addr', async () => {
    plugin.list.black.mail['list@badmail.com'] = true
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(DENY, rc)
          assert.ok(connection.transaction.results.get('access').fail.length)
          resolve()
        },
        connection,
        [new Address('<list@badmail.com>')],
      )
    })
  })

  it('blacklisted domain', async () => {
    const black = ['.*@spam.com']
    plugin.list_re.black.mail = black.map((r) => new RegExp(`^(${r})$`, 'i'))
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(DENY, rc)
          assert.ok(connection.transaction.results.get('access').fail.length)
          resolve()
        },
        connection,
        [new Address('<bad@spam.com>')],
      )
    })
  })

  it('blacklisted domain, white addr', async () => {
    plugin.list.white.mail['special@spam.com'] = true
    const black = ['.*@spam.com']
    plugin.list_re.black.mail = black.map((r) => new RegExp(`^(${r})$`, 'i'))
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(connection.transaction.results.get('access').pass.length)
          resolve()
        },
        connection,
        [new Address('<special@spam.com>')],
      )
    })
  })

  it('skips null sender', async () => {
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(rc, undefined)
          const r = connection.transaction.results.get('access')
          assert.ok(r.skip.length)
          resolve()
        },
        connection,
        [new Address('<>')],
      )
    })
  })

  it('skips when params are missing', async () => {
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(rc, undefined)
          const r = connection.transaction.results.get('access')
          assert.ok(r.skip.length)
          resolve()
        },
        connection,
        [],
      )
    })
  })

  it('returns next() when check.mail is false', async () => {
    plugin.cfg.check.mail = false
    await new Promise((resolve) => {
      plugin.mail_from_access(
        (rc) => {
          assert.equal(rc, undefined)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })
})
