# BoltSupport

A shared inbox customer support helpdesk with built-in AI assistance. Pure client-side SPA behind a
login, no SSR and no SEO surface.

Specs live outside this folder: `../prd/boltsupport-prd.md` for requirements (FR / NFR / AI ids),
`../prd/boltsupport-claude-design.md` for the 21 screen specifications, domain model and route map,
and `../design-files/frontend/` for the visual prototypes. Measured values from those prototypes are
in [`docs/design-inventory.md`](docs/design-inventory.md).

## Running it

```bash
npm install
```

```bash
npm run dev
```

| Script              | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Vite dev server                                              |
| `npm run build`     | Typecheck then production build                              |
| `npm run typecheck` | `tsc -b`, no emit                                            |
| `npm run lint`      | ESLint, including the security rules below                   |
| `npm run test`      | Vitest + React Testing Library                               |
| `npm run format`    | Prettier                                                     |
| `npm run verify`    | lint, typecheck, test, build. Run before calling a step done |

## Stack

React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind v4 + shadcn/ui. React Router
(`createBrowserRouter`), TanStack Query for server state, Zustand for UI state, react-hook-form + zod
for forms and boundary validation, Tiptap for rich text, Recharts for reports, cmdk for the palette,
`@tanstack/react-virtual` for long lists, MSW for the mock API, DOMPurify for sanitization.

The PRD names React 18; the current toolchain scaffolds React 19 and every dependency here supports
it. The spec's "fixed stack" is about not swapping the framework or adding a meta-framework, so this
follows the intent. Say the word if you want it pinned to 18.

## Architecture

Feature-sliced. Each feature under `src/features/` owns its `api/`, `components/`, `hooks/`,
`types.ts`, and exposes a single public `index.ts` barrel.

```
src/
  app/            router, providers, error boundary, query client
  components/ui/  shadcn primitives only, no business logic
  components/     shared cross-feature composites
  features/       auth inbox conversations composer contacts docs
                  reports automation ai channels settings
  hooks/          global hooks
  lib/            api client, sanitize, permissions, format, ai helpers
  types/          shared domain types
  mocks/          MSW handlers and seed data
```

A feature may import from `@/components`, `@/hooks`, `@/lib`, `@/types`, and from another feature
**only through its barrel**. ESLint enforces this: `@/features/*/*` is a restricted import, as are
deep relative paths.

## Data and the mock API

There is no backend. `src/mocks/` runs MSW over a deterministic in-memory store seeded from
`src/mocks/seed/`: 240 conversations, 30 contacts, 10 articles, and ~700 messages, all generated
from one fixed seed against a fixed clock so a reload never reshuffles the queue and tests stay
reproducible. The first six conversations are the exact tickets from the design prototypes.

Every domain type in `src/types/` is a zod schema with its TypeScript type inferred from it, and
`src/lib/api-client.ts` is the only place a response can enter the app. A shape that fails
validation throws a typed `ApiError` instead of reaching state (NFR-2.7).

Two fixtures are deliberately hostile, so the guards get exercised rather than assumed:
conversation `c5` carries an email body with a `<script>`, an `onerror` handler, a tracking pixel,
and a `javascript:` link for the Step 6 sanitizer; conversation `c1` contains a real prompt
injection attempt, which is why its AI summary has `injectionDetected: true`.

**Bundle accounting.** MSW is ~170KB gzipped, which alone would consume most of the 250KB budget
in NFR-1.6. It loads from a separate chunk behind `VITE_ENABLE_MOCK_API`, so the budget is measured
against what the browser fetches before the first screen. Set `VITE_ENABLE_MOCK_API=false` to build
against a real API and the mock chunk is never fetched.

`npm run check:bundle` gzips the entry script, everything `index.html` preloads, and the stylesheet,
and fails over 250KB. It exists because the budget regressed by 200KB twice without anything
failing: both times a shared dependency was hoisted into the entry chunk, and the only symptom was
a larger number in a build log nobody diffs. The chunk groups in `vite.config.ts` are what keep
React, the Tiptap stack, and Recharts out of the initial payload.

## Shell, routing, and keyboard

Everything is behind the login gate; there is no public surface. `src/app/router.tsx` registers
every route from the design specification and every one is now built; `STUB_ROUTES` in
`src/app/route-config.tsx` is empty. A test asserts that every navigation destination resolves, so
a nav item can never point at a route that does not exist.

The router names one page module per route rather than importing through a feature barrel. That
looks inconsistent with the import rule below and is deliberate: a barrel that also exports hooks
another feature uses becomes a shared module, and a shared module is hoisted into the entry chunk
along with everything it pulls in. Naming the module keeps each route's weight on that route.

`src/lib/shortcuts.ts` is the single source for the keyboard map: the bindings in
`useHotkeys` and the `?` cheat sheet both render from it, so the sheet cannot document a key the
app no longer listens for. Handlers are registered by shortcut id rather than by literal keys, so
only a shortcut that exists can be bound.

Two rules in there are worth knowing:

- **Cmd+K belongs to the editor** when focus is inside a rich text surface, where it inserts a
  link. Encoded once as `editorOwnsIt` rather than rediscovered per component.
- **Escape is observed, not consumed.** The hotkey layer deliberately does not `preventDefault` it,
  because Radix and every other dismissable layer bail out on an already-prevented event, which
  otherwise makes dialogs impossible to close from the keyboard.

## Enforced by lint, not by review

These come from the PRD's security and engineering requirements, and they fail the build rather than
relying on someone noticing in a diff:

- `dangerouslySetInnerHTML` is banned outright (NFR-2.2). Untrusted HTML renders only through the
  DOMPurify + sandboxed-iframe component, which uses `srcDoc`, so no exception is needed anywhere.
- `localStorage.setItem` with a token-shaped key is banned (NFR-2.5).
- `any`, non-null assertions, and `@ts-ignore` are errors (PRD §10.3).
- Cross-feature internal imports and deep relative imports are errors.

TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
`noUnusedLocals`, and `noUnusedParameters`.

## Design system

Tokens are in `src/index.css`, transcribed from the design prototypes where the `:root` block is
byte-identical across all five files. Three accent colors with three meanings and no overlap:

- **cobalt `--brand`** for links, active nav, focus, the bolt mark
- **violet `--ai`** for AI generated or proposed content and nothing else
- **amber `--note` / `--warning`** for internal notes

Plus `--chrome` for the dark top bar. The 3px **provenance rail** encodes who authored every block of
content; it is the one device preventing the product's worst failure, an agent mistaking an internal
note for a customer reply or AI text for human text.

Two proof sheets survive at `/dev/tokens` and `/dev/data`, outside the nav. They show every token in
both themes and the zod boundary rejecting a malformed response, so a token or validation regression
stays easy to see.

Each semantic colour has a fill and a `-strong` text variant. The fills are tuned to read as a dot,
a bar, or a rail; the same value used as 13px text on white lands around 3:1 and fails AA. Rather
than darken the fills and make them muddy, text uses the strong variant.

## Accessibility

`src/a11y.test.tsx` runs axe over fourteen screens: login, dashboard, the queue, a conversation, the
composer, contacts, docs, search, the workflow wizard, channels, the agent console, a report,
settings, and onboarding. Two rules are switched off with the reason recorded in `src/test/axe.ts`:
`color-contrast`, which jsdom cannot judge without a layout engine, and frame traversal, since the
only iframe is the sandboxed email renderer whose contents are untrusted email rather than our
markup.

Contrast is checked instead in `src/contrast.test.ts`, which parses the token sheet and measures
every pairing the product actually renders — in both themes, compositing translucent chip tints over
their surface first, against 4.5:1 for text and 3:1 for meaningful non-text UI.

| Requirement | Where it is enforced                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------- |
| NFR-3.1     | `src/contrast.test.ts`, 55 measured pairings across both themes                                    |
| NFR-3.2     | `jsx-a11y` lint rules plus the axe sweep; focus ring is a token checked for 3:1                    |
| NFR-3.3     | `ConversationList.test.tsx`, including that `aria-activedescendant` never dangles past the window  |
| NFR-3.4     | The polite live region on the conversation thread                                                  |
| NFR-3.5     | `jsx-a11y` requires the label; the tooltip is on the icon-only controls in the conversation header |
| NFR-3.6     | `src/index.css`, which pins transitions to opacity only and leaves layout transforms alone         |
| NFR-3.7     | `src/contrast.test.ts` asserts no `font-size` in the sheet goes below 11px                         |

The reduced-motion rule is deliberately not the usual blanket `transition-duration: 0`. Movement is
what causes discomfort; a cross fade does not, and it is the cue that still tells you a panel opened.
It also leaves the `transform` property alone, because the virtualized queue positions every row with
`translateY` and nulling it would stack the whole list on top of itself.

## AI safety

Eleven release-blocking requirements, one test each, in `src/features/ai/ai-requirements.test.tsx`.
Most of them fail silently, so the answer to "is AI-7 still true" should be a file rather than an
argument.

| ID    | Promise                                       | Enforcement                                                                                             |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| AI-1  | Nothing AI wrote sends itself                 | Structural: no AI module may reference the send endpoint, and no settings page offers automatic sending |
| AI-2  | Customer content goes to a model as data      | `src/mocks/prompt.ts` wraps every block and escapes both delimiters                                     |
| AI-3  | An injection attempt is stated, not hidden    | The notice on the source row and the summary; detector tested for false positives too                   |
| AI-4  | State-changing AI actions are auditable       | Every suggestion records its outcome; AI events carry their own provenance                              |
| AI-5  | Violet and the sparkle belong to AI alone     | A guard over every styled component in `ai-safety.test.tsx`                                             |
| AI-6  | Internal artifacts stay internal              | `AiSurface` marks `data-internal`; the Company table excludes predictions                               |
| AI-7  | Auto apply defaults off, gated on a threshold | Seed ships both modes at `suggest`, thresholds above chance                                             |
| AI-8  | Auto Tag only picks from the allowed set      | Every seeded suggestion checked against it; emptying the set drops the mode                             |
| AI-9  | The agent answers and escalates only          | The api surface has no account-action endpoint; the launch dialog says so                               |
| AI-10 | Model failure never blocks the workflow       | Send is disabled only on an empty draft, never by an evaluation                                         |
| AI-11 | One kill switch, calm disabled states         | Flips the store on the first click and cascades; no error state                                         |

AI-2's real enforcement is server side, since the browser never holds a model key and never calls a
model (NFR-2.6). What lives in `src/mocks/prompt.ts` is the contract the server implements, written
down so it is visible and testable rather than described in a comment.

## Security

[`docs/security.md`](docs/security.md) has the production CSP, the separate stricter policy the
sandboxed email frame carries, and what each lint rule enforces.

## Known advisory

`npm audit` reports a high-severity advisory on `react-router` (GHSA-qwww-vcr4-c8h2, RSC-mode CSRF
bypass) affecting 7.12.0 through 8.2.0, with no patched release above that range. **It is not
reachable here**: the advisory requires React Router's RSC mode, which needs a server, and this is a
static SPA with no server and no RSC. Downgrading to 7.11.0 would give up seven minor versions to
silence something structurally inapplicable, so we stay current and revisit when a patch ships.
