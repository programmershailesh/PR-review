# PSD2 strong customer authentication: code review checklist

Source: Commission Delegated Regulation (EU) 2018/389 of 27 November 2017, regulatory technical standards on strong customer authentication and common and secure open standards of communication under Directive (EU) 2015/2366 (PSD2), as amended, https://eur-lex.europa.eu/eli/reg_del/2018/389/oj. The checks below are written in our own words. The IDs are article numbers of the regulation, so a finding can be traced back to the official text.

PSD2 requires payment service providers to use strong customer authentication (SCA) for sign-in to payment accounts, electronic payments and risky actions. SCA means two or more independent factors from knowledge (something only the user knows), possession (something only the user has) and inherence (something the user is). The regulation also sets rules for protecting credentials and for the interfaces that banks give to third-party providers.

## When this applies

Apply these checks only to changed code of a payment service provider or a service that sits in the payment flow: bank and payment account sign-in, payment initiation, authentication and step-up flows, credential issue and reset, and account access interfaces (APIs) for third-party providers.

A merchant that only sends the payer to its payment provider is usually out of scope for most of these checks, but payment pages must still handle the authentication result correctly. If the change doesn't touch authentication, payments or account access interfaces, report this standard as `not_applicable`.

## Checks

### [PSD2 RTS Art. 4] Authentication codes are one-time, tied to the session and limited in attempts
Look for: codes that can be reused, that are not bound to the user and the action, that live too long, or that have no limit on wrong attempts. Also look for error messages that reveal which factor was wrong, and sessions with no inactivity timeout.
Decided from code: yes.

### [PSD2 RTS Art. 5] The payment amount and payee are tied to the authentication code
Look for: payment confirmation where the code is not bound to the amount and the payee, where the amount or payee can change after the code is issued with no new code needed, or where the user is not shown the amount and payee before confirming.
Decided from code: yes.

### [PSD2 RTS Art. 6] Knowledge factors are protected from disclosure
Look for: passwords, PINs and security answers that are logged, shown in the clear, stored unhashed, sent in URLs, or comparable by timing. Also look for knowledge factors that can be guessed with no throttling.
Decided from code: yes.

### [PSD2 RTS Art. 7] Possession factors cannot be copied
Look for: device registration or one-time-code seeds that can be cloned or exported, SMS or app codes that can be replayed, and device binding that relies on values the client can set.
Decided from code: partly. Hardware security of the device is outside the code.

### [PSD2 RTS Art. 8] Biometric and device factors are checked on the device and not leaked
Look for: biometric templates or raw samples sent to or stored on the server, biometric success reported to the server as a bare flag the client can forge, and fallbacks to a weaker factor with no re-check.
Decided from code: partly. The device's biometric quality is outside the code.

### [PSD2 RTS Art. 9] Factors are independent
Look for: flows where one breach exposes two factors, such as a code sent to the same app or device that holds the password, or a second factor that is skipped when the first is correct.
Decided from code: partly. Independence also depends on how users use the devices.

### [PSD2 RTS Art. 13] Trusted beneficiary lists need strong authentication to change
Look for: payee allow-lists that can be edited without SCA, or SCA exemptions that apply to payees added without authentication.
Decided from code: yes.

### [PSD2 RTS Art. 14] Recurring payments are authenticated when created or changed
Look for: standing orders or subscriptions that can be created or have their amount changed without SCA, and later payments that reuse a first authentication after a change.
Decided from code: yes.

### [PSD2 RTS Art. 18] Exemptions for low-risk payments are checked in real time
Look for: transaction risk analysis exemptions with no real-time risk check, thresholds that can be set by the client, exemptions applied without recording the reason, and no fallback to SCA when risk is high.
Decided from code: partly. The fraud-rate limits are calculated and reported outside the code.

### [PSD2 RTS Art. 22] Personalised security credentials are protected throughout
Look for: credentials, tokens or keys that are logged, stored in plain text, sent to unauthorised parties, or readable by staff who do not need them.
Decided from code: yes.

### [PSD2 RTS Art. 23] Credentials are created and sent securely
Look for: credential generation with weak randomness, credentials or reset links sent in the clear or by an unprotected channel, and activation links that never expire or can be reused.
Decided from code: yes.

### [PSD2 RTS Art. 27] Credentials can be deactivated and revoked
Look for: no way to revoke a device, token or credential, revoked credentials that still work (cached tokens, long-lived refresh tokens), and no record of the revocation.
Decided from code: yes.

### [PSD2 RTS Art. 29] Third-party provider access can be traced
Look for: account access interface calls that don't record which third-party provider called, for which user and consent, and the payment or data involved. Records must allow a payment to be traced end to end.
Decided from code: yes.

### [PSD2 RTS Art. 34] Third-party providers are identified by qualified certificates
Look for: access interfaces that accept third-party callers on a shared secret or API key alone, certificate checks that are turned off, and no check that the certificate is a qualified one for the provider's role.
Decided from code: yes, for what the code validates.

### [PSD2 RTS Art. 35] The communication session is secured
Look for: TLS turned off or not verified, weak protocol versions, sessions that don't expire, session identifiers in URLs, and responses that expose sensitive credentials of the user to the third party.
Decided from code: yes.
