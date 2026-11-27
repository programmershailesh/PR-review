# PCI Secure Software Standard v1.2.1: code review checklist

Source: PCI Security Standards Council, PCI Software Security Framework, Secure Software Standard v1.2.1 (May 2023, with the Technical FAQs for v1.x), https://www.pcisecuritystandards.org/document_library/. The checks below are written in our own words. The IDs are the control objectives of the standard's core requirements, so a finding can be traced back to the official text.

The Secure Software Standard is for vendors of payment software that stores, processes or transmits account data or that supports a payment. It is about how the software is built and what it does, unlike PCI DSS, which is about the environment that runs it. "Sensitive data" in the standard covers account data and authentication data, and also keys and other data that protect them.

## When this applies

Apply these checks only to changed code of payment software: payment applications, payment gateways and APIs, point-of-interaction and terminal software, card data handling libraries and SDKs, and software that supports or secures payments. Signs of this include card fields (`pan`, `cardNumber`, `cvv`, `track`), PIN handling, cryptographic key handling and payment messages.

The standard's separate modules (terminal software, web software and account data protection) have their own objectives that are not covered here. If the change doesn't touch software that handles or protects payment data, report this standard as `not_applicable`.

## Checks

### [PCI SSS 2.1] Features are off by default unless needed
Look for: new functions, ports, debug or admin interfaces, test endpoints and sample data that are enabled by default and not required for the software to do its job.
Decided from code: yes.

### [PCI SSS 2.3] No default credentials remain after installation
Look for: built-in accounts, API keys, passwords or keys that ship with the software and keep working after setup, and installers that do not force a change at first use.
Decided from code: yes.

### [PCI SSS 2.4] The software asks for only the privileges it needs
Look for: processes that run as root or administrator, containers with broad capabilities, requests for wide file, network or operating system permissions, and access to resources that the software doesn't use.
Decided from code: yes.

### [PCI SSS 3.1] Sensitive data is kept only when needed
Look for: new storage, caches, queues or files that keep card numbers, authentication data or keys longer than the function needs, and any storage of full track, card verification or PIN data after authorisation.
Decided from code: yes.

### [PCI SSS 3.4] Sensitive data is securely deleted when no longer needed
Look for: deletion that only drops a reference or a database row but leaves data in files, backups or logs, no deletion job for expired data, and data that survives uninstall or key change.
Decided from code: partly. Deletion in the underlying platform or storage may be outside the code.

### [PCI SSS 3.6] Sensitive data does not leak through unintended channels
Look for: card data, keys or authentication data in logs, error messages, debug output, crash dumps, analytics events, URLs, clipboard, temporary files and exception traces.
Decided from code: yes.

### [PCI SSS 4.2] Controls are implemented against attacks that apply to the software
Look for: unvalidated input, injection (SQL, command), buffer or memory errors, broken access control, insecure deserialisation, race conditions in payment state, and client-supplied amounts or states that the server trusts.
Decided from code: yes.

### [PCI SSS 5.1] Access to sensitive data and functions requires authentication
Look for: payment, key-management, configuration or card data functions that can be called without authentication, and checks done only on the client.
Decided from code: yes.

### [PCI SSS 5.3] Authentication methods and sessions are strong enough
Look for: weak password rules, no limit on failed attempts, guessable session or token values, sessions that never expire or aren't invalidated on sign-out, and credentials sent in URLs.
Decided from code: yes.

### [PCI SSS 6.1] Sensitive data is protected wherever it is stored
Look for: card data, authentication data or keys stored in plain text in databases, files, caches, logs, config, backups and test fixtures.
Acceptable: strong encryption with managed keys, truncation, tokens from a vault, or keyed one-way hashes.
Decided from code: yes.

### [PCI SSS 6.2] Sensitive data is protected during transmission
Look for: sensitive data sent over plain HTTP or other unencrypted channels, TLS verification turned off (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`), old protocol versions and weak cipher suites.
Decided from code: yes, for what the code configures.

### [PCI SSS 7.1] Only approved, current cryptographic algorithms are used
Look for: MD5, SHA-1, DES, 3DES, RC4, ECB mode, short RSA keys, home-made cryptography, and custom encryption of card data.
Decided from code: yes.

### [PCI SSS 7.2] Keys are managed securely through their life
Look for: hard-coded or committed keys, keys stored beside the data they protect, no rotation or replacement path, one key used for many purposes, and keys visible in memory dumps or logs.
Decided from code: partly. How key stores are secured at the deployment is outside the code.

### [PCI SSS 7.3] Random numbers come from a secure source
Look for: `Math.random`, `rand()`, time-based seeds or other predictable generators used for keys, tokens, nonces, IVs, session IDs or one-time codes.
Decided from code: yes.

### [PCI SSS 8.1] Access to sensitive assets is logged and traceable to a person
Look for: access to card data, keys, configuration and authentication that isn't logged with a user or service identity, shared accounts that make events untraceable, and logs that can be edited by those they record.
Decided from code: yes.

### [PCI SSS 8.2] Activity records have enough detail
Look for: log entries with no time, user, action, object or result; logging that is turned off or can be turned off with no record; and logs that include the sensitive data they are meant to protect.
Decided from code: yes.

### [PCI SSS 10.2] Vulnerabilities in the code and in third-party components are found and fixed before release
Look for: no static analysis, dependency scanning or security tests in the pipeline, ignored scan failures, outdated components with known flaws, and releases that don't wait for the results.
Decided from code: yes, for what the pipeline shows.

### [PCI SSS 11.2] Updates are delivered securely and their integrity can be checked
Look for: update or installer packages with no signature or checksum, update channels over plain HTTP, no check of the signature by the client, and unsigned build artefacts.
Decided from code: yes.
