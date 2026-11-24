# NIST SSDF (SP 800-218 v1.1): code review checklist

Source: NIST SP 800-218, Secure Software Development Framework (SSDF) Version 1.1: Recommendations for Mitigating the Risk of Software Vulnerabilities (February 2022), https://csrc.nist.gov/pubs/sp/800/218/final. The checks below are written in our own words. The IDs are the SSDF's task IDs, so a finding can be traced back to the official text. Version 1.1 marks some tasks as moved (PW.3.1, PW.3.2, PW.4.3, PW.4.5 and PW.5.2), and those are not used. NIST published a draft of version 1.2 (SP 800-218 Rev. 1) in December 2025. It is not final, so this checklist follows version 1.1.

The SSDF groups its practices into Prepare the Organization (PO), Protect the Software (PS), Produce Well-Secured Software (PW) and Respond to Vulnerabilities (RV). Many tasks are about people and processes. The checks below are the tasks whose evidence shows up in code, build files and pipelines.

## When this applies

Apply these checks to changes in application code, dependencies and lockfiles, build and compiler settings, CI/CD and release pipelines, default configuration, and security features such as sign-in, permissions, cryptography and logging.

The SSDF says which practices to follow, not exactly how, so judge each check against the project's own guidelines where it has them. If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [NIST SSDF PO.3.2] Build and CI tools are set up and run securely
Look for: CI actions, plugins or build images pulled by a moving tag (`@main`, `@v1`, `latest`) instead of a fixed version or commit hash, where the project pins them elsewhere. Pipeline tokens with broad rights (`permissions: write-all`) when the job needs less. Secrets available to builds of untrusted pull requests, such as a `pull_request_target` workflow that checks out and runs the pull request's code. Secrets printed in build logs. Tools downloaded in the pipeline without checking a hash or signature.
Decided from code: yes, for pipeline files in the repository.

### [NIST SSDF PO.4.1] Security gates in the pipeline aren't loosened without a recorded reason
Look for: severity thresholds raised, scanners set to never fail (`continue-on-error: true`, `|| true`, an exit code forced to 0), quality gates removed, or new ignore lists for findings, with no linked issue or approved exception.
Decided from code: partly. The criteria and any approved exceptions may be recorded outside the repository.

### [NIST SSDF PO.5.1] Environments are kept apart, and production secrets stay in production
Look for: production credentials, URLs or database connections in development, test or CI configuration. Test or CI jobs that can reach production systems. One set of credentials shared across environments. Production secrets made available to pipeline jobs that don't deploy to production.
Decided from code: partly. Network separation and access to each environment are mostly set outside the repository.

### [NIST SSDF PS.1.1] Code is protected from unauthorised change
Look for: `CODEOWNERS` entries for sensitive paths removed or emptied. Branch protection, required reviews or commit signing weakened in repository settings files or infrastructure code.
Decided from code: partly. Most repository access settings live in the Git host.

### [NIST SSDF PS.2.1] Releases can be checked for integrity
Look for: release pipelines that stop signing packages, installers or container images, or stop publishing checksums. Signing keys moved into the repository or into plain, unprotected pipeline variables.
Decided from code: yes, for release pipelines in the repository.

### [NIST SSDF PS.3.2] Each release records what it's made of
Look for: build or release pipelines that stop producing a software bill of materials (SBOM) or build provenance. Lockfiles deleted, ignored or no longer committed, so the exact component versions in a release can't be known.
Decided from code: yes, for this repository.

### [NIST SSDF PW.1.3] Shared, proven security features are used instead of home-made ones
Look for: custom password hashing, encryption, token formats, session handling or sign-in flows where the project or its platform already provides one. New code that checks permissions or writes security logs its own way, instead of through the project's shared access control or logging.
Decided from code: yes.

### [NIST SSDF PW.4.1] New third-party components are well chosen and come from trusted sources
Look for: new dependencies that are unmaintained, have very few users, or have names close to popular packages, which can be a sign of typosquatting. Packages installed from Git URLs, personal forks, tarballs or unofficial registries. Vendored copies or binaries committed with no version or source.
Decided from code: partly. Lists of approved components may be kept outside the repository.

### [NIST SSDF PW.4.4] Third-party components are checked for known problems and tampering
Look for: dependencies at versions with known vulnerabilities, or past end of life. Lockfiles without integrity hashes where the package manager supports them. Install settings that turn off integrity or TLS checks, such as `pip --trusted-host` or `npm config set strict-ssl false`. Dependency scanning removed from CI.
Decided from code: partly. Scans run outside the repository aren't visible.

### [NIST SSDF PW.5.1] Code follows secure coding practices for its language
Look for: input used without validation, and output not encoded for where it goes (HTML, SQL, shell, URLs). Injection, unsafe deserialisation, path traversal and server-side request forgery. Unsafe functions for the language, such as `eval` on user input, `pickle.loads` on untrusted data, `strcpy`, or `dangerouslySetInnerHTML` with user content. Errors ignored, or shown to users with internal details. Credentials or keys written into source code.
Not a breach: placeholder secrets in examples and tests that can't reach real systems.
Decided from code: yes.

### [NIST SSDF PW.6.1] Up-to-date, trusted compilers and build tools are used
Look for: compilers, runtimes, SDKs or build tools pinned to versions past end of life. Toolchains downloaded during the build from unofficial sources, or without checking a hash.
Decided from code: yes, for tools named in the repository.

### [NIST SSDF PW.6.2] Compiler and build security features stay on
Look for: hardening flags removed (`-fstack-protector`, `-D_FORTIFY_SOURCE`, PIE, RELRO, or ASLR and DEP settings). Warnings turned off, or no longer treated as errors. Unsafe code allowed where it was blocked, such as removing `#![forbid(unsafe_code)]` or turning on `AllowUnsafeBlocks`. Type checking loosened, such as `strict: false` in `tsconfig.json`, or new `@ts-ignore` or `# type: ignore` on security-relevant code.
Decided from code: yes.

### [NIST SSDF PW.7.2] Code review and analysis findings are fixed or tracked, not hidden
Look for: new suppressions of static analysis or security linter findings (`nosec`, `NOSONAR`, `eslint-disable` for security rules, `@SuppressWarnings` on security checks) with no reason or issue link. Analysis steps removed from CI. Code that looks like a backdoor: hidden admin switches, hard-coded bypass values, or deliberately obscured logic.
Decided from code: yes.

### [NIST SSDF PW.8.2] Security behaviour is tested, and fixed vulnerabilities stay fixed
Look for: changes to sign-in, permissions, cryptography or input handling with no tests of the failure cases, such as the wrong user, an expired token or bad input. A vulnerability fix with no test that would catch it coming back. Security or fuzz tests deleted, skipped or weakened.
Decided from code: yes.

### [NIST SSDF PW.9.1] Defaults are secure
Look for: new settings whose default is the less secure choice, such as TLS off, certificate checks off, debug on, CORS open to all origins, open sign-up, a default admin password or public storage. Security features that stay off unless the operator turns them on.
Decided from code: yes.

### [NIST SSDF PW.9.2] Security-relevant settings are applied and documented
Look for: new security-relevant settings or flags with no note of what they do, their default, and the risk of changing them, in a project that documents its settings. Defaults hard-coded in scattered places instead of in the project's central configuration.
Decided from code: yes.

### [NIST SSDF RV.3.3] When a vulnerability is fixed, the same flaw is fixed elsewhere
Look for: a security fix that changes one place while the same unsafe pattern is left in other places in the repository, such as the same unparameterised query or missing permission check in a sibling handler. Apply this check only when the pull request is itself a security fix.
Decided from code: yes, for this repository.
