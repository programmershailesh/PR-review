# Singapore PDPA: code review checklist

Source: Government of Singapore, Personal Data Protection Act 2012 (2020 Revised Edition), https://sso.agc.gov.sg/Act/PDPA2012. The Personal Data Protection Commission (PDPC) publishes advisory guidelines, https://www.pdpc.gov.sg. The checks below are written in our own words. The numbers are the Act's section numbers ("s 24" is section 24).

The PDPA governs how organisations collect, use and disclose personal data of individuals in Singapore. It sets a set of data protection obligations (consent, purpose, notification, access and correction, accuracy, protection, retention, transfer limitation and breach notification) and a Do Not Call (DNC) regime for marketing messages. Many obligations are organisational, so code review sees only the technical part. The Act's data portability provisions are not covered here because they are not yet in force.

## When this applies

Apply these checks to changed code that collects, uses, discloses, stores, or deletes personal data of individuals in Singapore, or that sends marketing messages to Singapore telephone numbers. Signs include NRIC or FIN numbers, Singapore addresses and phone numbers (+65), and consent, account, profile, analytics or messaging features.

If the change doesn't handle personal data or telephone marketing, report this standard as `not_applicable`.

## Checks

### [PDPA s 11(5)] A data protection contact is available to the public
Look for: removal of the data protection officer's or privacy team's business contact details from the product, such as a privacy page, footer or app settings screen that no longer gives any way to reach them.
Decided from code: partly. The contact may be published somewhere outside the repository.

### [PDPA s 12] People can raise complaints and get information about data protection practices
Look for: a privacy complaint or enquiry form, address or link that is removed or broken, and no way from the product to find or ask for the data protection policy where personal data is collected.
Decided from code: partly. The policies and the complaint process themselves are outside the code.

### [PDPA s 13] Consent is obtained before collection, use or disclosure that needs it
Look for: personal data collected, used or shared before the person agrees. Pre-ticked boxes. Consent to uses beyond what is reasonable for a product or service made a condition of getting it (also s 14). No record of when, how and for what the consent was given.
Not a breach: processing under a legal exception in the Act, such as deemed consent or legitimate interests, if the project says so.
Decided from code: partly. Which basis applies is a decision outside the code.

### [PDPA s 16] People can withdraw consent
Look for: no withdrawal control, withdrawal that needs a support request, withdrawal that doesn't stop the processing, including by processors and agents acting for the organisation, or that never tells the person the likely consequences.
Decided from code: yes.

### [PDPA s 18] Data is used only for purposes a reasonable person would find appropriate and the person was told about
Look for: data collected for one feature and reused for another (marketing, profiling, analytics, model training) with no new notice or consent, and new recipients of existing data.
Decided from code: partly.

### [PDPA s 20] People are told the purposes at or before collection
Look for: forms, sign-ups or device permissions that collect personal data with no purpose notice shown first, or notices that don't match what the code does.
Decided from code: partly. Notice wording is content.

### [PDPA s 21] People can get access to their personal data and know how it was used
Look for: no export or access path, access that skips logs, support tools or analytics, no record of disclosures in the past year.
Decided from code: partly.

### [PDPA s 22] People can have wrong data corrected, and the correction is passed on
Look for: fields users or staff can't fix, corrections that don't reach copies in other tables or systems, or recipients who received the data in the past year.
Decided from code: yes.

### [PDPA s 23] Data used for decisions or disclosed to others is reasonably accurate and complete
Look for: imports or merges that overwrite verified data with unchecked data, missing validation on key fields, disclosure of data that is known to be stale.
Decided from code: partly.

### [PDPA s 24] Reasonable security arrangements protect personal data
Look for: missing authentication or ownership checks on personal data, data stored or sent without encryption, TLS verification turned off, weak password hashing, secrets in code, personal data in logs or URLs, public storage buckets, open databases, and storage on devices or removable media that could be lost with the data readable.
Decided from code: yes, for what the code and configuration show.

### [PDPA s 25] Data is not kept longer than needed
Look for: personal data with no TTL, retention job or deletion rule, inactive accounts kept forever, deletion that leaves copies in indexes, caches or analytics. Anonymisation that can be reversed.
Acceptable: keeping data for a business or legal purpose the project can name.
Decided from code: partly. The business or legal need is a decision outside the code.

### [PDPA s 26] Transfers outside Singapore keep comparable protection
Look for: personal data sent to servers, vendors or SDKs outside Singapore (new regions, cloud services, analytics, support tools, AI services) with no contract, certification or other mechanism that protects it.
Decided from code: partly. The transfer mechanism is usually a contract outside the repository.

### [PDPA s 26B] Breaches that need notifying can be recognised
Look for: removed or missing audit logs for access to personal data, swallowed security errors and removed alerting, so that unauthorised access, copying, change or loss goes unnoticed. Pay most attention to data whose exposure would cause significant harm, such as identity numbers, financial, health and account credential data, and to bulk access paths.
Decided from code: partly. Whether a breach is notifiable depends on harm or scale.

### [PDPA s 26C] A suspected breach can be assessed quickly
Look for: missing logs, records or inventory that would let a team find out what data, how many people and what harm, promptly enough for a reasonable and expeditious assessment. A service that processes data for another organisation and has no way to tell it of a suspected breach without undue delay.
Decided from code: partly. The assessment process is outside the repository.

### [PDPA s 26D] The PDPC and affected people can be notified
Look for: no way to list affected people with contact details and what data was involved, or no working way to message them. Encryption or similar protection removed, which would otherwise make significant harm unlikely and spare individual notification.
Decided from code: partly. Notification is a process outside the repository, and the Commission must be told within three calendar days of the assessment.

### [PDPA s 43] Telephone marketing checks the Do Not Call register
Look for: code that sends marketing calls, SMS or messaging to Singapore numbers with neither a recent check of the relevant DNC register nor clear and unambiguous consent that is kept on record. Bulk marketing jobs with no DNC check step, or that reuse old check results with no expiry.
Not a breach: messages that are not marketing, such as service or transactional messages.
Decided from code: partly. Whether a message counts as marketing depends on content.

### [PDPA s 44] Marketing messages identify the sender
Look for: marketing message templates or sending code with no clear name of the organisation behind the message and no working way to contact it.
Not a breach: messages that are not marketing.
Decided from code: yes, for templates in the repository.

### [PDPA s 45] Marketing calls don't hide the caller's number
Look for: dialler or telephony code that withholds, masks or suppresses the calling line identity on marketing voice calls.
Decided from code: yes, for call settings in the repository.

### [PDPA s 47] Consent to marketing messages can be withdrawn and is honoured
Look for: no opt-out for marketing calls or messages, an opt-out that is blocked or hidden, or one that doesn't reach every sending job, list and agent. Suppression lists overwritten by imports.
Decided from code: yes.
