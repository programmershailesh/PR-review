# NIS2 Directive: code review checklist

Source: Directive (EU) 2022/2555 of the European Parliament and of the Council on measures for a high common level of cybersecurity across the Union (NIS2), Article 21, https://eur-lex.europa.eu/eli/dir/2022/2555/oj. Where useful, the checks also cite the technical and methodological requirements in the Annex to Commission Implementing Regulation (EU) 2024/2690, https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj. That regulation applies only to certain digital infrastructure and service providers (such as DNS and TLD name registries, cloud and data centre providers, content delivery networks, managed service providers, online marketplaces, search engines and social networks, and trust service providers). For other entities, member state law sets the detail, and the Annex is a useful reference only. The checks below are written in our own words. The IDs are the article, point and Annex section numbers, so a finding can be traced back to the official text.

NIS2 requires essential and important entities to take appropriate risk-management measures. Article 21(2) lists the areas, and most are about policy, training, governance and incident reporting. The checks below are the ones whose evidence shows up in code, configuration, dependencies and pipelines.

## When this applies

Apply these checks to changes in software or infrastructure that a NIS2 entity runs, or that it supplies as a service: application code, dependencies, build and release pipelines, network and access configuration, authentication, cryptography and logging. Signs of this include a project describing itself as critical infrastructure, a managed or cloud service for such entities, or guidelines that name NIS2.

If the change touches none of the areas above, such as documentation, styling or copy, report this standard as `not_applicable`.

## Checks

### [NIS2 Art. 21(2)(d)] Supply chain risks from dependencies and suppliers are controlled
Look for: new dependencies that are unmaintained, have few users, or have names close to popular packages. Packages installed from Git URLs, personal forks or unofficial registries. Lockfiles missing, ignored or without integrity hashes. CI actions and base images pulled by a moving tag instead of a fixed version or digest, where the project pins them elsewhere. Build tools downloaded without a hash or signature check.
Decided from code: partly. Supplier contracts and approved supplier lists are kept outside the repository.

### [NIS2 Reg. 2024/2690 6.2] Code follows a secure development process
Look for: input used without validation, and output not encoded for where it goes (HTML, SQL, shell). Injection, unsafe deserialisation and path traversal. Credentials written into source. Security-related tests, static analysis or code review steps removed from the pipeline. New suppressions of security linter findings with no reason.
Decided from code: yes.

### [NIS2 Reg. 2024/2690 6.3] Configuration is kept at a secure, known baseline
Look for: infrastructure or application settings that default to the less secure choice, such as debug on, certificate checks off, open storage or default passwords. Configuration changed by hand or in scripts outside version control when the project uses infrastructure as code. Drift from the project's hardened baseline.
Decided from code: yes, for settings in the repository.

### [NIS2 Reg. 2024/2690 6.4] Changes go through a controlled process
Look for: deployment paths that skip review or tests, such as direct pushes to the release branch, approval steps removed, or pipelines that deploy from any branch. Branch protection or required reviewers weakened in settings files. No way to roll back a change.
Decided from code: partly. Branch protection and approvals are usually set in the Git host.

### [NIS2 Reg. 2024/2690 6.5] Security is tested
Look for: changes to sign-in, permissions, cryptography or input handling with no tests of the failure cases (wrong user, expired token, bad input). Security, fuzz or integration tests deleted, skipped or weakened. Test stages that no longer block a release.
Decided from code: yes.

### [NIS2 Reg. 2024/2690 6.6] Security patches are applied in good time
Look for: dependencies, images or runtimes at versions with known vulnerabilities or past end of life. Automated update tooling removed. Pinned versions that haven't moved for a long time with no stated reason.
Decided from code: partly. Patching speed is a matter of process outside the repository.

### [NIS2 Reg. 2024/2690 6.7] Networks are protected by default
Look for: services bound to all interfaces or exposed to the internet without need. Security groups or firewall rules open to `0.0.0.0/0` on admin or database ports. Management interfaces on public networks. Inbound rules with no stated reason.
Decided from code: yes, for infrastructure files in the repository.

### [NIS2 Reg. 2024/2690 6.8] Networks and systems are segmented
Look for: development, test and production sharing a network or credentials. Internal databases and admin tools reachable from public-facing components with no separation. Flat network definitions that remove existing zones or policies.
Decided from code: partly. Network design is often set outside the repository.

### [NIS2 Reg. 2024/2690 6.9] Malicious or unauthorised software is kept out
Look for: downloads executed in builds or at start-up without a hash or signature check (`curl | sh`). Release pipelines that stop signing artefacts. Allow-lists for code or packages removed. Binaries committed with no source or version.
Decided from code: yes, for pipelines and build files in the repository.

### [NIS2 Reg. 2024/2690 6.10] Vulnerabilities are monitored, handled and disclosed
Look for: removal of a security policy file (`SECURITY.md`, `security.txt`) or its contact address. Security fixes shipped with no advisory or release note, where the project publishes them. Dependency vulnerability alerts or scans switched off. Known critical findings ignored or suppressed with no recorded reason.
Decided from code: partly. Reports and disclosure decisions are handled outside the repository.

### [NIS2 Reg. 2024/2690 3.2] Security-relevant events are logged and monitored
Look for: sign-ins, permission changes, access to sensitive data and administrative actions that write no log event. Logs without a timestamp, actor or outcome. Logging turned off, sampled or shortened by a change. Secrets or personal data written into logs. Alerts or monitoring rules removed.
Decided from code: partly. Alerting and retention may be set in the logging platform.

### [NIS2 Art. 21(2)(h)] Cryptography is used and managed properly
Look for: home-made encryption, deprecated algorithms (DES, RC4, MD5 or SHA-1 for protecting data), fixed or predictable keys, salts or initialisation vectors, and TLS certificate checks turned off. Keys committed to the repository, shared across environments, or with no path for rotation. Old protocol versions allowed.
Acceptable: keys loaded from a key management service or secret store at run time.
Decided from code: yes, for algorithms and key handling in code.

### [NIS2 Reg. 2024/2690 11.2] Access rights follow need-to-know and least privilege
Look for: wildcard permissions, broad cloud or database roles, new roles with more rights than the feature needs, and endpoints that check sign-in but not whether the caller may act on this record. Access changes made with no log entry. Default roles that grant more than read access.
Decided from code: partly. Who is assigned each role is decided outside the repository.

### [NIS2 Reg. 2024/2690 11.3] Privileged and administrator accounts get stronger protection
Look for: admin consoles, cloud accounts or deployment tooling that accept only a password. Admin rights given to ordinary service accounts, or one shared admin account. Admin functions reachable from the public internet with no extra control.
Decided from code: partly. Identity provider settings may live outside the repository.

### [NIS2 Reg. 2024/2690 11.7] Multi-factor authentication is used where appropriate
Look for: sign-in flows for administrators, remote users or access to sensitive data that need only a password. MFA made optional or turned off, or a bypass for "trusted" networks or test users that also works in production.
Decided from code: partly. MFA enforcement is often an identity provider setting.
