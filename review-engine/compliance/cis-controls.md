# CIS Critical Security Controls v8.1: code review checklist

Source: Center for Internet Security, CIS Critical Security Controls Version 8.1 (June 2024), https://www.cisecurity.org/controls/v8-1. The checks below are written in our own words. The IDs are the safeguard numbers (control number, then safeguard), so a finding can be traced back to the official text.

The CIS Controls are 18 groups of practical safeguards, sorted into three Implementation Groups (IG1, IG2, IG3) by organisation size and risk. Most safeguards are about enterprise assets such as laptops, networks and processes. The checks below are the safeguards whose evidence can show up in code, configuration, dependencies or pipelines. Control 16, Application Software Security, is the closest match to code review.

## When this applies

Apply these checks to changes in application code, dependencies and lockfiles, infrastructure and deployment configuration, CI/CD pipelines, and security features such as sign-in, permissions, encryption and logging.

Which safeguards an organisation has adopted depends on its Implementation Group, so say so where a finding relies on a safeguard that is outside IG1. If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [CIS Safeguard 2.2] Only supported software is used
Look for: end-of-life runtimes, base images, frameworks or libraries added or pinned back. Dependencies that are archived or unmaintained. Update tooling removed.
Decided from code: yes, for what the repository declares.

### [CIS Safeguard 3.3] Data access is controlled
Look for: new endpoints, queries, exports, buckets or file shares holding sensitive data without access checks. Public or world-readable storage. Object IDs used with no ownership check.
Decided from code: yes, for checks and permissions declared in the repository.

### [CIS Safeguard 3.10] Sensitive data is encrypted in transit
Look for: plain HTTP, FTP or unencrypted database and queue connections. TLS verification disabled. Old protocol versions allowed. Sensitive data in URL query strings.
Decided from code: yes.

### [CIS Safeguard 3.11] Sensitive data is encrypted at rest
Look for: new tables, files, caches, queues or buckets with sensitive data and no encryption, or with it turned off. Keys stored next to the data they protect.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [CIS Safeguard 3.14] Access to sensitive data is logged
Look for: new ways to read, export or delete sensitive data that write no log event. Log events with no user, record or time. Sensitive values written into the log itself.
Not a breach: log events that store a record ID rather than the sensitive data.
Decided from code: yes.

### [CIS Safeguard 4.7] Default accounts are managed
Look for: default or vendor passwords, built-in admin accounts left enabled, sample users in seed data that reach production, hard-coded credentials in images or setup scripts.
Decided from code: yes.

### [CIS Safeguard 4.8] Unneeded services are off
Look for: containers or images with extra services, debug ports, admin consoles, sample apps or test endpoints enabled in production configuration. Packages and tools installed in runtime images that the app doesn't need.
Decided from code: yes, for what the repository builds and configures.

### [CIS Safeguard 5.2] Passwords are unique and strong
Look for: shared passwords across accounts or environments, hard-coded passwords, weak password rules or removed checks, passwords stored in plain text or with fast hashes (MD5, SHA-1, unsalted SHA-256) instead of bcrypt, scrypt, Argon2 or PBKDF2.
Decided from code: yes.

### [CIS Safeguard 6.3] Externally exposed apps require multi-factor authentication
Look for: sign-in flows on internet-facing applications that drop or make optional a second factor, or allow a fallback that skips it. Admin and single sign-on integrations that don't enforce it.
Decided from code: partly. Multi-factor authentication is often enforced by an identity provider outside the repository.

### [CIS Safeguard 6.8] Access follows defined roles
Look for: permissions checked by user name or ad-hoc flags instead of roles. New roles with broad rights. Wildcard permissions in policies. Features that mix admin and ordinary access.
Decided from code: yes, for roles and checks in the repository.

### [CIS Safeguard 8.2] Audit logs are collected
Look for: sign-in, permission changes, admin actions and configuration changes with no log event. Logging turned off or lowered in production. Logs written only to local files that vanish with the container.
Decided from code: yes, for events the code produces.

### [CIS Safeguard 16.4] Third-party components are inventoried
Look for: dependencies added outside the manifest or lockfile, lockfiles deleted or ignored, no SBOM step where the project produces one, vendored copies of libraries with no record of source or version.
Decided from code: yes.

### [CIS Safeguard 16.5] Third-party components are up to date and trusted
Look for: dependencies from unofficial registries, git branches or unknown publishers. Known-vulnerable versions added or pinned back. Unpinned versions, install scripts, or checksum and lockfile integrity removed. Packages that are abandoned.
Decided from code: yes.

### [CIS Safeguard 16.7] Hardened templates are used for application infrastructure
Look for: new images, servers, containers or cloud resources built from scratch instead of the project's hardened base or module. Hardening settings dropped, such as containers running as root, writable file systems or open security groups.
Decided from code: yes, for infrastructure files in the repository.

### [CIS Safeguard 16.8] Production and non-production are separate
Look for: test or development code using production databases, keys or endpoints. Shared secrets or accounts across environments. Production data copied into test fixtures, seed files or CI. Debug or test routes enabled in production builds.
Decided from code: yes.

### [CIS Safeguard 16.10] Secure design principles are applied
Look for: new features that skip the project's established patterns: no deny-by-default, no input validation at trust boundaries, trust placed in client-supplied values, no separation between privileged and ordinary functions, security checks implemented ad hoc in each handler.
Decided from code: partly. Design intent is a judgement, so describe what the code does.

### [CIS Safeguard 16.11] Vetted modules are used for security functions
Look for: hand-written cryptography, authentication, session handling, input sanitising or token code where the project or platform provides a maintained library or service.
Decided from code: yes.

### [CIS Safeguard 16.12] Code-level security checks are in place
Look for: static analysis, secret scanning, linters or dependency checks removed from the pipeline, made non-blocking, or skipped for the changed code. Security-relevant changes with no tests. Suppressed findings with no reason.
Decided from code: yes, for the checks set up in the repository.
