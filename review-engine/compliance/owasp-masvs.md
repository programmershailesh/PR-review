# OWASP MASVS (mobile): code review checklist

Source: OWASP Mobile Application Security Verification Standard (MASVS) version 2, https://mas.owasp.org/MASVS/. The standard is © The OWASP Foundation and licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). The checks below are written in our own words. The IDs are the MASVS v2 control IDs, so a finding can be traced back to the official text. The MASVS-RESILIENCE controls (optional hardening for apps with a higher threat level) are not included.

## When this applies

Apply these checks only to changed code of a mobile app: Android (Kotlin, Java, manifest and Gradle files), iOS (Swift, Objective-C, plist and entitlements), and cross-platform frameworks such as React Native, Flutter or Xamarin that produce a mobile app.

If the change is not mobile app code, or is documentation, styling or copy only, report this standard as `not_applicable`.

## Checks

### [MASVS-STORAGE-1] Sensitive data is stored securely on the device
Look for: tokens, passwords, keys or personal data in `SharedPreferences`, `UserDefaults`, plain files, SQLite or Realm databases without encryption, or external storage. Secrets kept outside the Android Keystore or iOS Keychain. Files saved world-readable.
Not a breach: non-sensitive settings and cached public data.
Decided from code: yes.

### [MASVS-STORAGE-2] Sensitive data doesn't leak out of the app through other channels
Look for: sensitive values written to logs (`Log.d`, `print`, `NSLog`), included in analytics or crash reports, left in the clipboard, keyboard cache or screenshots of the app switcher, or included in app backups (`allowBackup="true"`, no backup exclusions).
Decided from code: yes.

### [MASVS-CRYPTO-1] The app uses strong, current cryptography
Look for: weak or broken algorithms and modes (DES, 3DES, RC4, MD5 or SHA-1 for security, AES-ECB), static or reused IVs and nonces, a non-random source for keys, tokens or IVs (`Random`, `arc4random` misuse), password hashing with a fast hash, and home-made cryptography.
Decided from code: yes.

### [MASVS-CRYPTO-2] Cryptographic keys are managed properly
Look for: keys, salts or secrets hard-coded in source or resources, the same key shipped to every install, keys derived from weak input, keys kept outside hardware-backed stores where available, and keys that are never rotated or are reused for different purposes.
Decided from code: yes.

### [MASVS-AUTH-1] The app uses secure protocols to authenticate users and authorise requests
Look for: sign-in flows that skip the standard for the platform (OAuth 2.0 with PKCE in the system browser, not an embedded web view), credentials sent in URLs, authorisation decided only on the device, long-lived tokens with no expiry or revocation, and no check on the server side.
Decided from code: partly. Server-side behaviour is outside the app's code.

### [MASVS-AUTH-2] Local authentication is done safely
Look for: biometric or PIN checks whose result is only a boolean that the app trusts (so it can be hooked), rather than unlocking a key held in the Keystore or Keychain. Fallback to weak checks, and no handling of changes in enrolled biometrics.
Decided from code: yes.

### [MASVS-NETWORK-1] Network traffic is protected with current TLS
Look for: `http://` URLs, `usesCleartextTraffic="true"`, App Transport Security exceptions (`NSAllowsArbitraryLoads`), trust-all `TrustManager` or `HostnameVerifier`, `URLSession` delegates that accept any certificate, ignored SSL errors in web views, old protocol versions.
Not a breach: cleartext limited to debug builds for local development.
Decided from code: yes.

### [MASVS-NETWORK-2] The app checks it is talking to the right server
Look for: certificate pinning removed or loosened (`network_security_config.xml`, pinning libraries, `TrustKit`), pins that are set to user-added certificates, and pinning applied to some hosts but not new ones that carry sensitive data.
Decided from code: partly. Pinning is a choice some projects make and others do not.

### [MASVS-PLATFORM-1] Communication with other apps and the system is secure
Look for: exported Android components (`exported="true"`, intent filters) without permissions, implicit intents carrying sensitive data, broadcasts anyone can receive, unvalidated intent extras, `PendingIntent` that is mutable, iOS URL schemes and universal links that act on unvalidated parameters, and content providers open to other apps.
Decided from code: yes.

### [MASVS-PLATFORM-2] Web views are configured safely
Look for: JavaScript turned on for untrusted content, `addJavascriptInterface` or message handlers exposed to remote pages, file access enabled (`setAllowFileAccess`, `allowUniversalAccessFromFileURLs`), loading of arbitrary URLs with no allow-list, and web debugging left on in release builds.
Decided from code: yes.

### [MASVS-PLATFORM-3] The user interface doesn't expose sensitive data
Look for: sensitive values shown in clear text on screen with no masking (password fields without secure input), no `FLAG_SECURE` or equivalent on sensitive screens when the project uses it, sensitive data in notifications, and auto-fill allowed for secrets.
Decided from code: yes.

### [MASVS-CODE-1] The app runs only on supported platform versions
Look for: a `minSdkVersion` or deployment target lowered to an old OS that no longer gets security fixes, without a reason.
Decided from code: yes.

### [MASVS-CODE-3] Third-party components have no known vulnerabilities
Look for: new or outdated libraries and SDKs in Gradle, CocoaPods, Swift Package Manager, npm or pub files, at versions with known vulnerabilities. Libraries from unofficial repositories, unpinned versions, and dependency scanning removed from the pipeline.
Decided from code: partly. A scan outside the repository is not visible.

### [MASVS-CODE-4] Untrusted input is validated and handled safely
Look for: data from deep links, intents, QR codes, files, push messages, web views and servers used with no checks: in SQL, file paths, commands, web-view URLs or deserialisation. Native code with unchecked buffer sizes. Debuggable builds shipped (`android:debuggable="true"`).
Decided from code: yes.

### [MASVS-PRIVACY-1] The app asks for as little sensitive data and as few permissions as it needs
Look for: new permissions in the manifest or `Info.plist` with no use in the code (location, contacts, camera, microphone, storage), precise data where approximate is enough, and new fields collecting personal data that the feature doesn't need.
Decided from code: yes.

### [MASVS-PRIVACY-2] Users can't easily be identified or tracked more than necessary
Look for: persistent device identifiers (IMEI, MAC address, advertising ID) collected or sent, fingerprinting, personal data in analytics events and URLs, and third-party SDKs that receive identifiers.
Decided from code: yes.

### [MASVS-PRIVACY-3] The app is open about what data it collects and shares
Look for: new data collection or new third-party SDKs with no matching update to the privacy notice, the in-app disclosure or the store privacy declarations (Data safety, App Privacy) kept in the repository.
Decided from code: partly. Store declarations are often kept outside the repository.

### [MASVS-PRIVACY-4] Users can control their data
Look for: new personal data with no way to view, export, delete or turn off collection, where the app offers these for similar data. Consent prompts that run after data is already sent, and opt-outs that don't stop the collection.
Decided from code: partly. Server-side deletion is not visible in the app.
