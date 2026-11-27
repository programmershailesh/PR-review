# FDA 21 CFR Part 11: code review checklist

Source: U.S. Food and Drug Administration, Electronic Records; Electronic Signatures, 21 CFR Part 11, as published in the eCFR (text current to November 2026), https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11. The checks below are written in our own words. The numbers are the regulation's section and paragraph numbers.

Part 11 sets the conditions under which FDA treats electronic records and electronic signatures as equivalent to paper records and handwritten signatures. It applies to records that FDA rules require, such as those kept for clinical trials, manufacturing, laboratory work and quality systems. It is not a general security standard, and a lot of it is procedural.

## When this applies

Apply these checks to changed code that creates, changes, stores, signs, approves or deletes records that FDA predicate rules require, or that implements electronic signatures on them. Signs include batch or lot records, laboratory results, clinical trial data, deviation or CAPA records, training records, approvals, and sign-off or "reviewed by" workflows in regulated (GxP) systems.

If the change doesn't touch regulated records or signatures, report this standard as `not_applicable`.

## Checks

### [21 CFR 11.10(a)] The system's accuracy and its handling of invalid or changed records can be shown
Look for: changes to regulated record logic with no automated tests, tests removed or skipped, features that can reach production without a recorded test run. Code that silently discards, truncates or rounds regulated values.
Decided from code: partly. Formal validation documents sit outside the repository, but tests and pipelines show part of the evidence.

### [21 CFR 11.10(b)] Accurate and complete copies of records can be produced
Look for: export, report or print features that leave out fields, the audit trail, signature details or attachments. Exports that truncate or reformat values. Records stored in formats that can't be read back.
Decided from code: yes.

### [21 CFR 11.10(c)] Records stay protected and retrievable for the whole retention period
Look for: jobs that purge or archive regulated records without a retention check, schema changes that make old records unreadable, records stored only in a cache or in storage with a short expiry, backups missing for regulated data.
Decided from code: partly. The retention period itself is set by the regulated record type.

### [21 CFR 11.10(d)] Only authorised individuals can use the system
Look for: endpoints that serve or change regulated records without authentication, shared or generic accounts, weakened sign-in, long or endless sessions in screens that sign or approve.
Decided from code: yes.

### [21 CFR 11.10(e)] Secure, computer-generated, time-stamped audit trails record record changes
Look for: create, change or delete paths for regulated records that write no audit entry. Entries without who, when, and old and new values. Audit entries that users or the application can edit or delete, or that can be switched off by a setting. Timestamps taken from the client rather than a trusted server clock. Overwrites that keep no earlier version.
Not a breach: audit entries stored in a separate append-only store.
Decided from code: yes.

### [21 CFR 11.10(f)] Permitted sequences of steps are enforced
Look for: workflows where approval can happen before review, a record can be signed before required fields are filled, or a closed record can be reopened and changed without going through the intended steps. Status changes that accept any state as the next.
Decided from code: yes.

### [21 CFR 11.10(g)] Authority checks control who can sign, change, or access records and operations
Look for: actions such as approve, sign, release, delete or change configuration that check login but not role. Roles that let the author of a record also approve it. Role checks only in the interface and not in the server.
Decided from code: yes.

### [21 CFR 11.10(h)] Sources of data and operations are checked
Look for: data from instruments, devices or other systems accepted without checking the source, format or range. Endpoints that take values from any client where a particular terminal or device is expected.
Decided from code: partly. Which sources are valid is defined by the regulated process.

### [21 CFR 11.10(k)] Documentation and system changes are controlled and recorded
Look for: changes to validated configuration, rules, templates or system documentation without review or a change record. Configuration that regulated users can change at run time without being logged.
Decided from code: partly. The change control process is outside the repository, but review and approval steps in the pipeline are visible.

### [21 CFR 11.30] Open systems add encryption and digital signature measures
Look for: regulated records sent or stored through systems outside the organisation's control, over the internet, without transport encryption (plain HTTP, TLS verification turned off) or without digital signatures or other means to show authenticity and integrity.
Decided from code: partly. Whether a system is open or closed is a determination made by the organisation.

### [21 CFR 11.50] Signed records show who signed, when and why
Look for: signed records whose view or print-out lacks the signer's printed name, the date and time of signing, or the meaning of the signature (such as review, approval or responsibility). Signature meaning that is not captured or can be changed after signing.
Decided from code: yes.

### [21 CFR 11.70] Signatures are tied to their records and can't be moved or copied
Look for: signatures stored in a separate table with no cryptographic or key-based link to the record content. Records that can be edited after signing without invalidating the signature. Signature images or approvals that can be copied from one record to another.
Decided from code: yes.

### [21 CFR 11.100] Each electronic signature is unique to one person
Look for: shared signing credentials, signing identifiers that can be reassigned to another person, signing done by a service account on behalf of a user, no check of the signer's identity before the signing feature is enabled.
Decided from code: partly. Identity verification before issuing a signature is a procedure outside the repository.

### [21 CFR 11.200] Signatures that use identification and password pairs require both parts, and signing needs re-authentication
Look for: signing that needs only an existing session and no entry of both identification components, for the first signing in a session or for later signings that are not continuous. Signing accepted with a stored or cached password. Biometric or token signing that is not bound to its owner.
Decided from code: yes.

### [21 CFR 11.300] Identification codes and passwords are unique and kept secure
Look for: duplicate user IDs, no way to revoke lost or compromised tokens or credentials, no lockout or alert after repeated failed attempts, passwords stored in plain text or with fast hashes, no mechanism for periodic review or expiry where the project's policy asks for it.
Decided from code: partly. Review periods are set by procedure.
