# EU Cyber Resilience Act: code review checklist

Source: Regulation (EU) 2024/2847 of the European Parliament and of the Council on horizontal cybersecurity requirements for products with digital elements (Cyber Resilience Act), Annex I, Essential cybersecurity requirements, https://eur-lex.europa.eu/eli/reg/2024/2847/oj. The checks below are written in our own words. The IDs are the Annex I part and point numbers, so a finding can be traced back to the official text. The Regulation entered into force on 10 December 2024. Reporting duties apply from 11 September 2026, and the Annex I requirements apply from 11 December 2027.

The Act applies to manufacturers, importers and distributors of products with digital elements: software and hardware that is connected, directly or indirectly, to a device or network. It excludes some products, such as certain medical devices, vehicles and software offered only as a service on a website, which are covered by other law. Part I of Annex I lists requirements for the product, to be applied according to the manufacturer's risk assessment. Part II lists vulnerability handling requirements. Many items are about process. The checks below are the ones whose evidence shows up in code, configuration and pipelines.

## When this applies

Apply these checks to changes in a product that is placed on the EU market, such as an application, library, firmware, device software, plugin or installable component. Signs of this include a distributed package or installer, firmware or device images, an update mechanism, and a product release process.

Internal tools, code that is never shipped to others, and pure hosted services may be outside the Act, so report this standard as `not_applicable` if the change doesn't touch a shipped product or its release and update path.

## Checks

### [CRA Annex I Part I (2)(a)] The product ships without known exploitable vulnerabilities
Look for: new or kept dependencies at versions with known exploitable vulnerabilities. Vulnerability scanning or advisories checks removed from the pipeline. Known-vulnerable code left in place with no mitigation or stated reason.
Decided from code: partly. Scans run outside the repository aren't visible, and exploitability depends on how the product uses a component.

### [CRA Annex I Part I (2)(b)] Defaults are secure, and the product can be reset
Look for: new settings whose default is the less secure choice, such as debug on, open ports, default or shared passwords, certificate checks off, telemetry or remote access on without consent. Security features that stay off until the user turns them on. A reset to factory state that no longer restores secure settings.
Decided from code: yes.

### [CRA Annex I Part I (2)(c)] The product can receive security updates
Look for: an update mechanism that is removed, broken or limited to feature updates. Where automatic security updates apply, ones that are not on by default or have no easy opt-out. No notice to users that an update is available, or no way to postpone it. Version checks or update channels hard-coded to a dead address.
Decided from code: partly. Update delivery and policy may be handled outside the repository.

### [CRA Annex I Part I (2)(d)] Access is protected against unauthorised use
Look for: new interfaces, ports, APIs or admin functions with no authentication. Authentication that is bypassed in some modes, default credentials, hard-coded tokens and weak or missing checks on who may perform an action. Failed or blocked access attempts that are not reported where the product has a way to do so.
Decided from code: yes, for checks done in code.

### [CRA Annex I Part I (2)(e)] Data is kept confidential, including by encryption
Look for: personal or sensitive data stored or sent without encryption. Plain HTTP or other unencrypted channels, TLS checks turned off, and weak or home-made encryption. Keys committed to the repository or shared across devices or installations.
Decided from code: yes.

### [CRA Annex I Part I (2)(f)] Data, commands, programs and settings are protected against unauthorised change
Look for: updates, plug-ins or configuration downloaded and applied without a signature or hash check. Unsigned firmware or installers. Configuration files or commands that any local or remote caller can write. Missing integrity checks on stored data, with no way to report corruption.
Decided from code: yes.

### [CRA Annex I Part I (2)(g)] Only the data needed is processed
Look for: new fields, logs, telemetry or crash reports that collect personal or sensitive data the feature doesn't need. Whole objects sent to a service when a few fields would do. Identifiers or location kept without a reason.
Decided from code: yes.

### [CRA Annex I Part I (2)(j)] The attack surface is kept small
Look for: new network listeners, open ports, external interfaces, debug or test endpoints, and services enabled by default that the product doesn't need. Unused libraries, features or build flags left in the release build. Debug code and test credentials shipped in production builds.
Decided from code: yes.

### [CRA Annex I Part I (2)(k)] Exploitation mitigations limit the effect of an incident
Look for: hardening flags removed (stack protection, PIE, RELRO, memory tagging or equivalent). Sandboxing, privilege dropping or process isolation weakened. Code running with more rights than it needs. Unsafe code allowed where it was blocked, and new `@ts-ignore` or `# type: ignore` on security-relevant code.
Decided from code: yes.

### [CRA Annex I Part I (2)(l)] Security-relevant activity is recorded
Look for: changes to data, settings, sign-ins and security functions that write no event, in products that keep a log. Logging turned off, or an option to opt out of it removed. Secrets or personal data written into logs.
Decided from code: partly. Whether a log is needed depends on the product and the manufacturer's risk assessment.

### [CRA Annex I Part I (2)(m)] Users can securely and permanently erase their data and settings
Look for: no way, or a broken way, to delete stored data, credentials and settings, such as a factory reset or uninstall that leaves secrets behind. Deletion that only marks records and never removes them. Secure transfer of data to another product that is removed or left unencrypted.
Decided from code: partly. Code shows the deletion path, but the product's intended use decides what is needed.

### [CRA Annex I Part II (1)] Components are identified and recorded in a software bill of materials
Look for: build or release pipelines that stop producing a machine-readable software bill of materials (SPDX or CycloneDX), or that leave out direct dependencies. Lockfiles deleted, ignored or not committed. Vendored code and binaries with no recorded name or version.
Decided from code: yes, for this repository.

### [CRA Annex I Part II (2)] Vulnerabilities are fixed without delay, in separate security updates where feasible
Look for: a known vulnerability in the changed area left open or only suppressed, release or update code that can ship a security fix only together with feature changes, and removal of a security-only release branch or update channel.
Decided from code: partly. How quickly fixes ship is a matter of process outside the repository.

### [CRA Annex I Part II (3)] Security testing is regular and effective
Look for: tests of sign-in, permissions, cryptography and input handling that are deleted, skipped or weakened. Static analysis, fuzzing or dependency scanning removed from the pipeline or set to never fail. Fixed vulnerabilities with no test that would catch them coming back.
Decided from code: yes.

### [CRA Annex I Part II (6)] There is a way to report vulnerabilities
Look for: removal of the security policy file (`SECURITY.md`), `security.txt` or the contact address in a product that publishes one. Reporting links that point to nothing. Issue templates for security reports removed.
Decided from code: partly. Whether a disclosure policy exists and is followed is a matter of process outside the repository.

### [CRA Annex I Part II (7)] Security updates are delivered by secure mechanisms
Look for: update channels over plain HTTP, or with TLS checks off. Updates installed without a signature check or against a key that is not pinned. Downgrade to older vulnerable versions allowed. Release pipelines that stop signing artefacts, or keep signing keys in plain pipeline variables or in the repository.
Decided from code: yes, for update code and release pipelines in the repository.
