# Security notes

Two policies live here: the one the app ships behind, and the one the sandboxed email frame
carries. They are different documents with different jobs and are easy to confuse.

## Production Content-Security-Policy

Serve this as a response header on the HTML document. A `<meta>` tag is a fallback, not an
equivalent: `frame-ancestors` and `report-to` are ignored in meta form.

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self';
  frame-src 'self';
  form-action 'none';
  base-uri 'none';
  frame-ancestors 'none';
  object-src 'none';
  upgrade-insecure-requests
```

Line by line, and why each is what it is:

| Directive                     | Why                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src 'none'`          | Everything is denied and then named back. A directive nobody thought about fails closed.                                                                                                                                                |
| `script-src 'self'`           | No `unsafe-inline` and no `unsafe-eval`. Vite emits external modules only, so nothing needs either.                                                                                                                                     |
| `style-src` with inline       | The one concession. Tailwind emits a stylesheet, but the app also sets inline `style` for token values, and Radix positions popovers with inline styles. A nonce would have to reach every one of those, so this is a deliberate trade. |
| `img-src 'self' data: https:` | Avatars are inline SVG data URIs. `https:` covers remote images inside an email, but only once the agent presses "Show images"; the frame's own policy is what actually gates them, and it starts at `img-src 'none'`.                  |
| `font-src 'self'`             | Fonts are self hosted through `@fontsource`. There is no CDN to allow, which is the point.                                                                                                                                              |
| `connect-src 'self'`          | The API is same origin. Widen this only for a real API host, never to `*`.                                                                                                                                                              |
| `frame-src 'self'`            | The email renderer's `srcDoc` frame inherits the parent origin. No third party frame is embedded anywhere.                                                                                                                              |
| `form-action 'none'`          | Nothing in the app posts a form. A phishing form injected into a page has nowhere to submit.                                                                                                                                            |
| `base-uri 'none'`             | Stops an injected `<base>` from repointing every relative URL on the page.                                                                                                                                                              |
| `frame-ancestors 'none'`      | The helpdesk is never embedded. This is the clickjacking defence, and it only works as a header.                                                                                                                                        |
| `object-src 'none'`           | No plugins, ever.                                                                                                                                                                                                                       |

Alongside it:

```
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### If a real API lives on another origin

Change `connect-src` to name that exact host. Do not add a wildcard: the value of `connect-src`
is that a script which somehow does run still has nowhere to send what it reads.

## The email frame's own policy

Separate, stricter, and generated per message in
[`src/lib/sanitize.ts`](../src/lib/sanitize.ts). Untrusted email is rendered inside an iframe with
`sandbox=""` — no `allow-scripts`, no `allow-same-origin` — carrying:

```
default-src 'none'; img-src 'none'|https: data:; style-src 'unsafe-inline'; font-src 'none'; form-action 'none'; base-uri 'none'
```

`img-src` starts at `'none'` and only widens when the agent chooses to load remote images, which
is what stops a tracking pixel confirming the address was read before anybody decided to.

Three layers, because one is not enough:

1. **DOMPurify** removes scripts, event handlers, and any URL outside `https:`, `mailto:`, and
   `cid:` before the HTML is ever written.
2. **The sandbox** means that even if something survived, it has no script execution and no
   access to the parent document.
3. **The frame CSP** means that even if it could run, it has nowhere to send anything.

## What the lint rules enforce

These are in `eslint.config.js` and fail the build, because a convention that is only written
down is a convention that erodes:

| Rule                                   | Requirement                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| No `dangerouslySetInnerHTML`           | NFR-2.2. Untrusted HTML has exactly one path, through `sanitize.ts` and a frame.       |
| No auth-shaped keys in `localStorage`  | NFR-2.5. Sessions are httpOnly cookies; a token in storage is XSS-readable.            |
| No `@/mocks` from application code     | NFR-2.6. Keeps the seed set, and anything that looks like a secret, out of the bundle. |
| Cross-feature imports via barrels only | Keeps the route-level code splitting real, which is what holds the bundle budget.      |

## Known advisory

`react-router` carries GHSA-qwww-vcr4-c8h2, a CSRF issue in its RSC server mode. This app is a
static SPA with no React Server Components and no router-run server, so the affected code path
is not reachable. Recorded here rather than silenced, so a future upgrade closes it properly
instead of the note being lost.
