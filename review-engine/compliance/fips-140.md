# FIPS 140-3 cryptography: code review checklist

Source: NIST, FIPS 140-3, Security Requirements for Cryptographic Modules (March 2019), https://csrc.nist.gov/pubs/fips/140-3/final, run through the Cryptographic Module Validation Program (CMVP), https://csrc.nist.gov/projects/cryptographic-module-validation-program. The checks below are written in our own words. The IDs are the identifiers of the NIST publications and the FIPS 140-3 (ISO/IEC 19790) sections that the requirements come from, so a finding can be traced back to the official text.

FIPS 140-3 validates cryptographic modules, meaning the library or device that does the cryptography. An application is not itself validated. What code review can check is whether the application uses cryptography in a way that fits the standard: it calls a validated module, uses only approved algorithms, and handles keys properly. FIPS 140-2 validations moved to the CMVP Historical list in September 2026, so a module cited for a new requirement should hold a FIPS 140-3 certificate that is still active.

## When this applies

Apply these checks only to changed code or configuration that performs, selects or configures cryptography: encryption, hashing, signing, key generation or storage, random numbers, password hashing, TLS settings, and the choice of crypto library or its build mode. Signs of a FIPS requirement include a FIPS mode flag, a validated crypto library (such as an OpenSSL FIPS provider, BoringCrypto, a cloud KMS or HSM), or federal or regulated customers.

If the project has no FIPS requirement and the change doesn't touch cryptography, report this standard as `not_applicable`. NIST is revising SP 800-131A and SP 800-52 as of November 2026, so this checklist follows the revisions currently in force (SP 800-131A Rev. 2 and SP 800-52 Rev. 2).

## Checks

### [FIPS 140-3 CMVP] Cryptography comes from a validated module
Look for: crypto done by home-written code or by a library with no FIPS 140-3 validation where the project needs one. A FIPS-capable library used in its default mode with FIPS mode never enabled. Build or runtime settings that switch FIPS mode off. Dependencies that bundle their own crypto and bypass the validated module.
Acceptable: a module with an active FIPS 140-3 certificate, used in its approved mode and within the operating environment listed on the certificate.
Decided from code: partly. The certificate status and its listed environment must be confirmed on the CMVP site by a person.

### [FIPS 140-3 SP 800-140C] Only approved security functions are used
Look for: algorithms or modes outside the approved list: MD5, MD4, RC4, DES, Blowfish, ECB for data, custom ciphers, or non-approved key sizes. Algorithm names chosen from configuration or input so an unapproved one can be selected.
Decided from code: yes, for the algorithms the code names.

### [FIPS 140-3 FIPS 197] Symmetric encryption uses AES
Look for: DES, 3DES, RC4, Blowfish, ChaCha20 or other non-AES ciphers used where FIPS mode is required. AES keys of an unapproved length. Ciphers selected by string without a fixed allow-list.
Decided from code: yes.

### [FIPS 140-3 SP 800-38A] Block cipher modes are used correctly
Look for: ECB mode, reused or fixed IVs, predictable IVs for CBC, no padding or integrity protection on CBC data, home-made counter or stream modes.
Decided from code: yes.

### [FIPS 140-3 SP 800-38D] Authenticated encryption uses unique nonces
Look for: AES-GCM with a fixed, reused or short random nonce under the same key, counters that reset on restart, tag lengths shortened below the approved sizes, tag not checked on decrypt, decrypted data used before the tag is verified.
Decided from code: yes.

### [FIPS 140-3 FIPS 180-4] Hashing uses approved secure hash functions
Look for: MD5 or SHA-1 for signatures, certificates, integrity checks or key derivation. SHA-2 or SHA-3 (FIPS 202) are the approved choices. Truncated digests that weaken collision resistance below what the use needs.
Not a breach: MD5 or SHA-1 used only as a non-security checksum, such as a cache key. Say it is not a security use.
Decided from code: yes.

### [FIPS 140-3 FIPS 198-1] Message authentication uses approved MACs
Look for: home-made keyed hashes (such as hash of key joined with message), HMAC built on a non-approved hash, MAC comparison with ordinary string equality instead of a constant-time check, tokens signed with a short or hard-coded HMAC key.
Decided from code: yes.

### [FIPS 140-3 FIPS 186-5] Digital signatures use approved algorithms and key sizes
Look for: RSA keys below 2048 bits, DSA or ECDSA on unapproved curves, signatures over MD5 or SHA-1, signatures verified with a lax mode or with verification skipped, signing keys generated in application code from weak input.
Decided from code: yes.

### [FIPS 140-3 SP 800-131A Rev 2] Deprecated and disallowed algorithms and key lengths are avoided
Look for: use of anything the transition document marks as deprecated or disallowed: two-key 3DES, SHA-1 for digital signatures, RSA or DH keys under 2048 bits, key agreement or encryption below 112 bits of strength. New code that adds a legacy algorithm for compatibility.
Not a breach: legacy algorithms used only to read old data that is re-protected with an approved one, when this is documented.
Decided from code: yes.

### [FIPS 140-3 SP 800-90A] Random numbers come from an approved generator
Look for: `Math.random`, `rand()`, `random.random`, timestamps or process IDs used for keys, nonces, salts, tokens or session IDs. Seeds set by hand. A custom random generator. Random bytes taken from the validated module or the operating system's secure source are the right choice.
Decided from code: yes.

### [FIPS 140-3 SP 800-132] Password-based keys use an approved derivation
Look for: encryption keys made directly from a password or by a plain hash. PBKDF2 with a tiny iteration count, a missing or fixed salt, or a non-approved hash. Password storage that doesn't use a validated, approved derivation where FIPS mode is required.
Decided from code: partly. The iteration count needed is a policy choice, so flag a low or missing value and say a person must confirm it.

### [FIPS 140-3 SP 800-56A] Key agreement uses approved schemes
Look for: Diffie-Hellman or elliptic curve key agreement with unapproved groups or curves, small parameters, home-made key exchange, shared secrets used directly as keys with no key derivation step, public keys accepted without validation.
Decided from code: yes.

### [FIPS 140-3 SP 800-52 Rev 2] TLS is configured to the approved profile
Look for: TLS 1.0 or 1.1 allowed, weak or export cipher suites enabled, certificate or hostname verification turned off, no minimum protocol version, custom cipher lists that add non-approved suites, client certificates skipped where the system requires them.
Decided from code: yes, for what the code configures.

### [FIPS 140-3 SP 800-57 Part 1] Keys are managed through their life
Look for: one key used for several purposes (encryption and signing), keys with no rotation or expiry path, keys shared across environments or tenants, old keys that are never retired, key material kept in the same store as the data.
Decided from code: partly. Rotation and archive schedules often live outside the repository.

### [FIPS 140-3 7.9] Sensitive security parameters are protected
Look for: keys, passwords, seeds or private values hard-coded, committed, written to logs, put in error messages, kept in plain text files or environment dumps, or left in memory buffers and temp files after use. Missing zeroisation where the language allows it. Keys held in a KMS, HSM or the validated module's key store are the better design.
Decided from code: yes, for what the code does with the values.

### [FIPS 140-3 7.10] Module self-test failures are respected
Look for: code that catches and ignores a failure from the crypto module's power-up or conditional self-tests, falls back to a non-validated implementation when FIPS mode fails to load, or continues to run after the module reports an error state.
Decided from code: partly. The self-tests themselves live in the module, so check only how the application reacts.
