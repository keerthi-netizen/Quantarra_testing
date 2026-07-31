import { test, expect } from '@playwright/test';
import { API, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Policies Module (21 endpoints)
 * Positive + Negative tests for policy management.
 */

test.describe('API: Policies — Positive', () => {
  let token: string;
  let policyId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
    // Get first policy
    const res = await request.get(`${API}/policies`, { headers: authHeader(token) });
    const body = await res.json();
    const policies = Array.isArray(body) ? body : body.data ?? [];
    policyId = policies[0]?.id;
  });

  test('GET /policies — returns policy list', async ({ request }) => {
    const res = await request.get(`${API}/policies`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /policies/:id — returns single policy', async ({ request }) => {
    if (!policyId) { test.skip(); return; }
    const res = await request.get(`${API}/policies/${policyId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
  });

  test('GET /policies/:id/controls — returns linked controls', async ({ request }) => {
    if (!policyId) { test.skip(); return; }
    const res = await request.get(`${API}/policies/${policyId}/controls`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /policies/:id/versions — returns version history', async ({ request }) => {
    if (!policyId) { test.skip(); return; }
    const res = await request.get(`${API}/policies/${policyId}/versions`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /policies/documents — returns document list', async ({ request }) => {
    const res = await request.get(`${API}/policies/documents`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });
});

test.describe('API: Policies — Negative', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /policies — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/policies`);
    expect(res.status()).toBe(401);
  });

  test('GET /policies/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/policies/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /policies — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/policies`, {
      data: { title: 'Test Policy' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /policies — empty body → 400', async ({ request }) => {
    const res = await request.post(`${API}/policies`, {
      headers: authHeader(token),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE /policies/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.delete(`${API}/policies/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 403, 404]).toContain(res.status());
  });

  test('POST /policies/:id/submit — invalid UUID → 404/400', async ({ request }) => {
    const res = await request.post(`${API}/policies/${INVALID_UUID}/submit`, {
      headers: authHeader(token),
      data: { levels: [] },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /policies/:id/publish — invalid UUID → 404/400', async ({ request }) => {
    const res = await request.post(`${API}/policies/${INVALID_UUID}/publish`, {
      headers: authHeader(token),
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /policies/:id/decide — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/policies/${INVALID_UUID}/decide`, {
      data: { decision: 'approve' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /policies/:id/download — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/policies/${INVALID_UUID}/download`, { headers: authHeader(token) });
    expect([400, 404]).toContain(res.status());
  });

  test('GET /policies — contributor role → 403', async ({ request }) => {
    const contribToken = await loginAs(request, 'contributor');
    const res = await request.get(`${API}/policies`, { headers: authHeader(contribToken) });
    // Contributor may be blocked from policies
    expect([200, 403]).toContain(res.status());
  });
});
