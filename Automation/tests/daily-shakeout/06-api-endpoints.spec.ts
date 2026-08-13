import { test, expect } from '@playwright/test';
import { getEnvConfig } from '../../src/config/environment';
import { getShakeoutAdmin } from './test-data';
import { checkGate } from './session-setup';

/**
 * Daily Shakeout — Core API Endpoints
 *
 * Validates that critical API endpoints respond correctly:
 * 1. GET /frameworks — returns list with known entries
 * 2. GET /audits — returns audit list
 * 3. GET /users — returns user list
 * 4. GET /policies — returns policy list
 * 5. GET /users/me — returns current user profile
 * 6. GET /business-units — returns list
 */

const envConfig = getEnvConfig();
const API = envConfig.apiUrl;

let token: string;

test.describe.configure({ mode: 'serial' });

test.describe('Core API Endpoints — Availability', () => {

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  test('Auth — obtain token for API tests', async ({ request }) => {
    const admin = getShakeoutAdmin();
    const res = await request.post(`${API}/auth/login`, {
      data: { email: admin.email, password: admin.password },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    token = body.accessToken;
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
  });

  test('GET /frameworks — returns list with required fields', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? [];
    expect(frameworks.length).toBeGreaterThan(0);

    // Each framework has required fields
    for (const fw of frameworks.slice(0, 5)) {
      expect(fw).toHaveProperty('id');
      expect(fw).toHaveProperty('name');
      expect(fw).toHaveProperty('sourceType');
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

  test('GET /users — returns user list', async ({ request }) => {
    const res = await request.get(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.data ?? [];
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toHaveProperty('id');
    expect(users[0]).toHaveProperty('email');
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
    // 200 = success, 403 = endpoint alive but permission restricted (still healthy)
    expect(res.status()).toBeLessThan(500);
  });

  test('API response time — no endpoint exceeds 5s', async ({ request }) => {
    const endpoints = ['/health', '/frameworks', '/audits', '/users', '/policies'];
    const slowEndpoints: string[] = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      const headers = endpoint === '/health' ? {} : { Authorization: `Bearer ${token}` };
      await request.get(`${API}${endpoint}`, { headers });
      const elapsed = Date.now() - start;

      if (elapsed > 5000) {
        slowEndpoints.push(`${endpoint} (${elapsed}ms)`);
      }
    }

    expect(
      slowEndpoints,
      `Slow endpoints: ${slowEndpoints.join(', ')}`,
    ).toHaveLength(0);
  });
});
