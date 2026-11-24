# OWASP ASVS 5.0.0: code review checklist

Source: OWASP Foundation, OWASP Application Security Verification Standard (ASVS) version 5.0.0 (May 2025), https://owasp.org/www-project-application-security-verification-standard/, with the source text at https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0. The ASVS is © The OWASP Foundation and licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/). The checks below are written in our own words, based on that work.

Each ID uses the citation format the ASVS itself recommends, `v<version>-<chapter>.<section>.<requirement>`. For example, `OWASP ASVS v5.0.0-1.2.4` means requirement 1.2.4 of version 5.0.0. Requirement numbers changed between ASVS 4 and 5, so always cite the IDs exactly as written in the headings.

## When this applies

Apply these checks to changed code in a web application, API or web service, and to any backend code that handles user input, sign-in, sessions, permissions, cryptography, secrets, files, logging or error handling. If the change touches none of these, report this standard as `not_applicable`.

This checklist is a selection of 35 of the 345 requirements in ASVS 5.0.0. They were chosen because they can usually be seen in a code change. The selection mostly reflects Level 1: 22 checks are Level 1 and 13 are Level 2. No Level 3 requirements are included. The ASVS says most applications should aim for Level 2.

The Level 2 checks are 1.3.6, 1.5.2, 4.3.1, 8.4.1, 11.4.2, 11.5.1, 12.3.2, 13.3.1, 13.4.2, 15.3.3, 16.2.5, 16.5.1 and 16.5.3. If the project is known to target Level 1 only, report problems on these checks as advice rather than failures. Passing this checklist is not ASVS compliance at any level, because many requirements depend on documentation, design or settings outside the code.

## Checks

### [OWASP ASVS v5.0.0-1.2.1] Output is encoded for the place it goes in HTML, XML or HTTP headers
Look for: untrusted data written into HTML elements, attributes, comments, inline CSS, XML or response headers without encoding that suits that spot. Template auto-escaping turned off or bypassed (`autoescape false`, `|safe`, triple braces in Handlebars or Mustache, `Html.Raw`, `th:utext`). HTML or XML built by joining strings. User data in an unquoted attribute.
Not a breach: framework templates that encode by default, used normally.
Decided from code: yes.

### [OWASP ASVS v5.0.0-1.2.4] Database queries keep data separate from the query
Look for: SQL, HQL, NoSQL or Cypher queries built by joining strings with untrusted data, such as string concatenation, f-strings or template literals in queries, `knex.raw` or `Sequelize.literal` with user values, `FromSqlRaw` with concatenation, or MongoDB `$where` with user input. Stored procedures that build SQL from their parameters and run it.
Acceptable: bound parameters, prepared statements, and ORM query builders.
Decided from code: yes.

### [OWASP ASVS v5.0.0-1.2.5] Operating system commands can't be changed by input
Look for: commands built from untrusted input and run through a shell, such as `os.system`, `subprocess` with `shell=True`, `child_process.exec`, `Runtime.exec` with one string, `Process.Start` with an argument string built from input, or PHP `system` and `exec`.
Acceptable: an argument array passed without a shell (`execFile`, `spawn` without `shell: true`, `subprocess.run([...])`), with input that can't be read as an extra option.
Decided from code: yes.

### [OWASP ASVS v5.0.0-1.3.2] Code isn't built from strings and run at run time
Look for: `eval`, `new Function`, `setTimeout` or `setInterval` with a string, Python `exec` or `eval`, PHP `eval`, Ruby `eval` or `instance_eval` with a string, or expression languages such as SpEL or OGNL parsed from user input.
Not a breach: dynamic code with no user input in it. Where there is truly no alternative, input must be sanitised first.
Decided from code: yes.

### [OWASP ASVS v5.0.0-1.3.6] Requests the server makes from untrusted data go only to allowed places
Look for: HTTP clients, webhook senders, URL previews, image or file fetchers, or PDF and HTML renderers given a URL or host that comes from the user, with no allow list of protocols, domains, paths and ports. A deny list of `localhost` alone is not enough.
Decided from code: yes, for checks in code. Network rules that block outbound traffic are outside the repository.

### [OWASP ASVS v5.0.0-1.5.1] XML parsers don't resolve external entities
Look for: XML parsers used on untrusted input without turning off external entities and DTDs, such as Java `DocumentBuilderFactory`, `SAXParserFactory` or `XMLInputFactory` with default features, .NET `DtdProcessing.Parse` with an `XmlResolver`, PHP `LIBXML_NOENT`, or lxml with `resolve_entities=True`. Remember that SVG, DOCX and XLSX uploads are XML too.
Acceptable: hardened parser settings, or a safe wrapper such as `defusedxml` in Python.
Decided from code: yes.

### [OWASP ASVS v5.0.0-1.5.2] Untrusted data is never deserialised into arbitrary objects
Look for: untrusted data passed to `pickle.loads`, `yaml.load` without a safe loader, Java `ObjectInputStream` without a class allow list, .NET `BinaryFormatter`, Json.NET `TypeNameHandling` set to anything but `None`, Jackson default typing, PHP `unserialize` or Ruby `Marshal.load`.
Acceptable: plain data formats such as JSON read into fixed types, or a strict allow list of classes.
Decided from code: yes.

### [OWASP ASVS v5.0.0-2.2.1] Input is checked against what is expected
Look for: new request fields that drive business or security decisions, such as amounts, quantities, IDs, roles, redirect targets, file names or enum values, used without checking type, format, range or allowed values. Validation that blocks known bad characters instead of allowing only expected values.
Not a breach: free-text fields that are encoded correctly wherever they are used.
Decided from code: yes.

### [OWASP ASVS v5.0.0-2.2.2] Validation is enforced on the server, not only in the browser
Look for: rules such as maximum length, allowed values, required fields or price and quantity limits that are checked only in front-end code, HTML form attributes (`maxlength`, `required`, `pattern`) or a mobile app, with no matching check on the server. Server checks removed because the UI already does them.
Decided from code: yes.

### [OWASP ASVS v5.0.0-3.2.2] Text is shown as text, not rendered as HTML
Look for: untrusted strings put into the page with `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, jQuery `.html()`, `dangerouslySetInnerHTML`, `v-html`, Svelte `{@html}`, or Angular `bypassSecurityTrustHtml`.
Acceptable: `textContent`, `createTextNode`, and framework bindings that escape by default, such as `{value}` in React or `{{ value }}` in Vue.
Decided from code: yes.

### [OWASP ASVS v5.0.0-3.4.2] CORS only allows trusted origins
Look for: `Access-Control-Allow-Origin` copied from the request's `Origin` header without an allow-list check, CORS middleware set to allow every origin (such as `origin: true` in the Node `cors` package), origin checks that can be fooled (unanchored regexes, `endsWith("example.com")`, which also matches `evilexample.com`), and `*` on responses that contain private data.
Decided from code: yes, when CORS is set in this repository.

### [OWASP ASVS v5.0.0-3.5.1] State-changing requests can't be forged from another site
Look for: cookie-authenticated endpoints that change data and accept simple cross-site requests (form posts, `text/plain` bodies) with no anti-forgery token and no required custom header. CSRF protection switched off for such endpoints, such as `csrf_exempt` in Django, `csrf().disable()` in Spring Security, `[IgnoreAntiforgeryToken]` in ASP.NET, or skipping `verify_authenticity_token` in Rails.
Not a breach: APIs authenticated only by a bearer token in the `Authorization` header, with no cookies.
Decided from code: yes.

### [OWASP ASVS v5.0.0-4.3.1] GraphQL queries are limited in depth and cost
Look for: a new GraphQL server or schema with no query depth limit, no limit on the number of items or aliases, no cost or complexity analysis, and no allow list of known queries, especially with nested or recursive types.
Decided from code: yes, when the server is configured in this repository.

### [OWASP ASVS v5.0.0-5.2.2] Uploaded files are the type they claim to be
Look for: uploads accepted based only on the file name or the client's `Content-Type`, with no check that the extension is expected and that the content matches it, such as by checking magic bytes, re-encoding images, or using a file-type library. Files inside uploaded archives not checked.
Decided from code: yes.

### [OWASP ASVS v5.0.0-5.3.2] File paths aren't built from user-supplied names
Look for: file paths built from a user's file name or path, such as `path.join(dir, req.body.filename)`, `Path.Combine` or `new File(dir, name)` with user input, or PHP `include` with user input, without strict validation that removes directory parts and keeps the result inside the intended folder.
Acceptable: generated names such as UUIDs, with the original name stored only as data.
Decided from code: yes.

### [OWASP ASVS v5.0.0-6.3.1] Sign-in is protected against brute force and credential stuffing
Look for: new or changed login, password reset, one-time code or PIN endpoints with no rate limit, lockout, delay or similar control. Limits keyed on a value the client controls, such as an `X-Forwarded-For` header that no trusted proxy sets.
Decided from code: partly. The ASVS expects the controls to follow the application's own security documentation, and limits may be applied by a gateway or identity provider outside the repository.

### [OWASP ASVS v5.0.0-7.2.4] A new session token is issued at sign-in
Look for: sign-in or re-authentication code that keeps the session ID from before authentication (session fixation), such as no `req.session.regenerate()` in Express, no `session_regenerate_id(true)` in PHP, or Spring Security session fixation protection set to `none()`.
Decided from code: yes.

### [OWASP ASVS v5.0.0-7.4.1] Logged-out and expired sessions can't be used again
Look for: logout that only deletes the cookie or token in the browser while the server-side session stays valid. Self-contained tokens, such as JWTs, used as sessions with no way to stop them working at logout, such as a list of ended tokens, a per-user "issued before" time, or a per-user signing key that is rotated.
Decided from code: yes.

### [OWASP ASVS v5.0.0-8.2.1] Each function is limited to callers with permission to use it
Look for: new endpoints, admin actions, GraphQL mutations or RPC methods with no role or permission check. Routes left out of the authorisation middleware. Checks that allow by default.
Decided from code: yes, for checks done in code.

### [OWASP ASVS v5.0.0-8.2.2] Each record is limited to callers with permission to that record
Look for: records read, changed or deleted by an ID from the request without checking the caller's rights to that specific record (insecure direct object references). Queries with no owner, team or tenant condition. Bulk endpoints that check only some of the IDs.
Decided from code: yes.

### [OWASP ASVS v5.0.0-8.3.1] Authorisation is decided on the server
Look for: access rules enforced only by hiding buttons, routes or fields in the front end or a mobile app. The server trusting role, permission or user ID values sent by the client, such as `isAdmin` in the request body or an unsigned cookie.
Decided from code: yes.

### [OWASP ASVS v5.0.0-8.4.1] One tenant's actions can never affect another tenant
Look for: queries, cache keys, file storage paths, queues, search indexes or background jobs that don't include the tenant. A tenant ID taken from the request instead of the authenticated session. Support or admin tools that cross tenants without a check.
Decided from code: yes.

### [OWASP ASVS v5.0.0-9.1.1] Tokens are verified before their contents are used
Look for: JWTs or other signed tokens decoded without checking the signature or MAC, such as `jwt.decode` instead of `jwt.verify` in Node, `verify_signature: False` in PyJWT, or claims read before the signature check.
Decided from code: yes.

### [OWASP ASVS v5.0.0-9.1.2] Only allowed algorithms are accepted for tokens
Look for: token verification that doesn't name the allowed algorithms and so trusts the `alg` value in the token header, the `none` algorithm accepted, or symmetric and asymmetric algorithms both allowed with no protection against key confusion.
Decided from code: yes.

### [OWASP ASVS v5.0.0-11.4.1] Only approved hash functions are used for security purposes
Look for: MD5 used for signatures, HMACs, key derivation, random generation, tokens or integrity checks. SHA-1 used for signatures, HMACs or key derivation, which the ASVS cryptography appendix (Appendix C) lists as legacy and unsuitable for those uses.
Not a breach: MD5 or SHA-1 used where security doesn't depend on it, such as cache keys or ETags.
Decided from code: yes.

### [OWASP ASVS v5.0.0-11.4.2] Passwords are stored with a slow password hashing function
Look for: passwords hashed with a fast hash such as SHA-256, SHA-1 or MD5, stored encrypted or in plain text, or hashed with a password function at weak settings. Appendix C accepts argon2id, scrypt, bcrypt with a cost of 10 or more, PBKDF2-HMAC-SHA-512 with at least 210,000 iterations, and PBKDF2-HMAC-SHA-256 with at least 600,000 iterations.
Decided from code: yes.

### [OWASP ASVS v5.0.0-11.5.1] Unguessable values come from a secure random generator
Look for: tokens, reset codes, API keys, session IDs, nonces or invite links made with `Math.random`, `java.util.Random`, Python's `random`, PHP `rand` or `mt_rand`, timestamps or counters. Values with less than 128 bits of entropy. UUIDs used as secret tokens, which the ASVS says don't meet this requirement.
Acceptable: `crypto.randomBytes` or `crypto.getRandomValues`, Python `secrets`, Java `SecureRandom`, .NET `RandomNumberGenerator`, or PHP `random_bytes`, with at least 16 random bytes.
Not a breach: short one-time codes that users type, which have their own length rules in chapter V6, as long as they also come from a secure generator.
Decided from code: yes.

### [OWASP ASVS v5.0.0-12.3.2] Outgoing TLS connections check the server's certificate
Look for: certificate checks turned off, such as `verify=False` in Python requests, `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0` in Node, `InsecureSkipVerify: true` in Go, a trust-all `TrustManager` or `HostnameVerifier` in Java, a `ServerCertificateCustomValidationCallback` that always returns true in .NET, or `CURLOPT_SSL_VERIFYPEER` set to false.
Not a breach: test code that only talks to a local test server and can't ship.
Decided from code: yes.

### [OWASP ASVS v5.0.0-13.3.1] Secrets are kept in a secrets manager, not in code
Look for: passwords, API keys, private keys, connection strings or token signing secrets in source code, committed config files, `.env` files, Dockerfiles, CI files, build output or front-end bundles.
Not a breach: placeholders, dummy values used only in tests, and values read at run time from a vault or the platform's secret store.
Decided from code: partly. The code shows whether secrets are in the repository. Whether a proper secrets manager is used is outside it.

### [OWASP ASVS v5.0.0-13.4.2] Debug modes are off in production
Look for: debug settings turned on in production config, such as `DEBUG = True` in Django, `app.run(debug=True)` in Flask, `UseDeveloperExceptionPage` without an environment check in ASP.NET, or debug toolbars and profilers registered for every environment.
Decided from code: yes, for configuration in this repository.

### [OWASP ASVS v5.0.0-14.2.1] Sensitive data isn't put in URLs
Look for: API keys, session tokens, passwords, access tokens or personal data placed in the URL path or query string, such as `?api_key=` or `?token=`, including GET forms that send sensitive fields.
Acceptable: sending them in the request body or a header such as `Authorization`.
Decided from code: yes.

### [OWASP ASVS v5.0.0-15.3.3] Requests can only set the fields each action allows
Look for: request bodies bound straight onto models or entities (mass assignment), such as `Object.assign(model, req.body)`, `Model.update(req.body)`, `findByIdAndUpdate(id, req.body)`, Rails `permit!`, a writable Django REST serializer with `fields = '__all__'`, or ASP.NET and Spring binding requests directly to entity classes. These let callers set fields such as `role`, `isAdmin`, `ownerId`, `price` or `verified`.
Acceptable: a separate input type per action, allow-listed fields, or fields marked read-only.
Decided from code: yes.

### [OWASP ASVS v5.0.0-16.2.5] Sensitive data in logs is left out or masked
Look for: passwords, API keys, tokens, session IDs, card numbers or personal data written to logs, error trackers or analytics. Whole request bodies, `Authorization` or `Cookie` headers, or full user objects logged for debugging.
Acceptable: masked or hashed values, such as the last four digits or a hash of a token.
Decided from code: yes, for what the code logs.

### [OWASP ASVS v5.0.0-16.5.1] Users get a generic message when something goes wrong
Look for: error handlers that return exception messages, stack traces, SQL, file paths, internal host names, secrets or tokens to the caller, such as sending `err.stack`, `str(e)` or `ex.ToString()` in a response.
Decided from code: yes.

### [OWASP ASVS v5.0.0-16.5.3] Errors make the code fail closed, not open
Look for: `catch` blocks that allow access, skip a check or carry on with a transaction after an error, such as returning `true` from a permission check when the policy service fails, or saving an order when payment validation throws. Validation errors that are logged but then ignored.
Decided from code: yes.
