# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

### [1.1.10] - 2025-01-26

#### Added

- 

#### Fixed

- 

#### Changed

- 


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
[1.1.6]: https://github.com/haraka/haraka-plugin-access/releases/tag/1.1.6
[1.1.7]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.7
[1.1.4]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.4
[1.1.8]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.8
[1.1.9]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.9
[1.1.10]: https://github.com/haraka/haraka-plugin-access/releases/tag/v1.1.10
