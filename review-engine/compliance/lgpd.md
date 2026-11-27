# LGPD: code review checklist

Source: Presidency of the Republic of Brazil, Lei Geral de Proteção de Dados Pessoais (LGPD), Lei nº 13.709 of 14 August 2018, as amended, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. The checks below are written in our own words. The numbers are the law's article, section (§) and item (inciso) numbers.

The LGPD governs the processing of personal data of people in Brazil, or collected in Brazil, or processed to offer goods or services there. The national authority is the ANPD. Sensitive data (such as health, biometric, genetic, racial or ethnic origin, religion, political opinion) has stricter rules. Many LGPD duties are organisational, so code review sees only the technical part.

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, or deletes personal data of individuals in Brazil. Signs include a CPF number, Brazilian addresses or phone numbers, Portuguese-language user flows, Brazilian customer bases, and consent or cookie features aimed at those users.

If the change doesn't process personal data, report this standard as `not_applicable`.

## Checks

### [LGPD Art. 6, III] Only the data needed for the purpose is collected
Look for: new form fields, API fields, tracking events or database columns for personal data that the feature doesn't need. Whole user objects sent to services that need only an ID. Sensitive data collected "just in case".
Decided from code: partly. What is necessary depends on the purpose, so say what the code collects and ask why.

### [LGPD Art. 6, I] Data is used only for the purposes told to the person
Look for: personal data collected for one feature and reused for another (marketing, profiling, analytics, model training) with no matching notice or consent. New recipients of existing data.
Decided from code: partly. The purposes the person was told are in notices outside the code.

### [LGPD Art. 7, I] Consent is taken before processing that depends on it
Look for: tracking, marketing messages, profiling or sharing started before the person agrees. Pre-ticked boxes. Consent bundled with other terms. No record of when and how consent was given and for which purpose.
Not a breach: processing that rests on another legal basis in Art. 7, such as a contract or legal duty, if the project says so.
Decided from code: partly. The legal basis is a decision outside the code.

### [LGPD Art. 8, §5] People can withdraw consent as easily as they gave it
Look for: no withdrawal control, withdrawal that needs support contact, withdrawal that doesn't stop the processing or reach the third parties that received the data.
Decided from code: yes.

### [LGPD Art. 11] Sensitive personal data has its own basis and tighter handling
Look for: health, biometric, genetic, religious, political or similar data collected or inferred without specific, highlighted consent or another basis listed in Art. 11. Sensitive data in logs, analytics or general-purpose tables.
Decided from code: partly.

### [LGPD Art. 14, §1] Children's data needs parental consent
Look for: sign-up flows that collect data from users under 12, or possibly under 18 for adolescents, with no age check or no way to obtain consent from a parent or guardian. Data from minors passed to third parties.
Decided from code: partly. The age threshold and its reading are legal judgments.

### [LGPD Art. 15] Processing ends when its purpose is done
Look for: personal data kept after the purpose is achieved, after consent is withdrawn or after the period ends, with no job, TTL or lifecycle rule. Inactive accounts kept forever.
Decided from code: partly.

### [LGPD Art. 16] Data is deleted after processing ends, except where the law allows keeping it
Look for: deletion that leaves copies in backups with no expiry, search indexes, caches, analytics stores or partner systems. Soft deletes that never purge. Anonymisation that can be reversed.
Acceptable: keeping data for a legal duty, research with anonymisation, or other cases listed in Art. 16.
Decided from code: partly.

### [LGPD Art. 18, II] People can get access to their data
Look for: no export or access path for a person's data, access that skips systems such as logs, support tools or analytics, exports in formats that can't be read.
Decided from code: yes.

### [LGPD Art. 18, III] People can have their data corrected
Look for: profile or record fields that users and staff can't fix, corrections that don't reach copies in other tables or systems.
Decided from code: yes.

### [LGPD Art. 18, IV] Unnecessary or unlawfully processed data can be anonymised, blocked or deleted
Look for: no deletion or restriction path, deletion that skips related tables or processors, no way to block further use while a request is open.
Decided from code: yes.

### [LGPD Art. 18, §6] Corrections, deletions and blocks are passed to those who received the data
Look for: sharing with processors or partners with no way to forward correction, deletion or blocking requests, no list of recipients.
Decided from code: partly.

### [LGPD Art. 37] Processing activities are recorded
Look for: new flows of personal data with no entry in the project's record of processing, new processors or purposes not reflected in it.
Decided from code: partly. The record sits outside the repository, so ask for it.

### [LGPD Art. 39] Processors act only on the controller's instructions
Look for: a processor or service that uses personal data for its own purposes (such as vendor analytics or model training), data sent to a vendor with no contract or scope, a vendor SDK added that collects extra data.
Decided from code: partly.

### [LGPD Art. 46] Technical measures protect data from unauthorised access and accidental loss
Look for: missing access control on personal data, data stored or sent without encryption, secrets in code, personal data in logs, no backup for critical data, weak password storage, broad network exposure of databases.
Decided from code: yes, for what the code and configuration show.

### [LGPD Art. 46, §2] Security is built in from the design stage
Look for: new features that process personal data with no access control, minimisation or retention plan in their design, privacy-hostile defaults such as sharing on by default.
Decided from code: partly.

### [LGPD Art. 48] Security incidents can be detected and reported
Look for: removed or missing logging of access to personal data, no way to tell which people's data an incident reached, swallowed security errors, alerting removed. Data kept encrypted so that an incident leaves it unreadable to an attacker.
Decided from code: partly. The notification to ANPD and affected people is a process outside the repository.
