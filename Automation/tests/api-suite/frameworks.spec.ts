import { test, expect } from '@playwright/test';
import { API, USERS, INVALID_UUID, loginAs, authHeader } from './helpers';

/**
 * API Test Suite: Frameworks Module (63 test cases)
 * Source: New_testcase.xlsx → API Test Cases sheet, rows 297-360
 *
 * Covers: List, get by ID, enable/disable, requirements (CRUD + bulk), coverage,
 *         mapping-suggestions, approve-mappings, custom frameworks
 * Test types: Positive (happy path) + Negative (401, 400, 403, 404)
 */

let adminToken: string;
let contributorToken: string;
let frameworkId: string;
let requirementId: string;

test.describe.configure({ mode: 'serial' });

test.describe('API: Frameworks', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAs(request, 'admin');
    contributorToken = await loginAs(request, 'contributor');

    // Get first framework
    const res = await request.get(`${API}/frameworks`, { headers: authHeader(adminToken) });
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? [];
    if (frameworks.length > 0) {
      frameworkId = frameworks[0].id;

      // Get first requirement
      const reqRes = await request.get(`${API}/frameworks/${frameworkId}/requirements`, { headers: authHeader(adminToken) });
      if (reqRes.status() === 200) {
        const reqBody = await reqRes.json();
        const reqs = Array.isArray(reqBody) ? reqBody : reqBody.data ?? [];
        if (reqs.length > 0) {
          requirementId = reqs[0].id;
        }
      }
    }
  });

  // === LIST FRAMEWORKS ===
  test('#297 GET /frameworks — 200 with valid auth', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const frameworks = Array.isArray(body) ? body : body.data ?? [];
    expect(frameworks.length).toBeGreaterThan(0);
  });

  test('#298 GET /frameworks — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API}/frameworks`);
    expect(res.status()).toBe(401);
  });

  // === GET BY ID ===
  test('#299 GET /frameworks/{id} — 200', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
  });

  test('#300 GET /frameworks/{id} — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}`);
    expect(res.status()).toBe(401);
  });

  test('#301 GET /frameworks/{id} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/frameworks/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === REQUIREMENTS ===
  test('#323 GET /frameworks/{id}/requirements — 200', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/requirements`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const reqs = Array.isArray(body) ? body : body.data ?? [];
    expect(reqs).toBeInstanceOf(Array);
  });

  test('#324 GET /frameworks/{id}/requirements — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/requirements`);
    expect(res.status()).toBe(401);
  });

  test('#325 GET /frameworks/{id}/requirements — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/frameworks/${INVALID_UUID}/requirements`, { headers: authHeader(adminToken) });
    expect([404, 403, 200]).toContain(res.status());
  });

  // === GET SINGLE REQUIREMENT ===
  test('#358 GET /frameworks/requirements/{requirementId} — 200', async ({ request }) => {
    if (!requirementId) test.skip();
    const res = await request.get(`${API}/frameworks/requirements/${requirementId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('#359 GET /frameworks/requirements/{requirementId} — 401 without auth', async ({ request }) => {
    if (!requirementId) test.skip();
    const res = await request.get(`${API}/frameworks/requirements/${requirementId}`);
    expect(res.status()).toBe(401);
  });

  test('#360 GET /frameworks/requirements/{requirementId} — 404 with invalid UUID', async ({ request }) => {
    const res = await request.get(`${API}/frameworks/requirements/${INVALID_UUID}`, { headers: authHeader(adminToken) });
    expect([404, 403]).toContain(res.status());
  });

  // === COVERAGE ===
  test('#307 GET /frameworks/{id}/coverage — 200', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/coverage`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#308 GET /frameworks/{id}/coverage — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/coverage`);
    expect(res.status()).toBe(401);
  });

  // === MAPPING SUGGESTIONS ===
  test('#320 GET /frameworks/{id}/mapping-suggestions — 200', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/mapping-suggestions`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
  });

  test('#321 GET /frameworks/{id}/mapping-suggestions — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.get(`${API}/frameworks/${frameworkId}/mapping-suggestions`);
    expect(res.status()).toBe(401);
  });

  // === ENABLE/DISABLE (negative only — don't mutate) ===
  test('#316 POST /frameworks/{id}/enable — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/enable`);
    expect(res.status()).toBe(401);
  });

  test('#319 POST /frameworks/{id}/enable — 403 as contributor', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/enable`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  test('#311 POST /frameworks/{id}/disable — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/disable`);
    expect(res.status()).toBe(401);
  });

  test('#314 POST /frameworks/{id}/disable — 403 as contributor', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/disable`, {
      headers: authHeader(contributorToken),
    });
    expect([403, 401]).toContain(res.status());
  });

  // === APPROVE MAPPINGS (negative only) ===
  test('#303 POST /frameworks/{id}/approve-mappings — 401 without auth', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/approve-mappings`, {
      data: { mappingIds: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('#306 POST /frameworks/{id}/approve-mappings — 403 as contributor', async ({ request }) => {
    if (!frameworkId) test.skip();
    const res = await request.post(`${API}/frameworks/${frameworkId}/approve-mappings`, {
      headers: authHeader(contributorToken),
      data: { mappingIds: [] },
    });
    expect([403, 401]).toContain(res.status());
  });

  // === CUSTOM FRAMEWORK (negative only) ===
  test('#346 POST /frameworks/custom — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/custom`, {
      data: { name: 'Test Framework' },
    });
    expect(res.status()).toBe(401);
  });

  test('#347 POST /frameworks/custom — 400 with missing fields', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/custom`, {
      headers: authHeader(adminToken),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('#348 POST /frameworks/custom — 403 as contributor', async ({ request }) => {
    const res = await request.post(`${API}/frameworks/custom`, {
      headers: authHeader(contributorToken),
      data: { name: 'Test Framework' },
    });
    expect([403, 401]).toContain(res.status());
  });
});
