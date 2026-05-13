'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')

const fixtures = require('haraka-test-fixtures')

describe('in_list', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('../index')
  })

  it('white, mail', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { white: { mail: 'test no file' } }
    this.plugin.list = { white: { mail: list } }
    assert.equal(true, this.plugin.in_list('white', 'mail', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('white', 'mail', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('white', 'mail', 'matt@non-exist'))
  })

  it('white, mail, case', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { white: { mail: 'test no file' } }
    this.plugin.list = { white: { mail: list } }
    assert.equal(true, this.plugin.in_list('white', 'mail', 'MATT@exam.ple'))
  })

  it('white, rcpt', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { re: { white: { rcpt: 'test file name' } } }
    this.plugin.list = { white: { rcpt: list } }
    assert.equal(true, this.plugin.in_list('white', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('white', 'rcpt', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('white', 'rcpt', 'matt@non-exist'))
  })

  it('white, helo', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { re: { white: { helo: 'test file name' } } }
    this.plugin.list = { white: { helo: list } }
    assert.equal(true, this.plugin.in_list('white', 'helo', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('white', 'helo', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('white', 'helo', 'matt@non-exist'))
  })

  it('black, mail', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { re: { black: { mail: 'test file name' } } }
    this.plugin.list = { black: { mail: list } }
    assert.equal(true, this.plugin.in_list('black', 'mail', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('black', 'mail', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('black', 'mail', 'matt@non-exist'))
  })

  it('black, rcpt', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { re: { black: { rcpt: 'test file name' } } }
    this.plugin.list = { black: { rcpt: list } }
    assert.equal(true, this.plugin.in_list('black', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('black', 'rcpt', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('black', 'rcpt', 'matt@non-exist'))
  })

  it('black, helo', function () {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    this.plugin.cfg = { re: { black: { helo: 'test file name' } } }
    this.plugin.list = { black: { helo: list } }
    assert.equal(true, this.plugin.in_list('black', 'helo', 'matt@exam.ple'))
    assert.equal(true, this.plugin.in_list('black', 'helo', 'matt@example.com'))
    assert.equal(false, this.plugin.in_list('black', 'helo', 'matt@non-exist'))
  })

  it('returns false when phase is undefined', function () {
    this.plugin.cfg = { white: { mail: 'test' } }
    this.plugin.list = { white: { mail: {} } }
    assert.equal(
      false,
      this.plugin.in_list('white', 'bogus_phase', 'user@example.com'),
    )
  })

  it('returns false when address is empty', function () {
    this.plugin.cfg = { white: { mail: 'test' } }
    this.plugin.list = { white: { mail: {} } }
    assert.equal(false, this.plugin.in_list('white', 'mail', ''))
    assert.equal(false, this.plugin.in_list('white', 'mail', undefined))
  })
})

describe('in_re_list', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
  })

  it('white, mail', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { white: { mail: 'test file name' } } }
    this.plugin.list_re = {
      white: { mail: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('white', 'mail', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('white', 'mail', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('white', 'mail', 'matt@non-exist'),
    )
  })

  it('white, rcpt', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { white: { rcpt: 'test file name' } } }
    this.plugin.list_re = {
      white: { rcpt: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('white', 'rcpt', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('white', 'rcpt', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('white', 'rcpt', 'matt@non-exist'),
    )
  })

  it('white, helo', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { white: { helo: 'test file name' } } }
    this.plugin.list_re = {
      white: { helo: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('white', 'helo', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('white', 'helo', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('white', 'helo', 'matt@non-exist'),
    )
  })

  it('black, mail', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { black: { mail: 'test file name' } } }
    this.plugin.list_re = {
      black: { mail: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('black', 'mail', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('black', 'mail', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('black', 'mail', 'matt@non-exist'),
    )
  })

  it('black, rcpt', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { black: { rcpt: 'test file name' } } }
    this.plugin.list_re = {
      black: { rcpt: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('black', 'rcpt', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('black', 'rcpt', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('black', 'rcpt', 'matt@non-exist'),
    )
  })

  it('black, helo', function () {
    const list = ['.*exam.ple', '.*example.com']
    this.plugin.cfg = { re: { black: { helo: 'test file name' } } }
    this.plugin.list_re = {
      black: { helo: new RegExp(`^(${list.join('|')})$`, 'i') },
    }
    assert.equal(true, this.plugin.in_re_list('black', 'helo', 'matt@exam.ple'))
    assert.equal(
      true,
      this.plugin.in_re_list('black', 'helo', 'matt@example.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('black', 'helo', 'matt@non-exist'),
    )
  })

  it('logs "checking" message with the regex pattern when list has entries', function () {
    // Regression: in_re_list was reading .source off the filename string
    // (cfg.re[type][phase]) instead of the compiled RegExp (list_re[type][phase]),
    // so the "empty file" debug fired on every check and the "checking" debug
    // never did.
    const logs = []
    this.plugin.cfg = {
      re: { white: { mail: 'mail_from.access.whitelist_regex' } },
    }
    this.plugin.list_re = {
      white: { mail: new RegExp('^(.*@example\\.com)$', 'i') },
    }
    this.plugin.logdebug = (msg) => logs.push(msg)

    this.plugin.in_re_list('white', 'mail', 'user@example.com')

    const joined = logs.join(' | ')
    assert.ok(
      logs.some((m) => m.startsWith('checking ') && m.includes('@example')),
      `expected a "checking" log line, got: ${joined}`,
    )
    assert.ok(
      !logs.some((m) => m.startsWith('empty file:')),
      `did not expect an "empty file" log line, got: ${joined}`,
    )
  })
})

describe('load_file', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
  })

  it('case normalizing', function () {
    this.plugin.load_file('white', 'rcpt')
    assert.equal(
      true,
      this.plugin.in_list('white', 'rcpt', 'admin2@example.com'),
    )
    assert.equal(
      true,
      this.plugin.in_list('white', 'rcpt', 'admin2@example.com'),
    ) // was ADMIN2@EXAMPLE.com
    assert.equal(
      true,
      this.plugin.in_list('white', 'rcpt', 'admin1@example.com'),
    ) // was admin3@EXAMPLE.com
  })
})

describe('load_re_file', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
  })

  it('whitelist', function () {
    this.plugin.load_re_file('white', 'mail')
    assert.ok(this.plugin.list_re)
    assert.equal(
      true,
      this.plugin.in_re_list('white', 'mail', 'list@harakamail.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('white', 'mail', 'list@harail.com'),
    )
    assert.equal(
      false,
      this.plugin.in_re_list('white', 'mail', 'LIST@harail.com'),
    )
  })
})
