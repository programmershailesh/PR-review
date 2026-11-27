# FBI CJIS Security Policy: code review checklist

Source: U.S. Department of Justice, Federal Bureau of Investigation, Criminal Justice Information Services (CJIS) Division, CJIS Security Policy, Version 6.1 (June 2026), https://le.fbi.gov/cjis-division/cjis-security-policy-resource-center. The checks below are written in our own words. The IDs are the control identifiers used in the policy since its modernisation in Version 6.0 (27 December 2024), which follows the NIST control families (for example AC-2), so a finding can be traced back to the official text. The control IDs were checked against the Version 6.0 text. Version 6.1 was not read in full, so a person should confirm that a cited control is unchanged there. Audit baselines differ between states, so the CJIS Systems Agency decides which version applies to a given agency.

The policy protects Criminal Justice Information (CJI), including criminal history records and data from FBI systems, held or handled by criminal justice agencies and their contractors. Many requirements are about agreements, personnel screening and physical sites. The checks below are the ones whose evidence shows up in code, configuration and pipelines.

## When this applies

Apply these checks to changes in systems that store, process, send or display CJI, or that control access to systems that do. Signs of this include criminal history, NCIC or state records queries, warrants, fingerprints and records management, dispatch or case systems, and CJIS audit or agency identifiers (ORI).

If the change doesn't touch CJI or the systems that protect it, report this standard as `not_applicable`.

## Checks

### [CJIS AC-2] Accounts are managed, and unused accounts can be removed
Look for: shared or generic accounts, accounts created with no owner or expiry, no way to disable a user quickly, or default accounts left active. Code that creates privileged accounts automatically. Service accounts with human sign-in.
Decided from code: partly. Account approval and review are processes outside the repository.

### [CJIS AC-3] Access to CJI is enforced by the system
Look for: endpoints or queries that return CJI without checking that the caller is permitted to see that record. Checks made only in the user interface. Record IDs taken from the request and used with no ownership or role check. Public read access to storage that holds CJI.
Decided from code: yes.

### [CJIS AC-6] Users and services get only the access they need
Look for: wildcard permissions, broad database or cloud roles, and administrator rights for ordinary features. New code that runs as root or administrator without a need. Roles that combine unrelated rights.
Decided from code: partly. Which person holds which role is decided outside the repository.

### [CJIS AC-7] Repeated failed sign-ins are limited
Look for: sign-in or token endpoints with no lockout, delay or rate limit after repeated failures. Lockout thresholds raised to very high values or removed. Different error messages that reveal whether a user exists.
Decided from code: yes, for checks done in the application.

### [CJIS AC-12] Idle and ended sessions are terminated
Look for: sessions or tokens that never expire, refresh tokens with no limit, "remember me" turned on by default for screens showing CJI, or logout that doesn't invalidate the session on the server.
Decided from code: partly. The chosen timeout may be set outside the repository.

### [CJIS AU-2] Security-relevant events are logged
Look for: sign-ins and failures, access to CJI, permission and account changes, exports and administrative actions that write no audit event. Logging turned off, sampled or shortened by a change.
Decided from code: yes, for events produced in code.

### [CJIS AU-3] Each audit record says what happened, when, where and who
Look for: audit events without a timestamp, user or service identity, source address, the record or object touched, or the outcome. Free-text messages that can't be parsed or searched.
Decided from code: yes.

### [CJIS AU-9] Audit logs are protected from tampering and deletion
Look for: audit logs the application itself can edit or delete, logs stored where ordinary users can write, and log settings that let any administrator disable auditing. Logs sent to storage with delete rights for the same service. Sensitive data such as full CJI or passwords written into logs.
Decided from code: partly. Protection of the log store may sit outside the repository.

### [CJIS IA-2] Users are identified and authenticated, with multi-factor authentication where required
Look for: sign-in flows that skip authentication for CJI access, or that need only a password where the policy requires an extra factor. MFA made optional, or bypassed for test users or "trusted" networks in a way that also works in production.
Decided from code: partly. Identity provider and MFA settings may live outside the repository.

### [CJIS IA-5] Authenticators are strong and stored safely
Look for: passwords stored in plain text or with fast hashes (MD5, SHA-1) instead of a slow, salted algorithm. Minimum length lowered, password checks removed, default passwords, or secrets and API keys committed to code. Passwords written to logs or sent in URLs.
Not a breach: placeholder secrets in examples and tests that can't reach real systems.
Decided from code: yes.

### [CJIS SC-8] CJI is protected while it is sent
Look for: CJI sent over plain HTTP or other unencrypted connections, including between internal services and to databases. Certificate or hostname checks turned off. Old protocol versions or weak ciphers allowed. CJI in URLs or in email bodies.
Decided from code: yes.

### [CJIS SC-12] Cryptographic keys are created and managed safely
Look for: keys, salts or initialisation vectors hard-coded or committed. Keys stored next to the data they protect, one key shared across environments, or no way to replace a key.
Acceptable: keys loaded from a key management service or secret store at run time.
Decided from code: partly. Key custody and rotation are often handled outside the repository.

### [CJIS SC-13] Approved cryptography is used
Look for: home-made encryption, deprecated algorithms (DES, RC4, MD5 or SHA-1 for protecting data), or libraries and modes that aren't FIPS-validated where the policy needs them. FIPS mode turned off in runtime or image settings.
Decided from code: partly. Code shows the algorithm and library. Whether a module holds a current validation must be checked by a person.

### [CJIS SC-28] CJI is protected while it is stored
Look for: new tables, columns, files, caches, queues, backups or buckets that hold CJI without encryption at rest. Encryption turned off in infrastructure files. Unencrypted exports or temporary files containing CJI.
Acceptable: disk or database encryption managed by the platform, and field-level encryption with keys from a key management service.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [CJIS SI-2] Flaws are found and fixed promptly
Look for: dependencies, images or runtimes at versions with known vulnerabilities or past end of life. Automated update or dependency scanning tools removed. Security fixes held back with no reason.
Decided from code: partly. Patching speed is a matter of process outside the repository.

### [CJIS SI-10] Input is validated
Look for: request data, file uploads and query parameters used without checks of type, length and format. Output not encoded for where it goes (HTML, SQL, shell). Injection, path traversal and unsafe deserialisation in code that handles CJI queries.
Decided from code: yes.
