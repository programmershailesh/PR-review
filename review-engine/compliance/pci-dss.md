# PCI DSS v4.0.1: code review checklist

Source: PCI Security Standards Council, PCI DSS v4.0.1 (June 2024), https://www.pcisecuritystandards.org/document_library/. The checks below are written in our own words. The numbers are the standard's requirement numbers, so a finding can be traced back to the official text.

PCI DSS protects account data: the primary account number (PAN), and the sensitive authentication data used to approve a payment (full track or chip data, the card verification code, PINs and PIN blocks).

## When this applies

Apply these checks only to changed code that stores, processes, transmits, logs or displays account data, or that controls access to systems that do. Signs of this include card fields (`pan`, `cardNumber`, `cvv`, `cvc`, `track`), payment processor SDKs handling raw card data, card vault or tokenisation code, and payment pages.

A change that only passes a processor's token (such as a Stripe payment method ID) and never sees the card number is usually out of scope for the storage checks, but payment page checks still apply to the page that loads the processor's script. If the change doesn't touch account data or payment pages at all, report this standard as `not_applicable`.

## Checks

### [PCI DSS 3.2.1] Account data is kept only as long as needed
Look for: new tables, columns, caches, queues or files that keep card numbers, with no retention limit or deletion job. Copies made "for debugging" or "for reconciliation" with no expiry.
Not a breach: storing a processor token, or the last four digits.
Decided from code: partly. Retention policy may live outside the repository, so say what the code does and mark the rest for a person to check.

### [PCI DSS 3.3.1] Sensitive authentication data is never stored after authorisation
Look for: CVV/CVC, full track or chip data, or PIN blocks written anywhere after the payment is approved, including databases, logs, analytics events, error reports, queues and retries.
Not a breach: passing the code once to the processor in memory during authorisation.
Decided from code: yes.

### [PCI DSS 3.4.1] Card numbers are masked when shown
Look for: UI, API responses, emails, receipts, exports or admin screens that show more than the first six and last four digits, unless the code restricts full display to a role with a documented business need.
Not a breach: showing only the last four digits.
Decided from code: yes, for what the code renders.

### [PCI DSS 3.5.1] Stored card numbers are unreadable
Look for: card numbers stored in plain text anywhere, including databases, files, logs, caches, message queues, backups and test fixtures. Card numbers written to application logs or error trackers are the most common case.
Acceptable: strong encryption with managed keys, truncation, tokens from a vault, or keyed one-way hashes of the whole number.
Decided from code: yes.

### [PCI DSS 3.5.1.1] Hashes of card numbers are keyed
Look for: plain hashes such as `sha256(pan)` used to store or look up card numbers. Card numbers are guessable, so an unkeyed hash can be reversed.
Acceptable: HMAC or another keyed hash, with the key managed like any other cryptographic key.
Decided from code: yes.

### [PCI DSS 3.6.1] Cryptographic keys that protect card data are protected
Look for: encryption keys for card data hard-coded in source, committed in config files, stored next to the data they protect, or logged.
Acceptable: keys loaded from a key management service or secret store at run time.
Decided from code: partly. How the key store itself is secured is outside the repository.

### [PCI DSS 4.2.1] Card data is encrypted in transit
Look for: card data sent over plain HTTP, TLS verification turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`), or old protocols allowed.
Not a breach: traffic inside a TLS connection to the processor.
Decided from code: yes, for what the code configures.

### [PCI DSS 4.2.2] Card numbers aren't sent through messaging
Look for: code that puts full card numbers into email, chat, SMS or notification messages.
Decided from code: yes.

### [PCI DSS 6.2.4] Code is protected against common attacks
Look for: in code that handles account data or payment flows, injection (SQL, command, LDAP), cross-site scripting, broken access control, insecure deserialisation, and business-logic flaws such as trusting a client-supplied amount or skipping a payment state check.
Decided from code: yes.

### [PCI DSS 6.3.2] Third-party components are tracked
Look for: new dependencies in payment code that bypass the lockfile or manifest, such as vendored copies with no version, or scripts copied in from a CDN.
Decided from code: yes, for this repository.

### [PCI DSS 6.4.3] Scripts on payment pages are authorised and checked
Look for: new or changed scripts loaded on a page that collects card data, without subresource integrity, without a content security policy that limits script sources, or from domains that aren't needed for payment.
Decided from code: yes, for scripts and headers set in this repository.

### [PCI DSS 6.5.5] Real card numbers aren't used outside production
Look for: real-looking card numbers in tests, fixtures, seed data or sample configuration that aren't the processors' published test numbers.
Not a breach: published test numbers such as 4242 4242 4242 4242.
Decided from code: yes.

### [PCI DSS 6.5.6] Test data and accounts are removed before release
Look for: test users, default credentials, debug endpoints or bypass flags that would ship to production in payment-related code.
Decided from code: yes.

### [PCI DSS 7.2.2] Access to card data follows least privilege
Look for: new endpoints, jobs or queries that expose card data without checking the caller's role, or that grant broader access than the feature needs.
Decided from code: yes, for checks done in code.

### [PCI DSS 7.2.5] Application and system accounts have least privilege
Look for: service accounts or database users for payment code given admin or wildcard permissions in code, infrastructure files or migrations.
Decided from code: partly.

### [PCI DSS 8.3.2] Passwords and other authentication factors are protected
Look for: passwords or authentication secrets stored or sent unencrypted or unhashed, or hashed with fast hashes such as MD5 or SHA-1 instead of bcrypt, scrypt, Argon2 or PBKDF2.
Decided from code: yes.

### [PCI DSS 8.6.2] Credentials aren't hard-coded
Look for: passwords, API keys or tokens for application and system accounts written into source code, scripts or committed configuration files.
Not a breach: placeholders, and values read from environment variables or a secret store.
Decided from code: yes.

### [PCI DSS 10.2.1.1] Access to card data is logged
Look for: new ways to read or export card data, or to reveal a full card number, that don't record an audit event for each access.
Decided from code: yes.

### [PCI DSS 10.2.2] Audit events record who, what, when and outcome
Look for: audit events for card data access that leave out the user, the action, the time, whether it succeeded, where it came from, or what was affected.
Decided from code: yes.

### [PCI DSS 11.6.1] Payment pages detect unauthorised changes
Look for: changes to a payment page's scripts or security headers that remove or weaken tamper detection, such as dropping CSP reporting or integrity checks.
Decided from code: partly. The detection system usually runs outside the repository.
