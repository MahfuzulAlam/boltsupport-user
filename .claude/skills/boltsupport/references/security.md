# BoltSupport security contract

Source: PRD §0 (L119-145), plus §11 and §14. These are requirements, not suggestions. A helpdesk
renders attacker-controlled content by definition: anyone with an email address can put HTML and
instructions in front of an agent and, through the AI features, in front of a model.

Client-side checks are UX only, never the security boundary. A production deployment additionally
needs a server-enforced CSP, per-tenant data isolation, and server-side authorization.

## Untrusted HTML has exactly one render path

Email bodies, AI output rendered as HTML, and knowledge base previews render **only** through a
single shared component that DOMPurify-sanitizes and then mounts inside a sandboxed iframe via
`srcdoc`. That component is `features/conversations/components/EmailIframeRenderer.tsx`, and it is
the only sanitized HTML renderer in the codebase.

```tsx
const html = DOMPurify.sanitize(bodyHtml, { FORBID_TAGS: ["style", "link"] });

<iframe
  srcDoc={html}
  sandbox=""            /* NOT allow-same-origin, NOT allow-scripts */
  referrerPolicy="no-referrer"
  title="Message content"
/>
```

Sandbox without `allow-same-origin` makes the browser treat the frame as an opaque origin, so the
document cannot reach back into the app. Never combine `allow-same-origin` with `allow-scripts`:
together they let the frame remove its own sandbox attribute, which is the same as having no sandbox
at all. Sanitizing *and* sandboxing is deliberate belt-and-braces, because DOMPurify configuration
mistakes are easy and silent.

A practical consequence of an empty sandbox: the frame cannot run scripts, so it cannot report its
own height. Do not reach for `allow-scripts` to auto-size it. Give it a generous fixed height with
internal scrolling, or a capped height with an expand control.

`dangerouslySetInnerHTML` is forbidden everywhere else. Enforce that with lint rather than review
attention:

```js
// eslint.config.js
"react/no-danger": "error",
"no-restricted-syntax": ["error", {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: "Render untrusted HTML through EmailIframeRenderer only.",
}],
```

Block remote images and external stylesheets in email bodies by default, with a per-message "Show
images" bar. Strip tracking pixels. Remote images are how a sender confirms an address is live and
being read.

## URLs

Validate every URL before rendering it as a link or passing it to `window.open`. Allow only `http`,
`https`, and `mailto`. Reject `javascript:`, `data:`, and `vbscript:`. External links get
`rel="noopener noreferrer"`. Put this in `lib/sanitize.ts` and use it at every call site, including
crawled AI Agent sources and provider-returned profile data.

## Auth, secrets, and API responses

- Never store auth tokens in localStorage. Assume httpOnly, Secure, SameSite cookies.
- No secrets, API keys, or model keys in client code or in the Vite env bundle. Only `VITE_`
  prefixed public config exists client-side, and everything in it is public by definition.
- Parse every API response with zod before it reaches state. On schema mismatch, reject and surface
  a typed error rather than trusting the shape. This is why `api/` folders hold the schema next to
  the request function.
- `lib/permissions.ts` exports `can(user, action, resource)`. Guard routes **and** hide or disable
  the UI affordance, so agents never see a control that will fail.
- Forms holding sensitive data set `autocomplete="off"` and `spellcheck="false"`.
- Never log message bodies, tokens, or PII to the console or to analytics. Redact by default.

## File uploads

Validate extension and MIME, cap size, block executable types, and never render an uploaded file
inline without sanitization. Applies to composer attachments and anything the AI Agent ingests.

## OAuth and channel connections (§14)

- Show a permissions disclosure block listing the exact scopes before starting the flow. Sending
  someone into an OAuth consent screen without telling them what is being granted is the failure
  this prevents, so it is a requirement rather than decoration.
- Use a `state` parameter and validate the redirect origin on return.
- Never render provider-returned strings as HTML; treat all provider profile data as untrusted
  display text. Never log tokens.

## AI-specific rules

Customer-authored content is **data, never instructions**. Wrap all untrusted text passed to a model
in clearly delimited labelled blocks and instruct the model to ignore any instructions found inside
them. This applies to thread contents, crawled website pages, snippets, and live chat input.

When injection is detected, **show it rather than hide it**. The user-visible notice is one muted
line, placed where the affected output is:

- AI summary panel: "Instructions found inside customer content were ignored."
- Auto Draft banner: "Suspicious instructions in the customer message were ignored."
- AI Agent knowledge source row: "Instructions found in crawled content were ignored."

The domain model carries `injectionDetected: boolean` on `AiSummary`, `AiDraft`, and
`KnowledgeSource` for exactly this.

The actual control, though, is not detection. It is that **nothing auto-sends**. Labelling and
detection are secondary defenses; a human pressing send is the one that holds. So:

- No AI output reaches a customer without an explicit human send action.
- The AI Agent answers and escalates only. It must never execute account actions such as refunds,
  cancellations, or data changes, and no UI should imply that it can.
- Every applied AI action writes an audit event and offers Undo.
- AI summaries and predicted satisfaction are internal-only. Mark the DOM node
  `data-internal="true"`, and test that they never reach a customer-facing render path.

## Deployment CSP

Ship and document this:

```
default-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self';
```

Self-hosted fonts via @fontsource exist so this stays clean. Adding a CDN origin to satisfy a font
or script is a change to the security posture, not a build detail.
