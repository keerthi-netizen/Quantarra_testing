import { test, expect } from '@playwright/test';
import { getTestUser, getEnvConfig } from '../../src/config/environment';

/**
 * API Smoke Tests — Critical endpoint verification.
 * Tests the API layer directly (no browser needed).
 * Works on: staging, prod (just switch ENV in .env).
 *
 * Uses a single login to avoid rate limiting on auth endpoints.
 */

const envConfig = getEnvConfig();
const API = envConfig.apiUrl;

// Shared token — set in first test, used by all subsequent tests
let token: string;

test.describe.configure({ mode: 'serial' });

test.describe('API Smoke', () => {
  test('POST /auth/login — valid credentials return token', async ({ request }) => {
    const user = getTestUser('admin');
    let res = await request.post(`${API}/auth/login`, {
      data: { email: user.email, password: user.password },
    });

    // Retry after delay if rate limited
    if (res.status() === 429) {
      await new Promise((r) => setTimeout(r, 3000));
      res = await request.post(`${API}/auth/login`, {
        data: { email: user.email, password: user.password },
      });
    }

    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(user.email);

    // Store token for all subsequent tests
    token = body.accessToken;
  });

  test('POST /auth/login — invalid credentials return 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'nonexistent@example.com', password: 'WrongPass!' },
    });
    // 401 = invalid creds, 429 = rate limited (acceptable in rapid test runs)
    expect([401, 429]).toContain(res.status());
  });

  test('GET /health — returns 200', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
  });

  test('GET /users/me — returns current user profile', async ({ request }) => {
    const res = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const profile = await res.json();
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('roles');
    expect(profile).toHaveProperty('firstName');
  });

  test('GET /users/me — 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/users/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /frameworks — returns framework list with known entries', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? body.value ?? [];
    expect(frameworks.length).toBeGreaterThan(0);

    // Verify known frameworks exist
    const names = frameworks.map((f: any) => f.name);
    expect(names).toContain('ISO IEC 27001');
    expect(names).toContain('SOC 2 Type 2');
  });

  test('GET /frameworks — each has required fields', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? body.value ?? [];

    for (const fw of frameworks) {
      expect(fw).toHaveProperty('id');
      expect(fw).toHaveProperty('name');
      expect(fw).toHaveProperty('sourceType');
      expect(fw).toHaveProperty('active');
    }
  });

  test('GET /audits — returns audit list', async ({ request }) => {
    const res = await request.get(`${API}/audits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const audits = Array.isArray(body) ? body : body.data ?? [];
    expect(audits).toBeInstanceOf(Array);
  });

  test('GET /audits/:id/controls — returns controls for first audit', async ({ request }) => {
    const listRes = await request.get(`${API}/audits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listRes.json();
    const audits = Array.isArray(body) ? body : body.data ?? [];

    if (audits.length === 0) {
      test.skip();
      return;
    }

    const auditId = audits[0].id;
    const res = await request.get(`${API}/audits/${auditId}/controls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /users — returns user list with required fields', async ({ request }) => {
    const res = await request.get(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.data ?? [];
    expect(users.length).toBeGreaterThan(0);

    for (const user of users.slice(0, 5)) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
    }
  });

  test('GET /policies — returns policy list', async ({ request }) => {
    const res = await request.get(`${API}/policies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /business-units — returns list', async ({ request }) => {
    const res = await request.get(`${API}/business-units`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });
});
