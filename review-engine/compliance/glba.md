# GLBA Safeguards Rule: code review checklist

Source: U.S. Federal Trade Commission, Standards for Safeguarding Customer Information, 16 CFR Part 314 (as amended 2021 and 2023), section 314.4, https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.4. The checks below are written in our own words. The IDs are the paragraphs of 314.4, so a finding can be traced back to the official text.

The Gramm-Leach-Bliley Act requires financial institutions to protect customer information: non-public personal financial information about their customers. The FTC's Safeguards Rule covers non-bank institutions such as lenders, brokers, tax preparers, payment and fintech firms and auto dealers that finance. Banks follow separate interagency guidelines with similar aims.

## When this applies

Apply these checks only to changed code that collects, stores, processes, transmits, logs or discloses customer information, or that controls access to systems that do. Signs of this include loan, account, income, tax, credit, Social Security number and bank account data, applications for financial products, and customer portals.

If the change doesn't touch customer information or the controls around it, report this standard as `not_applicable`.

## Checks

### [GLBA 314.4(c)(1)] Access to customer information is limited and authenticated
Look for: endpoints, queries, exports or admin screens that return customer information without sign-in, that return more than the caller needs, or that check permissions only in the UI. Also look for broad service accounts and shared credentials.
Decided from code: yes.

### [GLBA 314.4(c)(2)] Systems that hold customer information are known
Look for: new databases, buckets, queues, caches, analytics tools or exports that hold customer information and are not listed in the repository's data inventory, schema documentation or infrastructure code.
Decided from code: partly. The inventory may be kept elsewhere, so say what the code adds and mark the rest for a person to check.

### [GLBA 314.4(c)(3)] Customer information is encrypted in transit and at rest
Look for: customer information sent over plain HTTP, TLS verification turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`), databases, buckets or backups with encryption turned off, and sensitive fields stored in plain text on disk.
Acceptable: managed disk or database encryption, field-level encryption with keys from a key service, and TLS to external parties.
Decided from code: yes, for what the code and infrastructure files configure.

### [GLBA 314.4(c)(4)] The application is built securely and outside code is tested
Look for: injection (SQL, command), broken access control, cross-site scripting, insecure deserialisation and trust in client-supplied values in code that handles customer information. Also look for added third-party code or hosted components with no security testing step in the pipeline.
Decided from code: yes.

### [GLBA 314.4(c)(5)] Multi-factor authentication protects access to systems with customer information
Look for: sign-in to customer portals, admin tools and internal systems that holds customer information with a password alone, MFA settings turned off for staff or admin accounts, and MFA that can be skipped with a flag or parameter.
Acceptable: MFA through the identity provider, or a written approval for an equivalent control from the Qualified Individual named in the rule.
Decided from code: partly. A written exception would be outside the repository.

### [GLBA 314.4(c)(6)] Customer information is deleted when no longer needed
Look for: new tables, files, logs, backups or analytics copies of customer information with no retention limit or deletion job, and "soft delete" that never purges.
Not a breach: keeping data that a law or regulation requires, or that the business still needs for a stated reason.
Decided from code: partly. The retention policy is often outside the repository.

### [GLBA 314.4(c)(7)] Changes to systems with customer information go through change management
Look for: deployment pipelines that push to production with no review, direct pushes to the release branch, database or config changes made by hand with no record, and no way to roll back.
Decided from code: partly. Branch protection and approval settings often live in the repository host, not in the files.

### [GLBA 314.4(c)(8)] Authorised users' activity is logged
Look for: reads, exports and changes of customer information that leave no record of who did what and when, logs that can be edited by the users they record, and logs that include full account numbers or Social Security numbers.
Decided from code: yes.

### [GLBA 314.4(d)(2)] Vulnerability scanning and testing run on a schedule
Look for: no dependency or static analysis scan in the pipeline for code that handles customer information, scans that are turned off or whose failures are ignored, and no scheduled scan job.
Decided from code: partly. The rule sets periodic penetration tests and scans, which may be run outside the repository. Say which scans the pipeline shows.

### [GLBA 314.4(f)(2)] Service providers that receive customer information are bound to safeguards
Look for: new SDKs, APIs, analytics, support or AI services that are sent customer information, with no sign of a vetted provider, and data sent to a third party that isn't needed for the feature.
Decided from code: partly. The code shows where data goes; contracts and provider reviews are outside the repository.

### [GLBA 314.4(h)(6)] Security events are recorded so they can be investigated
Look for: authentication failures, permission changes, data exports and error paths that are not logged, and alerts that are swallowed or turned off. Without records the organisation cannot document an incident or decide whether notice to the FTC is required.
Decided from code: partly. The incident response plan itself is outside the repository.
