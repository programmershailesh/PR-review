# Cyber Essentials: code review checklist

Source: UK National Cyber Security Centre (NCSC), Cyber Essentials: Requirements for IT Infrastructure, version 3.3 (April 2026), https://www.ncsc.gov.uk/files/cyber-essentials-requirements-for-it-infrastructure-v3-3.pdf. The scheme is run with IASME. The checks below are written in our own words. The requirements have no numbers, so each ID names one of the five technical controls (Firewalls, Secure configuration, Security update management, User access control, Malware protection) and a short topic from it, so a finding can be traced back to the official text.

Cyber Essentials is a basic scheme for organisations of any size. It is mostly about how devices, networks and cloud accounts are set up, not about application code. A scheme assessment looks at the organisation's whole scope. The checks below are the few whose evidence shows up in code, infrastructure files, configuration and pipelines.

## When this applies

Apply these checks to changes in infrastructure as code, network and firewall rules, device or server images and configuration, cloud account and identity settings, sign-in code, dependency and runtime versions, and build pipelines. If the change touches none of these, such as application logic, styling or copy, report this standard as `not_applicable`.

## Checks

### [Cyber Essentials Firewalls: inbound rules] Inbound traffic is limited to what is needed
Look for: firewall, security group or network rules that open ports to the whole internet (`0.0.0.0/0`, `::/0`) without a stated reason, especially for database, remote desktop, SSH and other admin ports. New services bound to all network interfaces. Old rules left in place after the service they served was removed.
Acceptable: web ports open to the internet on a service that is meant to be public.
Decided from code: yes, for rules in the repository.

### [Cyber Essentials Firewalls: administration] Firewall and router administration is protected
Look for: default or shared administrator passwords on firewalls, routers or gateways in configuration. Admin interfaces reachable from the internet with no extra control such as multi-factor authentication or an allow-list of source addresses. A software firewall switched off on servers or devices that connect to untrusted networks.
Decided from code: partly. Network device settings are often kept outside the repository.

### [Cyber Essentials Secure configuration: unnecessary items] Unneeded accounts, software and services are removed
Look for: images, scripts or configuration that install or enable software, services, sample accounts or demo data the system doesn't need. Guest or default accounts left active. Debug tools and test endpoints enabled in production.
Decided from code: yes, for images and configuration in the repository.

### [Cyber Essentials Secure configuration: default credentials] Default and guessable passwords are changed
Look for: default passwords or well-known credentials in configuration, container images, setup scripts or seed data that can reach a real system (`admin/admin`, `changeme`, vendor defaults). Admin accounts created with a fixed password.
Not a breach: placeholder secrets in examples and tests that can't reach real systems.
Decided from code: yes.

### [Cyber Essentials Secure configuration: auto-run and device locking] Devices and services are set up to resist misuse
Look for: device or image settings that turn on auto-run for removable media, remove the screen lock, or allow sign-in with no password or PIN. Unlock methods without protection against repeated guessing.
Decided from code: partly. Device policies are often set in a device management tool outside the repository.

### [Cyber Essentials Security update management: supported software] Only licensed and supported software is used
Look for: operating system images, runtimes, frameworks, libraries and base images pinned to versions past end of life or no longer supported by their vendor. New dependencies that are abandoned. Software added without a licence that allows its use.
Decided from code: yes, for software named in the repository.

### [Cyber Essentials Security update management: timely updates] Security updates are applied quickly
Look for: pinned versions that have not moved for a long time with no stated reason, and known high-risk or critical fixes left unapplied for longer than a short window. Automatic update settings turned off. Automated dependency update tooling removed.
Decided from code: partly. Real patch timing is visible only over time and in device management outside the repository.

### [Cyber Essentials User access control: administrator accounts] Administrator rights are limited and separate
Look for: ordinary users, services or pipelines given administrator or owner rights when a narrower role would work. A shared administrator account. Admin accounts used for everyday work such as email and browsing. New roles with wildcard permissions.
Decided from code: partly. Who holds each role is decided outside the repository.

### [Cyber Essentials User access control: multi-factor authentication] Multi-factor authentication is on wherever it is offered
Look for: cloud service, administrator or remote access sign-in set up with a password only, when MFA is available. MFA made optional or removed, or bypassed for test users or "trusted" networks in a way that also works in production. Sign-in code that skips a second factor.
Decided from code: partly. Identity provider and cloud service settings may live outside the repository.

### [Cyber Essentials User access control: password quality] Password-based sign-in resists guessing
Look for: sign-in endpoints with no lockout, throttling or rate limit. Minimum length lowered below the project's rule, or common-password checks removed. Passwords stored in plain text, or with fast hashes instead of a slow, salted algorithm. Forced complexity rules or short expiry added against the scheme's advice to avoid them.
Decided from code: yes, for checks done in the application.

### [Cyber Essentials Malware protection: anti-malware or allow-listing] Malware protection is in place on devices and images
Look for: server or device images where anti-malware is removed, or where an application allow-list that was in use is dropped. Build or image steps that download and run code with no hash or signature check. Pipelines that execute downloads from untrusted sources.
Decided from code: partly. Endpoint protection is usually managed outside the repository.

### [Cyber Essentials Malware protection: unsigned software] Software is installed only from trusted sources
Look for: packages or tools installed from unofficial registries, personal forks, plain HTTP, or with signature checks turned off (`--trusted-host`, `--no-verify`, `curl | sh`). Browser extensions, plug-ins or apps added to images with no source recorded.
Decided from code: yes, for scripts and images in the repository.
