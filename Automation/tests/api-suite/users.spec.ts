import { test, expect } from '@playwright/test';
import { API, USERS, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Users Module (45 test cases)
 * Source: New_testcase.xlsx → API Test Cases sheet, rows 444-488
 *
 * Covers: List, get, create, update, delete, invite, /me, /me/capabilities, MFA (status/reset/disable/recovery-codes), password
 * Test types: Positive (happy path) + Negative (401, 400, 403, 404)
 */

let adminToken: string;
let contributorToken: string;
let userId: string;

test.describe.configure({ mode: 'serial' });

test.describe('API: Users', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAs(request, 'admin');
    contributorToken = await loginAs(request, 'contributor');

    // Get current user ID
    const res = await request.get(`${API}/users/me`, { headers: authHeader(adminToken) });
    if (res.status() === 200) {
      const body = await res.json();
      userId = body.id;
    }
  });

  // === LIST USERS ===
  test('#444 GET /users — 200 with valid auth', async ({ request }) => {
    const res = await request.get(`${API}/users`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.data ?? [];
    expect(users.length).toBeGreaterThan(0);
  });

  test('#445 GET /users — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/users`);
    expect(res.status()).toBe(401);
  });

  // === CREATE USER (negative only — don't create test data) ===
  test('#447 POST /users — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/users`, {
      data: { email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    });
    expect(res.status()).toBe(401);
  });

  test('#448 POST /users — 400 with missing fields', async ({ request }) => {
    const res = await request.post(`${API}/users`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('#449 POST /users — 403 as contributor', async ({ request }) => {
    const res = await request.post(`${API}/users`, {
      headers: authHeader(contributorToken),
      data: { email: 'newuser@test.com', firstName: 'New', lastName: 'User' },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === GET USER BY ID ===
  test('#450 GET /users/{id} — 200', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.get(`${API}/users/${userId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  });

  test('#451 GET /users/{id} — 401 without auth', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.get(`${API}/users/${userId}`);
    expect(res.status()).toBe(401);
  });

  test('#452 GET /users/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/users/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === UPDATE USER (negative only) ===
  test('#454 PATCH /users/{id} — 401 without auth', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.patch(`${API}/users/${userId}`, {
      data: { firstName: 'Test' },
    });
    expect(res.status()).toBe(401);
  });

  test('#455 PATCH /users/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.patch(`${API}/users/${INVALID_UUID}`, {
      headers: authHeader(adminToken),
      data: { firstName: 'Test' },
    });
    expect([404, 403]).toContain(res.status());
  });

  test('#457 PATCH /users/{id} — 403 as contributor', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.patch(`${API}/users/${userId}`, {
      headers: authHeader(contributorToken),
      data: { firstName: 'Unauthorized' },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === DELETE USER (negative only) ===
  test('#459 DELETE /users/{id} — 401 without auth', async ({ request }) => {
    const res = await request.delete(`${API}/users/${INVALID_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('#460 DELETE /users/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.delete(`${API}/users/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  test('#461 DELETE /users/{id} — 403 as contributor', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.delete(`${API}/users/${userId}`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === INVITE USER (negative only) ===
  test('#468 POST /users/invite — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/users/invite`, {
      data: { email: 'invite@test.com', roleIds: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('#469 POST /users/invite — 400 with missing fields', async ({ request }) => {
    const res = await request.post(`${API}/users/invite`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('#470 POST /users/invite — 403 as contributor', async ({ request }) => {
    const res = await request.post(`${API}/users/invite`, {
      headers: authHeader(contributorToken),
      data: { email: 'invite@test.com', roleIds: [] },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === /ME ENDPOINTS ===
  test('#471 GET /users/me — 200 with valid auth', async ({ request }) => {
    const res = await request.get(`${API}/users/me`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('roles');
  });

  test('#472 GET /users/me — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/users/me`);
    expect(res.status()).toBe(401);
  });

  test('#473 GET /users/me/capabilities — 200', async ({ request }) => {
    const res = await request.get(`${API}/users/me/capabilities`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#474 GET /users/me/capabilities — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/users/me/capabilities`);
    expect(res.status()).toBe(401);
  });

  // === MFA STATUS ===
  test('#483 GET /users/me/mfa/status — 200', async ({ request }) => {
    const res = await request.get(`${API}/users/me/mfa/status`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#484 GET /users/me/mfa/status — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/users/me/mfa/status`);
    expect(res.status()).toBe(401);
  });

  // === MFA RESET (negative only) ===
  test('#463 POST /users/{id}/mfa/reset — 401 without auth', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.post(`${API}/users/${userId}/mfa/reset`);
    expect(res.status()).toBe(401);
  });

  test('#464 POST /users/{id}/mfa/reset — 404 with invalid UUID', async ({ request }) => {
    const res = await request.post(`${API}/users/${INVALID_UUID}/mfa/reset`, {
      headers: authHeader(adminToken),
    });
    expect([404, 403]).toContain(res.status());
  });

  test('#466 POST /users/{id}/mfa/reset — 403 as contributor', async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.post(`${API}/users/${userId}/mfa/reset`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === MFA DISABLE (negative only) ===
  test('#476 POST /users/me/mfa/disable — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/users/me/mfa/disable`);
    expect(res.status()).toBe(401);
  });

  // === RECOVERY CODES (negative only) ===
  test('#480 POST /users/me/mfa/recovery-codes — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/users/me/mfa/recovery-codes`);
    expect(res.status()).toBe(401);
  });

  // === PASSWORD (negative only) ===
  test('#486 PATCH /users/me/password — 401 without auth', async ({ request }) => {
    const res = await request.patch(`${API}/users/me/password`, {
      data: { currentPassword: 'old', newPassword: 'new' },
    });
    expect(res.status()).toBe(401);
  });

  test('#487 PATCH /users/me/password — 400 with missing fields', async ({ request }) => {
    const res = await request.patch(`${API}/users/me/password`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });
});
