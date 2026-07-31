import { getEnvConfig } from '../../src/config/environment';

/**
 * API Test Suite — shared helpers and test data.
 */

const envConfig = getEnvConfig();
export const API = envConfig.apiUrl;

/** Test credentials */
export const USERS = {
  admin: { email: 'keerthikumar.kothandapani@gmail.com', password: 'Quantarra2026!' },
  contributor: { email: 'prasanna.d@keystoneeng.in', password: 'Quantarra2026!' },
  viewer: { email: 'matric.viewer@keystoneeng.in', password: 'Quantarra2026!' },
};

/** Non-existent UUID for 404 tests */
export const INVALID_UUID = '00000000-0000-0000-0000-000000000000';

/** Malformed UUID for 400 tests */
export const MALFORMED_UUID = 'not-a-uuid';

/** Login and return access token */
export async function loginAs(request: any, role: 'admin' | 'contributor' | 'viewer'): Promise<string> {
  const user = USERS[role];
  let res = await request.post(`${API}/auth/login`, {
    data: { email: user.email, password: user.password },
  });

  // Retry if rate limited
  if (res.status() === 429) {
    await new Promise((r) => setTimeout(r, 3000));
    res = await request.post(`${API}/auth/login`, {
      data: { email: user.email, password: user.password },
    });
  }

  const body = await res.json();
  return body.accessToken;
}

/** Auth header helper */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
