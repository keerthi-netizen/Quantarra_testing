import { test, expect } from '@playwright/test';
import { API, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Frameworks Module (16 endpoints)
 * Positive + Negative tests for framework management.
 */

test.describe('API: Frameworks — Positive', () => {
  let token: string;
  let frameworkId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
    // Get first framework ID
    const res = await request.get(`${API}/frameworks`, { headers: authHeader(token) });
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? body.value ?? [];
    frameworkId = frameworks[0]?.id;
  });

  test('GET /frameworks — returns list', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.data ?? body.value ?? [];
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /frameworks/:id — returns single framework', async ({ request }) => {
    if (!frameworkId) { test.skip(); return; }
    const res = await request.get(`${API}/frameworks/${frameworkId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
  });

  test('GET /frameworks/:id/requirements — returns requirements list', async ({ request }) => {
    if (!frameworkId) { test.skip(); return; }
    const res = await request.get(`${API}/frameworks/${frameworkId}/requirements`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /frameworks/:id/coverage — returns coverage report', async ({ request }) => {
    if (!frameworkId) { test.skip(); return; }
    const res = await request.get(`${API}/frameworks/${frameworkId}/coverage`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /frameworks/:id/mapping-suggestions — returns suggestions', async ({ request }) => {
    if (!frameworkId) { test.skip(); return; }
    const res = await request.get(`${API}/frameworks/${frameworkId}/mapping-suggestions`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });
});

test.describe('API: Frameworks — Negative', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /frameworks — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`);
    expect(res.status()).toBe(401);
  });

  test('GET /frameworks/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/frameworks/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('GET /frameworks/:id/requirements — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/frameworks/${INVALID_UUID}/requirements`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /frameworks/:id/enable — invalid UUID → 404', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/${INVALID_UUID}/enable`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /frameworks/:id/disable — invalid UUID → 404', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/${INVALID_UUID}/disable`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /frameworks/custom — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/custom`, {
      data: { name: 'Test Framework' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /frameworks/custom — empty body → 400', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/custom`, {
      headers: authHeader(token),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE /frameworks/custom/:id — invalid UUID → 404/403', async ({ request }) => {
    const res = await request.delete(`${API}/frameworks/custom/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([400, 403, 404]).toContain(res.status());
  });

  test('POST /frameworks/:id/requirements/bulk — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/${INVALID_UUID}/requirements/bulk`, {
      data: { requirements: [] },
    });
    expect(res.status()).toBe(401);
  });
});
