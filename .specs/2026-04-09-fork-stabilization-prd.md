# Fork Stabilization PRD

**Date**: 2026-04-09 **Status**: DRAFT **Owner**: Mike Williamson + Claude (Opus
4.6) **Target release**: `v0.12.0-fork.1` (on top of upstream
`mantoni/beads-ui@v0.12.0`)

---

## Context

`mikez93/beads-ui` is a fork of
[`mantoni/beads-ui`](https://github.com/mantoni/beads-ui), created on
**2026-04-09** after months of re-applying the same local patches to every
upstream release. See `AGENTS.md` for the full fork rationale.

**Why we're here**:

- Upstream has open P0 bugs with known fixes that have not shipped.
- We've been maintaining local patches (`server/list-adapters.js` limit/status
  hacks) across every version bump since v0.10.0, and the patch script keeps
  breaking as upstream reformats the source.
- Our multi-worktree Codex workflow is actively broken by the dropdown label
  collision bug we just filed as
  [#77](https://github.com/mantoni/beads-ui/issues/77).
- `bead-kanban` was our previous primary web UI. It's now deprecated
  (unmaintained, buggy in practice). `bdui` is our only option, so it has to
  work.

**The deal**: we fix the bugs properly, open PRs back to upstream where the
fixes are generic, and ship our own npm package when upstream stays behind. This
spec covers the first stabilization release.

---

## Problem statement

`bdui` v0.12.0 ships with at least six known bugs in file paths and user flows
we depend on daily:

1. **The Issues view silently truncates** at 50 rows and silently excludes
   closed issues from the "Status: Any" filter. Affects every repo with >50
   issues. ([#58](https://github.com/mantoni/beads-ui/issues/58), open since
   2026-02-26.)
2. **The workspace dropdown is useless for worktrees.** Every worktree of the
   same repo renders as the same label — you can't tell them apart without
   hovering each option. ([#77](https://github.com/mantoni/beads-ui/issues/77),
   filed by us 2026-04-09.)
3. **Long project-prefixed issue IDs overlap with adjacent columns** in the list
   and epic views. Visually confirmed on trophy-master-mind
   (`trophy-master-mind-djd`, etc.).
   ([#57](https://github.com/mantoni/beads-ui/issues/57), open since
   2026-02-25.)
4. **Board view comment additions silently fail** — the comment appears to
   submit but is never saved or displayed.
   ([#67](https://github.com/mantoni/beads-ui/issues/67), open since
   2026-03-12.)
5. **Board view fails to load at all on some repos** with an "unknown flag"
   error. ([#68](https://github.com/mantoni/beads-ui/issues/68), open since
   2026-03-20.)
6. **UI comment creation is broken** more generally.
   ([#74](https://github.com/mantoni/beads-ui/issues/74), open since
   2026-04-02.)

Plus lower-priority gaps we'd like to address opportunistically: missing
timestamps in the detail view
([#42](https://github.com/mantoni/beads-ui/issues/42)), no edit/delete on
comments ([#41](https://github.com/mantoni/beads-ui/issues/41)), no dependency
status indicators ([#49](https://github.com/mantoni/beads-ui/issues/49)).

---

## Goals

1. **Ship a stable fork** that we can actually use day-to-day without local
   patches.
2. **Close the P0 and P1 issues above**, in the fork, with upstream-friendly
   implementations so we can PR them back.
3. **Establish the fork's workflow**: spec-driven development, `.specs/` as
   source of truth, tests required, upstream sync cadence defined.
4. **Publish the fork** as either a tagged release on GitHub (for
   `npm install -g mikez93/beads-ui`) or as a distinctly-named npm package if
   upstream stays inactive.

## Non-goals

- **Rewriting the tech stack.** Lit + Express + ws is fine. Don't rewrite in
  React or Svelte. Don't migrate to TypeScript compilation — JSDoc +
  `tsc --noEmit` is the existing pattern.
- **Adding major features** (Jira integration [#66], AI icons [#36], label
  display [#48]). Out of scope for stabilization. Maybe a later spec.
- **Breaking compatibility with `bd`.** Stay compatible with `bd 0.63.3+` at
  minimum.
- **Changing the bdui ↔ bd wire protocol** unless required by a fix. The
  protocol (`subscribe-list`, `set-workspace`, etc.) is used by upstream and
  third-party consumers.
- **Replacing the multi-workspace model.** `CURRENT_WORKSPACE` being a server
  singleton is a real limitation, but fixing it is a much bigger project and not
  in scope here.

---

## Known issues table

| #                                                   | Title                                                    | Severity | Source   | Target file(s)                                                                                                                                                                                   | Phase   |
| --------------------------------------------------- | -------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| [58](https://github.com/mantoni/beads-ui/issues/58) | Issues view limited to 50; "Status: Any" excludes closed | P0       | upstream | `server/list-adapters.js`, `server/list-adapters.test.js`                                                                                                                                        | 1       |
| [77](https://github.com/mantoni/beads-ui/issues/77) | Workspace dropdown shows identical labels for worktrees  | P0       | ours     | `app/views/workspace-picker.js`, `server/app.js` (`/api/workspaces`), `server/registry-watcher.js` (workspace registry + `RegistryEntry` typedef)                                                | 1       |
| [57](https://github.com/mantoni/beads-ui/issues/57) | List columns overlap with long project-prefixed IDs      | P0       | upstream | `app/views/list.js` (`<colgroup>` widths), `app/views/issue-row.js` (renders ID cell), `app/styles.css` (`table-layout: fixed`), `app/utils/issue-id-renderer.js`                                | 1       |
| [67](https://github.com/mantoni/beads-ui/issues/67) | Board view: comment addition silently fails              | P1       | upstream | `app/views/board.js` (has **no** comment code — likely missing feature, not broken handler), `server/ws.js` (`add-comment` handler, lines 1180-1227), `app/views/detail.js` (working comment UI) | 2       |
| [68](https://github.com/mantoni/beads-ui/issues/68) | Failed to load board because of unknown flag             | P1       | upstream | `server/list-adapters.js` (probably `blocked-issues` spec), `bd` flag parity                                                                                                                     | 2       |
| [74](https://github.com/mantoni/beads-ui/issues/74) | Cannot create comment from UI                            | P1       | upstream | `app/views/detail.js`, `server/ws.js` (`add-comment` handler). Likely shares root cause with #67.                                                                                                | 2       |
| [42](https://github.com/mantoni/beads-ui/issues/42) | Show `created_at` / `closed_at` in issue detail          | P2       | upstream | `app/views/detail.js`, formatter in `app/utils/`                                                                                                                                                 | 3       |
| [41](https://github.com/mantoni/beads-ui/issues/41) | Edit/delete comments                                     | P2       | upstream | `app/views/detail.js` (+ 12 co-located test files: `detail.test.js`, `detail.assignee.test.js`, etc.), `server/ws.js`, `server/list-adapters.js`                                                 | 3       |
| [49](https://github.com/mantoni/beads-ui/issues/49) | Dependency status indicators                             | P3       | upstream | `app/views/detail.js`, `app/utils/`                                                                                                                                                              | backlog |

---

## Phase 1 — P0 fixes (ship as `v0.12.0-fork.1`)

### 1.1 Fix the list-adapters limit/status bug (#58)

**Problem**: `bd list` defaults to `--limit 50`. The `all-issues` subscription
doesn't pass `--limit` or `--status`, so:

- Repos with >50 issues silently truncate.
- "Status: Any" in the UI only returns open issues (because `bd list` without
  `--status` only returns open).

`ready-issues` and `closed-issues` hardcode `--limit 1000` which is better but
still arbitrary. `in-progress-issues` and `blocked-issues` have no `--limit`
either. `epics` also lacks `--limit`.

**Current state in `server/list-adapters.js` (v0.12.0, lines 13-41)**:

```js
case 'all-issues': {
  return ['list', '--json', '--tree=false'];
}
case 'epics': {
  return ['epic', 'status', '--json'];
}
case 'blocked-issues': {
  return ['blocked', '--json'];
}
case 'ready-issues': {
  return ['ready', '--limit', '1000', '--json'];
}
case 'in-progress-issues': {
  return ['list', '--json', '--tree=false', '--status', 'in_progress'];
}
case 'closed-issues': {
  return [
    'list',
    '--json',
    '--tree=false',
    '--status',
    'closed',
    '--limit',
    '1000'
  ];
}
```

**Fix** (same as the patch we've been applying locally — see
`../agentic-coding-resources/intel-vault/tools/beads-ecosystem/beads-ui/apply-patches.sh`):

```js
case 'all-issues': {
  return ['list', '--json', '--tree=false', '--limit', '0', '--status', 'all'];
}
case 'epics': {
  return ['epic', 'status', '--json', '--limit', '0'];
}
case 'blocked-issues': {
  return ['blocked', '--json', '--limit', '0'];
}
case 'ready-issues': {
  return ['ready', '--limit', '0', '--json'];
}
case 'in-progress-issues': {
  return ['list', '--json', '--tree=false', '--status', 'in_progress', '--limit', '0'];
}
case 'closed-issues': {
  return ['list', '--json', '--tree=false', '--status', 'closed', '--limit', '0'];
}
```

`--limit 0` means unlimited per `bd list --help`. `--status all` returns every
status including closed.

**Tests**: update `server/list-adapters.test.js` with the new expected arg
arrays for each subscription. Add explicit assertions that `all-issues` includes
`--status all` and that every subscription passes `--limit 0`. Cover `epics` and
`blocked-issues` too — the existing test file (lines 15-66) already has cases
for all six subscription types, so each one needs its expected args updated.

**Pre-implementation verification**: Run `bd list --help`, `bd blocked --help`,
`bd epic status --help`, and `bd ready --help` to confirm that `--limit 0` means
"unlimited" for each subcommand. The `blocked` and `epic status` subcommands may
not accept `--limit` at all — verify before assuming. If they don't, leave them
as-is and document why.

**Risk**: `bd list` performance on repos with thousands of issues when
`--limit 0` is passed. Mitigation: test on our largest repo (trophy-master-mind
at 204 issues — not a worry). For projects with 10k+ issues, upstream may want a
configurable cap. We can follow up with pagination as a Phase 3 item.

**Upstream PR**: yes. This fix is generic. Open a PR immediately after merging
to our fork: `fix: ensure list subscriptions return all matching issues (#58)`.

---

### 1.2 Fix the workspace dropdown label collision (#77)

**Problem**: `app/views/workspace-picker.js` renders each workspace `<option>`
using `getProjectName(workspace_path)` (line 15) as the visible text — a
function that splits the path on `/` and returns the last segment (equivalent to
`basename`). When multiple worktrees of the same repo are registered, they all
render as the same string. The full path lives in `option.title` (hover tooltip)
and `option.value` but is not shown in the dropdown text.

**Reproduction** (empirically verified 2026-04-09):

```
<select class="workspace-picker__select">
  <option value="/Users/mike/www/ai/trophy-master-mind" title="...">trophy-master-mind</option>
  <option value="/Users/mike/.codex/worktrees/48b0/trophy-master-mind" title="...">trophy-master-mind</option>
  <option value="/Users/mike/.codex/worktrees/8cdf/trophy-master-mind" title="...">trophy-master-mind</option>
  <option value="/Users/mike/.codex/worktrees/9959/trophy-master-mind" title="...">trophy-master-mind</option>
</select>
```

**Fix strategy** (in order of preference):

1. **Git branch disambiguation (preferred)** — show `myrepo (master)`,
   `myrepo (feature-a)`, `myrepo (bugfix-b)`. Requires the server to enrich the
   `/api/workspaces` response with the git branch for each workspace.
   `bd worktree list --json` exposes this in `bd 0.63.3+`, OR we can shell out
   to `git -C <path> rev-parse --abbrev-ref HEAD`.
2. **Parent-directory fallback** — when branch data isn't available, use parent
   directory: `myrepo`, `a1b2/myrepo`, `c3d4/myrepo`.
3. **Collision detection** — only apply the disambiguator when two or more
   options share the same basename. Single-workspace users keep the clean label.

**Target files**:

- `server/registry-watcher.js` — the workspace registry (201 lines). Provides
  `getAvailableWorkspaces()` (lines 115-131), `registerWorkspace()` (lines
  22-31), and `findWorkspaceEntry()` (lines 87-107). The `RegistryEntry` typedef
  (lines 43-50) currently has `workspace_path`, `socket_path`, `database_path`,
  `pid`, `version`, `started_at` — **no `branch` field**. Adding branch
  requires: enriching the typedef, computing branch at registration time (in
  `registerWorkspace()`), and including it in the data returned by
  `getAvailableWorkspaces()`.
- `server/app.js` — `/api/workspaces` endpoint (lines 58-61). Currently returns
  the raw workspace array from `getAvailableWorkspaces()`. Once the registry
  includes `branch`, this endpoint passes it through automatically.
- `app/views/workspace-picker.js` — group options by `getProjectName()` result,
  apply disambiguation suffix `(branch)` or `(parent)` only on collision. Keep
  `title` attribute as the full path for hover.

**Tests**:

- `server/list-adapters.test.js` pattern — add new tests for a hypothetical
  workspace enrichment module.
- `app/views/workspace-picker.test.js` (new file) — render with duplicate
  basenames, assert options get disambiguated. Render with unique basenames,
  assert no disambiguation applied.

**Risk**: shelling out to git on every `/api/workspaces` request could be slow
if many workspaces are registered. Mitigation: cache branch per workspace at
registration time; invalidate on `HEAD` change only if we care (don't — branch
changes are rare).

**Upstream PR**: yes. Same fix benefits everyone using worktrees. Open PR:
`fix(workspace-picker): disambiguate identical basenames by git branch (#77)`.

---

### 1.3 Fix long-ID column overlap (#57)

**Problem**: Issue IDs like `trophy-master-mind-djd` (19 chars) visually overlap
with the `Type` column in `app/views/list.js`. Visible in v0.10.0+ despite the
"No-wrap issue IDs" changelog entry claiming this was fixed in v0.10.0 — it
wasn't, or only partially.

**Visual evidence**: screenshot captured 2026-04-09 shows `trophy-mast`
collapsing into `nind-djd` in the list view, with the `Type` badge (Epic/Task)
intruding into the ID column.

**Target files**:

- `app/views/list.js` — the list column layout. Uses `<table>` with `<colgroup>`
  defining 7 fixed-width columns: ID (100px), Type (120px), Title (auto), Status
  (120px), Assignee (160px), Priority (130px), Deps (80px). Lines 291-305.
- `app/views/issue-row.js` — renders each table row. ID cell at line 150:
  `<td role="gridcell" class="mono">${createIssueIdRenderer(it.id)}</td>`.
- `app/styles.css` — `table-layout: fixed` (line 1176) locks column widths to
  the `<colgroup>` values. `.mono` class (lines 1916-1923) applies monospace
  font to ID cells. `.id-copy` button styles (lines 518-530).
- `app/utils/issue-id-renderer.js` — existing helper that creates an
  `HTMLButtonElement` with class `id-copy`. Already supports copy-to-clipboard,
  aria-live accessibility, and keyboard activation. Good candidate for adding a
  `title` tooltip if truncation is needed.

**Root cause**: The ID column is only 100px wide with `table-layout: fixed`. IDs
like `trophy-master-mind-djd` (19 chars in monospace) exceed this and overflow
into the Type column.

**Fix candidates** (need investigation before committing to one):

1. **Widen the ID `<col>` width** — increase from 100px to ~180px or use a
   percentage. Simplest fix; may compress other columns. Try this first.
2. **Switch to `table-layout: auto`** — lets the browser size columns based on
   content. Risk: unpredictable widths across different repos with different ID
   lengths.
3. **Truncate-with-tooltip** — CSS `text-overflow: ellipsis` +
   `overflow: hidden` on the ID cell, with `title` attribute for the full ID.
   `issue-id-renderer.js` already creates a button element that could carry the
   `title`. Space-efficient, but loses some readability.
4. **Monospace the ID column and let it scroll horizontally** on overflow.
   Preserves full text, adds scroll. Awkward UX in a table.

**Recommendation**: Start with **option 1** (widen the `<col>`) — it's a
one-line change in `list.js`. If that compresses other columns unacceptably,
fall back to **option 3** (truncate + tooltip via the existing
`issue-id-renderer.js`).

**Tests**:

- `app/views/list.test.js` — render with a mix of short and long IDs, assert
  column does not overlap (hard to test in a DOM-only test without layout; may
  need jsdom + computed styles or a visual regression test). Alternative: assert
  class names or inline styles match expectation.
- Manual testing on trophy-master-mind (204 issues with long prefixes) and a
  repo with short IDs (`bd-nn.n`).

**Risk**: CSS changes can regress other views. Sanity check board.js and
detail.js to make sure they don't inherit the list column styles.

**Upstream PR**: yes.
`fix(list): prevent column overlap with long project-prefixed IDs (#57)`.

---

## Phase 2 — P1 fixes (ship as `v0.12.0-fork.2`)

Individual tickets; each gets its own follow-up spec file when picked up.

### 2.1 Board comment save failure (#67)

- **Important finding**: `app/views/board.js` contains **zero** comment-related
  code (confirmed via grep). The board view has no comment submission handler,
  no comment display, and no comment-related imports.
- This means #67 is likely a **missing feature** (board view never wired up
  comment support), not a broken handler. The "silently fails" behavior is
  probably: user expects to add a comment from the board, but there's no UI for
  it.
- Comment functionality exists only in the detail view (`app/views/detail.js`)
  and server-side (`server/ws.js` lines 1180-1227, `add-comment` handler).
- **Investigate #74 first.** If the detail-view comment path works after fixing
  #74, then #67's fix is to either: (a) add inline comment support to board.js
  (feature addition), or (b) ensure board cards link to the detail view where
  comments work (simpler).
- Shares root cause investigation with #74.

### 2.2 Board unknown flag error (#68)

- Almost certainly another `list-adapters.js` issue where one of the
  subscription specs passes a flag `bd` no longer recognizes.
- Cross-reference with `bd --help` and the `list-adapters` test expectations.

### 2.3 UI comment creation (#74)

- Likely the server-side comment handler never made it into v0.11.x / v0.12.x,
  or regressed.
- Trace the path: user action in `app/views/detail.js` → WS message →
  `server/ws.js` `add-comment` handler (lines 1180-1227) → `bd comment add`
  invocation.
- The server-side handler exists and looks functional (gets git user name, runs
  `bd comment`, returns updated list). The bug may be client-side: the detail
  view not sending the right message format, or not handling the response.
- **Investigate this before #67** — if the ws.js handler is fine and only the
  detail-view client code is broken, fixing it here resolves the core issue and
  simplifies #67's scope.
- The detail view has extensive existing test coverage (12 co-located test
  files: `detail.test.js`, `detail.assignee.test.js`, `detail.deps.test.js`,
  `detail.edits.test.js`, `detail.labels.test.js`, `detail.notes-edit.test.js`,
  `detail.priority.test.js`, `detail.toast.test.js`,
  `detail.acceptance-notes.test.js`, `detail.acceptance-placeholder.test.js`,
  `detail.design.test.js`, `detail.ui47.test.js`). New comment tests should
  follow the same patterns.

---

## Phase 3 — P2 UX improvements (ship as `v0.12.0-fork.3`)

### 3.1 Timestamps in issue detail (#42)

Add `created_at` and `closed_at` display in `app/views/detail.js`. Use existing
date formatter in `app/utils/`. Leverage the existing 12 detail test files for
test patterns.

### 3.2 Edit / delete comments (#41)

Requires server-side handlers for `comment edit` and `comment delete` in
`server/ws.js`. Depends on #74 being fixed first. The `add-comment` handler
pattern (lines 1180-1227) provides a template for the edit/delete handlers.

---

## Upstream sync strategy

### Initial state

- **Forked from**: `mantoni/beads-ui@v0.12.0` (commit pinned at fork time).
- **Remotes**: `origin` → `mikez93/beads-ui`, `upstream` → `mantoni/beads-ui`.

### Sync cadence

- **Every Friday** or when `upstream/main` lands a new release: fetch + rebase.
- When an upstream release ships fixes that duplicate ours, drop our equivalent
  commits during rebase.

### Merge strategy

- **Rebase, not merge**, so our fork history stays linear.
- `git fetch upstream && git rebase upstream/main && git push --force-with-lease`.
- Conflicts most likely in `server/list-adapters.js` and
  `app/views/workspace-picker.js` (the files we're patching). Resolve manually;
  keep our behavior.

### PR back policy

- For every fork commit, decide if it's upstream-worthy:
  - **Yes if**: generic bug fix, doesn't depend on fork-specific behavior,
    upstream has an issue filed.
  - **No if**: branding, fork-specific workflow, or upstream has explicitly
    rejected the approach.
- Open PRs to `mantoni/beads-ui` **one issue at a time**. Keep PRs small and
  focused. Reference the upstream issue number.

### Package publishing

- **Until we need to diverge from upstream in a user-visible way**: do not
  publish to npm. Users install from GitHub: `npm install -g mikez93/beads-ui`.
- **If we need to publish**: change the `name` field in `package.json` to
  `@mikez93/beads-ui` (scoped) to avoid conflict with the upstream `beads-ui`
  package. Update version to a clear fork identifier: `0.12.0-fork.1`.
- **If upstream goes permanently inactive**: consider unscoped publish with a
  different name (`bdui-plus`, `beads-ui-next`, etc.) and archive this fork's
  plan in a new spec.

---

## Testing plan

### Unit tests (CI-required)

All P0/P1 fixes ship with unit tests. Run `npm test` locally before committing;
CI runs `npm run all`.

- `server/list-adapters.test.js` — expanded coverage for every subscription's
  expected arg array (existing test file, lines 15-66 have cases for all six
  types; update each to assert `--limit 0`)
- `app/views/workspace-picker.test.js` — new test file for the dropdown
  disambiguation logic
- `app/views/list.test.js` — existing file (752 lines), add cases for long-ID
  rendering and column width behavior

### Manual smoke tests

After any merge to `main`:

1. Start bdui from the main repo: `bdui start --port 7848 --open`
2. Register all 3 trophy-master-mind worktrees via
   `cd <wt> && bdui start --port 7848`
3. Verify dropdown shows 4 distinguishable options (main + 3 worktrees with
   branch labels)
4. Switch between workspaces, verify list and board populate
5. Set status filter to "Any", verify closed issues appear
6. Verify the list extends past 50 rows on trophy-master-mind (204 issues)
7. Verify long project-prefixed IDs don't overlap the Type column
8. Add a comment from the detail view, verify it persists after refresh
9. Add a comment from the board view, verify it persists
10. Open board view for every registered workspace, verify none fail to load

### Regression tests (upstream parity)

- `npm run all` must pass on every commit.
- Before opening any PR to upstream, verify the branch still works against the
  upstream `main` HEAD (rebase + test).

---

## Success criteria

Phase 1 is done when:

1. `v0.12.0-fork.1` tag exists on `mikez93/beads-ui`.
2. `npm run all` passes on the tag.
3. All three P0 issues have closing PRs merged in our fork.
4. Upstream PRs opened for all three P0 issues (status of each: open / merged /
   rejected, all acceptable).
5. Manual smoke test above passes 100% on all 4 trophy-master-mind workspaces.
6. The `apply-patches.sh` script in the sibling
   `agentic-coding-resources/intel-vault/tools/beads-ecosystem/beads-ui/` repo
   is marked **obsolete** — our fork no longer needs it because the patches are
   part of the source.

Phase 2 done when:

1. `v0.12.0-fork.2` tag exists.
2. Board comments work end-to-end (submit → persist → appear after refresh).
3. All registered workspaces load the board without the "unknown flag" error.
4. Detail-view comment creation works.

Phase 3 done when:

1. `v0.12.0-fork.3` tag exists.
2. Timestamps visible in detail view.
3. Comment edit / delete works in both detail view and board view.

---

## Open questions

1. **Do we fork-brand the UI itself** (header logo, page title, window title) or
   keep it upstream-neutral so PRs back are cleaner? **Recommendation**: keep
   upstream-neutral for now. Brand later if we go full-divergence.
2. **Do we sign up for an `@mikez93` npm scope** now, or wait until we need to
   publish? **Recommendation**: wait. Users can install from GitHub directly.
3. **Does `bd 0.63.3` vs newer `bd 1.0.0` matter**? bd v1.0.0 is available per
   `bd doctor`. If upstream bdui isn't tested against v1.0.0 yet, we may need to
   add a compatibility matrix. Add to Phase 2 investigation. **Specifically**:
   verify that `bd blocked --limit 0` and `bd epic status --limit 0` are valid —
   these subcommands may not accept `--limit` at all.
4. **Will upstream ever accept these PRs**? Unknown. Track response time on our
   first PR (the #58 fix) and decide the fork's long-term posture from there.

---

## Appendix A — Files touched in this spec

```
server/list-adapters.js             # Phase 1.1 (#58), Phase 2.2 (#68)
server/list-adapters.test.js        # Phase 1.1 (#58)
server/app.js                       # Phase 1.2 (#77) — /api/workspaces endpoint (lines 58-61)
server/registry-watcher.js          # Phase 1.2 (#77) — workspace registry, RegistryEntry typedef (lines 43-50)
server/ws.js                        # Phase 1.2 (#77), Phase 2.1 (#67), Phase 2.3 (#74), Phase 3.2 (#41)
                                    #   add-comment handler: lines 1180-1227
                                    #   CURRENT_WORKSPACE: line 196
app/views/workspace-picker.js       # Phase 1.2 (#77) — getProjectName() at line 15
app/views/workspace-picker.test.js  # Phase 1.2 (#77) — new file
app/views/list.js                   # Phase 1.3 (#57) — <colgroup> widths at lines 291-305
app/views/issue-row.js              # Phase 1.3 (#57) — ID cell rendering at line 150
app/views/list.test.js              # Phase 1.3 (#57) — existing file (752 lines)
app/views/board.js                  # Phase 2.1 (#67) — NOTE: has no comment code; may need feature addition
app/views/detail.js                 # Phase 2.3 (#74), Phase 3.1 (#42), Phase 3.2 (#41)
app/views/detail.*.test.js          # 12 co-located test files — leverage for Phase 2/3 work
app/styles.css                      # Phase 1.3 (#57) — table-layout: fixed at line 1176
app/utils/issue-id-renderer.js      # Phase 1.3 (#57) — copy button + a11y, candidate for truncation tooltip
```

## Appendix B — Upstream issue links

- [#58](https://github.com/mantoni/beads-ui/issues/58) — Issues view limited to
  50; "Status: Any" excludes closed
- [#77](https://github.com/mantoni/beads-ui/issues/77) — Workspace dropdown
  shows identical labels for git worktrees
- [#57](https://github.com/mantoni/beads-ui/issues/57) — List columns overlap
  with long IDs
- [#67](https://github.com/mantoni/beads-ui/issues/67) — Board comment save
  silently fails
- [#68](https://github.com/mantoni/beads-ui/issues/68) — Failed to load board
  (unknown flag)
- [#74](https://github.com/mantoni/beads-ui/issues/74) — Can not create comment
  from UI
- [#42](https://github.com/mantoni/beads-ui/issues/42) — Show
  created_at/closed_at timestamps
- [#41](https://github.com/mantoni/beads-ui/issues/41) — Edit/delete comments
- [#49](https://github.com/mantoni/beads-ui/issues/49) — Dependency status
  indicators
- [#48](https://github.com/mantoni/beads-ui/issues/48) — Labels and due dates
- [#38](https://github.com/mantoni/beads-ui/issues/38) — Epic filtering
