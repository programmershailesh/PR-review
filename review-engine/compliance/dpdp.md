# Digital Personal Data Protection Act (India): code review checklist

Source: the Digital Personal Data Protection Act, 2023 (No. 22 of 2023, Gazette of India, 11 August 2023) and the Digital Personal Data Protection Rules, 2025 (G.S.R. 846(E), Gazette of India, 13 November 2025), published by the Ministry of Electronics and Information Technology at https://www.meity.gov.in/data-protection-framework. The checks below are written in our own words. IDs starting "DPDP Act Section" are section numbers of the Act, and IDs starting "DPDP Rules Rule" are rule numbers of the Rules, so a finding can be traced back to the official text.

The Act protects digital personal data: any data in digital form about a person who can be identified by it. The business that decides why and how data is processed is the Data Fiduciary. The person the data is about is the Data Principal. A Data Processor processes data on the Data Fiduciary's behalf. A child is anyone under 18.

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, logs, exports or deletes digital personal data, when the processing happens in India, or happens outside India in connection with offering goods or services to people in India. Signs of this include user and customer records, phone numbers and email addresses, consent screens, analytics and advertising SDKs, data export and deletion features, and services for users in India. The Act doesn't cover data a person has made public themselves, or data used only for personal or household purposes.

Timing: the commencement notification (G.S.R. 843(E)) and Rule 1 bring the duties in this checklist into force eighteen months after the 13 November 2025 Gazette, that is around 13 May 2027. Until then, a finding prepares the code for that date, so say so in the finding and the status note. Check for any later notification that changes these dates.

If the change doesn't touch personal data at all, report this standard as `not_applicable`.

## Checks

### [DPDP Act Section 6(1)] Consent is a clear, specific choice, limited to the data needed
Look for: pre-ticked boxes, or consent assumed from sign-up or continued use. One consent covering several unrelated purposes. Permissions or data requested that the purpose doesn't need, such as a health app asking for the phone's contact list, which the Act's own example says consent can't cover. Consent bundled with giving up a right, which section 6(2) makes invalid.
Not a breach: processing under a legitimate use in section 7, such as data the person gave for a specific purpose without objecting to its use.
Decided from code: partly. Whether a legitimate use applies is a legal decision.

### [DPDP Rules Rule 3] The consent notice lists the data and purposes, and how to withdraw, use rights and complain
Look for: consent screens with no itemised list of the personal data, no specific purpose and description of what it enables, or no link or way to withdraw consent, use rights, and complain to the Data Protection Board. A notice buried in general terms instead of standing on its own. The Act also says the notice must come with or before the consent request.
Decided from code: partly. Notice text may come from a content system outside the repository.

### [DPDP Act Section 6(4)] Withdrawing consent is as easy as giving it
Look for: one-tap consent in the app with withdrawal only by email or a support request. Withdrawal hidden deep in settings, or missing for some of the purposes the person agreed to.
Decided from code: yes.

### [DPDP Act Section 6(6)] Withdrawal stops the processing, including at Data Processors
Look for: withdrawal that sets a flag which some jobs, caches, SDKs or vendor syncs never read. No call or notice to Data Processors that also use the data.
Not a breach: processing that a law requires or allows without consent.
Decided from code: yes, for flows in this repository.

### [DPDP Act Section 6(10)] The business can prove notice and consent were given
Look for: consent stored as a bare true or false, with no time, no notice version and no purpose. Consent records overwritten instead of kept as history.
Decided from code: yes.

### [DPDP Act Section 8(2)] Data Processors are used only under a valid contract
Look for: new SDKs, APIs or vendors that receive personal data, such as analytics, messaging, hosting, support, or AI and LLM services. Name the service and the data sent, so a person can confirm a contract is in place.
Decided from code: partly. The contract is outside the repository.

### [DPDP Act Section 8(5)] Personal data doesn't leak through logs, errors or URLs
Look for: names, phone numbers, email addresses, ID numbers, tokens or whole request bodies written to application logs, error trackers or crash reports. Personal data in URL paths or query strings. Error responses that show other users' data.
Acceptable: internal or pseudonymous IDs in logs, and masked values.
Decided from code: yes.

### [DPDP Rules Rule 6(1)(a)] Personal data is encrypted, masked or tokenised
Look for: personal data stored in plain text where encryption, masking, obfuscation or tokens would fit, such as ID numbers, financial data or contact details in new tables, files, exports or backups. Personal data sent over plain HTTP or with TLS verification turned off.
Decided from code: yes, for what the code stores and configures.

### [DPDP Rules Rule 6(1)(b)] Access to systems holding personal data is controlled
Look for: endpoints that read or change another person's data without an ownership or role check, such as IDs taken from the request and trusted. Admin tools without authorisation. Service credentials far broader than the feature needs.
Decided from code: yes, for checks done in code.

### [DPDP Rules Rule 6(1)(c)] Access to personal data is logged so misuse can be found
Look for: new ways to read, export or change personal data that don't record who did it and when. Access logging removed or turned down. Logs that can't show which records were touched.
Decided from code: partly. Monitoring and review of the logs happen outside the repository.

### [DPDP Rules Rule 6(1)(e)] Access logs are kept for one year
Look for: retention for access logs, and the personal data needed to investigate them, set below one year, unless another law sets a different period. Rule 8(3) separately sets a one-year minimum for processing logs.
Not a breach: keeping little personal data in logs. This rule is about keeping logs long enough to investigate, not a reason to log more personal data.
Decided from code: partly. Log retention is often set in infrastructure outside the repository.

### [DPDP Rules Rule 7] Breaches can be detected and reported to each affected person and to the Board
Look for: changes that remove security alerts or audit trails, so a breach would go unnoticed or its extent couldn't be worked out. No way to reach affected people through their account or registered contact details. The Board must get a detailed report within 72 hours of the business becoming aware of a breach.
Decided from code: partly. Incident response is outside the repository.

### [DPDP Act Section 8(7)] Data is erased when consent is withdrawn or the purpose is served
Look for: consent withdrawal or account closure that leaves personal data in place. No deletion job once the purpose has ended. Data Processors not told to erase their copies.
Not a breach: data a law requires the business to keep, such as a bank's customer identity records.
Decided from code: partly. When a purpose has ended can be a business decision.

### [DPDP Rules Rule 8(1)] Large platforms erase inactive users' data after three years, with notice
Look for: in an e-commerce entity or social media intermediary with at least two crore (20 million) registered users in India, or an online gaming intermediary with at least fifty lakh (5 million), no job that erases personal data three years after the user last used the service or their rights. Also a job that erases without first warning the user at least 48 hours ahead, which Rule 8(2) requires.
Not a breach: keeping what's needed to let the user reach their account, or any stored virtual token that can be used to get money, goods or services, which the Rules exclude. Data a law requires the business to keep.
Decided from code: partly. Whether the business is in one of these classes is outside the code.

### [DPDP Act Section 9(1)] Children's data is processed only with verifiable parental consent
Look for: sign-up or onboarding that can create accounts for under-18s with no age step and no parental consent. A parent's consent accepted without checking that the parent is an identifiable adult, as Rule 10 describes.
Not a breach: classes of businesses and purposes exempted in the Fourth Schedule of the Rules (Rule 12).
Decided from code: partly. The exemptions depend on who the business is.

### [DPDP Act Section 9(3)] Children aren't tracked, monitored or shown targeted ads
Look for: tracking SDKs, behavioural monitoring or analytics, or targeted advertising enabled for users the code knows or should treat as under 18.
Not a breach: the exemptions in the Fourth Schedule of the Rules (Rule 12).
Decided from code: yes, when the code knows the user is a child.

### [DPDP Act Section 11(1)] People can see a summary of their data and who it was shared with
Look for: an access feature that leaves out a new store, or doesn't list the other Data Fiduciaries and Data Processors the data was shared with and what was shared.
Decided from code: yes, for stores and integrations the repository knows about.

### [DPDP Act Section 12(3)] Erasure requests remove the data everywhere
Look for: deletion that misses new tables, caches, search indexes, file storage, analytics stores, or copies held by Data Processors.
Not a breach: data still needed for the purpose the person agreed to, or that a law requires the business to keep.
Decided from code: yes, for stores the repository knows about.

### [DPDP Act Section 16(1)] Personal data isn't sent to countries the government has restricted
Look for: new endpoints, regions, storage buckets or vendors outside India that receive personal data. Name the destination, so a person can check it against any countries the government has restricted, and against sector rules that require data to stay in India.
Decided from code: partly. Restrictions are set by notification, outside the repository.
