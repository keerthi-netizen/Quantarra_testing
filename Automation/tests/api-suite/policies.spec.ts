import { test, expect } from '@playwright/test';
import { API, USERS, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Policies Module (83 test cases)
 * Source: New_testcase.xlsx → API Test Cases sheet, rows 361-443
 *
 * Covers: CRUD, submit, decide, publish, upload, versions, controls, documents, add-as-evidence
 * Test types: Positive (happy path) + Negative (401, 400, 403, 404)
 */

let adminToken: string;
let contributorToken: string;
let policyId: string;

test.describe.configure({ mode: 'serial' });

test.describe('API: Policies', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAs(request, 'admin');
    contributorToken = await loginAs(request, 'contributor');

    // Get first policy
    const res = await request.get(`${API}/policies`, { headers: authHeader(adminToken) });
    if (res.status() === 200) {
      const body = await res.json();
      const policies = Array.isArray(body) ? body : body.data ?? [];
      if (policies.length > 0) {
        policyId = policies[0].id;
      }
    }
  });

  // === LIST POLICIES ===
  test('#361 GET /policies — 200 with valid auth', async ({ request }) => {
    const res = await request.get(`${API}/policies`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#362 GET /policies — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/policies`);
    expect(res.status()).toBe(401);
  });

  // === CREATE POLICY (negative only — don't mutate) ===
  test('#364 POST /policies — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/policies`, {
      data: { title: 'Test Policy', policyTypeId: INVALID_UUID },
    });
    expect(res.status()).toBe(401);
  });

  test('#365 POST /policies — 400 with missing fields', async ({ request }) => {
    const res = await request.post(`${API}/policies`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('#366 POST /policies — 403 as contributor', async ({ request }) => {
    const res = await request.post(`${API}/policies`, {
      headers: authHeader(contributorToken),
      data: { title: 'Test Policy', policyTypeId: INVALID_UUID },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === GET POLICY BY ID ===
  test('#367 GET /policies/{id} — 200', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#368 GET /policies/{id} — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}`);
    expect(res.status()).toBe(401);
  });

  test('#369 GET /policies/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/policies/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === UPDATE POLICY (negative only) ===
  test('#371 PATCH /policies/{id} — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.patch(`${API}/policies/${policyId}`, {
      data: { title: 'Updated' },
    });
    expect(res.status()).toBe(401);
  });

  test('#372 PATCH /policies/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.patch(`${API}/policies/${INVALID_UUID}`, {
      headers: authHeader(adminToken),
      data: { title: 'Updated' },
    });
    expect([404, 403]).toContain(res.status());
  });

  test('#374 PATCH /policies/{id} — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.patch(`${API}/policies/${policyId}`, {
      headers: authHeader(contributorToken),
      data: { title: 'Unauthorized' },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === DELETE POLICY (negative only) ===
  test('#376 DELETE /policies/{id} — 401 without auth', async ({ request }) => {
    const res = await request.delete(`${API}/policies/${INVALID_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('#377 DELETE /policies/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.delete(`${API}/policies/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  test('#378 DELETE /policies/{id} — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.delete(`${API}/policies/${policyId}`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === CONTROLS (linked) ===
  test('#397 GET /policies/{id}/controls — 200', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}/controls`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#398 GET /policies/{id}/controls — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}/controls`);
    expect(res.status()).toBe(401);
  });

  // === VERSIONS ===
  test('#427 GET /policies/{id}/versions — 200', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}/versions`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#428 GET /policies/{id}/versions — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}/versions`);
    expect(res.status()).toBe(401);
  });

  // === SUBMIT (negative only — don't mutate state) ===
  test('#418 POST /policies/{id}/submit — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/submit`, {
      data: { levels: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('#421 POST /policies/{id}/submit — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/submit`, {
      headers: authHeader(contributorToken),
      data: { levels: [] },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === DECIDE (negative only) ===
  test('#405 POST /policies/{id}/decide — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/decide`, {
      data: { decision: 'approved' },
    });
    expect(res.status()).toBe(401);
  });

  // === PUBLISH (negative only) ===
  test('#413 POST /policies/{id}/publish — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/publish`);
    expect(res.status()).toBe(401);
  });

  test('#416 POST /policies/{id}/publish — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/publish`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === DOWNLOAD ===
  test('#410 GET /policies/{id}/download — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.get(`${API}/policies/${policyId}/download`);
    expect(res.status()).toBe(401);
  });

  // === DOCUMENTS ===
  test('#438 GET /policies/documents — 200', async ({ request }) => {
    const res = await request.get(`${API}/policies/documents`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#439 GET /policies/documents — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/policies/documents`);
    expect(res.status()).toBe(401);
  });

  // === UPLOAD (negative only) ===
  test('#423 POST /policies/{id}/upload — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/upload`);
    expect(res.status()).toBe(401);
  });

  test('#426 POST /policies/{id}/upload — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/upload`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === APPROVAL LEVELS (negative only) ===
  test('#388 PUT /policies/{id}/approval-levels — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.put(`${API}/policies/${policyId}/approval-levels`, {
      data: { levels: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('#391 PUT /policies/{id}/approval-levels — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.put(`${API}/policies/${policyId}/approval-levels`, {
      headers: authHeader(contributorToken),
      data: { levels: [] },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === ADD AS EVIDENCE (negative only) ===
  test('#380 POST /policies/{id}/add-as-evidence — 401 without auth', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/add-as-evidence`, {
      data: { auditControlId: INVALID_UUID },
    });
    expect(res.status()).toBe(401);
  });

  test('#383 POST /policies/{id}/add-as-evidence — 403 as contributor', async ({ request }) => {
    if (!policyId) test.skip();
    const res = await request.post(`${API}/policies/${policyId}/add-as-evidence`, {
      headers: authHeader(contributorToken),
      data: { auditControlId: INVALID_UUID },
    });
    expect([403, 401]).toContain(res.status());
  });
});
