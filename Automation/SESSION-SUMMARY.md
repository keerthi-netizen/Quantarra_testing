# Session Summary — 2026-07-31 (01:00 - 05:25 IST)

## What was built

### Smoke Test Suite (`tests/smoke-suite/`)
Complete Playwright test suite driven by `tests/New_testcase.xlsx`:

| File | Tests | Status |
|------|-------|--------|
| `tg1-tg3-authentication.spec.ts` | TC-1, TC-2, TC-3 (6 steps), TC-4 | 9 pass, 2 known failures |
| `tg5-admin.spec.ts` | TC-11 to TC-16 | All pass |
| `tg6-audit-lifecycle.spec.ts` | TC-18 (17-step Create Audit) | Pass |
| `test-data.ts` | Credentials config | — |

### Generic Smoke Tests (`tests/smoke/`)
Broader environment smoke tests (not Excel-driven):

| File | Coverage |
|------|----------|
| `api-core.spec.ts` | Auth, frameworks, audits, users, policies, health |
| `auth.spec.ts` | Login flows, navigation, JS errors |
| `audits.spec.ts` | Audit list, detail, all tabs, controls |
| `dashboard.spec.ts` | Dashboard, Pulse |
| `policies.spec.ts` | Policy list, create flow |
| `admin.spec.ts` | Users, roles, business units |
| `evidence.spec.ts` | Evidence in control detail |
| `documents.spec.ts` | Documents page |
| `mc-flows.spec.ts` | Mission Control |
| `audit-portal.spec.ts` | External Auditor portal |
| `frameworks.spec.ts` | Framework listing |

### Config Changes
- `.env` — staging URLs updated to `stg.quantarra.com`, credentials set
- `.env.example` — updated with correct staging URLs
- `playwright.config.ts` — added `smoke-suite`, `smoke-web`, `smoke-mc`, `smoke-audit`, `smoke-api` projects
- `package.json` — added `smoke:suite`, `smoke:all`, `smoke:web`, etc. scripts
- `tsconfig.json` — fixed rootDir to include tests
- `src/config/environment.ts` — added `override: true` to dotenv

## Known Failures (expected)
| Test | Reason | Action |
|------|--------|--------|
| TC-3 Step 6: Google Drive "Connected" | Integration not connected on this org | Intended — not a bug |
| TC-4: Contributor sees /integrations | RBAC bug | **PRJAT-880** created, assigned to Irina |

## Jira Config (for future auto-creation)
- **Epic:** PRJAT-879
- **Labels:** RBAC (for RBAC issues)
- **Assignee:** Irina Gurova (`712020:68ce414a-517a-4c2a-9ee2-4a483c5d6b59`) — all UI fixes
- **Priority:** Medium
- **Auth:** `keerthi@quantarra.io` + API token

## Run Commands
```bash
npm run smoke:suite          # Excel-driven test cases
npm run smoke:all            # Full smoke (all projects)
npm run smoke:suite -- --headed  # With visible browser
```

## Next Steps
- TG-5 TC-11–16: "Run for Smoketest in prod" column is empty — confirm if these should run in prod
- Sheet 3 (prod credentials): not yet created — needed for prod runs
- More test cases: waiting for Excel updates from Keerthi
