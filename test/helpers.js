'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const fixtures = require('haraka-test-fixtures')

const phases = ['mail', 'rcpt', 'helo']
const types = ['white', 'black']
const cases = types.flatMap((type) => phases.map((phase) => ({ type, phase })))

describe('in_list', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('../index')
  })

  for (const { type, phase } of cases) {
    it(`${type}, ${phase}`, () => {
      plugin.list = {
        [type]: {
          [phase]: { 'matt@exam.ple': true, 'matt@example.com': true },
        },
      }
      assert.equal(plugin.in_list(type, phase, 'matt@exam.ple'), true)
      assert.equal(plugin.in_list(type, phase, 'matt@example.com'), true)
      assert.equal(plugin.in_list(type, phase, 'matt@non-exist'), false)
    })
  }

  it('lowercases the address before lookup', () => {
    plugin.list = { white: { mail: { 'matt@exam.ple': true } } }
    assert.equal(plugin.in_list('white', 'mail', 'MATT@exam.ple'), true)
  })

  it('returns false when phase is undefined', () => {
    plugin.list = { white: { mail: {} } }
    assert.equal(
      plugin.in_list('white', 'bogus_phase', 'user@example.com'),
      false,
    )
  })

  it('returns false when address is empty', () => {
    plugin.list = { white: { mail: {} } }
    assert.equal(plugin.in_list('white', 'mail', ''), false)
    assert.equal(plugin.in_list('white', 'mail', undefined), false)
  })
})

describe('in_re_list', () => {
  let plugin
  beforeEach(() => {
    plugin = new fixtures.plugin('access')
  })

  const compile = (patterns) => patterns.map((r) => new RegExp(`^(${r})$`, 'i'))

  for (const { type, phase } of cases) {
    it(`${type}, ${phase}`, () => {
      plugin.list_re = {
        [type]: { [phase]: compile(['.*exam.ple', '.*example.com']) },
      }
      assert.equal(plugin.in_re_list(type, phase, 'matt@exam.ple'), true)
      assert.equal(plugin.in_re_list(type, phase, 'matt@example.com'), true)
      assert.equal(plugin.in_re_list(type, phase, 'matt@non-exist'), false)
    })
  }

  it('logs the matching regex pattern when list has entries', () => {
    // Regression: in_re_list was reading .source off the filename string
    // (cfg.re[type][phase]) instead of the compiled RegExp (list_re[type][phase]),
    // so the "empty file" debug fired on every check and a per-match debug
    // line was never produced.
    const logs = []
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
    assert.equal(plugin.in_list('white', 'rcpt', 'admin2@example.com'), true)
    assert.equal(plugin.in_list('white', 'rcpt', 'admin2@example.com'), true) // was ADMIN2@EXAMPLE.com
    assert.equal(plugin.in_list('white', 'rcpt', 'admin1@example.com'), true) // was admin3@EXAMPLE.com
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
      plugin.in_re_list('white', 'mail', 'list@harakamail.com'),
      true,
    )
    assert.equal(plugin.in_re_list('white', 'mail', 'list@harail.com'), false)
    assert.equal(plugin.in_re_list('white', 'mail', 'LIST@harail.com'), false)
  })
})
