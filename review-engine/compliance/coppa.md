# COPPA: code review checklist

Source: Federal Trade Commission, Children's Online Privacy Protection Rule, 16 CFR Part 312, as amended by the final rule published 22 April 2025 (90 FR 16918), https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312. The amendments took effect on 23 June 2025, and operators had until 22 April 2026 to comply with most of them. The statute is 15 U.S.C. 6501 to 6506. The checks below are written in our own words. The numbers are the Rule's section and paragraph numbers, so a finding can be traced back to the official text.

COPPA covers an operator of a website or online service, including an app, that is aimed at children under 13, or that knows it is collecting personal information from a child under 13. Personal information includes a name, contact details, a persistent identifier such as a cookie, device ID or IP address, photos, video and audio of a child, precise location, and, since the 2025 amendments, biometric identifiers. The Rule doesn't set the age or the way a service decides who is a child. That is a product decision.

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, logs or deletes personal information from users who may be under 13, in a service aimed at children or one that knows it has child users. Signs include age or birthdate fields, a "kids" mode, parent or guardian accounts, a school or toys audience, child-oriented content or characters, and analytics, advertising or third-party SDKs in those flows.

If the service has no child users and no child-directed content, or the change doesn't touch personal information, report this standard as `not_applicable`.

## Checks

### [COPPA 312.4(b)] Parents are sent direct notice before their child's data is collected
Look for: a child sign-up or data collection path that never sends the parent a notice, or one that sends it only after collection has started. Notices that aren't sent again when the data practices change in a material way.
Decided from code: partly. The notice wording is outside the code, but the sending step and its timing are visible.

### [COPPA 312.4(d)] The online privacy notice is linked where children's data is collected
Look for: child-facing screens, sign-up flows or app store listings with no link to the children's privacy notice. A notice that doesn't cover a new SDK, data type or recipient the change adds.
Decided from code: partly. The code shows the link, not the adequacy of the text.

### [COPPA 312.5(a)(1)] No personal information is collected from a child before verifiable parental consent
Look for: analytics, ad, crash-reporting or sign-up code that runs before the parent has agreed. A consent flag that defaults to true, or a consent step the client can skip. Server-side jobs that skip the consent check the UI makes.
Not a breach: the narrow exceptions in 312.5(c), such as collecting a parent's contact details only to ask for consent.
Decided from code: yes.

### [COPPA 312.5(a)(2)] Sharing a child's data with third parties needs its own separate consent
Look for: child data sent to ad networks, analytics vendors, data brokers or AI services under the same single consent as basic collection. No separate switch for disclosure. Disclosure that continues when the parent has declined it.
Not a breach: disclosure that is integral to the service, such as sending data to the vendor that runs the service.
Decided from code: partly. Whether disclosure is integral is a judgement for a person.

### [COPPA 312.5(b)] The method used to check the person consenting is the parent is a real one
Look for: a consent step that a child can complete alone, such as a tick box, an "I am a parent" button, or a date of birth entered by the child. Email-only consent in a flow that also shares the data with third parties. Missing follow-up steps for email or text consent. Government ID or face images from consent checks that are stored and not deleted promptly.
Decided from code: partly. The code shows which method is used. Whether it is likely to reach the parent is a judgement.

### [COPPA 312.5(c)(7)] Persistent identifiers are used without consent only to run the service
Look for: cookies, advertising IDs or device IDs of children used for ad targeting, behavioural profiling, retargeting or cross-service tracking, with no parental consent. Identifiers sent to ad SDKs. The exception covers only internal operations, such as keeping the service working, security and fraud prevention, and contextual ads.
Decided from code: partly. The data flow is visible, but whether a use counts as internal operations may need a person.

### [COPPA 312.5(c)(1)] Contact details collected only to ask for consent are deleted if consent doesn't come
Look for: child or parent contact details stored when a consent request is sent, with no deadline and no purge if the parent never replies. Those details reused for marketing or other purposes.
Decided from code: yes.

### [COPPA 312.6(a)] Parents can see, stop and delete their child's data
Look for: no parent-facing path to see a description of the data collected, to refuse more collection, or to delete the child's data. Deletion that misses new tables, caches, search indexes, analytics stores, file storage and vendors. A check that the requester is the parent that a child could pass.
Decided from code: yes, for stores the repository knows about.

### [COPPA 312.7] A child isn't made to give more data than the activity needs
Look for: required form fields, permissions or settings that gate a game, prize or feature but aren't needed for it, such as a required location, photo, contact list or full birthdate.
Decided from code: yes.

### [COPPA 312.8(a)] Children's data is protected by reasonable security
Look for: children's personal information stored in plain text, sent over plain HTTP, or sent with TLS verification turned off. Endpoints that return a child's data without an ownership or role check. Child data, tokens or whole request bodies in logs, error trackers or URLs.
Acceptable: pseudonymous IDs in logs, and masked values.
Decided from code: yes, for what the code stores and configures.

### [COPPA 312.8(b)] The security program has the technical safeguards the Rule lists
Look for: removal or weakening of controls the written security program depends on, such as access control, encryption, audit logging of access to children's data, security tests in CI, and monitoring or alerts. Missing safeguards for new children's data stores.
Decided from code: partly. The written program, risk assessment and named coordinator are outside the repository.

### [COPPA 312.8(c)] Children's data goes only to services that can protect it
Look for: new SDKs, APIs, vendors or hosting regions that receive children's data. Name the service and the data sent, so a person can confirm that its ability to protect the data was checked and that written assurances are in place.
Decided from code: partly. The checks and the written assurances are outside the repository.

### [COPPA 312.10] Children's data isn't kept longer than needed and is deleted for good
Look for: tables, caches, queues, logs, exports or backups holding children's data with no expiry, TTL or deletion job. Soft-delete flags with no later purge. A purge that leaves copies in replicas, search indexes or analytics stores. Children's data held indefinitely.
Decided from code: partly. The written retention policy and its published description are outside the code.
