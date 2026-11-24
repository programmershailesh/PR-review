# Content Security Policy and security headers: code review checklist

Sources: W3C Content Security Policy Level 3 (https://www.w3.org/TR/CSP3/), RFC 6797 HTTP Strict Transport Security, RFC 6265 HTTP cookies and the SameSite attribute from its successor draft, the Fetch standard's CORS rules (https://fetch.spec.whatwg.org/), W3C Subresource Integrity, and the OWASP HTTP Headers Cheat Sheet. Written in our own words.

There is no numbered control list for web headers, so each check is identified by the directive or header it's about. Cite these names exactly.

## When this applies

Apply these checks to changed code that sets HTTP response headers or cookies, serves HTML, loads scripts or styles, configures a web framework's security middleware (such as helmet, Spring Security headers, Django `SECURE_*` settings, ASP.NET middleware or an nginx config), or changes CORS. Also apply them when a change adds inline scripts, inline event handlers or `eval`-style code to pages that are served with a policy.

If the change touches none of these, report this standard as `not_applicable`. Server-only APIs that return JSON still need the CORS, HSTS and cookie checks, but not the script checks.

## Checks

### [CSP script-src] Scripts can't run from injected markup
Look for: `'unsafe-inline'` in `script-src` (or in `default-src` when `script-src` is absent) without a nonce or hash, wildcard sources (`*`, `https:`, `data:`), or a policy with no `script-src` or `default-src` at all.
Better: nonces or hashes with `'strict-dynamic'`.
Not a breach: `'unsafe-inline'` alongside a nonce or hash, which modern browsers ignore and which is only there for old ones.
Decided from code: yes, when the policy is set in this repository.

### [CSP unsafe-eval] Code isn't built from strings at run time
Look for: `'unsafe-eval'` added to a policy, or new uses of `eval`, `new Function`, or `setTimeout` and `setInterval` with string arguments on pages served with a policy.
Better: `'wasm-unsafe-eval'` when only WebAssembly needs it.
Decided from code: yes.

### [CSP nonce] Nonces are fresh and unguessable
Look for: a nonce that's hard-coded, reused across responses, cached in a shared HTML page, or generated with a predictable random source.
Decided from code: yes.

### [CSP object-src] Plugins are blocked
Look for: a policy without `object-src 'none'`, unless `default-src 'none'` already covers it.
Decided from code: yes.

### [CSP base-uri] The base URL can't be changed by injected markup
Look for: a policy without `base-uri 'none'` or `base-uri 'self'`, which lets an injected `<base>` tag redirect relative script URLs.
Decided from code: yes.

### [CSP frame-ancestors] Pages can't be framed by other sites
Look for: pages with sign-in, payment or account actions that don't set `frame-ancestors`, or the older `X-Frame-Options`, to stop clickjacking. Also a policy that widens it to `*`.
Decided from code: yes.

### [CSP form-action] Forms can't post to other sites
Look for: sensitive forms on a page whose policy has no `form-action`, when the policy is otherwise strict enough that this matters.
Decided from code: yes.

### [CSP report-to] Policy violations are reported
Look for: a policy change that removes `report-to` or `report-uri`, or a new strict policy rolled out with no report-only stage or reporting.
Decided from code: yes.

### [CSP style-src] Styles can't be injected freely
Look for: `'unsafe-inline'` newly added to `style-src` on pages that render user content.
This is lower risk than scripts. Rate it accordingly.
Decided from code: yes.

### [CSP require-trusted-types-for] DOM sinks are protected where Trusted Types are used
Look for: a project that already enforces `require-trusted-types-for 'script'`, and a change that removes it or adds a permissive default policy that passes strings straight through.
Decided from code: yes.

### [SRI] Third-party scripts and styles are checked
Look for: new `<script>` or `<link rel="stylesheet">` tags loading from a CDN or another domain without an `integrity` attribute and `crossorigin`.
Not a breach: files served from your own origin, or scripts a vendor says must not be pinned, such as a payment provider's loader that is covered by `script-src`.
Decided from code: yes.

### [HSTS] Browsers are told to use HTTPS only
Look for: an HTTPS site that doesn't send `Strict-Transport-Security`, a `max-age` shorter than six months (15768000 seconds), or a change that removes the header or `includeSubDomains`.
Decided from code: yes, when headers are set in this repository. A proxy or CDN may add it instead, so check for that before flagging.

### [Set-Cookie] Session cookies have Secure, HttpOnly and SameSite
Look for: session or authentication cookies set without `Secure`, without `HttpOnly`, or with `SameSite=None` and no reason. Cookies holding personal or security data with a long lifetime.
Not a breach: cookies that scripts must read, such as a CSRF double-submit token, being without `HttpOnly`.
Decided from code: yes.

### [CORS] Cross-origin access is limited to trusted origins
Look for: `Access-Control-Allow-Origin` that reflects the request's `Origin` without checking it against an allow list, `*` on endpoints that use cookies or return private data, `Access-Control-Allow-Credentials: true` with a broad origin, or trusting the `null` origin.
Decided from code: yes.

### [X-Content-Type-Options] Browsers don't guess content types
Look for: responses that serve user uploads or other user-controlled content without `X-Content-Type-Options: nosniff`, or a change that removes it globally.
Decided from code: yes.

### [Referrer-Policy] URLs with secrets don't leak to other sites
Look for: pages whose URLs contain tokens, IDs or personal data, with no `Referrer-Policy` or with `unsafe-url`.
Decided from code: yes.

### [Permissions-Policy] Powerful browser features are only enabled where needed
Look for: a change that grants camera, microphone, geolocation or payment features to all origins, or to embedded third-party frames that don't need them.
Decided from code: yes.
