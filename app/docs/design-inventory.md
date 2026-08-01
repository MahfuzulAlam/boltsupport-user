# Design prototype inventory

Measured from the five prototypes in `design-files/frontend/*.dc.html`. This exists so later
steps port against verified values instead of re-reading ~11,000 lines of prototype markup.

## What the prototypes are

`.dc.html` files from a design tool. Each is a `<x-dc>` template plus one
`class Component extends DCLogic`, booted by `support.js`, which injects React 18 UMD from unpkg.
Template directives are `<sc-if>`, `<sc-for>`, `{{ binding }}`, and a non-standard `style-hover`
attribute used 268 times. **There are zero CSS classes**: every style is an inline `style` string.
Navigation is a single `view` string in state, not a router.

None of that structure ports. What ports is the token sheet, the measurements, the copy, and the
screen anatomy.

**Ignore `design-files/frontend/_ds/modernist-*/` completely.** It is an unrelated red-on-white
Archivo system with 0px radius that nothing links to. `_ds_bundle.js` is an empty stub.

## Canonical tokens

The `:root` and `[data-theme="dark"]` blocks are **byte identical across all five prototypes**
(verified by hashing). They are transcribed into `src/index.css` and that file is now the source of
truth. Values the PRD never documents but the prototypes rely on:

| Token            | Light                  | Dark                   | Why it exists                                          |
| ---------------- | ---------------------- | ---------------------- | ------------------------------------------------------ |
| `--app`          | `hsl(220 20% 98%)`     | `hsl(224 26% 8%)`      | Page ground behind cards, distinct from `--background` |
| `--chrome`       | `hsl(226 46% 20%)`     | `hsl(224 24% 12%)`     | The dark top bar. Deep navy, not black                 |
| `--chrome-fg`    | `hsl(0 0% 100% / .84)` | `hsl(210 20% 92%)`     | Nav labels on chrome                                   |
| `--chrome-hover` | `hsl(0 0% 100% / .10)` | `hsl(0 0% 100% / .08)` | Chrome button hover                                    |
| `--chrome-line`  | `hsl(0 0% 100% / .16)` | `hsl(0 0% 100% / .12)` | Search field border on chrome                          |
| `--brand-soft`   | `/ .10`                | `/ .16`                | Row selection, active folder                           |
| `--ai-soft`      | `/ .07`                | `/ .10`                | AI surfaces. Deliberately very faint                   |
| `--success-soft` | `/ .16`                | `/ .22`                | Status pills                                           |
| `--danger-soft`  | `/ .12`                | `/ .20`                | SLA critical, sentiment badges                         |

Two ambers, not one: `--note` (`hsl(45 96% 91%)`) is the note **fill**, `--warning`
(`hsl(38 92% 50%)`) is the note **rail and border**. Amber _text_ on light ground needs
`hsl(35 92% 34%)`, added here as `--warning-strong` because `--warning` fails contrast.

## Measurements

| Element                          | Value                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Top bar                          | 56px, `padding: 0 14px`, z-40, **no bottom border**, dark chrome                                                    |
| Conversation / list header       | 56px, `padding: 0 18px`                                                                                             |
| Mobile bottom nav                | 58px                                                                                                                |
| Left folder sidebar              | **244px**                                                                                                           |
| Sidebar folder row               | **40px**; Views rows 36px; menu items 36px                                                                          |
| Conversation row                 | **72px** default, **84px** comfortable                                                                              |
| Right rail                       | **326px** (file 03 and 06; file 02's 308px is superseded)                                                           |
| Split preview aside              | 412px                                                                                                               |
| Reading pane / thread / composer | **760px**                                                                                                           |
| Settings and report pages        | 960px                                                                                                               |
| Workspace dashboard              | 1240px                                                                                                              |
| Dialogs                          | palette 600 · cheat sheet 680 · bulk 620 · eval drawer 460 · launch 460 · discard 440 · sheet 288                   |
| Radii                            | 4px chips/kbd · 6px buttons/inputs/rows · 8px cards/dialogs/menus · 10-12px chat bubbles · 14px pills · 50% avatars |
| Button heights                   | 22 · 24 · 26 · 28 · 30 · 32 · 34 (primary) · 38 (form) · 42-44 (hero CTA)                                           |
| Toggle switches                  | 30x18 (popover, knob 12) · 34x20 (settings rows, knob 14) · 44x26 (master, knob 20)                                 |
| Provenance rail                  | **3px** wide, `border-radius: 2px`; `8px 0 0 8px` when integrated into a card edge                                  |
| KPI figure                       | mono, 26px, weight 500, `letter-spacing: -0.02em`                                                                   |
| Eyebrow label                    | 12px, 600, `letter-spacing: 0.06em`, uppercase, muted                                                               |
| Breakpoints                      | mobile `< 768` · nav and preview `>= 1180` · docked rail `>= 1280`                                                  |
| z-index                          | header 40 · menus 60 · rail and sheet 70 · palette/cheat/dialogs 80 · wizard 85 · launch and toast 90 · discard 92  |

Spacing is **not on a 4pt grid**. 5, 7, 9, 11, 13, 14, 18px are all used. The density was tuned by
eye; do not snap it mechanically.

## Provenance rail mapping

| Origin                   | Rail        | Companion treatment                                                                              |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| Customer message         | `--border`  | plain body, no card fill                                                                         |
| Agent reply              | `--brand`   | "Agent reply" label in brand; optional violet "AI assisted" chip                                 |
| Internal note            | `--warning` | fill `--note`, no border, "Note" chip outlined in warning, avatar tinted `hsl(38 92% 50% / .28)` |
| AI generated or proposed | `--ai`      | fill `--ai-soft`, sparkle, confidence in mono                                                    |
| System event             | none        | centered 13px muted line                                                                         |
| AI system event          | none        | centered line in `--ai` with a sparkle and an inline Undo                                        |

Implemented as a **sibling div**, not a border, so the rail keeps a fixed height independent of
content:

```html
<article style="display:flex;gap:14px">
  <div style="flex:none;width:3px;border-radius:2px;background:var(--brand)"></div>
  <div style="flex:1;min-width:0">…</div>
</article>
```

The prototypes also use a 3px brand rail at 42px height as the **unread marker** on list rows, with
an empty 3px spacer on read rows to keep alignment. That is a sixth use of the rail idiom beyond
"who authored this" — keep it, but do not add a seventh.

## Keyboard map as built

Registered capture-phase on `document`. `typing` guard is
`INPUT | TEXTAREA | isContentEditable`.

| Keys                                | Effect                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `Cmd/Ctrl+K`                        | Palette. **Explicitly returns early inside a TEXTAREA** so the editor owns the binding |
| `Cmd/Ctrl+Shift+G`                  | Generate AI draft immediately, skipping the options popover                            |
| `Cmd/Ctrl+Shift+C` / `+B`           | Show Cc / Bcc                                                                          |
| `Cmd/Ctrl+Shift+S` / `+D`           | Saved replies / Save draft                                                             |
| `Cmd/Ctrl+Enter`                    | Send. Works while typing                                                               |
| `Esc`                               | Layered close: overlays, then composer, then conversation to list. Works while typing  |
| `G` then `I/D/R/C/A/H`              | Go-to chord, 1200ms window                                                             |
| `/` `?` `C` `R` `N` `A`             | Search · cheat sheet · compose · reply · note · assign                                 |
| `J`/`↓` `K`/`↑` `X`/`Space` `Enter` | List cursor, select, open                                                              |

## Safety-critical copy, verbatim

Reuse these strings exactly. They were written deliberately and several map to AI-1 through AI-11.

- `AI draft. Review and edit before sending.`
- `Low confidence. This needs a careful human review.` / `One click accept is off`
- `No knowledge sources matched. Verify any claims before sending.`
- `Suspicious instructions in the customer message were ignored.`
- `Instructions found inside customer content were ignored.`
- `Instructions found in crawled content were ignored on {source}. The page is still indexed as data.`
- `Draft only, nothing sends without you`
- `AI actions never send without your review` (command palette footer)
- `Advisory only. Send is never blocked by a check.`
- `Quality scores are guidance for coaching, not performance management. Review with the agent before acting.`
- `Nothing is assigned until you confirm. Uncheck anything you disagree with.`
- `The AI can only choose from this list. It can never invent a new tag.`
- `Add at least one tag. Auto apply stays off while this list is empty.`
- `Auto apply is on while workload balancing is off. Assignments will pile onto whoever matches best on skills.`
- `The AI proposes, a human accepts. Safest, and the default.`
- `Conversations below {n}% confidence stay unassigned for a human to route.`
- `Predicted, not a real rating`
- `Predictions are internal. They never reach a customer, and they never appear in an agent ranking. Only actual ratings do.`
- `The agent answers and escalates only. It never issues refunds, cancels plans, or changes account data.`
- `AI features are turned off for this workspace. Everything else on this screen works as usual.`
- `Tag rejected, recorded for calibration` / `Suggestion dismissed, recorded for calibration`
- `The reply did not send. Your draft is safe.`
- Chip titles: `AI assisted` → `Internal only, never shown to the customer`; `Unedited AI draft` →
  `You have not edited the AI draft`; disabled accept → `Edit the draft first, low confidence`

## Prototype bugs and shortcuts to fix on port

These are artifacts of the prototype, not design intent.

1. **All 21 `<select>` elements are uncontrolled** — `onChange` with no `value`, state seeded to the
   first option. Adding a workflow condition pushes `op: 'contains'` while the DOM shows `is`, so
   state and UI disagree. Ten more selects have neither handler nor value. Replace all with
   controlled shadcn `Select`.
2. **`rRaiBorder` / `rRaiBg` typo** in Routing (the view model exposes `rAiBorder` / `rAiBg`), so the
   default AI-assisted strategy renders unselected.
3. **`insertDraft` writes `composerRef.current.value` imperatively**, bypassing React state, so the
   body desyncs from the `edited` flag that drives the "Unedited AI draft" chip. Route through state.
4. **The SLA "live countdown, ticking every second" does not exist.** All badges are hard-coded
   strings. The real ticker has to be built.
5. **Cross-screen state bleed:** `aaThreshold` backs three unrelated controls (Auto Assign
   confidence, AI Agent escalation, Routing copy); `wizName`/`wizIdentity` and the `guards` object
   each back two screens. Split into separate slices.
6. **Toggling any AI Agent guardrail marks both Auto Assign and Auto Tag dirty** (`sw()` sets
   `aaDirty` and `atDirty` unconditionally).
7. **Top-bar AI menu items are all dead** (`closeMenus`). AI screens are only reachable via the
   hamburger sheet and Cmd+K. Wire them up.
8. **Six list rows are hard-coded as literal markup** (`r1`…`r6`), not mapped from an array.
9. **Duplicated `<option>` values** in the SLA unit selects (`hours`, `hours`, `days`).
10. **Timers leak on unmount** (`sumTimer`, `streamTimer`, `sendTimer` are never cleared).
11. **Step indicators are copy-pasted four times** in the workflow builder; the four guardrail rows
    exist twice verbatim. Extract as components.
12. `editorReadonly` is computed but never bound, so the textarea stays editable while streaming.

## Deliberate divergences from the prototypes

- **Fonts self-hosted** via `@fontsource`, not the Google CDN `<link>` the prototypes use. PRD §9.3
  and the CSP require it.
- **Theme switches on a `.dark` class**, not only `data-theme`. `src/index.css` accepts both so
  ported markup keeps working.
- **Editor is Tiptap**, not the prototype's plain `<textarea>`. FR-3.3 needs slash commands and
  merge-field chips.
- **Right rail standardises on 326px** (file 02's 308px predates it).
- **KPI figures are 26px**, per PRD §9.3; the Bolt Agent card in the prototype used 24px.
