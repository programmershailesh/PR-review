# GDPR: code review checklist

Source: Regulation (EU) 2016/679, the General Data Protection Regulation (Official Journal L 119, 4 May 2016), https://eur-lex.europa.eu/eli/reg/2016/679/oj, checked against the text in force in November 2026. The European Commission's 2025 "Digital Omnibus" proposal to amend the GDPR was still before the European Parliament at that date, so it isn't reflected here. The checks below are written in our own words. The numbers are the Regulation's article, paragraph and point numbers, so a finding can be traced back to the official text.

The UK GDPR uses the same article numbers and mirrors these articles. The UK's Data (Use and Access) Act 2025, mostly in force since 5 February 2026, changed some UK rules, including automated decisions, lawful bases, purpose limitation, subject access searches and international transfers. For a UK-only service, check the UK text before relying on those checks.

The GDPR protects personal data: any information about a person who can be identified, directly or indirectly. That includes names, email addresses, ID numbers, location data, IP addresses, device and cookie identifiers, and anything that can be linked back to a person.

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, logs, exports or deletes personal data, in a project the GDPR covers: one run by an organisation based in the EU, or one that offers goods or services to people in the EU or monitors their behaviour there. Signs of this include user, customer or employee records, contact details, account and profile fields, analytics and tracking events, cookie or device identifiers, location data, marketing and CRM integrations, and data export or deletion features.

Rules on storing or reading cookies and other data on a user's device come from the ePrivacy Directive and national laws, not the GDPR. Cite these checks for the personal data processing itself, not for the cookie rule. If the change doesn't touch personal data at all, report this standard as `not_applicable`.

## Checks

### [GDPR Art. 5(1)(b)] Personal data is used only for the purpose it was collected for
Look for: data collected for one feature reused for an unrelated one. Examples are support tickets or account emails fed into marketing, ad targeting or AI training, or a new job that joins datasets collected for different reasons.
Decided from code: partly. Whether a new use fits depends on what people were told, which is outside the code.

### [GDPR Art. 5(1)(c)] Only the personal data a feature needs is collected
Look for: new form fields, columns or API parameters the feature doesn't use. `SELECT *` or whole user objects returned to clients. Analytics or tracking events that include names, emails or free text. Precise location where a rough one would do.
Decided from code: yes.

### [GDPR Art. 5(1)(e)] Personal data isn't kept longer than needed
Look for: new tables, caches, queues, logs, exports or backups holding personal data with no expiry, TTL or deletion job. Soft-delete flags with no later purge. "Temporary" copies that are never removed.
Decided from code: partly. The retention period itself is usually a policy decision, so say what the code does and mark the rest for a person to check.

### [GDPR Art. 5(1)(f)] Personal data doesn't leak through logs, errors or URLs
Look for: names, emails, phone numbers, addresses, ID numbers, tokens or whole request bodies written to application logs, error trackers, debug output or crash reports. Personal data in URL paths or query strings. Error responses that show other users' data.
Acceptable: internal or pseudonymous IDs in logs, and masked values.
Decided from code: yes.

### [GDPR Art. 6(1)(a)] Processing that relies on consent waits for consent
Look for: analytics, advertising, marketing or tracking code that starts before the person has agreed. Consent flags that default to true. Pre-ticked boxes, or silence or continued use treated as agreement. Server-side jobs or calls that skip the consent check the UI makes.
Not a breach: processing that rests on another lawful basis, such as delivering the service the person signed up for.
Decided from code: partly. Which lawful basis applies is a legal decision outside the code.

### [GDPR Art. 7(1)] Consent can be proven
Look for: consent stored as a bare true or false, with no time, no version of the text shown, and no record of what it covered. Consent records overwritten instead of kept as history. Consent that can't be linked to the person.
Decided from code: yes.

### [GDPR Art. 7(3)] Withdrawing consent is as easy as giving it, and it works
Look for: a one-click opt-in with no matching opt-out in the product. Withdrawal routed through email or support when consent was given in the app. Withdrawal that updates a flag which some jobs, caches, third-party audiences or SDKs never read.
Decided from code: yes.

### [GDPR Art. 9(1)] Special category data gets extra protection
Look for: new fields or inferences about health, racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data used to identify someone, sex life or sexual orientation. Flag them when there is no explicit consent check or other documented condition, or when they lack the stronger access control, encryption and logging the project uses for its most sensitive data. Also flag features that infer these traits from other data.
Decided from code: partly. Which Article 9(2) condition applies is a legal decision.

### [GDPR Art. 15(3)] People can get a copy of their personal data
Look for: a new table, file store or third-party service holding personal data that the data export or access-request code doesn't include. Exports that pull in other people's personal data, such as other members of a shared thread, without care.
Decided from code: yes, for stores the repository knows about.

### [GDPR Art. 17(1)] Deleting a person's data removes it everywhere
Look for: account or data deletion that misses new tables, caches, search indexes, analytics stores, file storage, queues, data warehouses or logs that hold personal data. Soft delete with no purge.
Not a breach: keeping data that a law requires, or that is needed for legal claims, when the code keeps only that data for that purpose.
Decided from code: yes, for stores the repository knows about.

### [GDPR Art. 19] Corrections and deletions reach the services the data was shared with
Look for: deletion, correction or restriction flows that don't notify or call the services the data was sent to, such as email, CRM, support, analytics or advertising platforms.
Decided from code: partly. Some recipients may be handled by a manual process outside the repository.

### [GDPR Art. 21(3)] Marketing stops when a person objects
Look for: marketing emails, push campaigns, audience syncs or marketing profiling that don't check the unsubscribe or objection flag. New campaign paths that bypass the existing suppression list. An objection that is reset by a later sign-up or import.
Decided from code: yes.

### [GDPR Art. 22(1)] Significant decisions aren't left solely to automation
Look for: code that automatically rejects, bans, scores out or prices people for things like credit, hiring, insurance or account closure, with no human review step and no way to contest the result.
Not a breach: automation where a person really reviews the outcome before it takes effect, or decisions with no legal or similarly significant effect.
Decided from code: partly. Whether an Article 22(2) exception applies is a legal decision.

### [GDPR Art. 25(2)] Defaults protect privacy
Look for: new settings that default to sharing, public profiles, being findable by email or phone, location tracking or personalised ads. Optional data collection switched on by default. Data made visible to everyone unless the person acts.
Decided from code: yes.

### [GDPR Art. 28(1)] New services that process personal data for you are flagged for review
Look for: new SDKs, APIs or vendors that receive personal data, such as analytics, error tracking, email, support, hosting, or AI and LLM services. Name the service and the data sent, so a person can confirm it has been vetted and has a data processing agreement.
Decided from code: partly. The contract and vendor review are outside the repository.

### [GDPR Art. 32(1)(a)] Personal data is encrypted or pseudonymised where the risk calls for it
Look for: sensitive personal data stored in plain text. Unencrypted exports or backups. Personal data sent over plain HTTP or with TLS verification turned off. Direct identifiers used where a pseudonymous ID would do.
Decided from code: yes, for what the code stores and configures.

### [GDPR Art. 32(1)(b)] Personal data stays confidential and intact
Look for: endpoints that read or change another person's data without an ownership or role check, such as IDs taken from the request and trusted. Admin tools without authorisation. Queries in multi-tenant systems without a tenant filter. Service credentials far broader than the feature needs.
Decided from code: yes, for checks done in code.

### [GDPR Art. 33] Breaches can be noticed and sized in time to report them
Look for: changes that remove or weaken security logging, alerts or audit trails for access to personal data, so that a breach would go unnoticed or the team couldn't tell which people and records were affected. The supervisory authority must usually be told within 72 hours, and the notice should give, where possible, the approximate number of people and records involved.
Decided from code: partly. Incident response is outside the repository.

### [GDPR Art. 44] Personal data isn't sent outside the EU without a transfer basis
Look for: new endpoints, regions, storage buckets, CDNs or vendors outside the EU and EEA that receive personal data, or region settings moved away from an EU region. Name the destination, so a person can check for an adequacy decision or safeguards such as standard contractual clauses.
Decided from code: partly. Adequacy decisions and contracts are outside the repository.
