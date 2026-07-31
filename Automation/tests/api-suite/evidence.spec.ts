import { test, expect } from '@playwright/test';
import { API, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Evidence Module (29 endpoints)
 * Positive + Negative tests for evidence management.
 */

test.describe('API: Evidence — Positive', () => {
  let token: string;
  let auditId: string;
  let controlId: string;
  let evidenceId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
    // Get first audit + control
    const auditRes = await request.get(`${API}/audits`, { headers: authHeader(token) });
    const audits = (await auditRes.json()).data ?? await auditRes.json();
    auditId = Array.isArray(audits) ? audits[0]?.id : null;

    if (auditId) {
      const ctrlRes = await request.get(`${API}/audits/${auditId}/controls`, { headers: authHeader(token) });
      const controls = (await ctrlRes.json()).data ?? await ctrlRes.json();
      controlId = Array.isArray(controls) ? controls[0]?.id : null;

      // Get evidence for this control
      if (controlId) {
        const evRes = await request.get(`${API}/evidence/by-control/${controlId}`, { headers: authHeader(token) });
        const evidence = (await evRes.json()).data ?? await evRes.json();
        evidenceId = Array.isArray(evidence) ? evidence[0]?.id : null;
      }
    }
  });

  test('GET /evidence/by-control/:controlId — returns evidence list', async ({ request }) => {
    if (!controlId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/by-control/${controlId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /evidence/:id — returns single evidence', async ({ request }) => {
    if (!evidenceId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/${evidenceId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
  });

  test('GET /evidence/:id/comments — returns comments', async ({ request }) => {
    if (!evidenceId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/${evidenceId}/comments`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /evidence/:id/files — returns files', async ({ request }) => {
    if (!evidenceId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/${evidenceId}/files`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /evidence/:id/parent-status — returns parent status', async ({ request }) => {
    if (!evidenceId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/${evidenceId}/parent-status`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /evidence/suggested/other-audits — returns suggestions', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/evidence/suggested/other-audits?auditId=${auditId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });
});

test.describe('API: Evidence — Negative', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /evidence/:id — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/evidence/${INVALID_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('GET /evidence/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/evidence/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /evidence — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/evidence`, {
      data: { title: 'Test Evidence' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /evidence — empty body → 400', async ({ request }) => {
    const res = await request.post(`${API}/evidence`, {
      headers: authHeader(token),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE /evidence/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.delete(`${API}/evidence/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /evidence/:id/comments — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/evidence/${INVALID_UUID}/comments`, {
      data: { text: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /evidence/:id/ia-accept — invalid UUID → 404', async ({ request }) => {
    const res = await request.post(`${API}/evidence/${INVALID_UUID}/ia-accept`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /evidence/:id/ia-request-update — invalid UUID → 404', async ({ request }) => {
    const res = await request.post(`${API}/evidence/${INVALID_UUID}/ia-request-update`, {
      headers: authHeader(token),
      data: { reason: 'test' },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /evidence/:id/link — invalid UUID → 404', async ({ request }) => {
    const res = await request.post(`${API}/evidence/${INVALID_UUID}/link`, {
      headers: authHeader(token),
      data: { targetControlId: INVALID_UUID },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('DELETE /evidence/:id/files/:fileId — invalid UUID → 404', async ({ request }) => {
    const res = await request.delete(`${API}/evidence/${INVALID_UUID}/files/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /evidence/bulk-remind — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/evidence/bulk-remind`, {
      data: { evidenceIds: [] },
    });
    expect(res.status()).toBe(401);
  });
});
