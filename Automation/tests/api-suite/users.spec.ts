import { test, expect } from '@playwright/test';
import { API, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Users Module (13 endpoints)
 * Positive + Negative tests for user management.
 */

test.describe('API: Users — Positive', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /users — returns user list', async ({ request }) => {
    const res = await request.get(`${API}/users`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.data ?? [];
    expect(users.length).toBeGreaterThan(0);
  });

  test('GET /users/me — returns current user profile', async ({ request }) => {
    const res = await request.get(`${API}/users/me`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('firstName');
  });

  test('GET /users/me/capabilities — returns capabilities', async ({ request }) => {
    const res = await request.get(`${API}/users/me/capabilities`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /users/me/mfa/status — returns MFA status', async ({ request }) => {
    const res = await request.get(`${API}/users/me/mfa/status`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('GET /users/:id — returns user by valid ID', async ({ request }) => {
    // Get a user ID from the list
    const listRes = await request.get(`${API}/users`, { headers: authHeader(token) });
    const users = (await listRes.json()).data ?? await listRes.json();
    const userId = Array.isArray(users) ? users[0]?.id : null;

    if (!userId) { test.skip(); return; }

    const res = await request.get(`${API}/users/${userId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(userId);
  });
});

test.describe('API: Users — Negative', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAs(request, 'admin');
  });

  test('GET /users — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/users`);
    expect(res.status()).toBe(401);
  });

  test('GET /users/me — no auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/users/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /users/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.get(`${API}/users/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('POST /users — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/users`, {
      data: { email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /users/invite — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/users/invite`, {
      data: { email: 'invite@test.com', roleIds: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /users/invite — missing required fields → 400', async ({ request }) => {
    const res = await request.post(`${API}/users/invite`, {
      headers: authHeader(token),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE /users/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.delete(`${API}/users/${INVALID_UUID}`, { headers: authHeader(token) });
    expect([404, 400]).toContain(res.status());
  });

  test('PATCH /users/:id — invalid UUID → 404', async ({ request }) => {
    const res = await request.patch(`${API}/users/${INVALID_UUID}`, {
      headers: authHeader(token),
      data: { firstName: 'Test' },
    });
    expect([404, 400]).toContain(res.status());
  });

  test('GET /users — contributor role → 403 or limited data', async ({ request }) => {
    const contribToken = await loginAs(request, 'contributor');
    const res = await request.get(`${API}/users`, { headers: authHeader(contribToken) });
    // Contributor may get 403 or limited list
    expect([200, 403]).toContain(res.status());
  });
});
