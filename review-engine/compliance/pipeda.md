# PIPEDA: code review checklist

Source: Government of Canada, Personal Information Protection and Electronic Documents Act (PIPEDA), S.C. 2000, c. 5, Schedule 1 (the ten principles of the CSA Model Code, CAN/CSA-Q830-96), https://laws-lois.justice.gc.ca/eng/acts/p-8.6/. The checks below are written in our own words. The numbers are the clause numbers in Schedule 1.

PIPEDA is Canada's federal private-sector privacy law. It covers personal information handled in the course of commercial activity, and several provinces have their own similar laws (Quebec, Alberta, British Columbia). The Office of the Privacy Commissioner of Canada enforces it. Breaches that pose a real risk of significant harm must be reported and recorded under the Act's breach rules, but those rules are in the body of the Act, not in Schedule 1, and are not part of this checklist.

## When this applies

Apply these checks to changed code that collects, stores, uses, discloses, or deletes personal information of individuals, in a commercial setting, especially users in Canada. Signs include Canadian customers or addresses, SIN numbers, French and English interfaces, and consent, account, profile or analytics features.

If the change doesn't handle personal information, report this standard as `not_applicable`.

## Checks

### [PIPEDA 4.1.3] Personal information passed to others stays protected
Look for: personal information sent to a vendor, processor or partner with no contract or terms limiting its use, or vendor SDKs and tags that collect more than needed, including outside Canada.
Decided from code: partly. Contracts sit outside the repository.

### [PIPEDA 4.2.3] People are told why data is collected at or before collection
Look for: forms, sign-ups, device permissions or tracking that collect personal information with no purpose notice shown first, notices that don't name the actual uses.
Decided from code: partly. The notice wording is content, and the code shows only whether it is shown.

### [PIPEDA 4.2.4] A new use is identified and agreed before it starts
Look for: existing personal information reused for a new feature (marketing, profiling, analytics, model training, sharing) with no new notice or consent step.
Decided from code: partly.

### [PIPEDA 4.3.3] Consent is not made a condition for uses the service doesn't need
Look for: sign-up or checkout flows that block the service unless the person agrees to unrelated uses such as marketing or data sharing, with no separate choice.
Decided from code: yes.

### [PIPEDA 4.3.4] Form of consent matches how sensitive the information is
Look for: sensitive information (health, financial, identity numbers, precise location) collected on implied or opt-out consent, pre-ticked boxes for sensitive uses.
Decided from code: partly. Sensitivity depends on context.

### [PIPEDA 4.3.8] People can withdraw consent
Look for: no way to withdraw consent from the account or preferences, a withdrawal that doesn't stop the processing, or that doesn't reach third parties already given the data.
Decided from code: yes.

### [PIPEDA 4.4.1] Only the information needed is collected
Look for: form fields, API fields, SDK calls or logs that gather personal information the purpose doesn't need, full records sent where an ID would do.
Decided from code: partly. Need depends on the purpose.

### [PIPEDA 4.4.2] Information is collected by fair and lawful means
Look for: hidden tracking, fingerprinting, scraping people's data from other sites, collection from device sensors without a visible request, collection that contradicts what the interface says.
Decided from code: yes, for what the code does.

### [PIPEDA 4.5.2] Retention periods are set
Look for: personal information stored with no TTL, retention job or expiry rule, inactive accounts kept forever, logs and backups with unlimited retention.
Decided from code: partly. The right period is a policy decision, so ask for it.

### [PIPEDA 4.5.3] Information no longer needed is destroyed, erased or made anonymous
Look for: delete features that leave copies in search indexes, caches, analytics stores or object storage. Soft deletes that never purge. Anonymisation that can be reversed by joining other fields.
Decided from code: partly.

### [PIPEDA 4.6.1] Information is accurate enough for its use
Look for: imports or merges that overwrite verified data with unchecked data, no validation on key fields, decisions about people made on stale or unvalidated data.
Decided from code: partly.

### [PIPEDA 4.7.1] Information is protected against loss, theft and unauthorised access, use or change
Look for: endpoints that return personal information without authentication or ownership checks, missing authorisation on records, personal information in logs, URLs or error messages, secrets in code, and missing backups for critical data.
Decided from code: yes.

### [PIPEDA 4.7.3] Technical safeguards fit the sensitivity of the information
Look for: personal information stored or sent without encryption, weak password hashing (MD5, SHA-1, unsalted hashes), TLS verification turned off, open databases or storage buckets, no limit on who can read sensitive fields.
Decided from code: yes, for what the code and configuration show.

### [PIPEDA 4.7.5] Information is disposed of carefully
Look for: exports, temporary files, downloaded attachments, caches or test copies that contain personal information and are never cleaned up. Decommission scripts that leave data behind.
Decided from code: partly. Hardware and media disposal happens outside the repository.

### [PIPEDA 4.9.1] People can find out what is held about them and how it is used
Look for: no way for a person or support staff to see, in one place, what personal information is held about them and where it has been disclosed. Access that skips logs, support tools or analytics.
Decided from code: partly.

### [PIPEDA 4.9.4] Access requests can be answered in an understandable form
Look for: export tools that produce unreadable or incomplete output, access paths that need a developer to run a query.
Decided from code: partly. Timing and cost depend on process.

### [PIPEDA 4.9.5] Wrong information can be corrected and the change passed on
Look for: fields users or staff can't fix, corrections that don't reach copies in other tables or systems, or that aren't passed to partners who received the data.
Decided from code: yes.
