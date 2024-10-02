[![CI Tests][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]

[![NPM][npm-img]][npm-url]

# haraka-plugin-access - ACLs

This plugin applies Access Control Lists during the connect, helo, mail, and rcpt phases of the SMTP conversation. It has a split personality, supporting two somewhat different modes, **any** -vs- **precise**.

## ANY

The **any** check is premised on blocking a domain name no matter where in the SMTP conversation it appears. That's possible using several regex lists in the **precise** checks, but it's also much slower.

With **any**, just drop the offending domain name into the _access.domains_ file and it gets blocked for the rDNS hostname, the HELO hostname, the MAIL FROM domain name, and the RCPT TO domain name.

The **any** blacklist matches only on the [Organizational Domain](#Organizational Domain) name (see NOTES below). Entries placed in the _access.domains_ file are automatically reduced to the OD. Examples:

           ENTRY                  O.D.
    mail.spam-central.com  -> spam-central.com
    mail151.wayn.net       -> wayn.net

In case the O.D. match is too broad, whitelist entries are placed in the same _access.domains_ file with a ! prefix. Whitelist entries can be email addresses (for the MAIL FROM and RCPT TO tests) or hostnames for the rDNS and HELO hostnames. To block anything from example.com but not special.example.com:

    example.com
    !special.example.com

To block everything (supposedly) from aol.com, except messages from that one
person you know that still uses it:

    aol.com
    !friend@aol.com

### ANY results

When a whitelisted email or domain matches, a `pass` result will be saved with the hook name (ex: connect:any). When a blacklisted email or domain matches, a `fail` result of the same syntax is stored. If neither match, a `msg` result is saved (ex: unlisted(connect:any)).

### ANY data

In addition to checking for a domain in the envelope, ANY can also check in
the message headers as well. Settings 'data=true' in the [checks] section of
`config/access.ini` enables this. At present this only checks the From header.

## PRECISE

The precise ACLs share a common file format with each phase having a set of
4 files (whitelist, whitelist_regex, blacklist, and blacklist_regex) which
are simple lists.

The ACLs for each phase apply their tests in the order listed. The whitelist
is primarily to counter blacklist entries that match too much, so the the flow
of control is: if whitelisted, stop processing. Then apply the blacklist.

Entries in ACL files are one per line.

Regex entries are anchored, meaning '^' + regex + '$' are added automatically.
To bypass that, use a '.\*' at the start or the end of the regex. This should
help avoid overly permissive rules.

# Usage

To enable the **access** plugin, add an entry (access) to config/plugins. Then
add entries to the config files for the addresses or patterns to block.

## Upgrading

When upgrading from the rdns_access, mail_from.access, and rcpt_to.access
plugins, be sure to remove the plugins from config/plugins, upon pain of
wasted CPU cycles.

There is no need to modify your black/white lists.

If you just want the new plugin to work exactly like the old trio it replaces,
add this section to _config/access.ini_:

    [check]
    any=false
    conn=true
    helo=false
    mail=true
    rcpt=true

### Checking ACL results

To check access results from other plugins, use the standard _results_
methods.

```js
const ar = connection.results.get('access')
if (ar.pass.length > 2) {
  // they passed the connection and helo checks
}

const ar = connection.transaction.results.get('access')
if (ar.pass.length > 2) {
  // they passed the mail and rcpt checks
}
```

To determine which file(s) had matching entries, inspect the contents
of the pass/fail elements in the result object.

## Config Files

### access.ini

Each check can be enabled or disabled in the [check] section of access.ini:

```ini
[check]
any=true    (see below)
conn=false
helo=false
mail=false
rcpt=false

[rcpt]
accept=false  (see below)
```

A custom deny message can be configured for each SMTP phase:

```ini
[deny_msg]
conn=You are not allowed to connect
helo=That HELO is not allowed to connect
mail=That sender cannot send mail here
rcpt=That recipient is not allowed
```

## PRECISE ACLs

### Connect

The connect ACLs are evaluated against the IP address **and** the rDNS
hostname (if any) of the remote.

- connect.rdns_access.whitelist (pass)
- connect.rdns_access.whitelist_regex (pass)
- connect.rdns_access.blacklist (block)
- connect.rdns_access.blacklist_regex (block)

### MAIL FROM

- mail_from.access.whitelist (pass)
- mail_from.access.whitelist_regex (pass)
- mail_from.access.blacklist (block)
- mail_from.access.blacklist_regex (block)

### RCPT TO

- rcpt_to.access.whitelist (pass)
- rcpt_to.access.whitelist_regex (pass)
- rcpt_to.access.blacklist (block)
- rcpt_to.access.blacklist_regex (block)

## NOTES

### ANY performance

I did some performance testing of indexOf -vs- precompiled regex. In
a list of 3 items, where the matches were at the front of the list, regex
matches are 2x as slow. When the list grows to 30 entries, the regex
matches are 3x times as slow. When the matches are moved to the end of the
30 member list, the regex searches are over 100x slower than indexOf.

Based on this observation, reducing the domain name and doing an indexOf
search of an (even much longer) blacklist is _much_ faster than adding lists
of .\*domain.com entries to the \*\_regex files.

### rcpt accept mode

By default this plugin only rejects recipients on the blacklists, and ignores those on the whitelists. Setting `rcpt.accept=true` enables recipient validation for users in whitelists, actually accepting mails instead of only blocking unwanted recipients.

### Organizational Domain

The OD is a term that describes the highest level portion of domain name that is under the control of a private organization. Let's clarify a few terms:

#### TLD

Top Level Domains. Domain labels at the apex of a domain name.

    com
    net
    org
    co
    us
    uk

#### Public Suffix

The portion of a domain name that is operated by a registry. These are often synonymous with TLDs but frequently also include second and third level domains as well:

    com
    co.uk

The Organizational Domain is the next level higher than the Public Suffix. So if a hostname is _mail.example.com_, and _com_ is the Public Suffix, the OD is _example.com_. If the hostname is *www.bbc.co.uk*, the PS is _co.uk_ and the OD is _bbc.co.uk_.

<!-- leave these buried at the bottom of the document -->

[ci-img]: https://github.com/haraka/haraka-plugin-access/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-access/actions/workflows/ci.yml
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-access/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-access
[npm-img]: https://nodei.co/npm/haraka-plugin-access.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-access
