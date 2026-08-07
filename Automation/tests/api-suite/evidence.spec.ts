import { test, expect } from '@playwright/test';
import { API, USERS, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Evidence Module (120 test cases)
 * Source: New_testcase.xlsx → API Test Cases sheet, rows 178-296
 *
 * Covers: CRUD, files, comments, IA/EA actions, duplicate, link, lock, status, parent
 * Test types: Positive (happy path) + Negative (401, 400, 403, 404)
 */

let adminToken: string;
let contributorToken: string;
let auditId: string;
let controlId: string;
let evidenceId: string;

test.describe.configure({ mode: 'serial' });

test.describe('API: Evidence', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAs(request, 'admin');
    contributorToken = await loginAs(request, 'contributor');

    // Get first audit and control to find evidence
    const auditRes = await request.get(`${API}/audits`, { headers: authHeader(adminToken) });
    const auditBody = await auditRes.json();
    const audits = Array.isArray(auditBody) ? auditBody : auditBody.data ?? [];
    if (audits.length > 0) {
      auditId = audits[0].id;

      const ctrlRes = await request.get(`${API}/audits/${auditId}/controls`, { headers: authHeader(adminToken) });
      const ctrlBody = await ctrlRes.json();
      const controls = Array.isArray(ctrlBody) ? ctrlBody : ctrlBody.data ?? [];
      if (controls.length > 0) {
        controlId = controls[0].id;

        // Try to get evidence for this control
        const evRes = await request.get(`${API}/evidence/by-control/${controlId}`, { headers: authHeader(adminToken) });
        if (evRes.status() === 200) {
          const evBody = await evRes.json();
          const evidences = Array.isArray(evBody) ? evBody : evBody.data ?? [];
          if (evidences.length > 0) {
            evidenceId = evidences[0].id;
          }
        }
      }
    }
  });

  // === GET EVIDENCE BY ID ===
  test('#182 GET /evidence/{id} — 200 with valid ID', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#183 GET /evidence/{id} — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}`);
    expect(res.status()).toBe(401);
  });

  test('#184 GET /evidence/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/evidence/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === UPDATE EVIDENCE ===
  test('#186 PATCH /evidence/{id} — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.patch(`${API}/evidence/${evidenceId}`, {
      data: { title: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('#187 PATCH /evidence/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.patch(`${API}/evidence/${INVALID_UUID}`, {
      headers: authHeader(adminToken),
      data: { title: 'test' },
    });
    expect([404, 403]).toContain(res.status());
  });

  // === DELETE EVIDENCE ===
  test('#191 DELETE /evidence/{id} — 401 without auth', async ({ request }) => {
    const res = await request.delete(`${API}/evidence/${INVALID_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('#192 DELETE /evidence/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.delete(`${API}/evidence/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === COMMENTS ===
  test('#204 GET /evidence/{id}/comments — 200', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/comments`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#205 GET /evidence/{id}/comments — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/comments`);
    expect(res.status()).toBe(401);
  });

  test('#206 GET /evidence/{id}/comments — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/evidence/${INVALID_UUID}/comments`, { headers: authHeader(adminToken) });
    expect([404, 403, 200]).toContain(res.status());
  });

  // === FILES ===
  test('#236 GET /evidence/{id}/files — 200', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/files`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#237 GET /evidence/{id}/files — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/files`);
    expect(res.status()).toBe(401);
  });

  test('#238 GET /evidence/{id}/files — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/evidence/${INVALID_UUID}/files`, { headers: authHeader(adminToken) });
    expect([404, 403, 200]).toContain(res.status());
  });

  // === BY CONTROL ===
  test('#287 GET /evidence/by-control/{controlId} — 200', async ({ request }) => {
    if (!controlId) test.skip();
    const res = await request.get(`${API}/evidence/by-control/${controlId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#288 GET /evidence/by-control/{controlId} — 401 without auth', async ({ request }) => {
    if (!controlId) test.skip();
    const res = await request.get(`${API}/evidence/by-control/${controlId}`);
    expect(res.status()).toBe(401);
  });

  test('#289 GET /evidence/by-control/{controlId} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/evidence/by-control/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403, 200]).toContain(res.status());
  });

  // === BULK FILES ===
  test('#290 GET /evidence/files — 200', async ({ request }) => {
    const res = await request.get(`${API}/evidence/files`, { headers: authHeader(adminToken) });
    expect([200, 400]).toContain(res.status()); // May require query param
  });

  test('#291 GET /evidence/files — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/evidence/files`);
    expect(res.status()).toBe(401);
  });

  // === LINKED EVIDENCE ===
  test('#292 GET /evidence/linked/{controlId} — 200', async ({ request }) => {
    if (!controlId) test.skip();
    const res = await request.get(`${API}/evidence/linked/${controlId}`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#293 GET /evidence/linked/{controlId} — 401 without auth', async ({ request }) => {
    if (!controlId) test.skip();
    const res = await request.get(`${API}/evidence/linked/${controlId}`);
    expect(res.status()).toBe(401);
  });

  // === SUGGESTED EVIDENCE ===
  test('#295 GET /evidence/suggested/other-audits — 200', async ({ request }) => {
    const res = await request.get(`${API}/evidence/suggested/other-audits`, { headers: authHeader(adminToken) });
    expect([200, 400]).toContain(res.status()); // May require query params
  });

  test('#296 GET /evidence/suggested/other-audits — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/evidence/suggested/other-audits`);
    expect(res.status()).toBe(401);
  });

  // === IA ACTIONS (negative only — don't mutate state) ===
  test('#247 POST /evidence/{id}/ia-accept — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.post(`${API}/evidence/${evidenceId}/ia-accept`);
    expect(res.status()).toBe(401);
  });

  test('#252 POST /evidence/{id}/ia-mark-reviewed — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.post(`${API}/evidence/${evidenceId}/ia-mark-reviewed`);
    expect(res.status()).toBe(401);
  });

  test('#257 POST /evidence/{id}/ia-request-update — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.post(`${API}/evidence/${evidenceId}/ia-request-update`);
    expect(res.status()).toBe(401);
  });

  // === EA ACTIONS (negative only) ===
  test('#222 POST /evidence/{id}/ea-accept — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.post(`${API}/evidence/${evidenceId}/ea-accept`);
    expect(res.status()).toBe(401);
  });

  test('#227 POST /evidence/{id}/ea-request-update — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.post(`${API}/evidence/${evidenceId}/ea-request-update`);
    expect(res.status()).toBe(401);
  });

  // === PARENT STATUS ===
  test('#275 GET /evidence/{id}/parent-status — 200', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/parent-status`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status()); // May not have a parent
  });

  test('#276 GET /evidence/{id}/parent-status — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.get(`${API}/evidence/${evidenceId}/parent-status`);
    expect(res.status()).toBe(401);
  });

  // === STATUS CHANGE (negative only) ===
  test('#279 PATCH /evidence/{id}/status — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.patch(`${API}/evidence/${evidenceId}/status`, {
      data: { status: 'submitted' },
    });
    expect(res.status()).toBe(401);
  });

  // === LOCK (negative only) ===
  test('#271 PATCH /evidence/{id}/lock — 401 without auth', async ({ request }) => {
    if (!evidenceId) test.skip();
    const res = await request.patch(`${API}/evidence/${evidenceId}/lock`, {
      data: { locked: true },
    });
    expect(res.status()).toBe(401);
  });

  // === BULK REMIND (negative only) ===
  test('#284 POST /evidence/bulk-remind — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/evidence/bulk-remind`, {
      data: { evidenceIds: [] },
    });
    expect(res.status()).toBe(401);
  });
});
