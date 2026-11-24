# OWASP API Security Top 10 (2023 edition): code review checklist

Source: OWASP Foundation, OWASP API Security Top 10 2023, https://owasp.org/API-Security/editions/2023/en/0x11-t10/, with the source text at https://github.com/OWASP/API-Security/tree/master/editions/2023/en. The OWASP API Security Top 10 is © The OWASP Foundation and licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/). The checks below are written in our own words, based on that work. The IDs are the list's own risk IDs, so a finding can be traced back to the official text.

The 2023 edition renumbered and merged several risks from 2019. For example, API3:2023 combines the old excessive data exposure and mass assignment risks. Always cite the 2023 IDs exactly as written in the headings.

## When this applies

Apply these checks only to changed code that defines, implements or calls an API. This includes REST, GraphQL, gRPC, SOAP and WebSocket endpoints, their middleware (authentication, authorisation, rate limiting, validation), serializers and response types, API gateway and OpenAPI configuration, and code that calls third-party APIs, which API10:2023 covers.

If the change doesn't touch API code, report this standard as `not_applicable`. A server-rendered page that only posts a form to its own back end is usually covered better by other standards, unless that back end is also used as an API.

## Checks

### [OWASP API Top 10 API1:2023] Every request for an object checks that the caller may use that object
Look for: handlers that take an object ID from the path, query, body, headers or GraphQL arguments (`/orders/{id}`, `?accountId=`) and read, change or delete the object without checking that the caller may act on it. Queries that filter only by the given ID and not by the current user, team or tenant. A check that only compares the ID in the URL with the user ID in the token, when the object belongs to the user through something else, such as an order, a file or a team. Bulk or nested endpoints that check only some of the IDs.
Acceptable: lookups scoped to the caller in the query itself (`where: { id, ownerId: user.id }`), or one shared policy check called on every access. Random IDs such as UUIDs make guessing harder but do not replace the check.
Decided from code: yes.

### [OWASP API Top 10 API2:2023] API authentication can't be bypassed, guessed or replayed
Look for: login, token, one-time code and password reset endpoints with no brute-force protection, such as rate limiting, lockout or captcha. Tokens or passwords sent in the URL. JWTs accepted unsigned (`alg: none`), signed with a weak or hard-coded secret, or used without checking the signature or expiry (`jwt.decode` without verification, `ignoreExpiration: true`). Email, password or second-factor changes allowed without asking for the password again. API keys used to sign in users rather than to identify client apps. Internal service endpoints that other services can call without authentication. Weak or predictable tokens. Passwords stored in plain text or with weak hashes.
Decided from code: yes, for code in this repository. Gateway or identity provider settings need a person to check.

### [OWASP API Top 10 API3:2023] Responses and updates only touch the properties the caller may see or change
Look for: whole database objects or ORM entities returned to the client, such as `res.json(user)`, a generic `to_json()`, a Django REST serializer with `fields = '__all__'`, or an entity returned straight from a controller, when they hold fields like password hashes, internal flags, tokens or other users' data. Relying on the front end to hide fields. Request bodies bound straight onto models (`Object.assign(user, req.body)`, `Model.update(req.body)`, Rails `permit!`) so a caller can set fields such as `role`, `isAdmin`, `balance`, `ownerId` or `verified`. GraphQL types that expose sensitive fields without field-level checks.
Acceptable: response types or serializers with an explicit list of fields, and input schemas that list the fields each action may change.
Decided from code: yes.

### [OWASP API Top 10 API4:2023] Every request has limits on size, number and cost
Look for: endpoints with no rate limit, especially costly ones. Page sizes taken from the request (`limit`, `per_page`, `pageSize`) with no maximum. No limit on body size, upload size, string length or array length. GraphQL with no limit on batching, depth or cost. Calls to paid services, such as SMS, email, AI models or identity checks, that a user can trigger without a per-user limit. No timeouts on outbound calls or long jobs. Operations such as checking a one-time code or requesting password recovery that can be repeated without a limit.
Decided from code: partly. Limits set in an API gateway, proxy, container settings or a provider's spending controls are outside the repository.

### [OWASP API Top 10 API5:2023] Administrative and privileged functions check the caller's role
Look for: new admin or internal endpoints with no role check, or protected only by a path that is hard to guess (`/api/v1/users/export_all`). Admin actions added to regular controllers without their own check. A path where GET is protected but PUT, PATCH or DELETE on the same path isn't. Role checks based on a header, parameter or claim the client controls and the server doesn't verify. Authorisation that allows by default and only blocks listed roles.
Acceptable: deny-by-default middleware, or a base controller that applies role checks to every admin route.
Decided from code: yes, for checks done in code.

### [OWASP API Top 10 API6:2023] Business flows that harm the business when automated are protected
Look for: new endpoints for buying, booking, redeeming, signing up, posting, referral rewards or similar flows, with nothing to slow down scripted abuse, such as per-user or per-device limits, captcha, or checks for inhumanly fast steps. Machine-to-machine and partner APIs that expose these flows with weaker protection than the public app.
Decided from code: partly. Which flows are sensitive is a business decision, and bot protection often runs in a service outside the repository.

### [OWASP API Top 10 API7:2023] The server only fetches URLs it is meant to fetch
Look for: code that fetches a URL supplied by the client, such as webhooks, URL previews, imports from a link, file or image fetching, or custom single sign-on, with no allow list of expected hosts, URL schemes, ports and media types. Requests that can reach internal addresses or cloud metadata, such as `localhost`, private IP ranges or `169.254.169.254`. HTTP clients left to follow redirects for these requests. Hand-written URL parsing. Raw responses from the fetched URL passed back to the client.
Acceptable: an allow list, redirects turned off, a well-tested URL parser, and fetching done from an isolated network.
Decided from code: partly. Network isolation of the service that fetches URLs is outside the repository.

### [OWASP API Top 10 API8:2023] The API and the systems behind it are configured securely
Look for: plain HTTP between clients and the API, or between internal services. CORS that is missing or too broad for browser clients. Error responses that include stack traces or other internal details. HTTP methods enabled that the API doesn't use. Missing security headers or cache-control headers on sensitive responses. Content types accepted that the endpoint doesn't need, such as XML on a JSON API. Verbose logging or debug features left on. Cloud storage or other permissions opened up in infrastructure files.
Decided from code: partly. Server, proxy and cloud settings may be outside the repository.

### [OWASP API Top 10 API9:2023] Every API host and version is known, documented and retired on purpose
Look for: new routes or API versions added without updating the API description the project keeps, such as an OpenAPI file or GraphQL schema. Old versions (`/v1`) kept running next to new ones without the same security fixes. Debug, test, beta or staging endpoints shipped in production code. API documentation served publicly when the API isn't public. Production data used in non-production deployments. New flows of sensitive data to third parties that aren't recorded anywhere.
Decided from code: partly. The full list of hosts, environments and data flows is usually kept outside the repository.

### [OWASP API Top 10 API10:2023] Data from other APIs is treated as untrusted
Look for: responses from third-party or partner APIs used without validation or sanitising, for example put into SQL, HTML, shell commands, file paths or redirects. Calls to other APIs over plain HTTP. HTTP clients that follow a third party's redirects with no allow list. No timeouts on calls to other services. No limit on how much of a response is read or processed.
Decided from code: yes.
