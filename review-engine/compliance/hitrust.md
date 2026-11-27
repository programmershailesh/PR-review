# HITRUST CSF: code review checklist

Source: HITRUST Alliance, HITRUST CSF version 11, control references numbered by category (for example 01.q), https://hitrustalliance.net/hitrust-csf. The control reference numbers come from HITRUST's published framework, which builds on ISO/IEC 27002 and maps to HIPAA, NIST and others. The checks below are written in our own words and cite control reference numbers only.

HITRUST CSF is a certifiable security and privacy framework, widely used for health data. A HITRUST assessment is scoped to a system and its requirement set, and the assessor decides what applies. Code review can only see the technical side of a few control references.

## When this applies

Apply these checks to changed code, configuration and pipelines of a system that is in, or is being prepared for, a HITRUST assessment, which in practice means systems that handle health, payment or other regulated data. Signs include HITRUST or HIPAA mentions in the repository, patient or claims data, and shared platform components used by those systems.

If the change touches no authentication, access, logging, encryption, data handling, build or release code, report this standard as `not_applicable`.

## Checks

### [HITRUST 01.c] Privileges are limited to what each role needs
Look for: new endpoints or jobs that run with admin rights when a narrower role would do. Wildcard permissions in IAM or role definitions. Role checks that grant access by default when a role is missing. Privilege escalation paths through user-editable role fields.
Decided from code: yes.

### [HITRUST 01.d] Passwords and secrets for users are handled safely
Look for: passwords stored in plain text or hashed with fast hashes such as MD5, SHA-1 or unsalted SHA-256 instead of bcrypt, scrypt, Argon2 or PBKDF2. Temporary passwords that don't expire or must not be changed. Passwords or reset tokens written to logs or sent in plain email.
Decided from code: yes.

### [HITRUST 01.q] Users are identified individually and authenticated, with stronger methods for sensitive access
Look for: shared logins, endpoints that serve sensitive data without authentication, multi-factor authentication removed or made optional for privileged or remote access, tokens accepted without signature or expiry checks.
Decided from code: yes.

### [HITRUST 01.r] The password system enforces quality and protects its own data
Look for: removed length or complexity checks, no lockout or rate limit on sign-in, password history disabled, passwords shown or transmitted in clear text, a credential store readable by the application's normal database user.
Acceptable: delegating sign-in to an identity provider that enforces these rules.
Decided from code: partly. Policy values may be set in the identity provider.

### [HITRUST 01.t] Idle sessions end
Look for: sessions or tokens with no idle timeout, a timeout removed or raised to days, refresh tokens that never expire, "remember me" on by default for screens that show sensitive data.
Decided from code: partly. Timeouts are often set outside the repository.

### [HITRUST 01.v] Access to information and application functions is restricted
Look for: queries or endpoints that return records without checking that the caller may see them, record IDs taken from the request without an ownership check, admin functions reachable by ordinary users, sensitive fields returned to roles that don't need them.
Decided from code: yes.

### [HITRUST 06.d] Covered information is protected as the organisation's privacy rules require
Look for: sensitive personal or health data written to logs, analytics, error tracking or test data. Fields collected without a purpose in the change. Exports or API responses that include more than the feature needs.
Decided from code: partly. Which data counts as covered, and the privacy rules themselves, are defined outside the repository.

### [HITRUST 09.m] Network exposure is limited and services are separated
Look for: databases, queues or admin panels open to the internet, wide-open security groups or firewall rules (`0.0.0.0/0` on non-web ports), no separation between production and non-production, services that trust any caller on the internal network.
Decided from code: partly. Infrastructure files show the intent, but live settings may differ.

### [HITRUST 09.s] Data sent between systems is protected
Look for: sensitive data sent over plain HTTP, FTP, SMTP or unencrypted queue connections. TLS verification turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`). Sensitive data in URL query strings. Partner endpoints or webhooks that accept data without verifying the sender.
Decided from code: yes, for what the code configures.

### [HITRUST 09.aa] Activity and security events are logged
Look for: new ways to view, change, delete or export sensitive data that write no audit event. Events that omit who acted, what, when and the result. Changes that turn off, sample or shorten audit logging. Failed sign-ins and authorisation failures that are not logged.
Not a breach: audit events that hold record IDs instead of the sensitive data itself.
Decided from code: yes.

### [HITRUST 09.ac] Log data is protected from change and exposure
Look for: audit logs the application can edit or delete, logs that contain passwords, tokens or sensitive records, logs written to a location every service can modify, no tamper protection where the project does this elsewhere.
Decided from code: partly. Retention and storage controls may sit in infrastructure outside the repository.

### [HITRUST 10.b] Input is validated
Look for: new inputs (request bodies, query strings, headers, file uploads, messages from other systems) used without type, length, range or format checks. Queries built by string concatenation. Output rendered into pages without encoding.
Decided from code: yes.

### [HITRUST 10.f] Cryptography follows an approved policy
Look for: weak or home-made algorithms (MD5, SHA-1 for security, DES, RC4, ECB mode), fixed or reused IVs and nonces, `Math.random` or other non-cryptographic random for tokens and keys, TLS older than 1.2 allowed, encryption missing on new stores of sensitive data.
Decided from code: yes, for what the code uses. Which algorithms the policy approves is outside the repository.

### [HITRUST 10.g] Keys are managed through their life cycle
Look for: keys or secrets hard-coded, committed or kept next to the data they protect. No way to rotate a key without a code change. Keys shared between environments. Key material written to logs.
Acceptable: keys loaded at run time from a key management service or secrets manager.
Decided from code: partly. Rotation schedules and key custody sit outside the repository.

### [HITRUST 10.i] Test data does not expose real sensitive data
Look for: fixtures, seed scripts, database dumps or snapshots containing real names, record numbers or health data. Scripts that copy production data into test or development environments without masking.
Decided from code: yes, for what is in the repository and its scripts.

### [HITRUST 10.k] Changes go through controlled review and approval
Look for: changes that remove required review, status checks or approval steps from the pipeline, direct pushes to protected branches, deployment configuration that lets one person ship to production alone, migrations that run without a rollback path.
Decided from code: partly. Branch protection and approval records live in the hosting platform.

### [HITRUST 10.m] Known vulnerabilities in software are found and fixed
Look for: dependencies or base images with known serious vulnerabilities, vulnerability scanning removed from the pipeline, lock files not committed, pinned versions left on end-of-life releases.
Decided from code: partly. Scanning and patch timelines are usually run by a process outside the repository.
