# FERPA: code review checklist

Source: U.S. Department of Education, Family Educational Rights and Privacy Act regulations, 34 CFR Part 99, https://www.ecfr.gov/current/title-34/subtitle-A/part-99, implementing the statute at 20 U.S.C. 1232g. The checks below are written in our own words. The numbers are the regulation's section and paragraph numbers, so a finding can be traced back to the official text.

FERPA protects education records: records that directly relate to a student and are kept by a school or by a party acting for it. It applies to schools and agencies that receive federal education funds. A software vendor is covered when it holds education records for a school as a "school official" under 99.31(a)(1), or when it receives them from a school. Rights belong to a parent, or to the student once the student is 18 or attends a postsecondary school (an "eligible student").

## When this applies

Apply these checks to changed code that collects, stores, uses, shares, exports, logs or deletes student records, in a product used by schools, districts, colleges or education agencies, or by a vendor acting for them. Signs include student, grade, attendance, enrolment, discipline, special education, financial aid or class records, roster syncs, parent and teacher portals, learning platforms and LMS integrations, and analytics or AI features built on student data.

If the change doesn't touch student records, report this standard as `not_applicable`.

## Checks

### [FERPA 99.10(a)] Parents and eligible students can inspect their records
Look for: new tables, file stores or vendor services holding student data that the record-access or export code leaves out. Access paths that give a parent or student another student's data, such as an ID taken from the request and trusted.
Decided from code: yes, for stores the repository knows about.

### [FERPA 99.10(e)] Records aren't destroyed while a request to see them is pending
Look for: retention or deletion jobs that purge student records with no check for an open access request or hold. Deletion tools that skip the hold flag.
Decided from code: yes, for the jobs in the repository.

### [FERPA 99.20] Parents and eligible students can ask for wrong records to be amended
Look for: student fields that are read-only with no request path. Corrections that update the main store but leave stale copies in caches, search indexes, reports, exports or downstream vendors.
Decided from code: partly. The decision on a request is a school process, but the way to submit it and apply it is visible.

### [FERPA 99.30(a)] Student records aren't disclosed without signed, dated consent unless an exception applies
Look for: new endpoints, exports, webhooks, partner feeds, third-party SDKs or reports that send student-identifying data outside the school, with no consent check and no stated exception. Data sent to advertising or analytics services.
Not a breach: disclosures that rest on an exception in 99.31, such as to a school official with a legitimate educational interest.
Decided from code: partly. Which exception applies is a legal decision.

### [FERPA 99.30(b)] A consent names the records, the purpose and the recipient
Look for: consent stored as a bare true or false. Consent forms that don't say which records, why and to whom. Consent that can't be linked to the parent or student, or that is overwritten rather than kept with its date and version. Electronic signatures that don't identify the signer.
Decided from code: yes, for consent records the code makes.

### [FERPA 99.31(a)(1)(i)(A)] Staff see only the records they have a legitimate educational interest in
Look for: role models where every teacher, staff member or admin can read every student's record. Missing class, school or district scoping on queries. Admin or support tools that show student data without a role check.
Decided from code: yes, for checks made in code.

### [FERPA 99.31(a)(1)(i)(B)] Outside services acting as school officials stay under the school's control
Look for: new vendors, subprocessors or AI services that receive student data. Name the service and the data sent. Flag any that may reuse the data for their own purposes, such as advertising, model training or product analytics across customers.
Decided from code: partly. The contract and the school's control are outside the repository.

### [FERPA 99.31(a)(1)(ii)] Access to records is limited by technical controls
Look for: student data reachable without authentication, shared accounts, broad service credentials, direct database access from tools and no audit log of who read student records. Removed or weakened access control on student data.
Decided from code: yes.

### [FERPA 99.31(b)(1)] Data called de-identified can't be traced back to a student
Look for: exports, research sets, analytics or test data that drop the name but keep student IDs, birth dates, small group counts, or other combinations that identify a student. Pseudonymous codes that can be reversed from information in the same dataset or from the code.
Acceptable: records with all identifiers removed and a documented check that no student can be identified.
Decided from code: partly. Re-identification risk also depends on data outside the repository.

### [FERPA 99.32(a)] Disclosures of student records are logged
Look for: code that sends student records to a third party and writes no log entry of who received them and why. Logs that can be edited or lost when logs rotate. New disclosure paths missing from the existing record.
Not a breach: disclosures that need no record, such as to the parent or student or to a school official.
Decided from code: yes, for disclosure paths in the repository.

### [FERPA 99.33(a)] Recipients are limited to the purpose and can't pass the data on
Look for: shared data that the recipient is free to forward, such as public links, broad API keys, or exports with no purpose limit. No terms or controls that restrict reuse. Data sent on to further parties by the recipient's integration.
Decided from code: partly. Terms and redisclosure rules are outside the repository, but open sharing is visible.

### [FERPA 99.37(a)] Directory information is shared only for categories that were announced, and opt-outs are honoured
Look for: directory exports, public student lists, yearbook or roster feeds that include fields beyond the designated categories. Opt-out flags that some jobs, feeds or integrations never read. An opt-out that is reset by a later import or sync.
Decided from code: partly. The designated categories are set by the school, but the code can show whether the opt-out is honoured.

### [FERPA 99.37(e)] Directory data isn't used to look up a student by their SSN or other non-directory data
Look for: search, lookup or verification features that let someone find or confirm a student by SSN, student ID or other non-directory details, with no consent. Responses that confirm that a student exists, or a record's contents, when the caller has only non-directory data.
Decided from code: yes.
