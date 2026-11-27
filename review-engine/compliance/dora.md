# DORA: code review checklist

Source: Regulation (EU) 2022/2554 on digital operational resilience for the financial sector (DORA), https://eur-lex.europa.eu/eli/reg/2022/2554/oj, and Commission Delegated Regulation (EU) 2024/1774 on ICT risk management tools, methods, processes and policies (the RTS on the ICT risk management framework), https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj. The checks below are written in our own words. The IDs are article numbers (of the Regulation, or of the RTS where marked "RTS"), so a finding can be traced back to the official text.

DORA applies to banks, insurers, payment and e-money institutions, investment firms, crypto-asset service providers and other EU financial entities, and to the ICT providers they depend on. It requires them to manage ICT risk, report major incidents, test their resilience and control third-party ICT risk. The RTS sets the detail of the ICT risk management framework.

## When this applies

Apply these checks only to changed code, infrastructure or pipelines of a financial entity, or of an ICT provider that serves one: core and payment systems, customer apps and APIs, data platforms, and the build and deployment code around them.

If the change doesn't touch ICT systems used by a financial entity, report this standard as `not_applicable`.

## Checks

### [DORA Art. 8] ICT assets and their dependencies are identified
Look for: new services, databases, queues, third-party APIs or SDKs that are not listed in the repository's inventory, architecture files or infrastructure code, and dependencies with no declared owner or purpose.
Decided from code: partly. The inventory may be kept elsewhere, so say what the code adds and mark the rest for a person to check.

### [DORA Art. 12] Data is backed up and can be restored
Look for: data stores with no backup configuration, backups kept in the same place as the data, backups with no restore test or integrity check, and backup job failures that are ignored.
Decided from code: partly. Backup setup is often managed by the platform, outside the repository.

### [DORA Art. 25] Resilience testing is part of the pipeline
Look for: no automated tests, dependency or code scans, or load and failure tests for critical services; scans that are turned off; and test results that do not block a release.
Decided from code: partly. Advanced testing is run outside the repository.

### [DORA Art. 28] Third-party ICT services are known and controlled
Look for: new external ICT services receiving the entity's data, with no sign of being recorded in the register of information; no exit or fallback path for a critical service; and a single provider for a critical function with no alternative.
Decided from code: partly. Contracts and the register are outside the repository.

### [DORA RTS Art. 6] Encryption and cryptographic controls are used and current
Look for: data at rest or in transit with no encryption, outdated algorithms (MD5, SHA-1, DES, RC4), hard-coded keys or IVs, home-made cryptography, and TLS verification turned off.
Decided from code: yes.

### [DORA RTS Art. 7] Cryptographic keys are managed through their life
Look for: keys in source, config or images, no rotation or revocation path, keys shared across environments, and keys stored next to the data they protect.
Acceptable: keys loaded from a key management service or hardware security module at run time.
Decided from code: partly. How the key store is secured is outside the repository.

### [DORA RTS Art. 10] Vulnerabilities and patches are managed
Look for: pinned old dependencies or base images with known flaws, no dependency scanning in the pipeline, ignored scan failures, and no automated update mechanism.
Decided from code: yes, for this repository.

### [DORA RTS Art. 11] Data and systems are protected against loss and misuse
Look for: sensitive data in logs or test fixtures, no integrity checks on stored data, services running with more privileges than needed, and no protection against unauthorised data exfiltration (open storage, public buckets).
Decided from code: yes.

### [DORA RTS Art. 12] Logging covers the events that matter
Look for: access, privilege changes, authentication events, changes to configuration and critical data, and errors that are not logged; logs with no timestamp or user; logs that are editable by those they record; and logs with secrets in them.
Decided from code: yes.

### [DORA RTS Art. 14] Data in transit is protected
Look for: plain HTTP or other unencrypted protocols between services or to external parties, mutual authentication turned off, and internal traffic that is sent in the clear because it is "internal".
Decided from code: yes, for what the code and infrastructure files configure.

### [DORA RTS Art. 16] Software is developed, tested and maintained securely
Look for: no code review, no static analysis or dependency scan, secrets in source, production data used in tests, and no separation of development, test and production environments.
Decided from code: yes, for what the repository and pipeline show.

### [DORA RTS Art. 17] ICT changes are controlled
Look for: pipelines that deploy without review or approval, no tests before release, changes made by hand in production, no rollback path, and an emergency path that skips all checks.
Decided from code: partly. Approval rules often live in the repository host, outside the files.

### [DORA RTS Art. 20] Identities are managed through their life
Look for: shared or generic accounts, service accounts without owners, accounts that are never disabled, and no link between a user in the app and the identity provider.
Decided from code: partly. Joiner, mover and leaver processes are outside the code.

### [DORA RTS Art. 21] Access follows need and is strongly authenticated
Look for: roles that grant more than needed, checks done only in the UI, privileged access with no multi-factor authentication, standing admin rights, and default credentials.
Decided from code: yes.

### [DORA RTS Art. 23] Unusual activity can be detected
Look for: no alerting or metrics on failed sign-ins, odd traffic, privilege use, data volume or errors; alerts that are swallowed or turned off; and no way to tell a security event from a normal fault.
Decided from code: partly. Monitoring is often run by a separate platform.
