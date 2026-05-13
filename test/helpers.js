'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const fixtures = require('haraka-test-fixtures')

describe('in_list', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('../index')
  })

  it('white, mail', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { white: { mail: 'test no file' } }
    plugin.list = { white: { mail: list } }
    assert.equal(true, plugin.in_list('white', 'mail', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('white', 'mail', 'matt@example.com'))
    assert.equal(false, plugin.in_list('white', 'mail', 'matt@non-exist'))
  })

  it('white, mail, case', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { white: { mail: 'test no file' } }
    plugin.list = { white: { mail: list } }
    assert.equal(true, plugin.in_list('white', 'mail', 'MATT@exam.ple'))
  })

  it('white, rcpt', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { re: { white: { rcpt: 'test file name' } } }
    plugin.list = { white: { rcpt: list } }
    assert.equal(true, plugin.in_list('white', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('white', 'rcpt', 'matt@example.com'))
    assert.equal(false, plugin.in_list('white', 'rcpt', 'matt@non-exist'))
  })

  it('white, helo', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { re: { white: { helo: 'test file name' } } }
    plugin.list = { white: { helo: list } }
    assert.equal(true, plugin.in_list('white', 'helo', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('white', 'helo', 'matt@example.com'))
    assert.equal(false, plugin.in_list('white', 'helo', 'matt@non-exist'))
  })

  it('black, mail', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { re: { black: { mail: 'test file name' } } }
    plugin.list = { black: { mail: list } }
    assert.equal(true, plugin.in_list('black', 'mail', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('black', 'mail', 'matt@example.com'))
    assert.equal(false, plugin.in_list('black', 'mail', 'matt@non-exist'))
  })

  it('black, rcpt', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { re: { black: { rcpt: 'test file name' } } }
    plugin.list = { black: { rcpt: list } }
    assert.equal(true, plugin.in_list('black', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('black', 'rcpt', 'matt@example.com'))
    assert.equal(false, plugin.in_list('black', 'rcpt', 'matt@non-exist'))
  })

  it('black, helo', () => {
    const list = { 'matt@exam.ple': true, 'matt@example.com': true }
    plugin.cfg = { re: { black: { helo: 'test file name' } } }
    plugin.list = { black: { helo: list } }
    assert.equal(true, plugin.in_list('black', 'helo', 'matt@exam.ple'))
    assert.equal(true, plugin.in_list('black', 'helo', 'matt@example.com'))
    assert.equal(false, plugin.in_list('black', 'helo', 'matt@non-exist'))
  })

  it('returns false when phase is undefined', () => {
    plugin.cfg = { white: { mail: 'test' } }
    plugin.list = { white: { mail: {} } }
    assert.equal(
      false,
      plugin.in_list('white', 'bogus_phase', 'user@example.com'),
    )
  })

  it('returns false when address is empty', () => {
    plugin.cfg = { white: { mail: 'test' } }
    plugin.list = { white: { mail: {} } }
    assert.equal(false, plugin.in_list('white', 'mail', ''))
    assert.equal(false, plugin.in_list('white', 'mail', undefined))
  })
})

describe('in_re_list', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
  })

  it('white, mail', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { white: { mail: 'test file name' } } }
    plugin.list_re = {
      white: { mail: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('white', 'mail', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('white', 'mail', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('white', 'mail', 'matt@non-exist'))
  })

  it('white, rcpt', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { white: { rcpt: 'test file name' } } }
    plugin.list_re = {
      white: { rcpt: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('white', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('white', 'rcpt', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('white', 'rcpt', 'matt@non-exist'))
  })

  it('white, helo', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { white: { helo: 'test file name' } } }
    plugin.list_re = {
      white: { helo: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('white', 'helo', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('white', 'helo', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('white', 'helo', 'matt@non-exist'))
  })

  it('black, mail', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { black: { mail: 'test file name' } } }
    plugin.list_re = {
      black: { mail: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('black', 'mail', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('black', 'mail', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('black', 'mail', 'matt@non-exist'))
  })

  it('black, rcpt', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { black: { rcpt: 'test file name' } } }
    plugin.list_re = {
      black: { rcpt: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('black', 'rcpt', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('black', 'rcpt', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('black', 'rcpt', 'matt@non-exist'))
  })

  it('black, helo', () => {
    const list = ['.*exam.ple', '.*example.com']
    plugin.cfg = { re: { black: { helo: 'test file name' } } }
    plugin.list_re = {
      black: { helo: list.map((r) => new RegExp(`^(${r})$`, 'i')) },
    }
    assert.equal(true, plugin.in_re_list('black', 'helo', 'matt@exam.ple'))
    assert.equal(true, plugin.in_re_list('black', 'helo', 'matt@example.com'))
    assert.equal(false, plugin.in_re_list('black', 'helo', 'matt@non-exist'))
  })

  it('logs the matching regex pattern when list has entries', () => {
    // Regression: in_re_list was reading .source off the filename string
    // (cfg.re[type][phase]) instead of the compiled RegExp (list_re[type][phase]),
    // so the "empty file" debug fired on every check and a per-match debug
    // line was never produced.
    const logs = []
    plugin.cfg = {
      re: { white: { mail: 'mail_from.access.whitelist_regex' } },
    }
    plugin.list_re = {
      white: { mail: [new RegExp('^(.*@example\\.com)$', 'i')] },
    }
    plugin.logdebug = (msg) => logs.push(msg)

    plugin.in_re_list('white', 'mail', 'user@example.com')

    const joined = logs.join(' | ')
    assert.ok(
      logs.some((m) => m.startsWith('matched ') && m.includes('@example')),
      `expected a "matched" log line, got: ${joined}`,
    )
    assert.ok(
      !logs.some((m) => m.startsWith('empty file:')),
      `did not expect an "empty file" log line, got: ${joined}`,
    )
  })
})

describe('load_file', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
  })

  it('case normalizing', () => {
    plugin.load_file('white', 'rcpt')
    assert.equal(true, plugin.in_list('white', 'rcpt', 'admin2@example.com'))
    assert.equal(true, plugin.in_list('white', 'rcpt', 'admin2@example.com')) // was ADMIN2@EXAMPLE.com
    assert.equal(true, plugin.in_list('white', 'rcpt', 'admin1@example.com')) // was admin3@EXAMPLE.com
  })
})

describe('load_re_file', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
    plugin.config = plugin.config.module_config(path.resolve(__dirname))
    plugin.register()
  })

  it('whitelist', () => {
    plugin.load_re_file('white', 'mail')
    assert.ok(plugin.list_re)
    assert.equal(
      true,
      plugin.in_re_list('white', 'mail', 'list@harakamail.com'),
    )
    assert.equal(false, plugin.in_re_list('white', 'mail', 'list@harail.com'))
    assert.equal(false, plugin.in_re_list('white', 'mail', 'LIST@harail.com'))
  })
})
