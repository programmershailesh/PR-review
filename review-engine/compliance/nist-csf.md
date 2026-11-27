# NIST Cybersecurity Framework 2.0: code review checklist

Source: NIST, The NIST Cybersecurity Framework (CSF) 2.0, NIST CSWP 29 (February 2024), https://www.nist.gov/cyberframework. The checks below are written in our own words. The IDs are the CSF's subcategory IDs, so a finding can be traced back to the official text.

The CSF is a set of outcomes, not a list of technical rules. It groups them into Govern (GV), Identify (ID), Protect (PR), Detect (DE), Respond (RS) and Recover (RC). Most subcategories are about policy, people and process. The checks below are the ones whose evidence can show up in code, configuration, dependencies or pipelines.

## When this applies

Apply these checks to changes in application code, dependencies and lockfiles, infrastructure and deployment configuration, CI/CD pipelines, and security features such as sign-in, permissions, encryption and logging.

The CSF says what outcome to reach, not how, so judge each check against the project's own guidelines where it has them. If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [NIST CSF ID.AM-02] Software and services in use are inventoried
Look for: new dependencies, containers, SaaS integrations or services that don't appear in the project's lockfile, manifest, SBOM or service list. Dependencies installed at build or run time outside the lockfile. Lockfiles deleted or ignored.
Decided from code: partly. The full organisational inventory is outside the repository, so judge what the repository records.

### [NIST CSF GV.SC-07] Risks from suppliers and third-party components are assessed
Look for: new third-party packages, images, actions or APIs with no sign of vetting: abandoned or tiny packages, install scripts, unknown publishers, typosquat-like names, or a vendor SDK that gets broad access to user data.
Not a breach: well-known, maintained packages from an established publisher.
Decided from code: partly. A vendor risk review is a process step, so say what a person should check.

### [NIST CSF ID.RA-01] Vulnerabilities in assets are found and recorded
Look for: changes that remove or skip dependency scanning, SAST, container or IaC scanning in the pipeline. Scan failures set to ignore. Known-vulnerable versions of dependencies added or pinned back. Suppressions without a reason or an expiry.
Decided from code: yes, for the scanning set up in the repository.

### [NIST CSF ID.RA-09] Software is checked for authenticity and integrity before use
Look for: downloads piped into a shell, binaries or archives fetched without a checksum or signature check, dependencies from unofficial registries or git branches, container images pulled by mutable tag, checksum verification removed.
Acceptable: lockfile integrity hashes, digest-pinned images, verified signatures or provenance.
Decided from code: yes.

### [NIST CSF PR.AA-01] Identities and credentials are managed
Look for: shared or generic accounts, credentials committed to the repository or baked into images, long-lived static keys where short-lived credentials are available, service accounts with no clear owner, default accounts left enabled.
Decided from code: yes, for what the repository creates or configures.

### [NIST CSF PR.AA-03] Users, services and devices are authenticated
Look for: new endpoints, jobs, webhooks or service-to-service calls with no authentication. Authentication that can be bypassed by a header, a debug flag or a different route. Multi-factor authentication removed or made optional for sensitive actions.
Decided from code: yes.

### [NIST CSF PR.AA-04] Identity assertions are protected and verified
Look for: tokens, JWTs, SAML responses or session IDs accepted without checking signature, issuer, audience and expiry. Algorithm set to `none` or chosen by the token. Tokens placed in URLs or logs. Callbacks and redirects that skip state or nonce checks.
Decided from code: yes.

### [NIST CSF PR.AA-05] Permissions follow least privilege and are enforced
Look for: new routes or queries that return or change data without a role or ownership check. Broad roles such as admin or wildcard IAM actions where a narrow one would do. Authorisation checked only in the client. Permissions granted by default.
Decided from code: yes, for checks done in code or declared in infrastructure files.

### [NIST CSF PR.DS-01] Data at rest is protected
Look for: new tables, files, caches, queues or buckets holding sensitive data without encryption, or with encryption turned off. Keys stored next to the data. Public or world-readable storage. Sensitive data kept in plain text where hashing or encryption is the norm.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [NIST CSF PR.DS-02] Data in transit is protected
Look for: plain HTTP, FTP or unencrypted database and queue connections. TLS verification disabled (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify`). Old protocol versions allowed. Sensitive data in URL query strings.
Decided from code: yes, for what the code configures.

### [NIST CSF PR.DS-10] Data in use is protected
Look for: sensitive data written to logs, error messages, crash reports, analytics or debug output. Secrets or personal data kept in long-lived memory, global caches or client-side storage when a shorter life would work. Sensitive values returned to the client that the screen doesn't need.
Decided from code: yes, for what the code exposes.

### [NIST CSF PR.DS-11] Backups are created, protected and tested
Look for: new data stores with no backup or snapshot configuration where the project backs up similar data. Backups left unencrypted or public. Retention or backup jobs removed. Migrations that drop data with no backup step.
Decided from code: partly. Restore testing happens outside the repository.

### [NIST CSF PR.PS-01] Configuration baselines are set and kept
Look for: insecure defaults added to configuration or infrastructure files: debug mode on, open ports, permissive CORS, default passwords, admin consoles exposed, containers running as root or privileged. Manual changes that bypass the infrastructure-as-code files.
Decided from code: yes, for configuration kept in the repository.

### [NIST CSF PR.PS-02] Software is kept maintained and unsupported software is removed
Look for: end-of-life runtimes, base images or frameworks added or pinned back. Dependencies that are archived or unmaintained. Automated update tooling removed. Pinned versions with a known fixed release available.
Decided from code: yes.

### [NIST CSF PR.PS-04] Log records are generated for monitoring
Look for: security-relevant actions (sign-in, permission changes, data export, admin actions, failures) that write no log event. Logs that leave out who, what, when or the outcome. Logging turned off, sampled or sent nowhere. Secrets or personal data written into logs.
Decided from code: yes.

### [NIST CSF PR.PS-06] Secure development practices are built into the workflow
Look for: changes that weaken the pipeline: tests, linters, type checks or security scans removed or made non-blocking, branch protection or review requirements bypassed in workflow files, new code paths with no tests for security-relevant behaviour.
Decided from code: partly. Review and training practices are outside the repository.

### [NIST CSF PR.IR-01] Networks and environments are protected from unauthorised access
Look for: security groups, firewall rules, ingress or network policies open to the whole internet (`0.0.0.0/0`) for databases, admin ports or internal services. Production and test environments sharing credentials or networks. Services bound to all interfaces without need.
Decided from code: yes, for infrastructure files in the repository.

### [NIST CSF DE.CM-09] Software and runtime environments are monitored for adverse events
Look for: removal of health checks, error reporting, runtime security agents or alert rules. New services deployed without the monitoring and alerting the project uses elsewhere. Errors that are swallowed so failures go unnoticed.
Decided from code: partly. Who responds to alerts is outside the repository.
