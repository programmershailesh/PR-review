# APPI: code review checklist

Source: Act on the Protection of Personal Information (Act No. 57 of 2003, as amended), official English translation published by the Japanese government, https://www.japaneselawtranslation.go.jp/en/laws/view/4241/en, with the Personal Information Protection Commission (PPC) guidelines at https://www.ppc.go.jp/en/. Article numbers are those of the text in force in November 2026. The Act Partially Amending the APPI (Act No. 56 of 2026) was promulgated on 17 July 2026. It adds administrative fines, rules for children under 16 and a new class of biometric data, and takes effect in stages. Its new and renumbered provisions aren't reflected here, so check the amended text before relying on a check. The checks below are written in our own words. The numbers are the Act's article and paragraph numbers, so a finding can be traced back to the official text.

The APPI applies to a business that handles a database of personal information. Personal information is information about a living person who can be identified, including by combining it with other data, and numbers or codes that identify a person. "Special care-required personal information" is a stricter class that includes race, creed, social status, medical history, criminal record and having been a crime victim. "Personal data" means personal information held in a searchable database.

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, logs, exports, transfers or deletes personal information, in a project run by a business that handles personal information of people in Japan. That includes foreign businesses that supply goods or services to people in Japan. Signs of this include user, customer or employee records, account and profile fields, analytics events, device identifiers, marketing and CRM integrations, vendor SDKs, and data export or deletion features.

If the change doesn't touch personal information, report this standard as `not_applicable`.

## Checks

### [APPI Art. 17(1)] The purpose of use is specific and recorded in the code's own terms
Look for: a new collection point (form, SDK, API field, event) whose purpose isn't stated anywhere, such as in a constant, schema comment, consent text or purpose tag. Catch-all purposes like "to improve our business" used for a new feature.
Decided from code: partly. The wording of the published purpose is outside the code, but a collection point with no stated purpose is visible.

### [APPI Art. 18(1)] Personal information isn't used beyond its stated purpose without consent
Look for: data collected for one feature reused for another, such as support or account data fed into marketing, ad targeting, profiling or AI training. New jobs or queries that join datasets that were collected for different purposes.
Not a breach: use that the person agreed to, and use the Act lists as an exception, such as legal obligations.
Decided from code: partly. Whether a new use fits the stated purpose depends on what people were told.

### [APPI Art. 20(2)] Special care-required personal information is collected only with consent
Look for: new fields or inferences about medical history, disability, race, creed, social status, criminal record or crime victim status, with no consent check or documented exception. Features that infer these traits from other data. Sensitive fields that lack the stronger access control and encryption the project uses for its most sensitive data.
Decided from code: partly. Which exception applies is a legal decision.

### [APPI Art. 21(1)] People are told the purpose of use when data is collected
Look for: forms, sign-up flows, SDKs or imports that collect personal information with no notice or link to the purpose of use. Notice text that doesn't match what the new code collects.
Decided from code: partly. The code shows whether a notice is present, but not whether it is adequate.

### [APPI Art. 22] Personal data is accurate and deleted when no longer needed
Look for: tables, caches, queues, logs, exports or backups holding personal data with no expiry, TTL or deletion job. Soft-delete flags with no later purge. Update paths that let stale copies stay in search indexes or replicas.
Not a breach: data kept because a law requires it, when the code keeps only what that law needs.
Decided from code: partly. The retention period is usually a policy decision, so say what the code does and mark the rest for a person to check.

### [APPI Art. 23] Personal data is protected by security measures that fit the risk
Look for: personal data stored in plain text, sent over plain HTTP, or sent with TLS verification turned off. Missing access control on endpoints that return personal data. Personal data, tokens or whole request bodies in logs, error trackers or URLs. Broad service credentials. Removed or weakened audit logging of access to personal data.
Acceptable: pseudonymous IDs in logs, and masked values.
Decided from code: yes, for what the code stores and configures.

### [APPI Art. 25] Vendors that handle personal data for you are flagged for review
Look for: new SDKs, APIs, subprocessors or hosting regions that receive personal data, such as analytics, error tracking, email, support, cloud storage or AI services. Name the service and the data sent, so a person can confirm that the contract and oversight are in place.
Decided from code: partly. The contract and vendor oversight are outside the repository.

### [APPI Art. 26(1)] Leaks can be detected and sized so they can be reported
Look for: changes that remove or weaken security logging, alerts or audit trails for access to personal data, so a leak would go unnoticed or the team couldn't tell which people and records were affected. The PPC must usually be told promptly after a leak that is likely to harm people, and again with a full report soon after.
Decided from code: partly. Incident response is outside the repository.

### [APPI Art. 27(1)] Personal data isn't given to third parties without consent
Look for: new endpoints, webhooks, partner feeds, ad or analytics SDKs, data exports or data sales that send personal data to another company, with no consent check. Opt-out sharing code that doesn't honour a person's withdrawal.
Not a breach: handing data to a vendor that only processes it for you under a contract, to a joint user that was disclosed, or in a business transfer, which the Act treats as not being third-party provision (Art. 27(5)).
Decided from code: partly. Whether a recipient counts as a third party depends on the contract.

### [APPI Art. 28(1)] Personal data sent to a foreign third party has the person's consent or an equivalent safeguard
Look for: new storage buckets, regions, CDNs, vendors or APIs outside Japan that receive personal data. Region settings moved away from a Japanese or approved region. Name the destination country, so a person can check for consent that names it, or for a recipient with equivalent protection.
Decided from code: partly. Consent wording and contracts are outside the repository.

### [APPI Art. 29(1)] Records are kept of personal data given to third parties
Look for: new code that sends personal data to a third party and writes no log entry of the date, the recipient and the data covered. Provision logs that can be edited or lost with ordinary log rotation.
Decided from code: yes, for the code paths in the repository.

### [APPI Art. 33(1)] People can get a copy of their retained personal data
Look for: a new table, file store or third-party service holding personal data that the access-request or export code doesn't include. Exports that leak other people's data. Access-request paths with no way to verify who is asking.
Decided from code: yes, for stores the repository knows about.

### [APPI Art. 34(1)] People can have wrong personal data corrected
Look for: records a person can't correct, such as profile fields marked read-only without a request path. Corrections that update the main store but not copies in caches, search indexes, analytics stores or vendors.
Decided from code: yes, for stores the repository knows about.

### [APPI Art. 35(1)] Personal data is stopped from use or deleted on request, and the request reaches every copy
Look for: account or data deletion that misses new tables, caches, search indexes, file storage, queues, warehouses or vendors. Suppression flags that some jobs or SDKs never read. A request to stop use that is reset by a later import or sign-up.
Not a breach: keeping data that a law requires, when the code keeps only that data for that purpose.
Decided from code: yes, for stores the repository knows about.
