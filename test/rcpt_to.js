'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

describe('rcpt_to_access', () => {
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
      plugin.rcpt_to_access(
        (rc) => {
          assert.equal(undefined, rc)
          assert.ok(connection.transaction.results.get('access').msg.length)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('whitelisted addr', async () => {
    plugin.list.white.rcpt['user@example.com'] = true
    const assertPass = (rc) => {
      assert.equal(undefined, rc)
      assert.ok(connection.transaction.results.get('access').pass.length)
    }
    await Promise.all([
      new Promise((resolve) => {
        plugin.rcpt_to_access(
          (rc) => {
            assertPass(rc)
            resolve()
          },
          connection,
          [new Address('<user@example.com>')],
        )
      }),
      new Promise((resolve) => {
        plugin.rcpt_to_access(
          (rc) => {
            assertPass(rc)
            resolve()
          },
          connection,
          [new Address('<USER@example.com>')],
        )
      }),
    ])
  })

  it('whitelisted addr, accept enabled', async () => {
    plugin.cfg.rcpt.accept = true
    plugin.list.white.rcpt['user@example.com'] = true
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
        (rc) => {
          assert.equal(OK, rc)
          assert.ok(connection.transaction.results.get('access').pass.length)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('regex whitelisted addr, accept enabled', async () => {
    plugin.cfg.rcpt.accept = true
    plugin.list_re.white.rcpt = new RegExp(`^user@example.com$`, 'i')
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
        (rc) => {
          assert.equal(OK, rc)
          assert.ok(connection.transaction.results.get('access').pass.length)
          resolve()
        },
        connection,
        [new Address('<user@example.com>')],
      )
    })
  })

  it('blacklisted addr', async () => {
    plugin.list.black.rcpt['user@badmail.com'] = true
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
        (rc) => {
          assert.equal(DENY, rc)
          assert.ok(connection.transaction.results.get('access').fail.length)
          resolve()
        },
        connection,
        [new Address('<user@badmail.com>')],
      )
    })
  })

  it('blacklisted domain', async () => {
    const black = ['.*@spam.com']
    plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
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
    plugin.list.white.rcpt['special@spam.com'] = true
    const black = ['.*@spam.com']
    plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
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

  it('returns next() when check.rcpt is false', async () => {
    plugin.cfg.check.rcpt = false
    await new Promise((resolve) => {
      plugin.rcpt_to_access(
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
