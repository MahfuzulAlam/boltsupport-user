---
name: boltsupport
description: Build, review, and extend BoltSupport, the shared-inbox support helpdesk (React 18 + Vite + TypeScript + Tailwind + shadcn/ui, pure SPA behind login, six human-in-the-loop AI features). Use this for ANY work in this repo, including scaffolding the app; building or editing a screen, component, hook, route, or feature slice; anything touching the inbox list, conversation detail, composer, AI summary, auto draft, auto assign, auto tag, response evaluation, predicted satisfaction, the AI Agent, workflows, SLAs, channels, docs, reports, contacts, or settings; picking colors, fonts, spacing, density, or UI copy; rendering email or any other untrusted HTML; wiring TanStack Query, Zustand, MSW mocks, or React Router; and reviewing code for the same. Trigger it even when the request sounds generic ("add a badge", "make this list faster", "write the settings page", "why is this slow"), because the fixed stack, the feature-slice import contract, the provenance rail, and the AI safety rules are non-obvious and get violated silently.
---

# BoltSupport

A shared inbox helpdesk with built-in AI assistance. Support agents live in this UI eight hours a
day, so priorities are, in order: **speed and keyboard-first operation, low visual noise at high
information density, AI that suggests rather than acts, accessibility.** Build it simpler and faster
than Help Scout, not a visual copy of it.

## Sources, in precedence order

Two spec documents exist and they disagree in places. Resolve conflicts downward through this list.

1. **`prd/boltsupport-prd.md`** (~650 lines) — the product requirements: numbered FR/NFR/AI
   requirements, priorities, success metrics, and the authoritative density and token numbers (§9).
   Newest document. When it contradicts anything else, it wins.
2. **`prd/boltsupport-claude-design.md`** (~1500 lines) — the build specification: 21 screen-by-screen
   specs, the component inventory, the route map, and the domain model plus seed data (§24). This is
   the source for *what is on each screen*. The table at the bottom of this file routes you to the
   exact section; read that section before writing the code, and do not read the file whole.
3. **`design-files/frontend/*.dc.html`** — five static HTML prototypes of the real screens, plus
   `design-files/frontend/CLAUDE.md` holding the standing look-and-feel instruction. Use these for
   visual fidelity when prose is ambiguous.

**Ignore `design-files/frontend/_ds/modernist-*/` entirely.** It is generic scaffolding the design
tool emits: a flat red-on-white Archivo system with 0px radius and a Google Fonts CDN import. It
contradicts BoltSupport's tokens on every axis and its own project notes say to keep BoltSupport's
tokens instead. Nothing in it gets ported.

## Read these when relevant

| File | Read it when |
|---|---|
| `references/design-system.md` | Any visual work: colors, type, spacing, density, motion, the provenance rail, copy tone. Includes paste-ready CSS variables and Tailwind config. |
| `references/security.md` | Rendering email or any untrusted HTML, handling auth, OAuth, uploads, URLs, or passing content to a model. |
| `references/ai-features.md` | Any of the six AI features or the AI Agent. Holds the shared human-in-the-loop contract that all of them inherit. |

## The rules that get broken silently

Everything below is cheap to follow up front and expensive to retrofit. These are the failures that
do not announce themselves in a code review diff.

**The stack is fixed. Do not substitute.** React 18 + Vite + TypeScript (strict) + Tailwind +
shadcn/ui. Pure client-side SPA entirely behind a login screen. No Next.js, no SSR, no server
components, no file-based routing, no SEO concerns. Routing is React Router `createBrowserRouter`.
Server state is TanStack Query; UI state is Zustand; forms are react-hook-form + zod; rich text is
Tiptap; charts are Recharts; the palette is cmdk; dates are date-fns; icons are lucide-react; motion
is Framer Motion; mocks are MSW over an in-memory seed store; long lists use
`@tanstack/react-virtual`; sanitization is DOMPurify. If a task seems to need something outside this
list, say so rather than quietly adding a dependency.

**Violet means AI. Amber means internal note. Nothing else may use them.** Every authored block of
content carries a 3px left rail whose color encodes who produced it: customer neutral, agent reply
brand accent, internal note amber, AI violet, system event no rail. This is the one memorable device
in the product and it exists because the worst failure mode in a helpdesk is an agent mistaking an
internal note for a customer reply, or AI text for human text. Introducing a second left-rail
treatment, or using violet for a non-AI accent, dilutes the only signal that prevents that. Details
in `references/design-system.md`.

**No AI output ever reaches a customer without a human pressing send.** Auto Draft never sends.
The AI Agent answers and escalates but never executes account actions. Summaries and predicted
satisfaction are internal-only and must never appear on a customer-facing surface. Every AI output
renders in a visually distinct proposed state with Accept, Regenerate, and Discard; every applied AI
action writes an audit event and offers Undo. Confidence thresholds gate auto-apply, and anything
below threshold degrades to a suggestion rather than acting. See `references/ai-features.md`.

**Untrusted content is data, never instructions.** Email bodies, crawled pages, chat input, and
provider profile strings are all untrusted. They render only through the single shared sanitized
sandboxed-iframe component, and they reach a model only inside clearly delimited labelled blocks.
`dangerouslySetInnerHTML` is forbidden everywhere else in the codebase; enforce it with an ESLint
rule rather than vigilance. See `references/security.md`.

**A file that renders UI does not also orchestrate logic.** Component files stay under roughly 200
lines, hooks under roughly 100. Past that, split. Presentational components take data via props and
do no fetching; fetching lives in feature-level hooks (`useConversations`, `useSendReply`). This is
what keeps a codebase with this many screens navigable.

**Cross-feature imports go through the barrel, always.** A feature may import from `@/components`,
`@/hooks`, `@/lib`, `@/types`, and from another feature *only* through that feature's `index.ts`.
Never reach into another feature's internal files. No circular imports. Shared logic used by two
features moves to `@/lib` or `@/hooks`. Use path aliases, never `../../../`.

**Strict means strict.** No `any`, no non-null assertions, no `@ts-ignore`. Use `unknown` plus a zod
parse at every boundary, and parse every API response with zod before it reaches state, surfacing a
typed error on schema mismatch rather than trusting the shape. Model variant state with
discriminated unions, not loose optional flags. Every list key is a stable domain id, never an array
index.

## Folder contract

```
src/
  app/            router.tsx, providers.tsx, error-boundary.tsx, query-client.ts
  components/ui/  shadcn primitives ONLY (generated; no business logic here)
  components/     shared composites: EmptyState, PageHeader, StickySaveBar, KpiTile,
                  DeltaIndicator, ConfirmDialog, CopyButton, DataTable, VirtualizedList,
                  ProvenanceRail
  features/
    auth/ inbox/ conversations/ composer/ contacts/ docs/ reports/ automation/ ai/
    channels/ settings/
      api/        typed request functions + zod response schemas
      components/ feature-local UI
      hooks/      useX data and behavior hooks
      types.ts    feature domain types
      index.ts    PUBLIC BARREL: the only thing other features may import
  hooks/          truly global hooks (useHotkeys, useMediaQuery, useDebounce)
  lib/            api-client.ts, sanitize.ts, permissions.ts, format.ts, ai/
  types/          shared domain types
  mocks/          MSW handlers + seed data
```

Naming: PascalCase components and component filenames, kebab-case filenames for non-component
modules, camelCase functions and variables, `useX` for hooks, UPPER_SNAKE for constants. Types are
PascalCase and live in the feature's `types.ts`. Every component is a named function component with
an explicit `Props` interface; no default exports except route-level lazy components; no
`React.FC`.

## Definition of done

A screen or component is not finished until all of this is true. Async UI in a support tool is the
norm, not the exception, so the four states are the baseline rather than polish.

- All four branches exist: **loading** (skeletons), **empty** (illustration plus a primary CTA that
  invites the next action), **error** (what happened plus a retry), and **populated**. No silent
  catch blocks. Each route is wrapped in an `ErrorBoundary` with a recoverable fallback.
- Mutations use TanStack Query optimistic updates: `onMutate` snapshot, `onError` rollback,
  `onSettled` invalidate. Destructive or send-like actions pair with an Undo toast rather than a
  confirmation dialog where an undo is possible; spinners are a last resort, because the interaction
  budget here is roughly 100ms.
- Keyboard reach and accessibility are part of the work, not a follow-up: semantic elements,
  labelled controls, visible focus, and the shortcuts from PRD §15 wired through the `useHotkeys`
  hook (disabled while typing in inputs).
- Copy follows the house rules: active voice, sentence case, no filler, and no em dashes anywhere in
  UI copy or code comments. A control says exactly what happens ("Save changes", not "Submit") and
  the same verb carries into its toast ("Publish" produces "Published"). Errors say what happened
  and how to fix it.
- Timestamps are relative via `date-fns` `formatDistanceToNowStrict`, with the absolute time in the
  `title` attribute.
- Tests: Vitest + React Testing Library for hooks and non-trivial components, plus a described
  Playwright happy path for each flow.

## Where to look in the build specification

Section numbers below index **`prd/boltsupport-claude-design.md`**. Read the linked section before
building. Line numbers are current as of the version in the repo; if they have drifted, search for
the section heading. For requirements and acceptance criteria on the same screen, cross-check the
FR ids in `prd/boltsupport-prd.md` §6.

| Area | Route | PRD section |
|---|---|---|
| Reusable context block (source of truth for everything above) | | §0, L50 |
| Global shell, nav, command palette | all | §1, L227 |
| Workspace dashboard | `/` | §2, L269 |
| Inbox and conversation list | `/inbox/:inboxId/:folder` | §3, L301 |
| Conversation detail and right sidebar | `/inbox/:inboxId/:folder/:conversationId` | §4, L351 |
| AI ticket summary module | (sidebar + list preview) | §5, L435 |
| Composer and Auto Draft | (docked in conversation) | §6, L477 |
| Auto Assign | `/ai/auto-assign` | §7, L543 |
| Auto Tag | `/ai/auto-tag`, `/ai/auto-tag/review` | §8, L584 |
| Response Evaluation | `/ai/evaluation` | §9, L620 |
| Predicted Satisfaction | `/reports/satisfaction`, `/ai/satisfaction` | §10, L656 |
| AI Agent landing, wizard, console | `/ai/agent`, `/ai/agent/setup` | §11, L697 |
| Workflow builder | `/inbox/:inboxId/settings/workflows/new` | §12, L785 |
| SLAs, SLA zero state, routing | `/inbox/:inboxId/settings/slas`, `/routing` | §13, L822 |
| Connect channels and OAuth modals | `/inbox/:inboxId/settings/channels` | §14, L868 |
| Keyboard cheat sheet and onboarding | `?` overlay | §15, L912 |
| New conversation, contacts, docs, reports, inbox settings, search, auth | various | §16-21, L983 |
| Component inventory (shadcn mapping) | | §22, L1075 |
| Full route map | | §23, L1096 |
| Domain model and seed data | | §24, L1149 |
| Build order and the signals that should change it | | L1500 |
| Caveats and known limits of the spec | | L1529 |

## Build order

Ship a usable helpdesk before touching AI. AI is the multiplier, not the product.

1. **Foundation and core inbox.** Scaffold with the exact folder contract, tsconfig paths, ESLint
   and Prettier, Vitest, the MSW seed layer, and the shared sanitized iframe renderer. Then §1, §2,
   §3, §4 (minus AI panels), §6 (minus Auto Draft), §16, §21.
2. **Organization and self-service.** §17 contacts, §18 docs, saved replies, tags, custom fields,
   §21 search, §15 shortcuts and onboarding.
3. **The AI layer**, in this order, because each one earns the trust the next one needs: AI Summary
   (§5), Auto Tag (§8) suggest-only, Auto Assign (§7) suggest-only, Auto Draft (§6), Predicted
   Satisfaction (§10), Response Evaluation (§9). Enable auto-apply modes only once acceptance rates
   are visible in the audit tables.
4. **Automation and channels.** §12 workflows, §13 SLAs and routing, §14 channels, §20 remaining
   inbox settings.
5. **Agent and analytics.** §11 AI Agent, then §19 all reports.

Three signals should override this plan. If list interaction latency exceeds roughly 100ms, stop and
fix virtualization and optimistic updates before adding features. If anyone ever confuses an internal
note with a customer reply, or an AI draft with human text, strengthen the provenance rail before
anything else. If Auto Tag or Auto Assign acceptance sits below roughly 70% in the audit tables,
keep them in suggest-only mode.
