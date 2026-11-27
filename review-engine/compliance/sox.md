# SOX IT general controls: code review checklist

Source: U.S. Sarbanes-Oxley Act of 2002 (sections 302, 404 and 802); PCAOB Auditing Standard AS 2201, An Audit of Internal Control Over Financial Reporting That Is Integrated with An Audit of Financial Statements, https://pcaobus.org/oversight/standards/auditing-standards/details/AS2201; ISACA COBIT 2019 Framework: Governance and Management Objectives, https://www.isaca.org/resources/cobit. The checks below are written in our own words. SOX itself has no IT control numbers. Auditors test IT general controls (ITGCs) using a framework, and most use COBIT, so the IDs below are COBIT 2019 practice numbers. Where a check rests on the Act itself, the section number is used. The practice numbers were checked against public secondary sources on COBIT 2019, not against ISACA's licensed publication.

SOX applies to companies that report to the U.S. SEC. Management must show that internal control over financial reporting works (section 404), and officers certify the reported numbers (section 302). The systems that produce those numbers are tested through ITGCs: who can access them, how changes are made, who can do what, and what trail is left.

## When this applies

Apply these checks only to changed code that produces, changes, approves or reports financial data, such as the general ledger, journal entries, invoicing, revenue recognition, payables, payroll, consolidation, period close and financial reports. Also apply them to the access control, build and deployment code around those systems.

Signs of this include accounting or ledger models, posting and reversal logic, approval workflows, finance admin screens, financial exports and the pipelines that deploy them. If the change doesn't touch financial reporting systems or the controls around them, report this standard as `not_applicable`.

## Checks

### [SOX DSS05.04] Users are identified, authenticated and limited by role
Look for: financial endpoints, admin screens, jobs or database access that work without sign-in, financial actions open to any signed-in user, role checks done only in the UI, "admin" flags that grant everything, shared or generic accounts, hard-coded service credentials, and sign-in that skips the company's identity provider.
Acceptable: single sign-on through the identity provider, and service accounts that are named, separate and loaded from a secret store.
Decided from code: yes, for what the code enforces.

### [SOX DSS06.03] The same person cannot both create and approve
Look for: workflows where the user who creates a journal entry, payment, vendor change or adjustment can also approve it, approvals that accept the requester's own ID, and approval steps that can be skipped with a flag or parameter.
Acceptable: an enforced check that the approver differs from the requester, or a documented compensating review.
Decided from code: yes, for what the code enforces. Whether the roles are assigned to different people is a matter for the organisation.

### [SOX DSS06.05] Financial changes leave an audit trail tied to a person
Look for: create, update, delete, approve and reverse actions on financial records that don't record who, when, what changed and the old and new values. Also look for audit entries written with a shared service identity instead of the real user.
Decided from code: yes.

### [SOX 802] Audit records cannot be altered or deleted by ordinary users
Look for: audit or ledger tables that application code can update or delete, "clean up" jobs that remove audit rows or financial history with no retention rule, log settings with very short retention, and hard deletes of posted financial records instead of reversals.
Acceptable: append-only tables, reversal entries, and retention set by policy.
Decided from code: partly. Section 802 penalises destroying or altering records to obstruct an investigation and sets record retention duties for auditors; it does not spell out these technical controls. Retention periods may be set outside the repository, so say what the code does and mark the rest for a person to check.

### [SOX BAI06.01] Changes to financial systems are reviewed and approved before release
Look for: deployment pipelines that push to production without a reviewed pull request, branch rules that let authors merge their own code, direct pushes to the release branch, and workflows that let the author approve their own deployment.
Decided from code: partly. Branch protection and approval rules often live in the repository host's settings, not in the repository. Say what the files show and mark the rest for a person to check.

### [SOX BAI06.02] Emergency changes still leave a record
Look for: "hotfix" or "break-glass" paths in pipelines or scripts that skip review, tests or logging, and production database edits done by script with no ticket or audit reference.
Acceptable: an emergency path that still records who made the change and requires review afterwards.
Decided from code: partly. Whether the follow-up review happens is a process matter.

### [SOX BAI07.04] Test and production are separate
Look for: test code or fixtures that point at production databases, production credentials in test or staging config, production data copied into test with no masking, and developers' accounts with write access to production in the same config.
Decided from code: yes, for what the config shows.

### [SOX BAI10.02] System configuration is kept in version control
Look for: infrastructure, database and application settings that are changed by hand or by script outside the repository, and settings that differ between environments with no record. Also look for changes to config that governs financial controls (rounding, tax, approval limits) hidden inside code changes with no review.
Acceptable: infrastructure as code and config files that go through the same review as code.
Decided from code: yes, for this repository.

### [SOX DSS06.02] Financial processing checks its inputs and totals
Look for: posting or import code that accepts unbalanced entries, negative or out-of-range amounts, wrong currencies, duplicate submissions or missing periods; rounding done differently in different places; and batch jobs that don't reconcile counts and totals or that ignore failures.
Decided from code: yes.

### [SOX 404] Automated financial controls cannot be switched off quietly
Look for: feature flags, environment variables, config or admin settings that disable validations, approval limits, period locks or reconciliations, and flags that can be changed with no log entry or no review.
Acceptable: a switch that needs a second person and leaves an audit record.
Decided from code: partly. How flag changes are approved may sit outside the repository.

### [SOX 302] Reported figures come from controlled sources, not manual edits
Look for: financial reports or dashboards fed from hand-edited files, spreadsheets, ad hoc SQL or scripts that overwrite values, and report code that lets users change figures after they are produced.
Decided from code: partly. The code shows the data path; whether people also edit numbers elsewhere is a matter for a person to check.

### [SOX DSS05.07] Security events on financial systems are logged and watched
Look for: failed sign-ins, permission changes, privileged actions and configuration changes that are not logged, logs that include secrets or full personal data, and logs written only to local files that the app's own users can edit.
Decided from code: partly. Whether anyone reviews the alerts is not visible in the code.

### [SOX DSS04.07] Financial data is backed up and can be restored
Look for: databases or files holding financial records with no backup configuration, backups with no restore test, and backup jobs whose failures are ignored.
Decided from code: partly. Backups are often managed by the platform, outside the repository.

### [SOX APO10.04] Risks from third-party suppliers and components in financial systems are managed
Look for: new dependencies, SDKs or hosted services that receive financial data and are not in the lockfile or manifest, vendored copies with no version, and scripts pulled in from a CDN.
Decided from code: yes, for this repository. Vendor reviews and service organisation reports are outside the code.
