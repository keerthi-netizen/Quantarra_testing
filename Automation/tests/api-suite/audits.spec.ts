import { test, expect } from '@playwright/test';
import { API, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Audit Programs Module (34 endpoints)
 * Positive + Negative tests for audit lifecycle.
 */

test.describe('API: Audits — Positive', () => {
  let token: string;
  let auditId: string;
  let controlId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
    // Get first audit
    const res = await request.get(`${API}/audits`, { headers: authHeader(token) });
    const body = await res.json();
    const audits = Array.isArray(body) ? body : body.data ?? [];
    auditId = audits[0]?.id;

    // Get first control in that audit
    if (auditId) {
      const ctrlRes = await request.get(`${API}/audits/${auditId}/controls`, { headers: authHeader(token) });
      const ctrlBody = await ctrlRes.json();
      const controls = Array.isArray(ctrlBody) ? ctrlBody : ctrlBody.data ?? [];
      controlId = controls[0]?.id;
    }
  });

  test('GET /audits — returns audit list', async ({ request }) => {
    const res = await request.get(`${API}/audits`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id — returns single audit', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
  });

  test('GET /audits/:id/controls — returns controls', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/controls`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/controls/:controlId — returns single control', async ({ request }) => {
    if (!auditId || !controlId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/controls/${controlId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/families — returns families', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/families`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/objectives — returns objectives', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/objectives`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/evidence — returns evidence list', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/evidence`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/findings — returns findings', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/findings`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/teams — returns teams', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/teams`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/progress — returns progress', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/progress`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/mapping-stats — returns stats', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/mapping-stats`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /audits/:id/assignable-users — returns users', async ({ request }) => {
    if (!auditId) { test.skip(); return; }
    const res = await request.get(`${API}/audits/${auditId}/assignable-users`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });
});

test.describe('API: Audits — Negative', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /audits — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/audits`);
    expect(res.status()).toBe(401);
  });

  test('GET /audits/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/audits/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('GET /audits/:id/controls — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/audits/${INVALID_UUID}/controls`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /audits — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/audits`, {
      data: { name: 'Test Audit', frameworkId: INVALID_UUID },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /audits — empty body → 400', async ({ request }) => {
    const res = await request.post(`${API}/audits`, {
      headers: authHeader(token),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE /audits/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.delete(`${API}/audits/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('PATCH /audits/:id/status — invalid UUID → 404', async ({ request }) => {
    const res = await request.patch(`${API}/audits/${INVALID_UUID}/status`, {
      headers: authHeader(token),
      data: { status: 'in_progress' },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /audits/:id/controls/notify — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/audits/${INVALID_UUID}/controls/notify`, {
      data: { controlIds: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /audits/:id/controls/:controlId — invalid audit → 404', async ({ request }) => {
    const res = await request.get(`${API}/audits/${INVALID_UUID}/controls/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /audits/:id/findings — invalid UUID → 404/400', async ({ request }) => {
    const res = await request.post(`${API}/audits/${INVALID_UUID}/findings`, {
      headers: authHeader(token),
      data: { title: 'Test finding' },
    });
    expect([400, 404]).toContain(res.status());
  });
});
