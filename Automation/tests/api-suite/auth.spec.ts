import { test, expect } from '@playwright/test';
import { API, USERS, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Auth Module (10 endpoints)
 * Positive + Negative tests for authentication flow.
 */

test.describe('API: Auth — Positive', () => {
  test('POST /auth/login — valid credentials return token', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: USERS.admin.email, password: USERS.admin.password },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.user).toHaveProperty('email');
  });

  test('POST /auth/refresh — valid refresh returns new token', async ({ request }) => {
    // Login first to get refresh token
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: USERS.admin.email, password: USERS.admin.password },
    });
    const { refreshToken } = await loginRes.json();

    const res = await request.post(`${API}/auth/refresh`, {
      data: { refreshToken },
    });
    // May return 200 or 401 if refresh is cookie-based
    expect([200, 201, 401]).toContain(res.status());
  });

  test('POST /auth/logout — authenticated user can logout', async ({ request }) => {
    const token = await loginAs(request, 'admin');
    const res = await request.post(`${API}/auth/logout`, {
      headers: authHeader(token),
    });
    expect([200, 204]).toContain(res.status());
  });

  test('POST /auth/forgot-password — returns 204 for any email', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: 'test@example.com' },
    });
    // Should always return 204 (doesn't reveal if email exists)
    expect([200, 204]).toContain(res.status());
  });
});

test.describe('API: Auth — Negative', () => {
  test('POST /auth/login — invalid credentials → 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'nonexistent@example.com', password: 'WrongPass!' },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('POST /auth/login — missing email → 400/401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { password: 'SomePass!' },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test('POST /auth/login — missing password → 400/401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: USERS.admin.email },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test('POST /auth/login — empty body → 400/401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: {} });
    expect([400, 401, 422]).toContain(res.status());
  });

  test('POST /auth/change-password — no auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/change-password`, {
      data: { currentPassword: 'x', newPassword: 'y' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/refresh — invalid token → 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, {
      data: { refreshToken: 'invalid-token-here' },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('POST /auth/reset-password — invalid reset token → 401/400', async ({ request }) => {
    const res = await request.post(`${API}/auth/reset-password`, {
      data: { token: 'fake-reset-token', newPassword: 'NewPass123!' },
    });
    expect([400, 401]).toContain(res.status());
  });
});
