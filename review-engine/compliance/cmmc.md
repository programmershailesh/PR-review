# CMMC 2.0 Level 2 (NIST SP 800-171 Rev 2): code review checklist

Source: U.S. Department of Defense, Cybersecurity Maturity Model Certification (CMMC) Program, 32 CFR Part 170. Level 2 uses the 110 security requirements of NIST SP 800-171 Revision 2, Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations (February 2020, includes updates through January 2021), https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final. The checks below are written in our own words. The IDs are the SP 800-171 Rev 2 requirement numbers (for example 3.1.1), so a finding can be traced back to the official text. Revision 3 of SP 800-171 exists, but CMMC Level 2 assessments are still based on Revision 2, so this checklist follows Revision 2.

CMMC applies to contractors that handle Federal Contract Information (FCI) or Controlled Unclassified Information (CUI) for the U.S. Department of Defense. Many requirements are about people, facilities and paperwork. The checks below are the ones whose evidence shows up in code, configuration, dependencies and pipelines.

## When this applies

Apply these checks to changes in systems that store, process or send CUI or FCI, or that protect those systems: application code, access control, authentication, logging, cryptography, infrastructure and configuration files, and build pipelines. Signs of this include export-controlled technical data, contract deliverables, defence programme documents, and systems labelled "CUI" or "FCI" in the project's guidelines.

If the change doesn't touch such a system or the controls around it, report this standard as `not_applicable`.

## Checks

### [CMMC 3.1.1] System access is limited to authorised users, processes and devices
Look for: new endpoints, jobs, queues, storage buckets or admin screens reachable without sign-in. Authentication checks removed or skipped for convenience, such as a debug bypass or a hard-coded token. Public read access added to storage that holds CUI. Anonymous access to internal APIs.
Decided from code: yes, for checks done in code.

### [CMMC 3.1.2] Users can perform only the actions and functions they are authorised for
Look for: handlers that check that the caller is signed in but not that the caller may perform this action on this record. Record IDs taken from the request and used without an ownership or role check. Role checks done only in the user interface.
Decided from code: yes.

### [CMMC 3.1.5] Least privilege is applied to users, services and roles
Look for: new roles, IAM policies, database users or service accounts with wildcard permissions (`*`) or broad admin rights where a narrow set would do. New code that runs with administrator or root rights without a need. Default roles that grant more than read access.
Decided from code: partly. Who is assigned each role is decided outside the repository.

### [CMMC 3.1.13] Remote access sessions are protected with cryptography
Look for: remote administration, VPN, bastion, SSH or management endpoints that accept plain-text protocols (Telnet, plain HTTP, unencrypted VNC), or that accept weak ciphers or protocol versions. TLS or SSH settings loosened in infrastructure files.
Decided from code: partly. Remote access paths are often set up outside the repository.

### [CMMC 3.3.1] Audit logs are created and kept for security-relevant events
Look for: sign-ins, access to CUI, permission changes, exports and administrative actions that write no log event. Logging turned off, sampled, or set to a shorter retention than the project's guidelines allow. Logs written only to local disk that is lost when a container restarts.
Decided from code: partly. Retention is often configured in the logging platform.

### [CMMC 3.3.2] Each logged action can be traced to one user
Look for: audit events without a user or service identity. Shared or generic accounts (`admin`, `service`) used by several people. Background jobs that act for a user without recording which user.
Not a breach: a service account used by one system, when the person who triggered the action is still recorded.
Decided from code: yes.

### [CMMC 3.4.2] Secure configuration settings are set and enforced
Look for: new settings whose default is the less secure choice, such as debug on, open ports, public storage, certificate checks off, default accounts or passwords, or permissive CORS. Infrastructure code that drifts away from the project's hardened baseline. Security settings that stay off unless an operator turns them on.
Decided from code: yes, for settings in the repository.

### [CMMC 3.4.3] Changes to systems are tracked, reviewed and approved
Look for: deployment paths that skip pull request review, such as direct pushes to the release branch, pipelines that deploy on any branch, or approval steps removed. Branch protection or required reviewers weakened in repository settings files. Production changes made through scripts that leave no record.
Decided from code: partly. Branch protection and approvals are usually set in the Git host.

### [CMMC 3.5.3] Multi-factor authentication is used for privileged and network access
Look for: sign-in flows for administrators, remote users or access to CUI that need only a password. MFA made optional or turned off, or a bypass for "trusted" networks or test users that also works in production. Admin consoles and cloud accounts set up without MFA enforcement.
Decided from code: partly. Identity provider settings may live outside the repository.

### [CMMC 3.5.10] Passwords are stored and sent only in protected form
Look for: passwords stored in plain text or with fast hashes such as MD5 or SHA-1 instead of a slow, salted algorithm (bcrypt, scrypt, Argon2, PBKDF2). Passwords written to logs or put in URLs. Credentials sent over unencrypted connections. Passwords or keys committed to source code.
Not a breach: placeholder secrets in examples and tests that can't reach real systems.
Decided from code: yes.

### [CMMC 3.11.2] Systems and applications are scanned for vulnerabilities
Look for: dependency, container image or code scanning steps removed from the pipeline, set to never fail, or limited to fewer paths. New ignore lists for findings with no reason. Scan schedules switched off.
Decided from code: partly. Scans run outside the repository aren't visible.

### [CMMC 3.13.8] CUI is encrypted while it is sent
Look for: connections that carry CUI over plain HTTP, unencrypted database or queue connections, FTP, or email without transport encryption. TLS certificate or hostname checks turned off (`verify=False`, `rejectUnauthorized: false`). Old protocol versions (SSL, TLS 1.0, TLS 1.1) allowed.
Decided from code: yes.

### [CMMC 3.13.10] Cryptographic keys are created and managed properly
Look for: keys, salts or initialisation vectors hard-coded or committed to the repository. Keys stored beside the data they protect. A single key shared across environments. Keys that are generated with a predictable random source or have no rotation path.
Acceptable: keys loaded from a key management service or secret store at run time.
Decided from code: partly. Rotation and custody are often handled outside the repository.

### [CMMC 3.13.11] FIPS-validated cryptography protects the confidentiality of CUI
Look for: encryption of CUI done with home-made algorithms or with libraries and modes that aren't FIPS-validated where the project requires FIPS. FIPS mode turned off in runtime, OS image or SDK settings. Algorithms that FIPS doesn't allow (MD5 or RC4 for protecting data, DES) used for CUI.
Decided from code: partly. Code shows the algorithm and library, but whether a module has a current validation certificate must be checked by a person.

### [CMMC 3.13.16] CUI is encrypted while it is stored
Look for: new tables, columns, files, caches, queues, backups or buckets that hold CUI without encryption at rest. Encryption turned off in infrastructure files. Local copies of CUI written to unencrypted temporary files or developer machines' exports.
Acceptable: disk or database encryption managed by the platform, and field-level encryption with keys from a key management service.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [CMMC 3.14.1] Software flaws are found and fixed in good time
Look for: dependencies at versions with known vulnerabilities or past end of life, and lockfiles that haven't been updated for a long time. Automated update tooling removed. Security fixes held back with no stated reason. Base images or runtimes pinned to unsupported releases.
Decided from code: partly. How fast fixes are made is a matter of process outside the repository.
