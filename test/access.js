'use strict'

const assert = require('assert')
const path = require('path')

const Address = require('address-rfc2821').Address
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
    // console.log(this.plugin.config.root_path);
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
    // console.log(this.plugin.temp);
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

  it('no list', function (done) {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    this.plugin.rdns_access((rc) => {
      // console.log(this.connection.results.get('access'));
      assert.equal(undefined, rc)
      assert.ok(this.connection.results.get('access').msg.length)
      done()
    }, this.connection)
  })

  it('whitelist', function (done) {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    this.plugin.list.white.conn['host.example.com'] = true
    this.plugin.rdns_access((rc) => {
      assert.equal(undefined, rc)
      assert.ok(this.connection.results.get('access').pass.length)
      // assert.ok(this.connection.results.has('access', 'pass', /white/));
      done()
    }, this.connection)
  })

  it('blacklist', function (done) {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.example.com'
    this.plugin.list.black.conn['host.example.com'] = true
    this.plugin.rdns_access((rc, msg) => {
      assert.equal(DENYDISCONNECT, rc)
      assert.equal(
        'host.example.com [1.1.1.1] You are not allowed to connect',
        msg,
      )
      assert.ok(this.connection.results.get('access').fail.length)
      done()
    }, this.connection)
  })

  it('blacklist regex', function (done) {
    this.connection.remote.ip = '1.1.1.1'
    this.connection.remote.host = 'host.antispam.com'
    const black = ['.*spam.com']
    this.plugin.list_re.black.conn = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.rdns_access((rc, msg) => {
      assert.equal(DENYDISCONNECT, rc)
      assert.equal(
        'host.antispam.com [1.1.1.1] You are not allowed to connect',
        msg,
      )
      assert.ok(this.connection.results.get('access').fail.length)
      done()
    }, this.connection)
  })
})

describe('helo_access', function () {
  beforeEach(function () {
    this.plugin = new fixtures.plugin('access')
    this.plugin.config = this.plugin.config.module_config(
      path.resolve(__dirname),
    )
    this.plugin.register()
    this.connection = fixtures.connection.createConnection()
  })

  it('no list', function (done) {
    this.plugin.cfg.check.helo = true
    this.plugin.helo_access(
      (rc) => {
        const r = this.connection.results.get('access')
        assert.equal(undefined, rc)
        assert.ok(r && r.msg && r.msg.length)
        done()
      },
      this.connection,
      'host.example.com',
    )
  })

  it('blacklisted regex', function (done) {
    const black = ['.*spam.com']
    this.plugin.list_re.black.helo = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.cfg.check.helo = true
    this.plugin.helo_access(
      (rc) => {
        assert.equal(DENY, rc)
        const r = this.connection.results.get('access')
        assert.ok(r && r.fail && r.fail.length)
        done()
      },
      this.connection,
      'bad.spam.com',
    )
  })
})

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

  it('no lists populated', function (done) {
    this.plugin.mail_from_access(
      (rc) => {
        assert.equal(undefined, rc)
        assert.ok(this.connection.transaction.results.get('access').msg.length)
        done()
      },
      this.connection,
      [new Address('<list@unknown.com>')],
    )
  })

  it('whitelisted addr', function (done) {
    this.plugin.list.white.mail['list@harakamail.com'] = true
    this.plugin.mail_from_access(
      (rc) => {
        assert.equal(undefined, rc)
        assert.ok(this.connection.transaction.results.get('access').pass.length)
        done()
      },
      this.connection,
      [new Address('<list@harakamail.com>')],
    )
  })

  it('blacklisted addr', function (done) {
    this.plugin.list.black.mail['list@badmail.com'] = true
    this.plugin.mail_from_access(
      (rc) => {
        assert.equal(DENY, rc)
        assert.ok(this.connection.transaction.results.get('access').fail.length)
        done()
      },
      this.connection,
      [new Address('<list@badmail.com>')],
    )
  })

  it('blacklisted domain', function (done) {
    const black = ['.*@spam.com']
    this.plugin.list_re.black.mail = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.mail_from_access(
      (rc) => {
        assert.equal(DENY, rc)
        assert.ok(this.connection.transaction.results.get('access').fail.length)
        done()
      },
      this.connection,
      [new Address('<bad@spam.com>')],
    )
  })

  it('blacklisted domain, white addr', function (done) {
    this.plugin.list.white.mail['special@spam.com'] = true
    const black = ['.*@spam.com']
    this.plugin.list_re.black.mail = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.mail_from_access(
      (rc) => {
        assert.equal(undefined, rc)
        assert.ok(this.connection.transaction.results.get('access').pass.length)
        done()
      },
      this.connection,
      [new Address('<special@spam.com>')],
    )
  })
})

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

  it('no lists populated', function (done) {
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').msg.length)
      done()
    }.bind(this)
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<user@example.com>'),
    ])
  })

  it('whitelisted addr', function (done) {
    let calls = 0
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
      if (++calls == 2) {
        done()
      }
    }.bind(this)
    this.plugin.list.white.rcpt['user@example.com'] = true
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<user@example.com>'),
    ])
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<USER@example.com>'),
    ])
  })

  it('whitelisted addr, accept enabled', function (done) {
    const cb = function (rc) {
      assert.equal(OK, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
      done()
    }.bind(this)
    this.plugin.cfg.rcpt.accept = true
    this.plugin.list.white.rcpt['user@example.com'] = true
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<user@example.com>'),
    ])
  })

  it('regex whitelisted addr, accept enabled', function (done) {
    const cb = function (rc) {
      assert.equal(OK, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
      done()
    }.bind(this)
    this.plugin.cfg.rcpt.accept = true
    this.plugin.list_re.white.rcpt = new RegExp(`^user@example.com$`, 'i')
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<user@example.com>'),
    ])
  })

  it('blacklisted addr', function (done) {
    const cb = function (rc) {
      assert.equal(DENY, rc)
      assert.ok(this.connection.transaction.results.get('access').fail.length)
      done()
    }.bind(this)
    this.plugin.list.black.rcpt['user@badmail.com'] = true
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<user@badmail.com>'),
    ])
  })

  it('blacklisted domain', function (done) {
    const cb = function (rc) {
      assert.equal(DENY, rc)
      assert.ok(this.connection.transaction.results.get('access').fail.length)
      done()
    }.bind(this)
    const black = ['.*@spam.com']
    this.plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<bad@spam.com>'),
    ])
  })

  it('blacklisted domain, white addr', function (done) {
    const cb = function (rc) {
      assert.equal(undefined, rc)
      assert.ok(this.connection.transaction.results.get('access').pass.length)
      done()
    }.bind(this)
    this.plugin.list.white.rcpt['special@spam.com'] = true
    const black = ['.*@spam.com']
    this.plugin.list_re.black.rcpt = new RegExp(`^(${black.join('|')})$`, 'i')
    this.plugin.rcpt_to_access(cb, this.connection, [
      new Address('<special@spam.com>'),
    ])
  })
})
