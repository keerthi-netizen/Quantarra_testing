import { test, expect } from '@playwright/test';
import { getTestUser, getEnvConfig } from '../../src/config/environment';

const envConfig = getEnvConfig();

test.describe('API: Authentication', () => {
  test('login returns valid access token', async ({ request }) => {
    const user = getTestUser('admin');
    const res = await request.post('/auth/login', {
      data: { email: user.email, password: user.password },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body.accessToken).toBeTruthy();
  });

  test('login rejects invalid credentials', async ({ request }) => {
    const res = await request.post('/auth/login', {
      data: { email: 'wrong@acme.com', password: 'WrongPass!' },
    });

    expect(res.status()).toBe(401);
  });
});

test.describe('API: Users', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const user = getTestUser('admin');
    const res = await request.post('/auth/login', {
      data: { email: user.email, password: user.password },
    });
    token = (await res.json()).accessToken;
  });

  test('GET /users returns user list with mfaEnabled', async ({ request }) => {
    const res = await request.get('/users', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    const users = data.data ?? data;
    expect(users.length).toBeGreaterThan(0);

    for (const user of users) {
      expect(user).toHaveProperty('mfaEnabled');
      expect(typeof user.mfaEnabled).toBe('boolean');
    }
  });

  test('GET /users/me returns current user profile', async ({ request }) => {
    const res = await request.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('orgId');
  });
});

test.describe('API: Audits', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const user = getTestUser('admin');
    const res = await request.post('/auth/login', {
      data: { email: user.email, password: user.password },
    });
    token = (await res.json()).accessToken;
  });

  test('GET /audits returns audit list', async ({ request }) => {
    const res = await request.get('/audits', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    const audits = Array.isArray(data) ? data : data.data ?? [];
    expect(audits).toBeInstanceOf(Array);
  });

  test('GET /frameworks returns available frameworks', async ({ request }) => {
    const res = await request.get('/frameworks', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
  });
});
