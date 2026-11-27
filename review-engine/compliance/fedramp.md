# FedRAMP (Rev 5 baselines): code review checklist

Source: GSA, Federal Risk and Authorization Management Program (FedRAMP), Rev 5 Low, Moderate and High baselines, https://www.fedramp.gov/rev5/baselines/. The baselines are built on NIST SP 800-53 Rev. 5 (https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final), with FedRAMP's own parameter values and added requirements. The checks below are written in our own words. The IDs are the SP 800-53 control and enhancement IDs used by the baselines, so a finding can be traced back to the official text.

FedRAMP authorises cloud services for use by U.S. federal agencies. A cloud service provider documents how it meets each control in its baseline, and an assessor tests it. FedRAMP is also building a newer process (20x), but this checklist follows the Rev 5 baselines. Many controls are about policy, personnel and operations. The checks below are the controls whose evidence can show up in code, configuration, dependencies or pipelines.

## When this applies

Apply these checks to changed code that belongs to a cloud service inside, or planned for, a FedRAMP authorisation boundary: application code, dependencies and lockfiles, infrastructure and deployment configuration, CI/CD pipelines, and security features such as sign-in, permissions, cryptography and logging. Signs include a FedRAMP or GovCloud environment, federal customer data, FIPS mode settings, or a documented authorisation boundary.

Which controls apply, and the exact values (such as scan frequency or fix deadlines), depend on the baseline level (Low, Moderate or High) and FedRAMP's current parameters, so flag a missing mechanism and say a person must confirm the value. If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [FedRAMP SC-13] Cryptography uses FIPS-validated modules
Look for: encryption, hashing, signing or TLS done with a library that isn't in FIPS mode or has no FIPS 140 validation, home-written crypto, MD5, SHA-1, DES, RC4 or ECB mode. Build or runtime settings that turn FIPS mode off. Dependencies that bundle their own crypto and bypass the validated module.
Decided from code: partly. The module's certificate status must be confirmed on the CMVP site by a person.

### [FedRAMP SC-28(1)] Stored data is encrypted
Look for: new tables, files, caches, queues, snapshots or buckets holding federal or sensitive data without encryption at rest, or with it turned off. Keys stored beside the data. Public or broad read access to storage.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [FedRAMP SC-8(1)] Data in transit is encrypted
Look for: plain HTTP, FTP or unencrypted database, cache and queue connections, including between internal services. TLS verification disabled. Old protocol versions or weak cipher suites allowed.
Decided from code: yes.

### [FedRAMP AC-17(2)] Remote access is encrypted
Look for: administrative or maintenance access through plain Telnet, unencrypted remote desktop, unprotected database ports, or tunnels and bastion settings that skip encryption or authentication.
Decided from code: yes, for access paths defined in the repository.

### [FedRAMP IA-2(1)] Privileged accounts use multi-factor authentication
Look for: admin consoles, operator tools or privileged API paths that accept a password or key alone. Multi-factor authentication that can be bypassed with a flag, fallback or break-glass route with no audit.
Decided from code: partly. Multi-factor is often enforced by an identity provider outside the repository.

### [FedRAMP IA-2(2)] Non-privileged users use multi-factor authentication
Look for: sign-in flows for ordinary users that drop or make optional a second factor, or allow a fallback that skips it.
Decided from code: partly. This may be enforced by an identity provider outside the repository.

### [FedRAMP IA-5(1)] Password-based authentication is handled safely
Look for: passwords stored in plain text or with fast hashes (MD5, SHA-1, unsalted SHA-256) instead of bcrypt, scrypt, Argon2 or PBKDF2. Weak or removed password rules, no check against common passwords, reset tokens that are guessable or never expire, temporary passwords that stay valid.
Decided from code: yes.

### [FedRAMP IA-5(7)] No static authenticators are embedded in code
Look for: passwords, API keys, tokens or private keys in source files, scripts, images, pipeline files or configuration, including unencrypted values in environment files committed to the repository. Secrets read from a secret store at run time are the better design.
Decided from code: yes.

### [FedRAMP AC-6] Access follows least privilege
Look for: wildcard or admin-level IAM roles and actions, services with broad database or storage rights, tokens and scopes wider than needed, privileged functions open to ordinary roles, containers running as root.
Decided from code: yes, for what the code and infrastructure files grant.

### [FedRAMP AU-2] Security events are logged with the needed detail
Look for: sign-in and failures, permission changes, data export or deletion, admin actions and configuration changes with no audit event. Events missing the time, type, outcome, acting identity, source or affected object. Secrets or whole sensitive records written to logs.
Decided from code: yes.

### [FedRAMP AU-9] Audit logs are protected
Look for: logs the application can edit or delete, log storage with open permissions, logs shipped over an unencrypted channel, retention shortened or logging turned off in production.
Decided from code: partly. Storage permissions and retention may be set outside the repository.

### [FedRAMP CM-6] Configuration uses the hardened baseline
Look for: debug mode, verbose errors, default credentials, open admin interfaces, permissive CORS, disabled security headers, containers running privileged, or settings that differ from the project's hardening baseline in configuration that reaches production.
Decided from code: yes, for configuration in the repository.

### [FedRAMP CM-7(5)] Only approved software runs
Look for: runtime images with extra packages and tools, containers that can pull and run arbitrary code at start-up, install steps that fetch software from the internet at run time, allow-lists removed.
Decided from code: partly. The approved software list is kept by the organisation.

### [FedRAMP CM-8] Components are inventoried
Look for: dependencies, images or services added outside the manifest, lockfile or inventory the project keeps. Lockfiles deleted or ignored. No SBOM step where the project produces one.
Decided from code: partly. The full authorisation-boundary inventory is outside the repository.

### [FedRAMP SC-7(5)] Network traffic is denied by default
Look for: security groups, firewall rules and network policies open to the whole internet (`0.0.0.0/0`) for databases, admin ports or internal services. Allow-all egress where the project restricts it elsewhere. Services bound to all interfaces without need.
Decided from code: yes, for infrastructure files in the repository.

### [FedRAMP RA-5] Vulnerabilities in code, dependencies and images are scanned
Look for: scanning of code, dependencies, containers or infrastructure code removed from the pipeline, set to ignore failures, or skipped for the changed code. Suppressed findings with no reason or expiry.
Decided from code: partly. Scan frequency and the person who reviews results are outside the repository.

### [FedRAMP SI-2] Flaws are fixed in time
Look for: known-vulnerable dependencies, runtimes or base images added or pinned back. Automated update tools removed. Unmaintained packages with no replacement plan. Security patches reverted.
Decided from code: partly. FedRAMP's fix deadlines depend on severity and baseline, so say a person must confirm them.

### [FedRAMP SA-11(1)] Static code analysis is run
Look for: static analysis or security linters removed from the pipeline, made non-blocking, or skipped for the changed code. Security-relevant changes (authorisation, input handling, cryptography) with no tests.
Decided from code: yes, for the analysis set up in the repository.

### [FedRAMP SR-11] Components are checked for authenticity
Look for: downloads, plug-ins, actions or images used without checksum or signature verification, mutable image tags, dependencies from unofficial registries or git branches, lockfile integrity hashes removed.
Decided from code: yes.
