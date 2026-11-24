# HIPAA Security Rule: code review checklist

Source: U.S. Department of Health and Human Services, HIPAA Security Rule, 45 CFR Part 164 Subpart C, as published in the eCFR (text current to November 2026), https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C. Two Privacy Rule items are included because code can show them: the minimum necessary standard (164.502(b)) and de-identification (164.514), from Subpart E. The checks below are written in our own words. The numbers are the regulation's section and paragraph numbers, so a finding can be traced back to the official text.

HIPAA protects protected health information (PHI): health, treatment and payment information that can be tied to a person. The Security Rule covers PHI in electronic form (ePHI) held by covered entities (health plans, clearinghouses and most providers) and their business associates.

Some items are "addressable" rather than "required", including encryption, automatic logoff and integrity checks. An organisation may use a documented alternative for those, so flag a missing safeguard and say a person must confirm whether an alternative is in place.

## When this applies

Apply these checks only to changed code that creates, receives, stores, sends, logs or displays ePHI, or that controls access to systems that do. Signs of this include patient, diagnosis, medication, lab result or appointment data, medical record numbers, health plan member IDs, claims, FHIR or HL7 messages, EHR integrations, and clinical notes or images.

Data that has been properly de-identified under 164.514 is not PHI, but the de-identification checks still apply to the code that produces it. If the change doesn't touch ePHI or the access controls around it, report this standard as `not_applicable`.

HHS proposed a major update to the Security Rule on 6 January 2025 (90 FR 898). It would remove the difference between required and addressable items and add new duties. As of November 2026 it has not been finalised, so this checklist follows the rule currently in force. A separate Privacy Rule update published on 19 November 2026 (in effect from 19 January 2027) doesn't change the sections cited here.

## Checks

### [HIPAA 164.312(a)(1)] Only authorised users and programs can reach ePHI
Look for: new endpoints, queries, jobs or exports that return patient data without checking that the caller was granted access to that patient or record. Record IDs taken from the request and used without an ownership, care-team or role check. Service accounts or API keys that can read every record when the feature needs only a few.
Decided from code: yes, for checks done in code.

### [HIPAA 164.312(a)(2)(i)] Every user has their own identity
Look for: shared or generic logins (such as `admin`, `nurse` or `frontdesk`), one API key used by many people, or actions on ePHI recorded without a user ID, so activity can't be traced to a person.
Not a breach: a service account used by one system, when the person who triggered the action is still recorded.
Decided from code: yes.

### [HIPAA 164.312(a)(2)(iii)] Idle sessions end on their own
Look for: sessions or tokens in apps that show ePHI with no idle timeout, a timeout removed or raised to days, refresh tokens that never expire, or "remember me" turned on by default for clinical screens.
Decided from code: partly. This item is addressable, and the chosen timeout is often set outside the repository.

### [HIPAA 164.312(a)(2)(iv)] Stored ePHI is encrypted
Look for: new tables, columns, files, caches, queues, backups or storage buckets that hold ePHI without encryption at rest. Encryption turned off in infrastructure files. Decryption keys hard-coded, committed, or stored next to the data they protect.
Acceptable: disk or database encryption managed by the platform, field-level encryption, and keys loaded from a key management service at run time.
Decided from code: partly. This item is addressable, and platform encryption settings may live outside the repository.

### [HIPAA 164.312(b)] Activity on ePHI is recorded
Look for: new ways to view, create, change, delete, export or print ePHI that don't write an audit event. Audit events that leave out who acted, which record, when, or whether it worked. Audit logs that the application itself can edit or delete. Changes that turn off, sample or shorten audit logging.
Not a breach: audit events that store record IDs rather than the health data itself, which is the better design.
Decided from code: yes.

### [HIPAA 164.312(c)(1)] ePHI can't be changed or destroyed improperly
Look for: endpoints or jobs that overwrite or hard-delete clinical records without an authorisation check. Bulk update or delete paths with no safeguards. Missing checks that let one patient's data be written into another patient's record. Migrations that drop or truncate ePHI without a backup step.
Decided from code: yes.

### [HIPAA 164.312(c)(2)] Unauthorised changes to ePHI can be detected
Look for: changes that remove checksums, signatures or version history from stored records, documents or images. New stores of clinical documents where tampering would go unnoticed, in a project that protects similar data this way elsewhere.
Decided from code: partly. This item is addressable, and an organisation may rely on other documented measures.

### [HIPAA 164.312(d)] People and systems prove who they are before reaching ePHI
Look for: endpoints that serve ePHI without authentication. Weakened sign-in, such as multi-factor authentication removed or long-lived magic links. Webhooks or partner APIs that accept ePHI without verifying the sender. Tokens accepted without checking the signature or expiry.
Decided from code: yes.

### [HIPAA 164.312(e)(1)] ePHI isn't sent over unprotected channels
Look for: ePHI put into plain email, SMS or push notification text. ePHI in URL query strings, which end up in proxy and browser logs. ePHI sent to analytics, error tracking or chat tools.
Not a breach: a notification that only says a new message is waiting, with the content behind a sign-in.
Decided from code: yes, for what the code sends.

### [HIPAA 164.312(e)(2)(ii)] ePHI is encrypted in transit
Look for: ePHI sent over plain HTTP, FTP, or unencrypted database and queue connections. TLS verification turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`). Old protocol versions allowed.
Decided from code: yes, for what the code configures. This item is addressable, so if encryption is missing, say a person must confirm the documented alternative.

### [HIPAA 164.308(a)(3)(ii)(C)] Access ends when someone leaves
Look for: user deactivation or role removal that doesn't revoke active sessions, refresh tokens, API keys or cached permissions. Offboarding code that skips connected systems.
Decided from code: partly. The offboarding procedure itself is outside the repository.

### [HIPAA 164.308(a)(5)(ii)(C)] Sign-in attempts are monitored
Look for: sign-in code that stops logging failed attempts, removes lockout or rate limits, or drops alerts on unusual sign-in patterns.
Decided from code: partly. Who reviews those logs, and how often, is outside the repository.

### [HIPAA 164.308(a)(5)(ii)(D)] Passwords are created, changed and stored safely
Look for: passwords stored in plain text, or hashed with fast hashes such as MD5, SHA-1 or unsalted SHA-256 instead of bcrypt, scrypt, Argon2 or PBKDF2. Password reset tokens that are guessable or never expire. Passwords written to logs.
Decided from code: yes.

### [HIPAA 164.308(a)(6)(ii)] Security incidents can be spotted and dealt with
Look for: code that swallows authorisation failures, integrity errors or suspicious access without logging them. Security alerts removed. No way to find out which patients' records a compromised account or key has touched.
Decided from code: partly. The incident response process is outside the repository.

### [HIPAA 164.310(d)(2)(i)] ePHI is disposed of properly
Look for: exports, reports, temporary files, local caches or downloaded attachments with ePHI that are never cleaned up. Delete features that leave copies in search indexes, caches or object storage. Decommissioning scripts that remove references but leave the data.
Decided from code: partly. Disposal of hardware and backup media happens outside the repository.

### [HIPAA 164.502(b)] Only the minimum necessary PHI is used or shared
Look for: API responses, exports, events or calls to other services that send a whole patient record when the feature needs a few fields. `SELECT *` on clinical tables behind list views. PHI sent to analytics, logging or AI services that don't need it. Staff screens that show full records to roles that need only part of them.
Not a breach: disclosures to a health care provider for treatment, and data given to the patient, which the rule exempts.
Decided from code: partly. What each role needs is a policy decision, so say what the code exposes.

### [HIPAA 164.514(b)(2)] Data called de-identified has the identifiers removed
Look for: exports, analytics tables, test data or training sets described as anonymised or de-identified that still hold names, street addresses, cities, counties, full ZIP codes, dates other than the year (such as birth or admission dates), ages over 89, phone or fax numbers, email addresses, record, account or member numbers, licence numbers, vehicle or device identifiers, URLs, IP addresses, biometric data, face photos, or any other unique code.
Acceptable: a documented expert determination, which is the other method the rule allows. Ask for it rather than assuming it exists.
Decided from code: partly.

### [HIPAA 164.514(c)] Re-identification codes can't be traced back to the patient
Look for: pseudonymous IDs in de-identified data that are built from identifiers, such as a hash of the medical record number, Social Security number or email address, which can be reversed by guessing. The code or mapping table shared with whoever receives the data.
Acceptable: random IDs, with the mapping kept by the covered entity and never disclosed.
Decided from code: yes.
