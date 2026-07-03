# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

- fix: tolerate both Address APIs; on Haraka <= 3.1.7 (address-rfc2821,
  .address is a method) the property read yielded a function, so list
  lookups never matched and in_list threw on .toLowerCase()
- test: refactored against test-fixtures 1.7.0

### [1.4.0] - 2026-05-28

- change: removed precise-mode HELO check; use helo.checks

### [1.3.0] - 2026-05-24

- dep(address-rfc282{1,2}): replaced with @haraka/email-address
- deps: bump versions

### [1.2.0] - 2026-05-12

- tests:
  - added lots of them
  - split tests into multiple files
  - switch runner to node:test
  - switch coverage reporter to node:test
- remove unnecessary done callbacks in synchronous tests (#40)
- deps: bumped all to latest
- feat: logdebug the matching regex when a match is found
- fix: in_re_list was reading .source off the filename string vs the compiled regex
- fix: removed the dead if (!this.list) blocks
- fix: removed the dead data_any guard checking
- fix: use Object.create(null) (vs `{}`) to prevent prototype pollution
- fix: consider NXDOMAIN as invalid remote.host
- change: use modern JS idioms to simplify code

### [1.1.10] - 2025-01-26

- code formatting with prettier
- dep(eslint): upgrade to v9

### [1.1.9] - 2024-11-18

- Fix hook registration for any access.domains #37

### [1.1.8] - 2024-11-06

- fix: Run rdns_access on connect hook, #35

### [1.1.7] - 2024-10-01

- index: updated this.logdebug syntax
- deps(all): bumped to latest
- run rdns_access on connect_init hook #32

### [1.1.6] - 2024-04-09

- register rdns_access on connect_init #28
- dep: update all versions and pin to latest
- dep: eslint-plugin-haraka -> @haraka/eslint-config
- lint: remove duplicate / stale rules from .eslintrc
- chore: populate [files] in package.json.
- chore: remove `const plugin = this` pattern (deprecated)
- chore: remove unused in_file and in_re_file
- test: remove `done` from sync tests

### [1.1.5] - 2022-06-06

- ci: use shared GHA workflows
- ci: add submodule .release
- ci: expand codeclimate config

### 1.1.4 - 2020-04-09

- wrap from parsing in a try #20

### 1.1.3 - 2018-11-16

- check if OD was found before attemping to use it

### 1.1.2 - 2018-11-10

- use header.get_decoded('from'), was get('from')

### 1.1.1 - 2018-06-09

- #9: make all mail address comparisons case insensitive, instead of the previously mixed behavior

### 1.1.0 - 2018-04-23

- #6: add rcpt.accept setting to enable recipient validation for users in whitelists (like an rcpt_to.\* plugin)

### 1.0.0 - 2017-06-29

- initial release

[1.1.5]: https://github.com/haraka/haraka-plugin-access/releases/tag/1.1.5
[1.1.6]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.6
[1.1.7]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.7
[1.1.4]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.4
[1.1.8]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.8
[1.1.9]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.9
[1.1.10]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.10
[1.2.0]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.2.0
[1.3.0]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.3.0
[1.4.0]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.4.0
