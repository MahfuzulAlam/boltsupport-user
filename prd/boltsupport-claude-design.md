# BoltSupport
## Research Synthesis + Complete Claude Design Prompt Package

Version 2. Updated with engineering standards, modular architecture, security requirements, and six AI features.

---

## TL;DR

- Product name is **BoltSupport**. This document is a paste-ready Claude Design prompt package: a reusable Context Block (now containing engineering standards, a modular architecture contract, and a security contract), a full set of screen and module prompts, a shadcn/ui component inventory, a React Router map, a TypeScript domain model with seed data, and a 5-phase build order.
- Stack is fixed: React + Vite + TypeScript + Tailwind + shadcn/ui. No Next.js. Pure SPA behind login.
- The six AI features are specified in full: **AI Ticket Summary** (right sidebar, regenerable, staleness aware), **Auto Draft**, **Auto Assign**, **Auto Tag**, **Response Evaluation**, and **Predicted Satisfaction Score**. Plus a customer facing **AI Agent** setup wizard and management console.
- Also added: multi channel connect (Email, Live Chat, Instagram, Messenger, SMS, WhatsApp) with OAuth modals, and the SLA zero state.
- Every AI feature is human in the loop by design. Nothing generated is ever auto sent to a customer, and all untrusted content (email bodies, crawled pages, chat input) is treated as data, never as instructions.

---

## Key Findings (research synthesis)

**1. Information architecture.** Help Scout, Front, and Chatwoot converge on the same spine: an Account or Workspace contains Inboxes (channels), Inboxes contain Conversations, Conversations contain Threads and Messages, and Contacts aggregate across inboxes. Chatwoot's open source model is the cleanest public reference: Account is the multi tenant root, an Inbox is a polymorphic channel (Channel::Email, Channel::WebWidget, and so on), a Conversation belongs to an Inbox, Messages are sub resources of Conversations, and a Contact links to an Inbox through a join table (ContactInbox with a source_id) so one person's threads aggregate across channels. Folders (Unassigned, Mine, Drafts, Closed, Spam) are computed system views; saved Views are user defined filter sets. Front is a good model here: per Front's official help docs, "You can create up to 50 views per workspace," each view can target up to 50 shared inboxes, 50 shared tags, and 50 teammates, and views come in private versus shared scopes.

**2. Conversation list and triage.** The dominant pattern is a dense single line plus preview row: checkbox, customer, subject and snippet, ticket number, and a relative waiting age, with inline tag chips. Keyboard first tools use J and K to move, X to select, Enter to open, and a command palette for everything else. On speed: Superhuman publicly frames itself around Gmail creator Paul Buchheit's "100ms rule" (the threshold "where interactions feel instantaneous"), and design study analysis of the app documents a stricter internal budget of roughly 50 to 60ms for all actions. The practical lesson is optimistic UI with undo as the safety net rather than loading spinners. The clear improvement over Help Scout: first class bulk actions and a split pane preview toggle.

**3. Conversation detail.** Internal notes must render visually distinct (Help Scout uses an amber tint). Customer messages, agent replies, internal notes, system events, and AI events are distinct visual treatments. Collision detection is table stakes: Help Scout shows a yellow corner icon when a teammate is viewing and a red border plus avatar when a teammate is actively replying, and its Traffic Cop feature automatically stops an outgoing message from sending if a new message has been detected from the customer or another user, routing the paused reply to the Needs Attention folder with a Paused status.

**4. Composer.** Reply (R) and Note (N) toggle; slash commands open an insert menu; saved replies and Docs articles are searchable inline (Help Scout uses Cmd+Shift+S for saved replies and Cmd+/ for Docs search). Split send buttons (Send, Send and Close, Send and Snooze), scheduled send, and undo send (Z) are the modern baseline. Merge fields use fallback syntax like `{%customer.firstName,fallback=there%}`.

**5. Keyboard shortcuts.** Help Scout publishes a full scheme in its Keyboard Navigation docs: Reply R, Add Note N, Forward F, Edit Draft E, Delete D, Add Tag T, Undo after send Z, Command Palette Cmd+K, Status "S then A/P/C", "!" for Spam, Select All "* then A", and "G then H/U/M/D/A" folder navigation. Superhuman and Linear reinforce single key actions plus Cmd+K. The unified map is in prompt 15.

**6. Automation.** The universal structure is trigger, then conditions (AND/OR groups), then actions, presented as a wizard (Help Scout uses Type, Conditions, Actions, Summary). HappyFox's "match all / match any" toggle is the simplest condition group UI, and Intercom's docs explicitly warn about the negative OR logic trap ("City is not Dublin OR City is not London" matches almost everyone). Use Match ALL / Match ANY rather than nested boolean editors.

**7. Knowledge base.** Collection, then Category, then Article; editor with Edit, Related Articles, and Keywords tabs, a slug display, and draft or published states. Help Scout's newer block editor drew explicit user complaints (per eesel AI's review, a Reddit user called it "hideous" and "barely usable"; a separate G2 and AWS Marketplace reviewer flagged it as "outdated" and lacking undo and redo), so a clean Tiptap editor is a concrete win. Title tags near 55 characters, meta descriptions 50 to 160.

**8. Reporting.** The metrics that matter: First Response Time, Resolution Time, Resolved on First Reply, CSAT or Happiness, volume by channel, busiest day and hour, per agent performance, tag distribution, and saved reply usage. First Response Time is time to first human reply; auto acknowledgements do not count. Help Scout's Happiness Score, per its official docs, "is calculated much like NPS. You take the % of Great ratings and subtract the % of Not Good ratings." Deltas versus the previous period and an office hours toggle on time metrics are standard. Help Scout reporting is consistently criticized as shallow, so CSV export plus custom date ranges plus drilldown are the improvement.

**9. Do better list (from reviews).** Native SLA support (the most cited missing feature; one reviewer noted Help Scout "still don't have SLA support"), deeper reporting with filters, a better Docs editor, stronger bulk actions, better mobile (the mobile app "lacks automation features available on desktop"), and faster search.

**10. Frontend implementation.** Render untrusted HTML email inside a sandboxed iframe using `srcdoc` after DOMPurify sanitization; this is the pattern Close's engineering team documented ("this attribute [srcdoc] allowed us to inject HTML content into an iframe... We chose srcdoc because it worked and was easiest for our setup"). Sandbox WITHOUT `allow-same-origin` so the browser treats it as an opaque origin, and never combine `allow-same-origin` with `allow-scripts`. Block remote images by default, virtualize long lists with TanStack Virtual, use TanStack Query optimistic updates (onMutate snapshot, onError rollback, onSettled invalidate), and use WebSocket or SSE for new message, presence, and collision events.

**11. AI in support UIs (design position, not a vendor claim).** The safe pattern across the category is suggestion, not action: the model proposes, a human confirms. Auto send is where trust collapses. BoltSupport therefore renders every AI output in a visually distinct proposed state with Accept, Regenerate, and Discard, records an audit event for anything applied, and gives one click Undo. Confidence thresholds gate auto apply, and anything below threshold falls back to a suggestion. This is both a UX and a security decision: it keeps a human between untrusted input and customer visible output.

---

# THE CLAUDE DESIGN PROMPT PACKAGE

Paste the Context Block first, then prepend it (or reference it) at the top of each screen prompt.

---

## 0. Reusable Context Block

Prepend this to **every** screen prompt.

```
CONTEXT (prepend to every request; do not restate it back to me):

PRODUCT: "BoltSupport" is a shared inbox customer support helpdesk with built in AI assistance.
Support agents live in this UI eight hours a day. Priorities in order:
(1) speed and keyboard first operation, (2) low visual noise with high information density,
(3) trustworthy AI that suggests rather than acts, (4) accessibility.
Build it simpler and faster than Help Scout, not a visual copy of it.

TECH STACK (FIXED, do not substitute):
- React 18 + Vite + TypeScript (strict) + Tailwind CSS + shadcn/ui.
- Pure client side SPA entirely behind a login screen. NO Next.js, NO SSR, NO server components,
  NO file based routing, NO SEO concerns. Use React Router (createBrowserRouter).
- Server state: TanStack Query. UI state: Zustand. Forms: react-hook-form + zod. Rich text: Tiptap.
  Charts: Recharts. Command palette: cmdk. Dates: date-fns. Icons: lucide-react.
  Motion: Framer Motion (subtle only, 120 to 180ms, respect prefers-reduced-motion).
  Mock API: MSW with an in memory seed store. Long lists: @tanstack/react-virtual.
  Sanitization: DOMPurify.
- Mutations use TanStack Query optimistic updates (onMutate snapshot, onError rollback,
  onSettled invalidate).

ENGINEERING STANDARDS (non negotiable, apply to every file):
- TypeScript strict mode. No `any`, no non null assertions, no `@ts-ignore`. Use `unknown` plus a
  zod parse at every boundary. Model variant state with discriminated unions, never loose optional flags.
- Every component is a named function component with an explicit Props interface. No default exports
  except route level lazy components. No inline React.FC.
- Hard limits: a component file stays under roughly 200 lines, a hook under roughly 100. If it grows
  past that, split it. A component either renders UI or orchestrates logic, never both: push logic
  into a custom hook in the same feature folder.
- Presentational components take data via props and do no data fetching. Data fetching lives in
  feature level hooks (useConversations, useConversation, useSendReply).
- Naming: PascalCase components, camelCase functions and variables, useX for hooks, UPPER_SNAKE for
  constants, kebab-case filenames for non component modules, PascalCase filenames for components.
  Types are PascalCase and live in the feature's types.ts.
- Every list render uses a stable domain id as key, never an array index.
- All async UI has explicit loading, empty, error, and populated branches. No silent catch blocks.
  Wrap each route in an ErrorBoundary with a recoverable fallback.
- Accessibility is part of done: semantic elements, labelled controls, visible focus, keyboard reach.
- Include Vitest + React Testing Library tests for hooks and non trivial components, and describe the
  Playwright happy path for each flow. Set up ESLint (typescript-eslint, react-hooks, jsx-a11y) and
  Prettier. Use Conventional Commits.
- Use path aliases (@/features, @/components, @/lib, @/hooks, @/types) via tsconfig paths plus
  vite-tsconfig-paths. No deep relative imports like ../../../.

MODULAR ARCHITECTURE (feature sliced; follow this exact contract):
src/
  app/            router.tsx, providers.tsx, error-boundary.tsx, query-client.ts
  components/ui/  shadcn primitives ONLY (generated; never put business logic here)
  components/     shared cross feature composites (EmptyState, PageHeader, StickySaveBar,
                  KpiTile, DeltaIndicator, ConfirmDialog, CopyButton, DataTable)
  features/
    auth/ inbox/ conversations/ composer/ contacts/ docs/ reports/ automation/ ai/ channels/ settings/
      api/          typed request functions plus zod response schemas
      components/   feature local UI
      hooks/        useX data and behavior hooks
      types.ts      feature domain types
      index.ts      PUBLIC BARREL: the only thing other features may import
  hooks/          truly global hooks (useHotkeys, useMediaQuery, useDebounce)
  lib/            api-client.ts, sanitize.ts, permissions.ts, format.ts, ai/ (prompt builders, guards)
  types/          shared domain types
  mocks/          MSW handlers plus seed data
RULES: a feature may import from @/components, @/hooks, @/lib, @/types, and from another feature ONLY
through that feature's index.ts barrel. Never reach into another feature's internal files. No circular
imports. Shared logic used by two features moves to @/lib or @/hooks. Keep barrels small and intentional.

SECURITY (requirements, not suggestions):
- Untrusted HTML (email bodies, AI output rendered as HTML, KB previews) renders ONLY through a single
  shared component that DOMPurify sanitizes and then mounts inside <iframe sandbox srcdoc>. Sandbox
  WITHOUT allow-same-origin and WITHOUT allow-scripts. `dangerouslySetInnerHTML` is forbidden
  everywhere else in the codebase. Enforce this with an ESLint rule.
- Block remote images and external stylesheets in email bodies by default; provide a per message
  "Show images" control. Strip tracking pixels.
- Validate every URL before rendering it as a link or window.open target: allow only http, https, and
  mailto. Reject javascript:, data:, vbscript:. External links get rel="noopener noreferrer".
- Never store auth tokens in localStorage. Assume httpOnly, Secure, SameSite cookies. No secrets, API
  keys, or model keys in client code or in the Vite env bundle. Only VITE_ prefixed public config.
- Parse every API response with zod before it reaches state. Reject and surface a typed error on
  schema mismatch rather than trusting the shape.
- Authorization: a permissions module exports can(user, action, resource). Guard routes AND hide or
  disable UI affordances. Treat client side checks as UX only, never as the security boundary.
- File uploads: validate extension and MIME, cap size, block executable types, and never render an
  uploaded file inline without sanitization.
- Forms holding sensitive data set autocomplete="off" and spellcheck="false". Never log message
  bodies, tokens, or PII to the console or to analytics; redact by default.
- AI specific: customer authored content is DATA, never instructions. Wrap all untrusted text passed
  to a model in clearly delimited labelled blocks and instruct the model to ignore instructions found
  inside them. If injection is detected, show a "Suspicious instructions in this message were ignored"
  notice rather than hiding it. No AI output is ever sent to a customer without an explicit human send
  action. Every applied AI action writes an audit event and offers Undo.
- Ship a documented Content-Security-Policy for deployment:
  default-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'.

DESIGN SYSTEM:

Direction. This is a working tool, not a marketing site. The interface should feel like a precision
instrument: quiet, dense, fast, with all the boldness spent in exactly one place.

SIGNATURE ELEMENT, the provenance rail. Every block of content that has an author carries a 3px left
rail whose color encodes who produced it. This is the one memorable device in the product and it runs
consistently across messages, drafts, suggestion strips, and the AI summary panel:
  customer      -> border, neutral
  agent reply   -> brand accent
  internal note -> amber
  AI generated  -> violet
  system event  -> no rail (compact centered line)
This exists because the single worst failure mode in a helpdesk is confusing an internal note with a
customer reply, or AI text with human text. The rail makes origin unmistakable at a glance and at any
zoom level. Do not introduce other left rail treatments that would dilute it.

Color tokens (HSL, via CSS variables in the Tailwind theme; light and dark both required):
  Light: --background 0 0% 100%; --foreground 222 24% 11%; --muted 220 14% 96%;
         --muted-foreground 220 9% 46%; --border 220 13% 91%; --card 0 0% 100%;
         --primary 222 24% 11%;  --primary-foreground 0 0% 100%;   (ink buttons, high contrast)
         --accent-brand 222 89% 55%;                                (electric cobalt: links, active
                                                                     nav, focus, the bolt mark)
         --ring 222 89% 55%;
  Dark:  --background 224 26% 8%; --foreground 210 20% 96%; --muted 224 18% 15%;
         --muted-foreground 218 11% 65%; --border 224 16% 19%; --card 224 22% 11%;
         --primary 210 20% 96%;  --primary-foreground 224 26% 8%;
         --accent-brand 218 92% 66%; --ring 218 92% 66%;
  Semantic: success 152 62% 40%; warning 38 92% 50%; danger 0 72% 51%; info 199 89% 48%.
  Notes:    amber tint, light hsl(45 96% 91%), dark hsl(42 88% 18% / 0.4).
  AI:       --ai 268 74% 58% violet. Reserved EXCLUSIVELY for AI generated or AI proposed content.
            Never use violet for anything else anywhere in the product.
  "Needs Attention" counts use danger.

  Rationale for ink primary: default indigo-everywhere reads as a template. Near black buttons with a
  single electric cobalt accent keep a dense UI calm, leave violet unambiguously owned by AI, and
  leave amber unambiguously owned by internal notes. Three accent colors, three meanings, no overlap.

  Implementation: --accent-brand and --ai are not stock shadcn tokens; extend the Tailwind theme with
  them alongside the standard variables. Self host all fonts via @fontsource
  (@fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono, @fontsource/instrument-serif); no external
  font CDN calls, consistent with the CSP.

Typography, two faces with a real division of labor:
  Fonts, all self-hosted in production (Google CDN in these artifacts):
  IBM Plex Sans — all UI chrome and human content.
  IBM Plex Mono — machine data only: ticket numbers, SLA countdowns, counts, percentages, confidence values, KPI figures, and <kbd> keys. If it's monospaced, a machine produced it.
  Instrument Serif — exactly two places, both persuading rather than working: the AI Agent landing headline and the SLA zero state headline, at 36px.
  Sizes:

  14px base UI text (root), line height 1.5
  15px nav labels, list subjects, message bodies (1.6), composer text
  13px secondary text, dense controls, table cells, mono metadata
  12px uppercase section labels, status chips, tooltips-in-line
  11px <kbd> chips and micro labels (the floor)
  Headings 16 / 18 / 20 / 24px, tracking −0.01 to −0.015em
  26px mono for KPI numbers, 36px serif for the two zero-state headlines
  Density anchors: sidebar rows 40px, conversation rows 72px (84 comfortable), reading pane max 760px, top bar 56px.

Radius: --radius 8px lg, 6px md, 4px sm. Prefer 1px borders over shadows. shadow-sm on cards,
shadow-md only on popovers, dialogs, and the command palette.

Density: list rows 40px default and 48px comfortable; sidebar items 32px; rows separated by 1px
borders, not gaps. No card inside a card. Reading panes max-w 720px. App chrome full width.

Motion: 120 to 180ms ease-out. One orchestrated moment per screen at most. Respect
prefers-reduced-motion by disabling transforms and keeping opacity changes only.

CONVENTIONS:
- Every screen implements loading (skeletons), empty (illustration plus primary CTA), error (message
  plus retry), and populated.
- Relative timestamps via date-fns formatDistanceToNowStrict, absolute time in the title attribute.
- Keyboard hints render as <kbd>: rounded 4px, bg-muted, IBM Plex Mono, text-xs, px-1.5.
- Copy rules: active voice, sentence case, no filler. A control says exactly what happens
  ("Save changes", not "Submit"), and the same verb carries through to its toast ("Publish" produces
  "Published"). Errors state what happened and how to fix it. Empty states invite an action.
- Do not use em dashes in any UI copy or code comment.
```

---

## 1. Global Shell, Navigation, and Command Palette

```
[PREPEND CONTEXT BLOCK]

Build the global app shell in features/app plus app/router.tsx. This is the persistent frame around
every authenticated route.

TOP BAR (h-14, border-b, bg-background, sticky top-0 z-40):
- Left: wordmark "BoltSupport" with a bolt glyph in the brand accent.
- Primary nav (shadcn NavigationMenu): Inboxes (dropdown of inboxes), Docs, Messages,
  Reports (dropdown), Customers (dropdown), AI (dropdown: AI Agent, Auto Draft, Auto Assign,
  Auto Tag, Evaluation, Satisfaction), Manage (dropdown of settings areas).
  Active route gets a 2px brand accent underline.
- Right: global search trigger (search icon plus "Search" plus <kbd>/</kbd>), notifications bell
  (Popover, unread dot), help icon, user avatar DropdownMenu (Your profile, Notification settings,
  Keyboard shortcuts, Toggle dark mode, Sign out).

COMMAND PALETTE (cmdk in a Dialog), open with Cmd+K or Ctrl+K:
- Groups: "Go to" (inboxes, folders, reports, settings), "Actions" (New conversation, Assign,
  Change status, Add tag, Snooze, Summarize with AI, Draft with AI), "Conversations" (fuzzy),
  "Contacts".
- Each row shows its shortcut in <kbd> so the palette teaches shortcuts over time. Arrow keys
  navigate, Enter runs, Esc closes. Actions needing a target push a nested sub list ("Assign to...").
- AI actions carry the sparkle icon and the --ai accent.

GLOBAL SHORTCUTS (useHotkeys hook in hooks/, disabled while typing in inputs):
/ focus search. Cmd+K palette. ? shortcut cheat sheet. C compose.
G then I / D / R / C / A / H for Inboxes, Docs, Reports, Customers, AI, Home.
Cmd+K is context aware: inside a rich text editor it inserts a link (the editor owns the binding),
everywhere else it opens the palette. Encode this rule once in the useHotkeys module and state it in
the cheat sheet, so the two bindings never fight.

RESPONSIVE: below 768px collapse nav into a hamburger Sheet, keep search and avatar. Add a bottom tab
bar on mobile (Inboxes, Search, Compose, Profile).

Implement the light and dark toggle persisting to localStorage, honoring prefers-color-scheme on first
load. Wrap routes in ErrorBoundary and Suspense with route level lazy imports.
```

---

## 2. Workspace Dashboard

```
[PREPEND CONTEXT BLOCK]

Build the Workspace Dashboard at "/" in features/inbox.

LAYOUT: page header "Workspace" plus a "New inbox" button. Responsive grid
(grid-cols-1 md:grid-cols-2 xl:grid-cols-3, gap-4).

INBOX CARD (shadcn Card):
- Header: inbox name, connected address (text-sm text-muted-foreground), a row of small channel icons
  for every connected channel (email, chat, WhatsApp, SMS, Instagram, Messenger), and an overflow menu.
- Body: compact stat grid, label plus tabular mono value: Chats, Unassigned, Mine, Assigned, Drafts,
  Needs Attention (danger color, bold when greater than zero). Each links to that folder.
- AI strip at the card footer (render only when AI features are enabled for the workspace):
  "AI resolved 34 this week" and "12 drafts suggested", both with the
  sparkle icon and --ai accent, linking to the AI reports.
- Footer actions: "New conversation" (ghost) and a settings gear.

KNOWLEDGE BASE CARD (muted background, book icon): docs domain, article count, lock icon when private.
Actions: "Open editor", "Preview site".

AI AGENT CARD (only when an agent exists): agent name and avatar color, status pill
(Draft / Live / Paused), resolution rate this week, and "Open agent".

STATES: loading is six skeleton cards; empty is an illustration plus "Create your first inbox";
error is a retry. Subtle staggered fade in, reduced motion safe.
```

---

## 3. Inbox and Conversation List

```
[PREPEND CONTEXT BLOCK]

Build the Inbox view at "/inbox/:inboxId/:folder?" in features/inbox. This is the most used screen.
Optimize for speed and density above all else.

THREE COLUMN LAYOUT (shadcn ResizablePanelGroup):

LEFT SIDEBAR (w-60, border-r):
- Folders (32px rows, icon plus label plus right aligned mono count): Chats, Unassigned, Mine, Drafts,
  Needs Attention (danger), Assigned, Closed, Spam.
- "Views" section with a "+" to create. Saved views with counts and an overflow menu (edit, duplicate,
  delete, share). Ship two AI powered default views, both marked with the sparkle icon:
  "At risk" (predicted Not Good satisfaction, still open) and "AI suggestions pending"
  (unreviewed AI tags or assignments).
- Bottom: settings gear and a primary "Compose" button.

MAIN LIST:
- Sticky toolbar: select all checkbox, filter button (Match ALL / ANY builder from prompt 12), sort
  dropdown (Newest, Oldest, Waiting longest, SLA due soonest), split view toggle.
- On selection the toolbar becomes a BULK ACTION BAR: "N selected" plus Assign, Status, Add tag,
  Snooze, Move, Delete, Clear, plus "Apply AI tags" and "Auto assign". Both AI bulk actions open a
  confirmation that lists exactly what will change before anything is applied.
- Rows (virtualized, 40px):
  checkbox | avatar plus customer name | subject (font-medium) plus snippet (muted, truncate) |
  inline tag chips (AI suggested tags render dashed with a sparkle) | SLA badge with a live mono
  countdown (muted, then warning, then danger as the deadline nears, plus a distinct Breached state) |
  predicted satisfaction dot (green, gray, red, tooltip "Predicted: Not good, 71% confidence") |
  ticket number (mono) | waiting age.
- Unread: semibold name and subject plus a 3px brand accent left rail.
- Collision: teammate avatar with a yellow ring (viewing) or red ring (replying).
- Infinite scroll via useInfiniteQuery with a "Loading more" row.

KEYBOARD (list focused): J and K move, X or Space select, Enter open, * then A select all,
* then N select none, A assign, S then A/P/C/X status (X marks spam), T tag, D delete, M move,
E edit draft.
Render a visible cursor row distinct from selection.

RIGHT PREVIEW PANE (split mode only): read only conversation plus an "Open" button.

STATES: skeleton rows; per folder empty copy ("You are all caught up" for Mine, "No unassigned
conversations" for Unassigned); error retry.

RESPONSIVE: below lg hide the preview pane; below md the sidebar becomes a Sheet.
```

---

## 4. Single Conversation View (including the AI Summary panel)

```
[PREPEND CONTEXT BLOCK]

Build conversation detail at "/inbox/:inboxId/:folder/:conversationId" in features/conversations.
The composer is prompt 6.

HEADER (border-b, sticky): subject (inline editable), status pill Select (Active, Pending, Closed,
Spam), a priority flag control (Urgent, High, Normal, Low; default Normal; a subtle flag icon plus
label, since AI priority suggestions and SLA targets both key off this field),
icon actions with tooltip, aria-label, and <kbd>: Assign (A), Snooze (H), Tag (T),
Run workflow, overflow (Forward F, Merge, Move, Delete D, Print). Prev and next chevrons (K and J).
An SLA chip with a live mono countdown sits beside the status.

AI SUGGESTION STRIP (directly under the header, only when suggestions are pending):
- One line, violet left rail, sparkle icon, up to three inline suggestion chips:
  - Assign: "Suggested assignee: Priya Shah, 82%" with Accept, Change, Dismiss.
  - Tags: dashed chips ("billing", "refund") each with a check to accept and an x to reject.
  - Priority: "Looks urgent" with Accept and Dismiss.
- Accepting writes a system event and shows an Undo toast. Dismissing records the rejection for
  calibration. The strip collapses to nothing once everything is handled.

THREAD (max-w-3xl):
- Each message: avatar, name, From address, timestamp (relative, absolute on hover), visibility label.
  Hover actions: reply, forward, copy link, overflow.
- FIVE message types, distinguished by the provenance rail:
  1. Customer message: neutral rail, default card.
  2. Agent reply: brand accent rail. If AI assisted, a small sparkle chip "AI assisted"
     (internal only, never visible to customers).
  3. Internal note: amber rail, amber background, "Note" chip, lock icon.
  4. System event: no rail, compact centered muted line with an icon (assigned, status changed,
     workflow ran, snoozed).
  5. AI event: no rail, compact centered line in violet with a sparkle, for example
     "Auto assigned to Priya Shah by AI, confidence 0.82", with an inline Undo for 30 seconds.
- Render email bodies ONLY through the shared sanitized sandboxed iframe component described in the
  Context Block security section. Block remote images with a per message "Show images" bar. Collapse
  quoted chains behind a "..." toggle.
- Collision banner when a teammate is replying. Paused review state when the conversation changed
  mid compose.
- An aria-live="polite" region announces new inbound messages.

RIGHT SIDEBAR (w-80, border-l, scrollable, collapsible sections):

  (A) AI SUMMARY PANEL, pinned at the very top, the first thing an agent sees:
  - Card with a violet rail, header "AI summary" plus sparkle icon, a Regenerate icon button, and an
    overflow menu (Copy, Insert as internal note, Report a problem).
  - Body renders a structured summary, not a wall of text:
      * A TL;DR of two to four bullets.
      * Labelled rows: "Customer wants", "Already tried", "Blocked on", "Suggested next step".
      * A sentiment badge (Positive, Neutral, Frustrated, Angry) and a message count plus thread age.
  - Meta line in mono: "Generated 4 min ago from 9 messages".
  - STALENESS: when new messages arrive after generation, show an amber inline bar
    "3 new messages since this summary" with a "Refresh" button. The stale summary stays visible and
    dimmed rather than disappearing, because a stale summary still beats no summary.
  - GENERATION: auto generate on open when the thread has more than four messages; otherwise show a
    compact "Summarize this thread" button. Stream tokens in as they arrive with a shimmer
    placeholder. Regenerate is always available, including on a fresh summary.
  - FEEDBACK: thumbs up and thumbs down. Thumbs down opens a small reason picker (Inaccurate, Missing
    a key detail, Wrong tone, Too long) that feeds the evaluation dataset.
  - STATES: not generated (button), generating (streaming skeleton), generated, stale, error (message
    plus Retry), unavailable (AI turned off for this workspace, with a link to settings).
  - SECURITY COPY: if injection was detected in the source thread, show one muted line
    "Instructions found inside customer content were ignored."

  (B) PREDICTED SATISFACTION PANEL:
  - Predicted rating badge (Great, Okay, Not good) with a mono confidence percentage and the muted
    label "Predicted, not a real rating".
  - Top drivers as short chips: "Slow first response", "3 back and forths", "Frustration detected",
    "Question unanswered".
  - When an actual rating exists, show the real rating prominently and demote the prediction to a
    small calibration line underneath.

  (C) Customer block: avatar, name, email, website, Edit and View profile.
  (D) "Conversations": this customer's other threads (subject, status, date).
  (E) "Customer information": custom properties as label and value rows.
  (F) App panels (collapsible Cards): Billing, Orders, each with action buttons.

RESPONSIVE: below xl the right sidebar becomes a toggled drawer, but the AI summary is surfaced as a
collapsible bar directly under the header so it is never lost on smaller screens.
```

---

## 5. AI Ticket Summary (dedicated behavior spec)

```
[PREPEND CONTEXT BLOCK]

Implement the AI summary as a self contained module in features/ai. It is consumed by the conversation
sidebar (prompt 4) and by the list preview pane.

FILES:
  features/ai/components/AiSummaryPanel.tsx      presentational only
  features/ai/components/AiSummaryContent.tsx    renders the structured summary shape
  features/ai/hooks/useAiSummary.ts              fetch, cache, regenerate, staleness
  features/ai/api/summary.ts                     typed request plus zod schema
  features/ai/types.ts                           AiSummary type

BEHAVIOR:
- useAiSummary(conversationId) returns
  { summary, status, isStale, generate, regenerate, cancel }.
- Staleness is DERIVED, never polled:
  isStale = conversation.lastMessageId !== summary.sourceLastMessageId.
  New messages arriving flip the flag from cache without a refetch.
- Regenerate is idempotent and cancellable. A second click while streaming aborts the first request
  with an AbortController and starts fresh. Never leave two streams writing to the same state.
- Cache per conversation in TanStack Query with a long staleTime. Invalidate on new message arrival.
- Streaming: the hook exposes partial text, the panel renders progressively with a caret. If streaming
  is unavailable, fall back to a single response with a skeleton.
- "Insert as internal note" opens the composer in Note mode pre filled with the summary plus an
  attribution line, and requires the agent to press Send. It never posts by itself.

GUARDRAILS:
- The summary is internal only. Never render it in any customer facing surface, never include it in a
  reply body automatically, and mark the DOM node with data-internal="true".
- Degrade gracefully: if the AI service errors, the rest of the sidebar renders normally.
- When AI is disabled for the workspace, show a calm "AI features are turned off for this workspace"
  state with a settings link, not an error.

TESTS: staleness derivation, abort on regenerate, error fallback, disabled state, and that the summary
never reaches a customer facing render path.
```

---

## 6. Composer with Auto Draft

```
[PREPEND CONTEXT BLOCK]

Build the composer docked at the bottom of the conversation view, in features/composer.
Two modes: Reply and Note.

MODE TOGGLE: "Reply (R)" and "Note (N)" with <kbd> hints. Note mode switches the composer to the amber
note tint and amber rail, so it can never be confused with a customer reply.

FIELDS:
- To field with Cc and Bcc reveal (Cmd+Shift+C, Cmd+Shift+B). Note mode swaps To for an @mention field.
- Body: Tiptap editor. "/" opens a slash command menu: Saved reply, Insert doc, Draft with AI,
  Attachment, Variable, Image, Link, Code, Blockquote. Placeholder "Type / for more options".
- Floating "+ Insert" button and an "Aa" formatting toggle (bold Cmd+B, italic Cmd+I, lists,
  link Cmd+K).
- Saved replies Cmd+Shift+S. Docs search Cmd+/. Merge fields render as chips with fallback syntax
  {%customer.firstName,fallback=there%}.

AUTO DRAFT (the headline AI feature on this screen):
- A "Draft with AI" button in the composer toolbar (sparkle icon, violet accent, Cmd+Shift+G). Also in
  the slash menu and the command palette.
- Clicking opens a compact Popover of options BEFORE generating:
  Tone (Friendly, Neutral, Formal, Apologetic), Length (Short, Standard, Detailed), Language
  (auto detected from the customer's last message, overridable), and toggles for "Use knowledge base"
  and "Include next steps". Remember the last used options per user.
- On generate the draft STREAMS into the editor in a distinct AI draft state: violet left rail on the
  editor, violet tinted background at low alpha, and a banner above the composer reading
  "AI draft. Review and edit before sending." with a sparkle icon.
- SOURCE CITATIONS: below the draft, chips for every knowledge source used ("Refund policy",
  "Saved reply: Shipping delay"). Clicking a chip opens that article or reply in a side Sheet.
  If no sources matched, say so explicitly: "No knowledge sources matched. Verify any claims before
  sending." This single line prevents the most damaging failure, a confident wrong answer.
- ACTIONS on the draft: Accept (removes AI styling, converts to normal editable content, keeps an
  internal aiAssisted flag), Regenerate, Try another tone (quick tone pills), Discard (clears and
  restores any prior manual draft from a snapshot).
- CONFIDENCE: when confidence is low, swap the banner for an amber variant reading
  "Low confidence. This needs a careful human review." and disable one click Accept so the agent must
  edit or explicitly override.
- HARD RULE: Auto Draft NEVER sends. Send remains a deliberate human action. If the agent tries to send
  a completely unedited AI draft, show a non blocking chip "Unedited AI draft" next to Send so the
  choice is conscious rather than accidental.
- Record aiAssisted, model, tone, and editedRatio on the sent message for evaluation and reporting.
- SECURITY: the thread is passed to the model as clearly delimited untrusted data. If it contains text
  attempting to instruct the model, generation still proceeds but the banner adds
  "Suspicious instructions in the customer message were ignored."

PRE SEND EVALUATION: a "Check reply" ghost button next to Send runs the Response Evaluation from
prompt 9 inline. See that prompt for the result UI.

ACTION BAR: status dropdown (applied on send), assignee Combobox, snooze Popover (Later today,
Tomorrow, Next week, Custom via Calendar), send later control, and a SPLIT SEND button
(Send, Send and close, Send and snooze, Send later). Cmd+Enter sends. Cmd+Shift+D saves a draft.
Esc discards with a confirm if dirty.

UNDO SEND: after send, a toast "Message sent. Undo (Z)" for six seconds with optimistic UI.

STATES: empty, typing, ai-generating, ai-draft-pending-review, sending (optimistic append at 50%
opacity), send error (inline retry, draft preserved), draft restored on remount.

Attachments: drag and drop zone with progress and remove. Validate MIME and size. Block executables.
```

---

## 7. Auto Assign

```
[PREPEND CONTEXT BLOCK]

Build Auto Assign in features/ai. Three surfaces: an inline suggestion, a bulk action, and settings.

INLINE SUGGESTION (in the AI suggestion strip from prompt 4):
- "Suggested assignee: {avatar} Priya Shah" plus a mono confidence percentage plus a "Why?"
  affordance. Clicking Why opens a Popover listing the signals that drove it: matched skills and tags,
  similar conversations resolved, current open load, availability, language match. Each signal is a
  short row with a plus or minus weight indicator. Never show a bare score with no explanation.
- Buttons: Accept, Change (opens the assignee Combobox with the suggestion pre highlighted), Dismiss.
- Accepting writes an AI system event in the thread and shows an Undo toast for 30 seconds.

BULK: in the list bulk bar, "Auto assign" opens a confirmation Dialog listing each selected
conversation with its proposed assignee and confidence, with per row checkboxes so the agent can
deselect any they disagree with, then "Assign N conversations".

SETTINGS ("/ai/auto-assign", workspace level; scope to specific inboxes via the condition builder):
- Master toggle Enabled or Disabled.
- Mode RadioGroup as cards: "Suggest only" (default, safest) versus "Auto apply above a confidence
  threshold".
- Confidence threshold Slider (0.5 to 0.95) with live copy:
  "Conversations below 75% confidence stay unassigned for a human to route."
- Signals section with Switches: Skills and tags, Past resolution history, Current workload,
  Availability and working hours, Language match. Each has one line of explanation.
- Round robin fallback picker, an "Exclude these teammates" multi select, and an
  "Only apply to these tags or inboxes" condition builder.
- Fairness guardrail: a max concurrent conversations number input per agent, plus a warning banner if
  auto apply is on while workload balancing is off.
- Sticky save bar, disabled until dirty.

AUDIT: a "Recent auto assignments" table on the settings page: conversation, assignee, confidence,
kept or overridden by a human, timestamp. Show an accuracy figure at the top:
"Agents kept 87% of AI assignments in the last 30 days." This number is the go or no go signal for
turning on auto apply.
```

---

## 8. Auto Tag

```
[PREPEND CONTEXT BLOCK]

Build Auto Tag in features/ai. Surfaces: inline chips, a review queue, and settings.

INLINE (conversation header, under the subject):
- Applied tags render as solid chips. AI SUGGESTED tags render as dashed border chips in the violet
  accent with a sparkle, each with a check to accept and an x to reject. Hovering shows confidence and
  a one line rationale ("Message mentions chargeback and refund").
- Accepting converts the chip to solid and writes an AI system event. Rejecting removes it and logs the
  rejection for calibration.

REVIEW QUEUE ("/ai/auto-tag/review"): a table of conversations with pending tag suggestions: subject,
customer, suggested tags (accept or reject inline), confidence, date. Bulk "Accept all above 90%" with
a confirmation. This exists so tagging stays clean without forcing agents to open every thread.

SETTINGS ("/ai/auto-tag"):
- Master toggle. Mode RadioGroup cards: "Suggest only" versus "Auto apply above threshold", with a
  confidence Slider.
- ALLOWED TAG SET: a REQUIRED multi select of tags the model may apply. Copy:
  "The AI can only choose from this list. It can never invent a new tag."
  This is both a data hygiene and a security control. The UI must make it non optional: auto apply
  cannot be enabled with an empty allowed set.
- Optional per tag descriptions in a small editable table
  ("refund: the customer wants money back, not a return"). These materially improve accuracy.
- A "Never auto tag conversations matching..." condition builder.
- Sticky save bar.

METRICS on the settings page: acceptance rate per tag over 30 days as a small horizontal bar list, so
a misfiring tag is obvious and one click to remove from the allowed set.
```

---

## 9. Response Evaluation

```
[PREPEND CONTEXT BLOCK]

Build Response Evaluation in features/ai. Two surfaces: a pre send inline check and a QA dashboard.

(A) PRE SEND CHECK (inside the composer, prompt 6):
- A "Check reply" ghost button next to Send. Runs in a couple of seconds with an inline spinner.
- Result renders as a compact panel above the action bar. Never a modal, never blocking:
  * A small score ring 0 to 100 with a one word verdict (Looks good, Needs review, Risky).
  * Five criteria rows, each with a pass, warn, or fail dot and a short label:
    Accuracy (claims supported by the knowledge base), Completeness (every question the customer asked
    is answered), Tone match, Clarity, Policy compliance.
  * Expanding a failing row highlights the exact span in the editor with a colored underline and
    offers a one click "Fix" that proposes a replacement the agent can accept or ignore.
  * An "Unanswered question" callout quoting the customer's question when Completeness fails. This is
    the single highest value catch in the feature, so give it visual priority over the score.
- Explicitly advisory: Send is never disabled by an evaluation result.

(B) QA DASHBOARD ("/ai/evaluation"):
- Header with date range picker, inbox filter, agent filter, and CSV export.
- KPI tiles with deltas versus the previous period: Average quality score, Replies evaluated,
  Accuracy warnings, Unanswered question rate.
- A Recharts bar distribution of scores bucketed 0-20, 21-40, 41-60, 61-80, 81-100.
- A per agent table: agent, replies evaluated, average score, top weakness, trend sparkline. Sortable.
- A sampled conversations table: conversation, agent, score, flagged criteria, date. Row click opens a
  side Sheet showing the customer message, the agent reply, per criterion scores, and the model's
  rationale, plus "I disagree" with a reason picker that feeds calibration.
- COPY GUARDRAIL, designed as a visible element rather than fine print:
  "Quality scores are guidance for coaching, not performance management. Review with the agent before
  acting." Agent trust determines whether this feature gets used or resented, so state the intent.
```

---

## 10. Predicted User Satisfaction Score

```
[PREPEND CONTEXT BLOCK]

Build Predicted Satisfaction in features/ai. Surfaces: conversation panel, list indicator, saved view,
and a report.

CONVERSATION PANEL (prompt 4, section B): predicted badge Great, Okay, or Not good, a mono confidence
percentage, the muted label "Predicted, not a real rating", and driver chips. When an actual rating
arrives, show the real rating prominently and demote the prediction to a small calibration line.

LIST INDICATOR: a small colored dot in the conversation row with a tooltip
"Predicted: Not good, 71% confidence, driven by slow first response". Keep it small and neutral. This
is a triage aid, not a scarlet letter.

AT RISK SAVED VIEW: a default view "At risk" filtering open conversations with a predicted Not good
above a confidence threshold. This is the practical payoff: a lead can rescue the conversation before
the bad rating lands.

REPORT ("/reports/satisfaction"):
- KPI tiles: Actual happiness score, Predicted happiness score, Rating coverage
  ("actual ratings cover 8% of conversations"), At risk open conversations.
- A line chart plotting actual versus predicted over time so drift is visible.
- A calibration panel: of conversations that received a real rating, what percentage the prediction got
  right, shown as an accuracy figure plus a small 3x3 confusion grid of predicted versus actual.
  Without this the number is unfalsifiable and should not be trusted.
- A drivers table: which factors correlate most with Not good ratings this period (first response time,
  reply count, reopen count, sentiment shift), each with an impact bar.
- CSV export.

GUARDRAILS, built into the UI copy:
- Predictions are internal only. Never expose them to customers or include them in any customer facing
  surface.
- A settings toggle to show predictions to leads only, for workspaces that prefer that.
- Never render a predicted score in an agent performance ranking. Only actual ratings appear in the
  Company report team table.
```

---

## 11. AI Agent: landing, setup wizard, and management console

```
[PREPEND CONTEXT BLOCK]

Build the customer facing AI Agent in features/ai. Three screens.

(A) LANDING ("/ai/agent" when no agent exists):
- A bordered container with a top info banner: info icon, the line
  "You are only charged when the agent resolves a customer question without human assistance",
  and a "See pricing" outline button on the right.
- Two column body. LEFT: headline "Resolve questions automatically" set in Instrument Serif at 36px
  (one of only two places in the product that uses the serif), subcopy
  "Create an AI agent that responds to customers around the clock with accurate, on brand answers",
  and a checkmark list:
    "Learns only from content you approve"
    "Escalates to a human when it cannot help"
    "Stays private until you launch it"
    "You only pay for questions it resolves"
  Then a large primary "Customize your agent" button and a "How it works" text link below it.
- RIGHT: a product illustration area showing an angled, softly shadowed mock of the chat widget.
  Compose it in CSS, do not use an image asset. Mark it aria-hidden.

(B) SETUP WIZARD (full screen overlay route "/ai/agent/setup", three steps):
- Chrome: back arrow top left, a three dot step indicator centered (completed dots fill with the
  violet accent, the active dot elongates into a pill), and a close X top right that confirms before
  discarding.
- SPLIT LAYOUT: left 60% is the form, right 40% is a LIVE AGENT PREVIEW panel with a soft violet to
  pink gradient background. The preview shows the agent avatar (a sparkle in a rounded violet square)
  and chat bubbles that change per step, for example step 1:
  "Give me some knowledge so I can answer your customers' questions." then
  "You can add more at any time."
- STEP 1, "Teach your AI agent what it should know",
  subcopy "Share content that will help the agent answer questions accurately."
  * "Choose a source" as three selectable cards with icons:
      Website ("Sync content from your public website")
      Snippets ("Add quick snippets to guide responses")
      Docs site ("Connect your knowledge base articles")
    The selected card gets a tinted background and border.
  * Website: a URL input with an https:// placeholder and an "Add website" button, disabled until the
    URL is valid. Added sources appear below as rows with a crawl status chip
    (Queued, Crawling, Indexed, Failed), page count, and a remove button.
  * Snippets: a small repeatable list of title plus body fields.
  * Docs site: a picker of existing collections with checkboxes.
  * "Next" is a full width button, disabled until at least one source is added.
- STEP 2, "Define the agent's identity",
  subcopy "Keep your agent on brand. Refine its tone, vocabulary, and critical context."
  * "Name" with the helper "For internal use only": a text input with a trailing color swatch
    DropdownMenu for the agent accent color.
  * "Identity" with the helper "Define the agent's role, audience, and voice": a large textarea,
    placeholder "Describe the agent's purpose, tone, and context...".
    Below it, three one click starter templates (Friendly SaaS support, Formal enterprise, Concise
    ecommerce) that fill the textarea and remain fully editable. Starting from a blank textarea is the
    main reason this step gets abandoned.
  * Full width "Next".
- STEP 3, "Test your agent before customers do":
  * A working chat test console on the left where the operator types questions and sees answers with
    source citations under each answer.
  * A pre launch guardrail checklist with Switches:
    "Escalate to a human when confidence is low", "Escalate when the customer asks twice",
    "Never discuss pricing or refunds", "Only respond during business hours" (with an hours link).
  * Footer: "Save as draft" (secondary) and "Launch agent" (primary) with a confirmation Dialog that
    states clearly which channels it will go live on.

(C) MANAGEMENT CONSOLE ("/ai/agent" when an agent exists), Tabs:
- Overview: status pill (Draft, Live, Paused) with a Pause or Launch toggle, resolution rate,
  conversations handled, escalation rate, deflection savings, and a 30 day chart.
- Knowledge: a table of sources (name, type, pages indexed, last synced, status) with Resync, Edit, and
  Delete row actions, plus "Add source". Show a warning row for any source that failed to crawl.
- Identity: name, color, and identity textarea from step 2, with a sticky save bar.
- Guardrails: the escalation switches, a "Topics to avoid" tag input, a "Required disclaimers"
  textarea, and a confidence threshold slider for escalation.
- Deployment: channel toggles (Live chat widget, Email, WhatsApp, SMS, Instagram, Messenger) each
  showing whether that channel is connected, with a link to Connect channels.
- Test: the test console, always available.

SECURITY FOR THIS BUILD:
- Crawled website content and customer chat input are untrusted data. Show an
  "Instructions found in crawled content were ignored" indicator on any source where injection was
  detected.
- The agent answers and escalates only. It must never execute account actions such as refunds,
  cancellations, or data changes. Do not build UI that implies otherwise.
- The escalation handoff carries the full transcript plus an AI summary into the human inbox, so the
  agent picking it up has context immediately.
```

---

## 12. Workflow Builder (four step wizard)

```
[PREPEND CONTEXT BLOCK]

Build the workflow builder at "/inbox/:inboxId/settings/workflows/new" in features/automation, as a
four step wizard with a step indicator: 1 Choose type, 2 Conditions, 3 Actions, 4 Summary.

STEP 1: Workflow name field, Type dropdown (Automatic or Manual), and an explainer panel that changes
with the selection and gives a concrete example ("Automatic workflows run when a conversation matches
your conditions, for example tag every email containing refund and assign it to Billing").
"Next step" button.

STEP 2 CONDITIONS: build a reusable ConditionGroupBuilder component. It is also used by SLAs, saved
views, and the AI settings pages, so make it generic and export it from the automation barrel.
- Top toggle "Match ALL / Match ANY".
- Condition rows: field dropdown (Subject, Body, From, To, Tag, Status, Priority, Channel, Predicted
  satisfaction, AI confidence, Custom field), operator dropdown (is, is not, contains, starts with,
  greater than), and a value input that adapts to the field type.
- "+ Add condition", per row delete, one level of nesting for advanced users.
- Inline warning when a user builds a negative OR combination ("is not X OR is not Y"), which matches
  almost everything and is the most common rule building mistake.

STEP 3 ACTIONS: an ordered, drag reorderable list: Assign to, Add tag, Remove tag, Set status,
Set priority, Move to
inbox, Send reply (saved reply picker), Add note, Snooze, plus the AI actions "Generate AI summary" and
"Request AI draft". The AI draft action creates a draft for a human to review. It never sends.

STEP 4 SUMMARY: a plain English recap ("When a conversation matches ANY of: ... then: ...") with Edit
links back to each step, an active or draft toggle, and "Create workflow".

Persist a draft between steps in Zustand. Validate each step before advancing. Warn on the summary if
there are zero conditions or zero actions.
```

---

## 13. SLAs and Routing (including the SLA zero state)

```
[PREPEND CONTEXT BLOCK]

Build SLAs and Routing in features/automation. Native SLA support is the single most requested thing
missing from Help Scout, so make it first class.

SLA ZERO STATE ("/inbox/:inboxId/settings/slas" with no policies). This is one of only two places in
the product that uses the serif display face, because it is persuading rather than working.
Two columns:
- LEFT: headline "Respond on time, every time" in Instrument Serif at 36px, subcopy
  "Set response and resolution time goals so your team knows what is urgent", a checkmark list
  ("Prioritize important conversations", "Improve response times", "Measure performance over time"),
  a large primary "Create SLA policy" button, and a "Learn more" text link.
- RIGHT: a decorative preview built entirely in CSS, no image asset. A faded table of Target and
  Company rows with time chips, and one floating white card in front titled "Enterprise SLA" showing
  two rows: "Respond in" with an amber ring icon and a mono "12m 24s", and "Resolve in" with a dotted
  ring icon and a mono "2d 16h". Put a soft violet tinted panel behind it. Mark the whole illustration
  aria-hidden.

SLA LIST AND EDITOR: a table of policies (name, applies to, targets summary, active toggle) plus
"New policy". The policy form:
- Name; conditions via the shared ConditionGroupBuilder.
- Per priority target rows (Urgent, High, Normal, Low), each with First response and Resolution
  targets (number plus unit).
- Clock toggle: "Business hours" versus "Calendar, 24/7", with helper copy that makes the difference
  concrete: "A four hour business hours target on a 4pm ticket is due tomorrow morning, not at
  midnight." This is the setting people get wrong.
- "Pause the SLA while waiting on the customer" switch.
- Escalation actions when at risk or breached: notify a teammate, reassign, add a tag.
- Sticky save bar.

LIVE SLA UI ELSEWHERE: an SLABadge component exported from the automation barrel, used in the
conversation list and header. It shows a live mono countdown ticking client side, transitions muted
then warning then danger as the deadline approaches, and switches to a distinct Breached state showing
the overdue duration. Paused state renders as a pause icon with "Paused, waiting on customer".

ROUTING ("/inbox/:inboxId/settings/routing"): strategy RadioGroup cards (Round robin, Load balanced by
fewest open, AI assisted using the Auto Assign model, Manual). Show the teammate rotation list with
availability toggles and a max concurrent cap per agent. If AI assisted is selected, surface a link to
the Auto Assign settings and show the current confidence threshold inline.
```

---

## 14. Connect Channels

```
[PREPEND CONTEXT BLOCK]

Build Connect Channels at "/inbox/:inboxId/settings/channels" in features/channels.

PAGE: title "Connect channels", subcopy "Add customer conversations from other channels into this
inbox" with a "Learn more" link, then a divided list of channel rows.

CHANNEL ROW (h-20, separated by 1px borders): a 44px rounded brand icon tile, the channel name
(font-medium), a one line description ("Route WhatsApp messages into this inbox"), and a right side
action.
- Connected channels show the account identifier under the name, a green "Connected" Badge, and a
  chevron that expands an inline panel with: connected account, connected date, granted scopes as
  chips, last sync time, "Sync now", and a destructive "Disconnect" behind an AlertDialog confirm.
- Disconnected channels show an outline "Connect" button.
- Channels in the list: Email (connected in the seed), Live chat widget, Instagram, Messenger, SMS,
  WhatsApp. Show a muted "Coming soon" pill for anything unsupported rather than hiding it, so people
  stop searching for it.

CONNECT MODAL (one reusable provider driven component): a centered Dialog, max-w-lg, containing
- A logo pair at the top: the provider mark, three animated connecting dots, then the BoltSupport bolt.
- Title "Connect {Provider} to BoltSupport".
- Two short benefit paragraphs ("Get notified of, reply to, and manage {Provider} conversations without
  leaving your inbox", "Give customers who reach you on {Provider} the same experience as email").
- A permissions disclosure block listing exactly which scopes will be requested, each on its own line
  with an icon. This is a security requirement, not decoration: never send someone into an OAuth flow
  without showing what is being granted.
- A full width primary button "Continue with {Provider}" carrying the provider icon, and a small muted
  line "You can disconnect at any time from channel settings."
- States: idle, redirecting (button spinner plus "Opening {Provider}..."), returned with error (inline
  Alert with the reason and a Try again), success (checkmark, then auto close and update the row).

WHATSAPP AND SMS SPECIFICS: after OAuth, add a follow up step to select the phone number or WhatsApp
Business account, and surface a plain language notice about the 24 hour customer service window and
template messages. Without it, agents will be confused when free form replies are rejected.

SECURITY: validate the OAuth redirect origin, use a state parameter, never render provider returned
strings as HTML, and never log tokens. Treat all provider profile data as untrusted display text.
```

---

## 15. Keyboard Shortcut Cheat Sheet and Onboarding

```
[PREPEND CONTEXT BLOCK]

Build (a) the ? cheat sheet overlay and (b) first run onboarding.

CHEAT SHEET (Dialog opened by ?): a multi column reference grouped by area, each row
"Action ..... <kbd>" with keys in IBM Plex Mono. Use exactly this map:

Global
  Command palette      Cmd+K
  Search               /
  This help            ?
  Compose              C
  Go to Inboxes        G then I
  Go to Docs           G then D
  Go to Reports        G then R
  Go to Customers      G then C
  Go to AI             G then A
  Go to Home           G then H

Conversation list
  Move                 J / K
  Select               X or Space
  Open                 Enter
  Select all           * then A
  Select none          * then N
  Assign               A
  Status               S then A / P / C / X (spam)
  Tag                  T
  Snooze               H
  Delete               D
  Move                 M
  Edit draft           E

Conversation
  Reply                R
  Note                 N
  Forward              F
  Assign               A
  Snooze               H
  Tag                  T
  Status               S
  Undo send            Z
  Prev / next          K / J
  Regenerate summary   Cmd+Shift+U

Composer
  Send                 Cmd+Enter
  Draft with AI        Cmd+Shift+G
  Check reply          Cmd+Shift+E
  Save draft           Cmd+Shift+D
  Saved replies        Cmd+Shift+S
  Docs search          Cmd+/
  Cc                   Cmd+Shift+C
  Bcc                  Cmd+Shift+B
  Bold                 Cmd+B
  Italic               Cmd+I
  Link                 Cmd+K (in the editor; opens the palette everywhere else)
  Discard              Esc

ONBOARDING: a first run stepper: name your inbox, connect a channel (reuses prompt 14), invite
teammates, then optionally turn on AI features with a short plain language explanation of what each one
does and the reassurance that nothing is auto sent. Show a dashboard empty state before any inbox
exists with a single prominent CTA. Zero data report states show "No data for this range yet" with an
illustration and a suggestion to widen the date range.
```

---

## 16 to 21. Remaining Screens

```
16. NEW CONVERSATION COMPOSER at "/inbox/:inboxId/new"
    Ticket number chip (mono), subject, tag Combobox, To / Cc / Bcc with zod email validation, the same
    Tiptap editor and slash menu, Draft with AI available, and an action bar with status, assignee,
    schedule, and a split Send. Cmd+Enter sends. Esc offers to save a draft.

17. CONTACTS at "/customers"
    Header with total count, debounced search, and an inbox filter. Virtualized sortable Table:
    Name (with an optional secondary plan line), Email, Conversations count (mono), Last seen.
    Row opens "/customers/:contactId" with identity plus editable custom properties on the left and
    conversation history on the right. Below md, collapse the table to stacked cards.

18. DOCS at "/docs/:collectionId" and "/docs/:collectionId/article/:articleId"
    Collection view with a left rail (All articles plus categories with counts), search, and an article
    list (title, updated date, Draft or Published chip, delete). Editor with Edit, Related articles,
    and Keywords tabs, a slug display with copy, a clean distraction free Tiptap surface with a
    floating "+ Insert" and "Aa" toolbar, autosave with a "Saved" indicator, Preview and Update
    buttons, an unsaved changes guard, and SEO fields with character counters (Title tag 55,
    Meta description 155). Prioritize the writing surface over chrome: a clunky editor is exactly the
    complaint that drove users away from the incumbent.
    Add a "Suggest articles from resolved conversations" AI action that proposes draft articles from
    repeated questions. Suggestions always land as Draft for human editing, never published.

19. REPORTS at "/reports/:reportType"
    Shared chrome: a colored header band, a date range picker with presets and a compare to previous
    toggle, a "+" to save a custom report, and CSV export. Deltas as a percentage plus an arrow colored
    by good direction. Recharts throughout. All numbers in mono. Zero data empty state per report.
    Build:
    - All channels: channel tabs (All, Email, Chat, Messaging, Social; Messaging groups WhatsApp and
      SMS, Social groups Instagram and Messenger, matching the ChannelType union), KPI tiles
      (Total conversations, New
      conversations, Customers, Conversations per day, Busiest day), a Volume by channel bar chart with
      a metric selector, and bottom tables for Tags and Saved replies (#, %, delta).
    - Email: KPI tiles (Email conversations, Messages received, Replies sent, Emails created, Resolved,
      Resolved on first reply), a line chart with a metric selector plotting current versus previous,
      Response time and Resolutions tabs, an Office hours toggle, and donut charts plus distribution
      tables bucketing response times: under 15 min, 15 to 30 min, 30 to 60 min, 1 to 2h, 2 to 3h,
      3 to 6h, 6 to 12h, 12 to 24h, 1 to 2 days, 2+ days, each with % and delta.
    - Happiness: three ring gauges for Great, Okay, Not good with deltas, a composite happiness score
      computed as %Great minus %Not good, the caption "based on N ratings from X% of customers", and a
      ratings table (#, Customer, Agent, Date, Rating, Comment) with All / Great / Okay / Not good
      filter tabs.
    - Company: KPI tiles (Customers helped, Conversations per day, Closed), a current versus previous
      area chart, and a Your team table with per agent Replies, Customers helped, Happiness score.
      Only actual ratings appear here, never predicted ones.
    - AI: Total conversations handled, Resolution rate with a Resolved / Unresolved / Human escalation
      legend, Happiness out of 100 with a Great / Okay / Not good legend, an AI answers over time chart
      by channel with a hover tooltip, plus tiles for Auto draft acceptance rate, Auto tag acceptance
      rate, Auto assign override rate, and average evaluation score.
    - Satisfaction: as specified in prompt 10.

20. INBOX SETTINGS SHELL at "/inbox/:inboxId/settings/*"
    Left rail grouped: General (Edit inbox, Channels), Workspace (Saved replies, Custom fields),
    Automations (Workflows, SLAs, Routing), Advanced (Inbox hours, Permissions, Outgoing email,
    Auto reply, Satisfaction ratings). AI configuration is workspace level and lives under /ai/*;
    do not duplicate it per inbox. Add a single "AI settings" link at the bottom of the rail that
    navigates to /ai. Per inbox scoping happens inside each AI settings page via its condition
    builder. Every page uses title, description, form sections, and a sticky save bar disabled until
    dirty. Build:
    - Edit inbox: name, read only address with copy, connected email with a Manage link, default From
      name / Status / Assignee, and a destructive Delete inbox with a confirm.
    - Permissions: "Choose who can access this inbox", quick search, and a responsive grid of
      selectable user cards with avatar, name, and role badge. Save disabled until dirty.
    - Outgoing email: "Use BoltSupport" versus "Use custom SMTP" radio cards, DKIM and DMARC rows with
      Active badges and expandable panels, current record display, a recommended record table
      (Host, Type, Value) with Copy buttons, and a Test settings button.
    - Auto reply: enable toggle, an "Only send outside office hours" toggle, a subject field with a
      variable chip, and a Tiptap message editor with an "Insert variable..." dropdown supporting
      {%customer.firstName,fallback=there%}.

21. GLOBAL SEARCH and AUTH
    Search at "/search?q=" with filter chips (In, Status, Assignee, Tag, Date, Type) and tabbed results
    (Conversations, Contacts, Docs) with highlighted matches, arrow key navigation, and Enter to open.
    Login at "/login" plus "/forgot-password" and "/signup": centered card, zod validated fields, SSO
    buttons, idle / submitting / error / success states, autofocus email, Enter submits, dark mode
    supported.

ALSO BUILD (small pages so no nav item dead ends):
    "/ai" AI overview: a hub of six feature cards (Summary, Auto draft, Auto assign, Auto tag,
    Evaluation, Satisfaction), each showing an on or off status, its headline metric (acceptance
    rate or average score), and a link to its settings, plus an AI Agent card with status and
    resolution rate.
    "/messages": a stub list page for proactive outbound messages with an empty state reading
    "Proactive messages are coming soon".
    "/manage/users, /teams, /tags, /integrations, /notifications": simple list plus form drawer
    pages following the settings page pattern (title, description, sticky save bar).
```

---

## 22. Component Inventory (shadcn/ui mapping)

**shadcn primitives:** NavigationMenu, DropdownMenu, Sheet, Avatar, Tooltip, Separator, Command, Dialog, AlertDialog, Table, Card, Badge, ScrollArea, Collapsible, Popover, Select, Combobox, Calendar, Tabs, Form, Input, Textarea, Switch, RadioGroup, Checkbox, Slider, Skeleton, Alert, Toast (sonner), Resizable, Progress.

**Shared composites** (`src/components/`): EmptyState, PageHeader, StickySaveBar, KpiTile, DeltaIndicator, ConfirmDialog, CopyButton, VirtualizedList, DataTable, ProvenanceRail.

**Feature components:**

| Feature | Components |
|---|---|
| `conversations/` | ConversationRow, BulkActionBar, CollisionIndicator, MessageBubble (5 variants), SystemEvent, EmailIframeRenderer (the only sanitized HTML renderer in the codebase), QuotedTextToggle, ConversationHeader |
| `composer/` | TiptapEditor, SlashCommandMenu, SplitSendButton, SnoozePopover, AttachmentDropzone, MergeFieldChip |
| `ai/` | AiSurface (shared wrapper), AiSummaryPanel, AiSummaryContent, AiSuggestionStrip, AiDraftBanner, AiSourceChips, ConfidenceMeter, PredictedSatisfactionPanel, SatisfactionDot, EvaluationScoreRing, EvaluationCriteriaList, AiAgentWizard, AgentPreviewPanel, KnowledgeSourceTable, TestConsole, AiAuditTable, AiKillSwitchNotice |
| `automation/` | ConditionGroupBuilder (shared, exported), ActionListBuilder, WizardStepper, SLABadge, SlaPolicyForm |
| `channels/` | ChannelRow, ConnectChannelModal, ScopeDisclosureList, ConnectedChannelPanel |
| `reports/` | DateRangePicker, ReportHeaderBand, ExportButton, ResponseTimeDonut, DistributionTable, RingGauge, CalibrationGrid |

Every AI component wraps in `AiSurface`, which applies the violet provenance rail, the sparkle icon, and a `data-ai-generated` attribute. AI output is never styled ad hoc.

---

## 23. Routing Map (React Router, createBrowserRouter)

```
/login, /forgot-password, /signup            public
/                                            Workspace dashboard
/inbox/:inboxId                              redirect to default folder
/inbox/:inboxId/:folder                      Conversation list
    folder = chats | unassigned | mine | drafts | needs-attention | assigned | closed | spam
    Validate the param against this union and redirect unknown values to the default folder.
    (React Router ranks static segments like "new", "view", "settings" above the :folder param,
    so those sibling routes resolve correctly. Still add the validation.)
/inbox/:inboxId/:folder/:conversationId      Conversation detail
/inbox/:inboxId/view/:viewId                 Saved view
/inbox/:inboxId/new                          New conversation
/inbox/:inboxId/settings/general
/inbox/:inboxId/settings/channels
/inbox/:inboxId/settings/saved-replies
/inbox/:inboxId/settings/custom-fields
/inbox/:inboxId/settings/workflows           + /new + /:workflowId
/inbox/:inboxId/settings/slas                + /new + /:policyId
/inbox/:inboxId/settings/routing
/inbox/:inboxId/settings/inbox-hours
/inbox/:inboxId/settings/permissions
/inbox/:inboxId/settings/outgoing-email
/inbox/:inboxId/settings/auto-reply
/inbox/:inboxId/settings/satisfaction-ratings
/ai                                          AI overview
/ai/agent                                    Agent landing or console
/ai/agent/setup                              Three step wizard, full screen
/ai/auto-draft                               Auto Draft settings
/ai/auto-assign                              Auto Assign settings plus audit
/ai/auto-tag                                 Auto Tag settings
/ai/auto-tag/review                          Tag review queue
/ai/evaluation                               QA dashboard
/ai/satisfaction                             Predicted satisfaction settings
/docs
/docs/:collectionId
/docs/:collectionId/article/:articleId
/messages
/reports/all-channels
/reports/email
/reports/happiness
/reports/company
/reports/ai
/reports/satisfaction
/customers
/customers/:contactId
/manage/users | /teams | /tags | /integrations | /notifications
/search
```

---

## 24. Domain Model and Seed Data

```ts
type ID = string;
type ISODate = string;

// ---------- Core ----------
type Role = "owner" | "admin" | "agent";

interface User {
  id: ID; name: string; email: string; avatarUrl?: string;
  role: Role; available: boolean; openCount: number; skills: string[];
}

type ChannelType = "email" | "chat" | "sms" | "whatsapp" | "instagram" | "messenger";
type ChannelStatus = "connected" | "disconnected" | "error" | "coming_soon";

interface Channel {
  id: ID; inboxId: ID; type: ChannelType; status: ChannelStatus;
  account?: string; connectedAt?: ISODate; scopes: string[]; lastSyncAt?: ISODate;
}

interface Inbox {
  id: ID; name: string; email: string; channels: Channel[];
  counts: {
    chat: number; unassigned: number; mine: number; assigned: number;
    drafts: number; needsAttention: number; closed: number; spam: number;
  };
}

interface Contact {
  id: ID; name: string; email: string; website?: string; avatarUrl?: string;
  plan?: string; conversationsCount: number; lastSeen: ISODate;
  properties: Record<string, string | number | boolean>;
}

type ConvStatus = "active" | "pending" | "closed" | "spam";
type Priority = "urgent" | "high" | "normal" | "low";
interface Tag { id: ID; name: string; color: string }

interface Conversation {
  id: ID; number: number; inboxId: ID; subject: string; preview: string;
  contact: Pick<Contact, "id" | "name" | "email" | "avatarUrl">;
  status: ConvStatus; assigneeId: ID | null; tags: Tag[];
  priority: Priority;                                 // SLA targets and AI suggestions key off this
  channel: ChannelType; unread: boolean;
  waitingSince: ISODate; createdAt: ISODate; updatedAt: ISODate;
  lastMessageId: ID;                                  // drives AI summary staleness
  sla?: {
    policyId: ID;
    firstResponseDueAt: ISODate | null;
    resolutionDueAt: ISODate | null;
    paused: boolean; breached: boolean;
  };
  presence?: { userId: ID; state: "viewing" | "replying" }[];
  ai?: {
    summaryId?: ID;
    predictedSatisfaction?: PredictedSatisfaction;
    suggestions: AiSuggestion[];
  };
}

type MessageType = "customer" | "reply" | "note" | "system" | "ai_event";

interface Message {
  id: ID; conversationId: ID; type: MessageType;
  author: { id: ID; name: string; avatarUrl?: string; email?: string };
  bodyHtml: string;                    // ALWAYS sanitized and sandboxed at render time
  createdAt: ISODate; visibility?: string;
  attachments?: { id: ID; name: string; size: number; mime: string; url: string }[];
  systemEvent?: { kind: "assigned" | "status" | "workflow" | "snoozed" | "tag"; detail: string };
  aiEvent?: {
    kind: "auto_assign" | "auto_tag" | "summary" | "agent_reply" | "escalation";
    detail: string; confidence: number; undoableUntil?: ISODate;
  };
  aiAssisted?: { model: string; tone: string; editedRatio: number; sourceIds: ID[] };
}

// ---------- AI ----------
interface AiSummary {
  id: ID; conversationId: ID;
  tldr: string[];                       // two to four bullets
  customerWants: string;
  alreadyTried: string;
  blockedOn: string;
  suggestedNextStep: string;
  sentiment: "positive" | "neutral" | "frustrated" | "angry";
  messageCount: number;
  sourceLastMessageId: ID;              // compare against Conversation.lastMessageId
  generatedAt: ISODate; model: string;
  injectionDetected: boolean;
}

interface AiSuggestion {
  id: ID; conversationId: ID;
  kind: "assign" | "tag" | "priority";
  value: string;                        // userId, tagId, or priority
  confidence: number;                   // 0 to 1
  rationale: { signal: string; weight: number }[];
  state: "pending" | "accepted" | "rejected" | "auto_applied";
  createdAt: ISODate;
}

interface AiDraft {
  id: ID; conversationId: ID; bodyHtml: string;
  tone: "friendly" | "neutral" | "formal" | "apologetic";
  length: "short" | "standard" | "detailed";
  language: string; confidence: number;
  sources: { id: ID; type: "doc" | "saved_reply"; title: string }[];
  injectionDetected: boolean; createdAt: ISODate;
}

type EvalVerdict = "pass" | "warn" | "fail";
type EvalCriterion = "accuracy" | "completeness" | "tone" | "clarity" | "policy";

interface Evaluation {
  id: ID; conversationId: ID; messageId?: ID; agentId: ID;
  score: number;                        // 0 to 100
  criteria: {
    key: EvalCriterion; verdict: EvalVerdict; note: string;
    spans?: { start: number; end: number }[];   // offsets into the plain text serialization of the draft
  }[];
  unansweredQuestion?: string;
  rationale: string;
  disagreed?: { by: ID; reason: string };
  createdAt: ISODate;
}

type Csat = "great" | "okay" | "notGood";

interface PredictedSatisfaction {
  rating: Csat; confidence: number;
  drivers: string[]; predictedAt: ISODate;
  actualRating?: Csat;                  // populated later, used for calibration
}

type AgentStatus = "draft" | "live" | "paused";

interface KnowledgeSource {
  id: ID; type: "website" | "snippet" | "docs"; label: string; url?: string;
  status: "queued" | "crawling" | "indexed" | "failed";
  pages: number; lastSyncAt?: ISODate; injectionDetected: boolean;
}

interface AiAgent {
  id: ID; name: string; color: string; identity: string; status: AgentStatus;
  sources: KnowledgeSource[];
  guardrails: {
    escalateOnLowConfidence: boolean; escalateOnRepeat: boolean;
    avoidTopics: string[]; businessHoursOnly: boolean; confidenceThreshold: number;
  };
  deployment: { channelIds: ID[] };
  stats: { handled: number; resolutionRate: number; escalationRate: number };
}

interface AiSettings {
  autoAssign: {
    enabled: boolean; mode: "suggest" | "auto"; threshold: number;
    signals: string[]; fallbackUserId: ID | null; excludedUserIds: ID[];
  };
  autoTag: {
    enabled: boolean; mode: "suggest" | "auto"; threshold: number;
    allowedTagIds: ID[]; descriptions: Record<ID, string>;
  };
  autoDraft: {
    enabled: boolean; defaultTone: AiDraft["tone"]; useKnowledgeBase: boolean;
    lowConfidenceThreshold: number;     // below this, one click Accept is disabled (prompt 6)
  };
  evaluation: { enabled: boolean; samplingRate: number };
  satisfaction: { enabled: boolean; visibleTo: "everyone" | "leads" };
}

// ---------- Automation, Docs, Reports ----------
interface Condition { field: string; operator: string; value: string | number | string[] }

interface Action {
  type: "assign" | "tag" | "untag" | "status" | "priority" | "move" | "reply" | "note"
      | "snooze" | "ai_summary" | "ai_draft";
  value?: string;
}

interface Workflow {
  id: ID; inboxId: ID; name: string; kind: "automatic" | "manual";
  match: "all" | "any"; conditions: Condition[]; actions: Action[]; active: boolean;
}

interface SlaPolicy {
  id: ID; name: string; match: "all" | "any"; conditions: Condition[];
  clock: "business" | "calendar"; pauseOnCustomer: boolean;
  targets: {
    priority: Priority;
    firstResponseMins: number; resolutionMins: number;
  }[];
  active: boolean;
}

interface View {
  id: ID; name: string; scope: "private" | "shared";
  match: "all" | "any"; conditions: Condition[]; count: number;
  system?: "at_risk" | "ai_pending";
}

interface Article {
  id: ID; collectionId: ID; categoryId: ID | null;
  title: string; slug: string; bodyHtml: string;
  status: "draft" | "published"; updatedAt: ISODate;
  keywords: string[]; relatedIds: ID[];
  seo: { titleTag: string; metaDescription: string };
}

interface Collection {
  id: ID; name: string; domain: string; private: boolean; articleCount: number;
}

interface Rating {
  id: ID; conversationNumber: number; customer: string; agent: string;
  date: ISODate; rating: Csat; comment?: string;
}

interface Metric { value: number; deltaPct: number }
```

### Seed data

```ts
export const users: User[] = [
  { id: "u1", name: "Dana Ruiz",  email: "dana@acme.io",  role: "admin", available: true,  openCount: 12, skills: ["billing", "api"] },
  { id: "u2", name: "Marco Bell", email: "marco@acme.io", role: "agent", available: true,  openCount: 4,  skills: ["onboarding"] },
  { id: "u3", name: "Priya Shah", email: "priya@acme.io", role: "agent", available: true,  openCount: 9,  skills: ["billing", "refunds"] },
];

export const inboxes: Inbox[] = [
  {
    id: "in1", name: "Support", email: "support@acme.io",
    channels: [
      { id: "ch1", inboxId: "in1", type: "email", status: "connected",
        account: "support@acme.io", connectedAt: "2026-02-01T10:00:00Z",
        scopes: ["mail.read", "mail.send"], lastSyncAt: "2026-07-31T09:00:00Z" },
      { id: "ch2", inboxId: "in1", type: "whatsapp",  status: "disconnected", scopes: [] },
      { id: "ch3", inboxId: "in1", type: "instagram", status: "disconnected", scopes: [] },
      { id: "ch4", inboxId: "in1", type: "sms",       status: "disconnected", scopes: [] },
      { id: "ch5", inboxId: "in1", type: "messenger", status: "disconnected", scopes: [] },
      { id: "ch6", inboxId: "in1", type: "chat",      status: "connected",
        account: "Website widget", connectedAt: "2026-03-10T08:00:00Z",
        scopes: ["widget"], lastSyncAt: "2026-07-31T09:00:00Z" },
    ],
    counts: { chat: 3, unassigned: 12, mine: 5, assigned: 28, drafts: 2, needsAttention: 4, closed: 1893, spam: 7 },
  },
];

export const tags: Tag[] = [
  { id: "t1", name: "high priority", color: "#ef4444" },
  { id: "t2", name: "premium",       color: "#6366f1" },
  { id: "t3", name: "refund",        color: "#f59e0b" },
];

export const conversations: Conversation[] = [
  {
    id: "c1", number: 12045, inboxId: "in1",
    subject: "Refund for duplicate charge",
    preview: "Hi, I was billed twice this month and would like...",
    contact: { id: "ct1", name: "Alex Turner", email: "alex@buyer.com" },
    status: "active", assigneeId: null, tags: [tags[0]],
    priority: "high",
    channel: "email", unread: true,
    waitingSince: "2026-07-31T09:12:00Z",
    createdAt: "2026-07-31T08:00:00Z",
    updatedAt: "2026-07-31T09:12:00Z",
    lastMessageId: "m4",
    sla: {
      policyId: "s1",
      firstResponseDueAt: "2026-07-31T10:00:00Z",
      resolutionDueAt: "2026-07-31T17:00:00Z",
      paused: false, breached: false,
    },
    presence: [{ userId: "u2", state: "viewing" }],
    ai: {
      summaryId: "sum1",
      predictedSatisfaction: {
        rating: "notGood", confidence: 0.71,
        drivers: ["Slow first response", "Frustration detected"],
        predictedAt: "2026-07-31T09:15:00Z",
      },
      suggestions: [
        {
          id: "sg1", conversationId: "c1", kind: "assign", value: "u3", confidence: 0.82,
          rationale: [
            { signal: "Resolved 24 similar refund threads", weight: 0.4 },
            { signal: "Skill match: refunds",               weight: 0.3 },
            { signal: "Currently available",                weight: 0.1 },
          ],
          state: "pending", createdAt: "2026-07-31T09:13:00Z",
        },
        {
          id: "sg2", conversationId: "c1", kind: "tag", value: "t3", confidence: 0.94,
          rationale: [{ signal: "Mentions billed twice and refund", weight: 0.9 }],
          state: "pending", createdAt: "2026-07-31T09:13:00Z",
        },
      ],
    },
  },
];

export const summaries: AiSummary[] = [
  {
    id: "sum1", conversationId: "c1",
    tldr: [
      "Charged twice for the July subscription",
      "Already contacted their bank, no reversal yet",
      "Wants a refund of the duplicate charge, not a credit",
    ],
    customerWants: "A refund of the duplicate July charge to the original card",
    alreadyTried: "Contacted their bank, checked the billing page",
    blockedOn: "Needs confirmation that we can see both charges",
    suggestedNextStep: "Confirm both charges in Stripe and refund the duplicate",
    sentiment: "frustrated",
    messageCount: 3,
    sourceLastMessageId: "m3",          // stale against lastMessageId "m4"
    generatedAt: "2026-07-31T09:05:00Z",
    model: "support-summary-v2",
    injectionDetected: false,
  },
];

export const messages: Message[] = [
  { id: "m1", conversationId: "c1", type: "customer",
    author: { id: "ct1", name: "Alex Turner", email: "alex@buyer.com" },
    bodyHtml: "<p>Hi, I was billed twice this month...</p>",
    createdAt: "2026-07-31T08:00:00Z", visibility: "Anyone, Active" },

  { id: "m2", conversationId: "c1", type: "note",
    author: { id: "u2", name: "Marco Bell" },
    bodyHtml: "<p>@Dana second duplicate charge from Stripe today.</p>",
    createdAt: "2026-07-31T08:05:00Z" },

  { id: "m3", conversationId: "c1", type: "ai_event",
    author: { id: "system", name: "BoltSupport AI" }, bodyHtml: "",
    createdAt: "2026-07-31T09:05:00Z",
    aiEvent: { kind: "summary", detail: "Generated AI summary", confidence: 0.9 } },

  { id: "m4", conversationId: "c1", type: "customer",
    author: { id: "ct1", name: "Alex Turner", email: "alex@buyer.com" },
    bodyHtml: "<p>Any update? This is urgent.</p>",
    createdAt: "2026-07-31T09:12:00Z" },
];
```

Generate roughly 40 conversations, 30 contacts, 10 articles, and 60 messages from these shapes so every screen renders with believable density.

---

## Recommended Build Order

**Phase 1, a usable helpdesk with no AI yet.** Project scaffold with the exact folder contract, tsconfig paths, ESLint and Prettier, Vitest, the MSW seed layer, and the shared sanitized iframe renderer. Then Global Shell and Command Palette (1), Workspace Dashboard (2), Conversation List with virtualization and bulk actions (3), Conversation Detail (4, minus the AI panels), Composer (6, minus Auto Draft), New Conversation (16), Login (21). Ship this before touching AI. It is the product. AI is the multiplier.

**Phase 2, organization and self service.** Contacts (17), Docs collection and editor (18), Saved Replies, Tags, Custom Fields, Global Search (21), the shortcut cheat sheet and onboarding (15).

**Phase 3, the AI layer.** Build `features/ai` in this order, because each one earns trust for the next:

1. **AI Summary** (5) first. Read only, low risk, and it proves value on day one.
2. **Auto Tag** (8), suggest mode only.
3. **Auto Assign** (7), suggest mode only.
4. **Auto Draft** (6).
5. **Predicted Satisfaction** (10).
6. **Response Evaluation** (9).

Only enable auto apply modes once acceptance rates are visible in the audit tables.

**Phase 4, automation and channels.** Workflow builder (12), SLAs with live countdown badges and the zero state (13), Routing, Connect Channels with OAuth modals (14), and the remaining inbox settings (20).

**Phase 5, agent and analytics.** AI Agent landing, wizard, and console (11), then all reports including the AI and Satisfaction reports (19).

### Signals that should change this plan

- If list interaction latency exceeds roughly 100ms, stop and fix virtualization and optimistic updates before adding features.
- If agents ever confuse an internal note with a customer reply, or an AI draft with human text, strengthen the provenance rail before anything else. That is the failure mode that destroys trust in the whole product.
- If Auto Tag or Auto Assign acceptance rates sit below roughly 70% in the audit tables, keep them in suggest only mode rather than shipping auto apply.

---

## Caveats

- Competitor shortcut schemes and report anatomies were captured from vendor documentation and reputable third party sources current as of mid 2026. Products iterate, so verify exact key bindings before finalizing muscle memory critical mappings. Superhuman shortcuts are not user customizable and Missive ships two presets, so "the" competitor shortcut depends on configuration.
- Pricing and missing feature claims (native SLA support, reporting depth, the Docs editor) come from third party review aggregators and user forums. Treat them as directional sentiment, not official vendor statements.
- The AI section is a design and safety specification, not a claim about any specific vendor's implementation. Confidence thresholds, acceptance rate targets, and sampling rates are starting values to tune against real data.
- Security guidance is deliberately conservative: sanitize with DOMPurify **and** sandbox without `allow-same-origin`, and never enable `allow-scripts` on the email iframe. A production system additionally needs a server enforced CSP, tracking pixel stripping, per tenant data isolation, and server side authorization. Client side permission checks are UX only.
- Prompt injection defense in a helpdesk is an ongoing problem, not a solved one. The human in the loop requirement, that nothing auto sends, is the actual control. The labelling and detection notices are secondary.
- The domain model and seed data are sized for a believable prototype. A real backend needs pagination cursors, permission scoping, soft delete and audit fields, message threading metadata, and retention policies for AI artifacts.
