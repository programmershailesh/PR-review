# SWIFT Customer Security Controls Framework: code review checklist

Source: Swift, Customer Security Controls Framework (CSCF) v2027, part of the Customer Security Programme, https://www.swift.com/myswift/customer-security-programme-csp. The framework is published to Swift users and the full text needs a swift.com login. The checks below are written in our own words. The IDs are the framework's control numbers; a number ending in "A" is an advisory control. Swift reviews the framework every year, so confirm control numbers against the version in force.

The framework sets security controls for the local environment that connects an institution to the Swift network: the interface, messaging software, back office link, operator PCs, jump servers and the people and credentials that use them. It is organised around three objectives: secure the environment, know and limit access, and detect and respond.

## When this applies

Apply these checks only to changed code, configuration or pipelines that belong to the Swift environment or touch it: Swift interface or messaging integration, back-office or payment hub code that sends to or receives from Swift, payment release and approval tools, and the access, hardening and deployment code around those systems.

If the change doesn't touch the Swift environment or the systems that feed it, report this standard as `not_applicable`.

## Checks

### [SWIFT CSP 1.1] The Swift environment is separated from the rest of the network
Look for: firewall, network policy, security group or routing changes that open the Swift zone to general IT, flat networks where the Swift components share a segment with general-purpose servers, and rules that allow any-to-any traffic.
Decided from code: yes, for what the infrastructure files configure.

### [SWIFT CSP 1.4] Internet access from the Swift environment is blocked
Look for: outbound access to the internet from Swift components or their jump servers, proxy or egress rules with wide allow-lists, and package or update downloads run directly on those systems.
Decided from code: yes, for what the infrastructure files configure.

### [SWIFT CSP 2.1] Data moving between Swift components is protected
Look for: traffic between the messaging interface, the application and other Swift components that is unencrypted or has no integrity or mutual authentication, and TLS verification turned off.
Decided from code: yes.

### [SWIFT CSP 2.2] Security updates are applied to Swift components
Look for: pinned old versions of operating systems, interface software, libraries or base images with known flaws, and no process in the pipeline that flags or applies updates.
Decided from code: partly. Patching of installed software is often done outside the repository.

### [SWIFT CSP 2.3] Systems in the Swift environment are hardened
Look for: images or build scripts that leave default accounts, unneeded services, open ports, debug modes or sample files, and configuration that deviates from a hardening baseline.
Decided from code: yes, for what the build and config files show.

### [SWIFT CSP 2.4] The link between the back office and Swift is secured
Look for: the first systems that talk to the Swift interface using shared credentials, unprotected file shares or unauthenticated queues; messages that aren't checked for origin or integrity before they are passed on; and back-office hosts with broad access.
Decided from code: yes, for what the code and config enforce.

### [SWIFT CSP 2.6] Operator sessions are confidential and tamper-resistant
Look for: operator access to Swift tools over unencrypted or unauthenticated sessions, session timeouts turned off, and remote access tools with weak settings.
Decided from code: yes.

### [SWIFT CSP 2.7] Systems are scanned for vulnerabilities
Look for: no dependency, image or infrastructure scanning for Swift components in the pipeline, scans that are disabled, and findings that are ignored.
Decided from code: partly. Scans of running systems are carried out outside the repository.

### [SWIFT CSP 2.9] Outgoing payments pass business controls
Look for: payment or message release code that sends with no limit, duplicate, counterparty, currency, working-hours or sanctions check; limits that the sender can change; and validation done only on the client side.
Decided from code: yes, for the checks the code runs.

### [SWIFT CSP 2.10] Swift-related applications are hardened
Look for: payment and interface applications with default or hard-coded accounts, debug endpoints, verbose errors, unneeded features, or input that is not validated before it reaches the messaging layer.
Decided from code: yes.

### [SWIFT CSP 4.1] Passwords are strong and protected
Look for: weak or no password rules for Swift tools, passwords stored in plain text or with fast hashes, default or shared passwords, and passwords in source, scripts or config.
Decided from code: yes.

### [SWIFT CSP 4.2] Multi-factor authentication is used for Swift access
Look for: sign-in to Swift tools, jump servers and operator accounts with a password alone, and MFA that can be turned off or skipped by a flag.
Decided from code: partly. MFA is often set up in the identity provider, outside the repository.

### [SWIFT CSP 5.1] Access is limited by role, and the user list is kept
Look for: roles that give operators more rights than needed, one person able to both create and release a payment, standing administrator accounts, shared accounts, and access rights with no way to list who has them.
Decided from code: partly. Who holds each role is a matter for the organisation.

### [SWIFT CSP 5.4] Credentials and secrets are stored safely
Look for: Swift credentials, certificates, private keys or tokens in source, config files, build logs, images or chat; and secrets stored on the same host as the system they open.
Acceptable: a vault, hardware security module or secret store, with access limited by role.
Decided from code: yes.

### [SWIFT CSP 6.2] Software integrity is verified
Look for: Swift software, packages or scripts installed with no signature or checksum check, build steps that pull unpinned components, and no check for unexpected changes to files.
Decided from code: yes, for what the build and deployment files do.

### [SWIFT CSP 6.4] Activity in the Swift environment is logged and monitored
Look for: sign-ins, privileged actions, message release and configuration changes that are not logged; logs that are editable by those they record; logs kept only on the same host; and alerts that are swallowed.
Decided from code: partly. Whether anyone reviews the logs is not visible in the code.
