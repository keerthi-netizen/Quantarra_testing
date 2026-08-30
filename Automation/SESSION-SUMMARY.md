# Session Summary — 2026-08-30 (Eva Keerthi, QA)

Repo: quantarra-qa-automation
Working tree: C:\Users\keert\Desktop\Testing\quantarra-qa-automation\Automation
Branch: main (NOT committed — changes in working tree only)

## What was done today

### Scripted new Excel test cases: Scenario 3 (TG-3) additions + expanded Scenario 7 (TG-7)
Source of truth: tests/New_Testcase.xlsx → "Regression" sheet. Specs are Excel-driven via
shouldRun('TG-X','Scenario X','TC-N') (RUN_MODE=regression reads "Run for Full regression",
RUN_MODE=shakeout reads "Run Shakeout in Prod and POC"). All TG-7 rows are Shakeout=No → regression-only.

**Scenario 3 / TG-3** — added 3 tests to tests/daily-shakeout/02-tg2-tg3-tg4-navigation.spec.ts:
- TC-1: contributor role shown. NOTE: Excel identifier was xpath //*[@id="radix-«r1q»"]/p — that
  Radix id is generated per-render and is NOT stable; asserted on visible "Contributor" text instead.
- TC-6: "Create new"/Add Audit button NOT visible for contributor.
- TC-7: all audit tiles are the default framework (SOC 2 Type 2).
- (TC-2/3/4/5 already existed in that file.)

**Scenario 7 / TG-7** — REWROTE tests/daily-shakeout/07-tg7-workspace-filters.spec.ts for the new
"Audit Workspace & Internal Auditor - Filter per sub-tab" (TC-1..TC-17 + added negative TC-9b).
The old Scenario 7 (single All-controls filter) was fully replaced. Two describe blocks:
Audit Workspace (TC-1..9,14..17) and Internal Audit (TC-10..13).

### Result: 20/20 passed on STAGING, 0 skipped (ENV=staging RUN_MODE=regression, headed)
Login happens ONCE per role in auth-setup; all TG-7 tests reuse admin storageState.

## Key UI facts discovered (verified live on stg.quantarra.com, SOC 2 Type 2 audit)
- Workspace Controls filter: button [data-testid="workspace-filter-btn"], badge
  [data-testid="workspace-filter-badge"]; drawer role=dialog title "Filters"; has "Submission status"
  section with "In progress" etc.; "Owner" + "Function" sections shown ONLY on All controls.
  Control rows: #tabpanel-ws a[href*="/control/"]. Empty result renders "No controls match your filters".
- Audit tab labels (getByRole tab): Dashboard | Audit Workspace | **Internal Audit** | Documents | Action Plans.
  It is "Internal Audit", NOT "Internal Auditor" — an earlier /internal auditor/i selector caused
  TC-10..13 to skip. Internal Audit tab IS visible under the admin (Super User) login — no separate
  IA user needed to reach it.
- Internal Audit sub-tabs: "Ready for review (N)", "Needs updates (N)", "Accepted (N)",
  "Sent for final review (N)", "Findings (N)". On the test audit all are (0).
- **Internal Audit filter is a DIFFERENT UI** from the workspace: button has NO testid, uses
  aria-label="Open filters"; drawer headings are Owner / Function / Trust Services Criterion /
  Last updated — there is NO "Submission status" here (sub-tabs are the status grouping). Owner
  options are checkboxes (11 on test audit) with a "Search owners…" input above them; footer is
  "Clear all" / "Apply filter" / "Close".

## Lessons / gotchas (important for future filter tests)
- Don't hard-code a submission status that may be empty. TC-9 was skipping ("no In progress controls");
  made it DATA-ADAPTIVE via applyFirstStatusWithResults() which picks the first status with rows
  (used "Not started", 172 controls). The persistence requirement now always runs.
- Empty-filter result is a valid NEGATIVE case → added TC-9b: force an empty status ("Accepted"),
  assert badge=1 + zero rows + "No controls match your filters" empty state + NO crash. Do NOT use a
  bare /error/i matcher — it false-positives on page chrome (console-error dot / "0 errors"). Scope to
  #tabpanel-ws and match specific phrases (something went wrong|failed to load|http 5xx).
- Filter persistence after opening a control: use the in-app "Back" link, NOT page.goBack() — browser
  history unwinds past the workspace to the Home audits list (observed), losing the tab/filter state.
- IA sub-tabs are empty on the test audit, so IA badge assertions are count-tolerant (compare counts
  before/after) rather than asserting a specific "1".

## Files changed (working tree, uncommitted)
- M tests/daily-shakeout/02-tg2-tg3-tg4-navigation.spec.ts  (TG-3 TC-1/TC-6/TC-7)
- M tests/daily-shakeout/07-tg7-workspace-filters.spec.ts   (full Scenario 7 rewrite, 18 tests)

## Not done / next
- TG-7 is regression-only (Shakeout=No). When the per-sub-tab filter feature ships to Prod, flip
  "Run Shakeout in Prod and POC" = Yes for TG-7 and run against Prod.
- Nothing committed. Awaiting user's "commit"/"PR" before staging files.
- Pre-existing typecheck errors remain (NOT ours): 03-tg6-audit-lifecycle.spec.ts, 06-api-endpoints.spec.ts,
  e2e-02-assign-control.spec.ts. Left untouched.

---

# Session Summary — 2026-08-24 (Eva Keerthi, QA)

Repo: quantarra-qa-automation (origin: keerthi-netizen/Quantarra_testing)
Working tree: C:\Users\keert\Desktop\Testing\quantarra-qa-automation
Branch: main (up to date)

## What was done today

### 1. Fixed Daily Shakeout Prod failure — TG-3 Contributor Navigation (MERGED, PR #2, commit 3e05dcf)
- Symptom: "Daily Shakeout #32" Prod failed on "TG-3: Contributor Navigation — Restricted Access"
  with `expect(locator('aside, nav').first()).toBeVisible()` → element(s) not found.
- Root cause: automated contributor login in `loginAndSave` (tests/daily-shakeout/session-setup.ts)
  waited on `page.waitForLoadState('networkidle')`, which never settles on Prod (analytics/websocket/
  AI-context traffic). Login threw → wrote an EMPTY session `{cookies:[],origins:[]}` → TG-3 ran
  unauthenticated → redirected to /login (no aside/nav) → assertion failed.
  Manual login with the Prod contributor (sales1@keystoneeng.in) worked fine — confirmed it's not the credential.
- Fix (tests/daily-shakeout/session-setup.ts): dropped networkidle waits; wait for login form input,
  confirm success via POST /auth/login response, fail loudly on non-OK, and verify saved session has
  cookies/localStorage (throw on empty).
- Decision (user): did NOT add a graceful TG-3 skip — TG-3 must stay a hard RBAC validation.
- Verified in CI: dispatched daily-shakeout.yml on the fix branch (run 32664057228, ENV=prod):
  contributor session saved OK, TG-3 checks passed, whole suite 52 passed.

### 2. Built TG-7 regression spec — Audit Workspace Filters (MERGED, PR #3, commit ed45911)
- New file: Automation/tests/daily-shakeout/07-tg7-workspace-filters.spec.ts (picked from Regression
  tab of Automation/tests/New_Testcase.xlsx — Scenario 7, TC-1..TC-14).
- Covers: navigate to Workspace→Controls→All controls; open filter Sheet; select "In progress"
  submission status; Apply; slide bar closes; count badge "1"; filter persists after opening a control
  and navigating back; Clear all + Apply removes filter/badge; All controls repopulates.
- UI selectors (apps/web, verified against source):
  - Filter trigger: [data-testid="workspace-filter-btn"] (Controls sub-tab only)
  - Count badge: [data-testid="workspace-filter-badge"]
  - Filter Sheet (Radix Sheet, role=dialog): title "Filters"; legend "Submission status";
    status option label "In progress"; footer buttons "Clear all" + "Apply filter"
  - Control rows: `#tabpanel-ws a[href*="/control/"]`
- Excel-driven via shouldRun('TG-7','Scenario 7','TC-N'). RUN_MODE=shakeout reads
  "Run Shakeout in Prod and POC"; RUN_MODE=regression reads "Run for Full regression".
- User set "Run Shakeout in Prod and POC" = No for TG-7 (filter feature NOT yet deployed to Prod),
  so TG-7 is regression-only for now. Flip to Yes once the feature is live on Prod.
- Verified: 9 passed against STAGING (ENV=staging RUN_MODE=regression). Prod run was requested then
  cancelled (feature not on Prod yet — would fail), so we kept it regression-only.

## Environment notes / gotchas
- OS: Windows / PowerShell — use `;` not `&&` in shell commands.
- Jira token lives in Automation/.env (JIRA_API_TOKEN), NOT in shell env or environments.json.
  Jira REST base: https://quantarra.atlassian.net/rest/api/3, email keerthi@quantarra.io.
- Env resolution: ENV=dev|staging|poc|prod (default dev). Prod contributor=sales1@keystoneeng.in,
  Prod admin=keerthi@quantarra.io (Super User). Creds in Automation/config/environments.json.
- Pre-existing typecheck errors (NOT ours, do not touch unless asked): 03-tg6-audit-lifecycle.spec.ts
  (page:any x2), 06-api-endpoints.spec.ts (Authorization header type), e2e-02-assign-control.spec.ts (page:any x2).
- CI workflow: .github/workflows/daily-shakeout.yml (workflow_dispatch input environment=poc|prod|both).
  Runs project=daily-shakeout, RUN_MODE defaults to shakeout.

## Also produced (not committed — informational)
- Manual UI test cases for Jira PRJAT-1179 (IA/EA control owner assignment + auditor staff visibility).
  Real UI labels: client owner column = "Owner"; IA/EA owner column = "Assigned auditor" (both apps/web
  Internal Audit tab and apps/audit Audit tab). testids: auditor-assign-{id}, auditor-dropdown-{id},
  ia-assigned-auditor-{id}. External-firm reassign shows a ConfirmDialog. PRJAT-1179 status: In Review.

## Uncommitted / untracked in working tree (left alone intentionally)
- M Automation/.gitignore
- ?? Automation/scripts/add-config-sheet.ts, debug-controls-tab.ts
- ?? Q_test, project-atlas/  (project-atlas is a local copy of the product repo used for reading source)

## Next steps / TODO for tomorrow
- When workspace-filter feature deploys to Prod: set TG-7 "Run Shakeout in Prod and POC" = Yes and
  run TG-7 against Prod to confirm.
- Optional: script the must-pass PRJAT-1179 UI cases (picker gating, external-reassign confirm dialog,
  staff-only visibility) as Playwright specs if requested.
- Optional cleanup: fix the pre-existing typecheck errors in 03-tg6 / 06-api-endpoints / e2e-02 (separate small PR).
