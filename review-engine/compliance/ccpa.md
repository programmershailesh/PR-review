# CCPA and CPRA: code review checklist

Source: California Consumer Privacy Act of 2018 as amended by the California Privacy Rights Act (Proposition 24), California Civil Code 1798.100 onward, in the version effective 1 January 2026, and the CCPA regulations in California Code of Regulations, Title 11, Division 6, Chapter 1 (section 7000 onward), also effective 1 January 2026. Both are published by the California Privacy Protection Agency (CalPrivacy) at https://cppa.ca.gov/regulations/, and the statute is also at https://leginfo.legislature.ca.gov/. The checks below are written in our own words. IDs starting "CCPA" are Civil Code section numbers. IDs starting "CCPA Regs" are regulation section numbers. Both can be traced back to the official text.

The CCPA protects the personal information of California residents. It gives them the right to know, delete and correct their data, to opt out of its sale or sharing, and to limit the use of sensitive personal information. "Sharing" means giving personal information to a third party for cross-context behavioural advertising, whether or not money changes hands.

## When this applies

Apply these checks only when the project belongs to a business the CCPA covers and the changed code handles personal information of California residents. Signs of this include advertising pixels and tags, ad and attribution SDKs, audience syncs, data sales or partner exports, the Global Privacy Control signal, "Do Not Sell or Share" or "Limit the Use" links, privacy request (access, deletion, correction) flows, and sensitive personal information such as government ID numbers, account logins, precise location, health, biometric or genetic data, and the contents of messages.

The regulations on automated decisionmaking technology (Article 11) must be met by 1 January 2027 for technology already in use, and from first use after that date. If the change doesn't touch personal information at all, report this standard as `not_applicable`.

## Checks

### [CCPA 1798.100(c)] Personal information is collected and used only as far as needed
Look for: new fields, device permissions (contacts, precise location, microphone) or data uses that go beyond what the feature needs or what users would expect. Data collected for one purpose reused for an unrelated one. The regulations say to weigh the minimum personal information needed for the purpose.
Decided from code: partly. What users were told is in the privacy notice, which may be outside the repository.

### [CCPA 1798.100(a)(3)] Personal information isn't kept longer than needed
Look for: new tables, caches, logs, exports or backups holding personal information with no expiry, TTL or deletion job. Copies kept "just in case" with no end date.
Decided from code: partly. The retention period is a policy decision, so say what the code does.

### [CCPA 1798.100(e)] Personal information is protected by reasonable security
Look for: sensitive personal information stored in plain text, such as government ID numbers, account logins with passwords, financial account numbers, health or biometric data. Missing access checks on endpoints that return personal information. TLS verification turned off. Secrets in code. Consumers can sue over breaches of certain kinds of personal information that was neither encrypted nor redacted, when the breach came from a lack of reasonable security (1798.150), so encryption and redaction matter most.
Decided from code: partly. Security outside the repository can't be judged from code.

### [CCPA 1798.105(c)(1)] Deletion removes the data and reaches service providers and third parties
Look for: deletion that misses new tables, caches, search indexes, file storage or analytics stores. No call or notice to service providers and contractors. No notice to third parties the data was sold to or shared with.
Acceptable: deidentifying or aggregating the data instead of erasing it. Leaving archived or backup copies until that backup is restored or next used, which the regulations allow (CCPA Regs 7022). Keeping data under a listed exception, such as completing a transaction, security or a legal obligation, when the code keeps only what the exception needs.
Decided from code: yes, for stores and integrations the repository knows about.

### [CCPA 1798.130(a)(3)(A)] Access requests return all the personal information held
Look for: an access or "download my data" feature that leaves out a new store, including data held for the business by a service provider or contractor.
Decided from code: yes, for stores the repository knows about.

### [CCPA Regs 7024(d)] Access responses never reveal the most sensitive values
Look for: data exports that include Social Security numbers, driver's licence or other government ID numbers, financial account numbers, health insurance or medical ID numbers, account passwords, security questions and answers, or biometric data. The response should say these are held without showing them.
Decided from code: yes.

### [CCPA Regs 7061(a)] Users sign in again before deleting, correcting or downloading their data
Look for: in products with password-protected accounts, account deletion, data correction or data export reachable with only an existing session, with no password, multi-factor or other re-authentication step.
Decided from code: yes.

### [CCPA 1798.120(d)] Once a person opts out, their data isn't sold or shared
Look for: advertising pixels, tags and SDKs, audience syncs, server-side conversion events, or partner and data broker exports that run without checking the opt-out state. New data flows to third parties that bypass the existing opt-out check.
Decided from code: yes, for flows in this repository.

### [CCPA Regs 7025(c)(1)] Opt-out preference signals are honoured
Look for: a site or app that sells or shares personal information but doesn't read an opt-out preference signal such as Global Privacy Control (the `Sec-GPC: 1` header or `navigator.globalPrivacyControl`). Code that reads the signal but applies it only to the cookie banner, rather than to that browser or device, any profile linked to it, and the signed-in person when known. A change that removes existing support.
Not a breach: a business that doesn't sell or share personal information.
Decided from code: yes.

### [CCPA Regs 7025(c)(5)] A later visit without the signal doesn't undo the opt-out
Look for: code that treats a request without the signal as permission to resume selling or sharing for a known person who sent the signal before, for example by resetting the opt-out flag on each visit or on a new device.
Decided from code: yes.

### [CCPA Regs 7025(c)(6)] The site shows that the signal was honoured
Look for: signal handling with no visible status for the person, such as an "Opt-Out Request Honored" message or a privacy setting that shows they are opted out.
Decided from code: yes.

### [CCPA Regs 7026(f)] Opt-outs take effect within 15 business days and reach third parties
Look for: opt-out handling that only sets a flag, with no step that stops downstream sharing. No notice to third parties that received the person's data after the request and before it took effect. Batch jobs that keep sending data until someone changes them by hand.
Decided from code: partly. Some downstream steps may be manual.

### [CCPA 1798.135(c)(1)] Opting out needs no account and no extra information
Look for: opt-out or "limit" pages that require signing in, creating an account, or giving more details than needed to carry out the request. Data collected for the request and then reused for anything else, which 1798.135(c)(6) forbids.
Decided from code: yes.

### [CCPA Regs 7004(a)(2)] The privacy-protective choice is as easy as the other one
Look for: consent or opt-out screens where "Accept all" takes one click but declining takes more steps, is hidden, greyed out or confusingly worded. Toggles whose state is unclear. Extra confirmation steps only on the privacy-protective path. Agreement obtained through dark patterns like these doesn't count as consent.
Decided from code: yes.

### [CCPA 1798.121(b)] Sensitive personal information is limited when the person asks
Look for: precise location, government ID numbers, health, biometric, genetic, racial or ethnic origin, sexual orientation or message content used for advertising, profiling or other purposes beyond providing the service, after the person has used "Limit the Use of My Sensitive Personal Information". New uses of sensitive data that don't check the limit flag.
Decided from code: partly. Some purposes are allowed even after a limit request, such as security and fraud prevention, so check the purpose before flagging.

### [CCPA 1798.120(c)] Data of users under 16 isn't sold or shared without opt-in
Look for: ad or data-sharing code that runs for users the business knows are under 16, such as from a birth date or age field, without opt-in from the user if they are 13 to 15, or from a parent or guardian if under 13.
Decided from code: yes, when the code knows the user's age.

### [CCPA 1798.125(a)(1)] People aren't penalised for using their rights
Look for: code that blocks features, lowers service quality, or changes prices for people who opted out, asked for deletion, or limited the use of sensitive data.
Not a breach: a financial incentive program that the law allows, with notice and opt-in consent.
Decided from code: partly. Whether an incentive program is disclosed is outside the code.

### [CCPA Regs 7221(a)] People can opt out of automated significant decisions
Look for: new automated decisionmaking technology that makes significant decisions, meaning decisions that give or deny financial or lending services, housing, education enrolment or opportunities, employment or contracting opportunities or pay, or healthcare services, with no opt-out and no appeal to a human reviewer who can overturn the result.
Not a breach: an appeal to a human reviewer that meets the conditions in 7221(b)(1), offered instead of an opt-out.
Decided from code: partly. Whether the system counts as automated decisionmaking technology, and whether an exception applies, needs a person to check.
