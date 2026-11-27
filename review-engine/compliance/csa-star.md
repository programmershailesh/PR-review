# CSA Cloud Controls Matrix v4: code review checklist

Source: Cloud Security Alliance, Cloud Controls Matrix (CCM) Version 4, the control framework behind the CSA STAR programme, https://cloudsecurityalliance.org/research/cloud-controls-matrix. This checklist follows the v4.0 control IDs. CSA has since published v4.1, which renames and widens some controls, so confirm an ID against the version the organisation is assessed on. The checks below are written in our own words. The IDs are the CCM's control IDs, so a finding can be traced back to the official text.

The CCM has 17 domains of cloud security controls, and STAR is CSA's assurance programme that uses it (self-assessment, third-party audit and continuous monitoring). Many controls are about policy, contracts and the split of duties between cloud provider and customer. The checks below are the controls whose evidence can show up in code, configuration, dependencies or pipelines.

## When this applies

Apply these checks to changes in application code, dependencies and lockfiles, cloud and deployment configuration, CI/CD pipelines, and security features such as sign-in, permissions, encryption and logging, especially in services run in or delivered from the cloud.

If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [CCM AIS-04] Applications are designed and built securely
Look for: new features that skip the project's secure patterns: no input validation at trust boundaries, trust in client-supplied values, no deny-by-default, secrets handled ad hoc, security logic copied between handlers instead of shared.
Decided from code: partly. Design intent is a judgement, so describe what the code does.

### [CCM AIS-05] Application security testing is automated
Look for: static analysis, dependency scanning, secret scanning, dynamic tests or security unit tests removed from the pipeline, made non-blocking, or skipped. Security-relevant changes with no tests.
Decided from code: yes, for the checks set up in the repository.

### [CCM AIS-06] Deployment is automated and secure
Look for: manual deployment steps, scripts that copy files to servers by hand, pipelines that deploy without the project's checks, long-lived deploy credentials, deploy jobs with broader rights than needed, or builds that can be altered by pull request content.
Decided from code: yes, for pipelines in the repository.

### [CCM AIS-07] Application vulnerabilities are fixed
Look for: known-vulnerable dependencies added or pinned back, scan findings suppressed without a reason or expiry, security fixes reverted, unmaintained packages with no replacement plan.
Decided from code: partly. Fix deadlines are set by the organisation.

### [CCM CCC-02] Changes are tested before release
Look for: pipelines that deploy without running tests, test jobs set to continue on error, tests deleted or skipped to get a change through, no test for the changed behaviour.
Decided from code: yes.

### [CCM CCC-04] Unauthorised changes are prevented
Look for: workflow changes that bypass review or branch protection, direct pushes to the release branch, deploy jobs triggered by untrusted input, infrastructure edited by hand instead of through code, secrets or pipeline settings editable by anyone with repository access.
Decided from code: partly. Branch protection and repository settings are often outside the repository files.

### [CCM CEK-03] Data is encrypted
Look for: new tables, files, caches, queues, buckets or messages holding sensitive data with no encryption at rest or in transit, or with it turned off. TLS verification disabled. Keys stored beside the data.
Decided from code: partly. Platform encryption settings may live outside the repository.

### [CCM CEK-04] Encryption uses strong, approved algorithms
Look for: MD5, SHA-1, DES, 3DES, RC4, ECB mode, small RSA keys, home-made encryption, non-cryptographic random numbers used for keys, tokens or IVs.
Decided from code: yes.

### [CCM CEK-10] Keys are generated safely
Look for: keys, salts or IVs built from predictable values (timestamps, user IDs, `Math.random`, `rand()`), fixed or reused IVs, keys derived from short passwords with a fast hash, keys hard-coded or committed to the repository.
Decided from code: yes.

### [CCM IAM-05] Access is limited to what is needed
Look for: wildcard or admin-level IAM actions and roles, services with broad database or storage rights, tokens and API scopes wider than the feature needs, privileged functions open to ordinary roles.
Decided from code: yes, for what the code and infrastructure files grant.

### [CCM IAM-14] Strong authentication is used
Look for: sensitive or admin actions without a second factor where the project expects one, multi-factor authentication that can be bypassed by a flag or fallback, endpoints with no authentication, weak password rules, passwords stored with fast hashes.
Decided from code: yes, for what the code enforces.

### [CCM IAM-16] Authorisation is enforced
Look for: new endpoints, queries or exports without a permission or ownership check. Authorisation done only in the client. Object IDs taken from the request and used as is. Tokens accepted without checking signature, audience and expiry.
Decided from code: yes.

### [CCM LOG-08] Log records capture the needed detail
Look for: audit events missing the time, event type, outcome, acting user or service, source or affected object. Free-text logs that can't be searched. Security events (sign-in, permission changes, data export) that write nothing.
Decided from code: yes.

### [CCM LOG-09] Logs are protected
Look for: logs the application can edit or delete, open permissions on log storage, logs sent over an unencrypted channel, secrets, tokens or whole sensitive records written into logs.
Decided from code: partly. Storage permissions may be set outside the repository.

### [CCM DSP-10] Sensitive data is transferred safely
Look for: sensitive data sent to other services, partners, analytics or AI tools without encryption, authentication or a clear need. Sensitive data in URLs, email or chat messages. Exports written to shared locations.
Decided from code: yes, for what the code sends.

### [CCM DSP-15] Production data isn't used in test and development
Look for: production database dumps, real customer records or live credentials in fixtures, seed files, CI jobs, snapshots or test environments. Test environments pointed at production data stores.
Acceptable: synthetic data, or properly masked data with a documented process.
Decided from code: yes.

### [CCM IVS-05] Production and non-production are separate
Look for: shared databases, keys, accounts or networks across environments. Debug or test routes enabled in production builds. Test and production using the same credentials or the same cloud account without isolation.
Decided from code: yes, for what the repository configures.

### [CCM TVM-05] Vulnerabilities in external libraries are tracked
Look for: dependencies added outside the lockfile, no dependency scanning in the pipeline, scanning set to ignore failures, vendored libraries with no record of version, unpinned versions or unofficial registries.
Decided from code: yes.
