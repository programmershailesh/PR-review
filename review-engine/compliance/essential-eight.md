# Essential Eight: code review checklist

Source: Australian Signals Directorate (ASD), Australian Cyber Security Centre, Essential Eight Maturity Model (November 2023 update), https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight/essential-eight-maturity-model. The checks below are written in our own words. The Essential Eight has no numbered controls, so each ID names one of the eight mitigation strategies and, where needed, a topic within it, so a finding can be traced back to the official text. ASD published a successor framework, ASD Essentials, in October 2026 and has said it will keep both on its website during a transition. Maturity ratings don't carry over between them. Until the project's guidelines say otherwise, this checklist follows the Essential Eight maturity model.

The Essential Eight is about how an organisation's workstations, servers and accounts are set up and managed. It has maturity levels from One to Three, and the target level is the organisation's choice. Most of it can't be seen in application code. The checks below are the few whose evidence shows up in configuration, images, infrastructure as code, dependencies and pipelines. Flag what looks weaker than the project's stated target level.

## When this applies

Apply these checks to changes in infrastructure and device configuration (group policy, device management profiles, images, scripts), software and operating system versions, application and package allow-lists, sign-in and privileged access settings, and backup jobs. If the change touches none of these, such as application logic, styling or copy, report this standard as `not_applicable`.

## Checks

### [Essential Eight Application control] Only approved software can run
Look for: allow-list rules for executables, libraries, scripts or installers that are removed, widened to whole folders that users can write to, or replaced by "allow all". Application control policies set to audit only when the project means them to enforce. Scripts and installers that are exempt with no reason.
Decided from code: partly. Policies are often kept in a device management tool outside the repository.

### [Essential Eight Patch applications: timeframes] Application and internet-facing service patches are applied quickly
Look for: pinned versions of applications, frameworks and libraries that have not moved for a long time, and known critical fixes left unapplied. Automatic update settings turned off. Dependency update tooling or vulnerability scanning removed. Patch jobs on internet-facing services with longer intervals than the project's target.
Decided from code: partly. Real patch timing shows only over time and in tools outside the repository.

### [Essential Eight Patch applications: unsupported software] Applications that are no longer supported are removed
Look for: runtimes, frameworks, browsers, plug-ins and base images pinned to versions past end of life. New dependencies that are abandoned. Legacy components added back to images.
Decided from code: yes, for software named in the repository.

### [Essential Eight Patch operating systems] Operating systems and firmware are patched and supported
Look for: operating system or machine images pinned to versions past end of life, or old versions added to the build. Image build or update jobs removed, and automatic OS update settings turned off. Firmware or driver updates dropped from the maintenance routine.
Decided from code: partly. Fleet patch state lives in tools outside the repository.

### [Essential Eight Configure Microsoft Office macro settings] Macros are blocked unless there is a business need
Look for: group policy or device management settings that enable macros for all users, allow macros from the internet, or let users change macro settings. Macro scanning turned off. Trusted locations set to folders that users or the internet can write to.
Decided from code: partly. Applies only where Microsoft Office is used and its policy is kept in the repository.

### [Essential Eight User application hardening] Browsers and productivity software are locked down
Look for: policy or image settings that allow web browsers to process Java or web advertisements from the internet, turn the old Internet Explorer 11 back on, or let users change hardening settings. Security features of browsers and office suites disabled in configuration.
Decided from code: partly. Applies where such policy is kept in the repository.

### [Essential Eight Restrict administrative privileges] Administrator rights are limited, checked and kept apart from everyday use
Look for: roles, IAM policies or group memberships that give administrator, owner or wildcard rights where a narrower role would work. Privileged accounts allowed to browse the web or read email. Shared admin accounts. Privilege requests approved automatically with no check. Privileged and ordinary working environments merged.
Decided from code: partly. Who holds each role is decided outside the repository.

### [Essential Eight Multi-factor authentication: online services] Multi-factor authentication protects access to online services and sensitive data
Look for: sign-in to the organisation's online services, third-party services or customer-facing services that hold sensitive data, set up with a password only. MFA made optional or removed, or bypassed for test users or "trusted" networks in a way that also works in production.
Decided from code: partly. Identity provider settings may live outside the repository.

### [Essential Eight Multi-factor authentication: privileged users] Privileged users always use multi-factor authentication
Look for: administrator, cloud console or deployment access that needs only a password. Break-glass accounts without a control. At higher target levels, MFA methods that can be phished (SMS or one-time codes) where the project's guidelines ask for phishing-resistant methods such as FIDO2 keys or passkeys.
Decided from code: partly. Identity provider settings may live outside the repository.

### [Essential Eight Regular backups] Important data, software and settings are backed up, kept and restorable
Look for: backup jobs removed, switched off, or reduced in scope so that important data, software or configuration is no longer covered. Retention shortened below the project's rule. Backups kept in the same account or store, with the same credentials, as the live data. Restore tests removed from the routine. Backup access open to ordinary users, who can then change or delete the backups.
Decided from code: partly. Backup schedules may be set outside the repository, and restore tests show only in operation.
