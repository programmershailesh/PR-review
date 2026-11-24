# SOC 2 Trust Services Criteria: code review checklist

Source: AICPA, 2017 Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy, with revised points of focus (2022), https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022. The 2022 revision changed only the points of focus. The criteria and their numbers stayed the same. The checks below are written in our own words. The numbers are the criteria's own IDs, so a finding can be traced back to the official text.

SOC 2 is an auditor's report on a service organisation's controls. Its criteria fall into five categories: Security (the common criteria, CC), Availability (A), Confidentiality (C), Processing Integrity (PI) and Privacy (P). Security is in every SOC 2 report. The others are in it only if the company chose them. The criteria say what a control must achieve, not how, so each check below describes the evidence in code that an auditor would care about. Privacy criteria are not included here. Use a privacy checklist such as GDPR for personal data.

## When this applies

Apply these checks to changed code in the system the SOC 2 report covers: the product, and the infrastructure, pipelines and tools that build, deploy and run it. Signs of this include sign-in and permission code, customer data handling, secrets and keys, encryption settings, logging and audit events, infrastructure code (Terraform, CloudFormation, Kubernetes manifests, Helm charts) and CI/CD pipeline files.

The Security checks (CC) apply whenever a change touches what they describe. The Availability (A), Confidentiality (C) and Processing Integrity (PI) checks count only if the company's SOC 2 report includes those categories, and the code can't show that. If one of those checks fails, report it, and say in the status note that a person must confirm the category is in scope.

SOC 2 has no criterion for ordinary coding bugs. Leave those to the main review, unless a bug weakens one of the checks below, such as an injection flaw that lets one customer read another's data. If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [SOC 2 CC6.1] Protected data and functions sit behind sign-in, managed secrets and encryption
Look for: new routes, handlers, jobs or queue consumers that reach customer data with no sign-in check. Passwords stored in plain text, or hashed with fast hashes such as MD5, SHA-1 or unsalted SHA-256 instead of bcrypt, scrypt, Argon2 or PBKDF2. API keys, database passwords or tokens written into source code or committed configuration files. A new database, bucket or volume in infrastructure code with encryption at rest turned off, where similar stores in the project are encrypted. Encryption keys kept next to the data they protect.
Not a breach: placeholders, dummy values in tests that can't reach real systems, and values read from environment variables or a secret manager.
Decided from code: partly. Identity provider settings and the security of the secret store are outside the repository.

### [SOC 2 CC6.2] Accounts are approved before they get access, and access ends when it should
Look for: sign-up or invite flows that let someone join an organisation or get a role without approval from a person allowed to grant it. Removing or deactivating a user while their sessions, API keys, refresh tokens or OAuth grants keep working. Service accounts or machine users created in infrastructure code with no stated owner or purpose.
Decided from code: partly. Joiner and leaver processes and access reviews happen outside the repository.

### [SOC 2 CC6.3] Access follows roles and least privilege
Look for: endpoints that check only that the user is signed in, not that they may act on this record or tenant, such as loading an object by ID with no owner or tenant check. Admin actions with no role check, or role checks done only in the UI. New roles or IAM policies with wildcards (`"Action": "*"`, `"Resource": "*"`), `cluster-admin` bindings, or database users with owner rights when the feature needs less. A user able to approve their own request in a feature that exists to separate duties.
Decided from code: yes, for checks done in code and policies defined in the repository.

### [SOC 2 CC6.6] Entry points open to the outside are protected
Look for: new public endpoints, ports or listeners. Security groups, firewall rules or Kubernetes services opened to `0.0.0.0/0` or `::/0` without need. Admin panels, debug endpoints, metrics or database ports reachable from the internet. Sign-in endpoints with no rate limit or lockout. Multi-factor authentication removed or made optional for remote or admin access.
Decided from code: partly. Network edges, firewalls and identity provider policies may be set outside the repository, so check for them before flagging.

### [SOC 2 CC6.7] Data is protected when it moves, and can only go where it should
Look for: data sent over plain HTTP, FTP, or unencrypted database or queue connections. TLS checks turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`, trust-all certificate handlers). New export, download, bulk API or webhook features that let data leave without a permission check. Customer data sent to a new third-party service.
Not a breach: plain HTTP between processes on the same host, or inside a service mesh that adds TLS.
Decided from code: yes, for what the code configures.

### [SOC 2 CC6.8] Unapproved or malicious software can't get into the system
Look for: code that downloads and runs scripts, plugins or binaries at run time without checking a signature or hash. `curl ... | sh` or `wget ... | bash` in Dockerfiles, install scripts or CI. Base images or CI actions pulled by a moving tag such as `latest`, where the project pins them elsewhere. Integrity checks on software or configuration removed. File uploads from outside the company that are stored and shared with other users with no type or content checks.
Decided from code: partly. Malware scanning and endpoint protection usually run outside the repository.

### [SOC 2 CC7.1] Risky configuration changes and known vulnerabilities are caught
Look for: dependency, container or code scanning removed from CI or set to never fail. New dependencies or base images with known vulnerabilities. Settings that move away from the project's secure standard, such as debug mode on in production configuration, detailed error pages, or default passwords. Configuration checks removed from infrastructure code, such as `tfsec`, `checkov` or policy-as-code rules.
Decided from code: partly. Scanners and alerting may run outside the repository.

### [SOC 2 CC7.2] Security events are recorded so unusual activity can be spotted
Look for: new sign-in, permission change, admin, export or deletion actions that write no audit event. Failed sign-ins, denied requests or rejected input that are swallowed with no log. Alerts, metrics or log shipping removed. Audit records stored where ordinary users, or code paths they control, can change or delete them.
Not a breach: leaving debug logs out of busy code paths, as long as security events are still recorded.
Decided from code: partly. Alert rules and the log platform are often set up outside the repository.

### [SOC 2 CC8.1] Changes are reviewed, tested and approved before they reach production
Look for: pipeline changes that deploy to production without the usual tests or approval, such as removed required jobs, `continue-on-error: true` on tests, or a deleted manual approval step. Scripts that change production data or infrastructure by hand, outside the pipeline. `CODEOWNERS` entries for sensitive paths removed or emptied. Branch protection weakened in infrastructure code. Hotfix paths that skip review and leave no record.
Decided from code: partly. Branch protection and approval rules usually live in the Git host's settings. Say what the code shows and ask a person to confirm the rest.

### [SOC 2 C1.1] Confidential information is identified and kept protected
Look for: secrets, access tokens, customer records or other confidential data written to logs, analytics events, error trackers, crash reports or URLs. Confidential data copied into caches, search indexes, queues or exports that lack the protection of the original store. Production data copied into test, staging or developer environments.
Decided from code: partly. What counts as confidential comes from the company's promises to its customers, so check the project's guidelines.

### [SOC 2 C1.2] Confidential information is disposed of when it's no longer needed
Look for: delete or account closure features that remove the main record but leave copies in caches, search indexes, object storage, analytics or derived tables. New stores of confidential data with no expiry, time-to-live or clean-up job. Soft delete where the feature promises real deletion.
Decided from code: partly. Retention periods and backup expiry are usually set outside the repository.

### [SOC 2 PI1.2] Inputs are checked for completeness and accuracy
Look for: data that feeds processing, such as orders, payments, imports, API payloads or uploaded files, accepted with no schema, type, range or required-field checks. Bad records silently fixed, cut short or dropped instead of rejected and reported. Imports that keep no record of what was received.
Decided from code: yes.

### [SOC 2 PI1.3] Processing is complete and accurate, and errors are caught
Look for: multi-step updates with no transaction, so a failure leaves work half done. Retries with no idempotency key, so the same action can run twice. Errors caught and ignored in batch jobs or queue consumers. Money or quantities calculated in floating point. Race conditions on shared counters or balances.
Decided from code: yes.

### [SOC 2 PI1.4] Output is complete, accurate and reaches only the right recipient
Look for: reports, exports, emails, webhooks or files that could go to the wrong customer or tenant. Output silently cut short by page limits or row caps. Output jobs that keep no record of what was sent and to whom.
Decided from code: yes.

### [SOC 2 PI1.5] Stored data stays complete and accurate
Look for: migrations that drop columns, narrow types or change encodings in ways that lose data. Database constraints removed (unique, foreign key, not null) that protected data integrity. Writes across two stores that can half succeed with nothing to reconcile them. Lossy conversions, such as rounding amounts or reading dates without a time zone.
Decided from code: yes.

### [SOC 2 A1.2] Data the system relies on is backed up and can be recovered
Look for: new databases, buckets or volumes in infrastructure code with no backups, point-in-time recovery or versioning, where similar stores in the project have them. Backup retention cut, or deletion protection turned off. Recovery scripts in the repository that no longer match the new setup.
Decided from code: partly. Backup schedules and recovery tests are often managed outside the repository.
