import { describe, expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { requireSameOrigin } from "./csrf.js";
import { consumeRate, rateLimit } from "./rate-limit.js";
import { authCookieValue } from "../utils/cookies.js";
import { environment } from "../config/env.js";
import { publicSubmit } from "../controllers/privacy.controller.js";

function response() {
  const headers: Record<string, string> = {};
  const state = { code: 200, body: null as unknown, headers };
  const res = {
    setHeader: (key: string, value: string) => { headers[key] = value; },
    status: (code: number) => { state.code = code; return res; },
    json: (body: unknown) => { state.body = body; return res; },
  };
  return { state, res: res as unknown as Response };
}

describe("HTTP security controls", () => {
  test("production cookies are secure and platform sessions expire sooner", () => {
    expect(authCookieValue("token", "SUPER_ADMIN", true)).toContain("Secure");
    expect(authCookieValue("token", "SUPER_ADMIN", true)).toContain("Max-Age=28800");
    expect(authCookieValue("token", "SUPER_ADMIN", true)).toContain("HttpOnly; SameSite=Lax; Secure");
    expect(authCookieValue("token", "AGENT", false)).not.toContain("Secure");
  });

  test("malformed public privacy requests are rejected before database access", () => {
    for (const body of [{}, { type: "ACCESS", subjectName: "Asha Shah", bookingPnr: "ABCD", contactEmail: "bad" }]) {
      const { state, res } = response();
      publicSubmit({ body } as Request, res);
      expect(state.code).toBe(400);
    }
  });

  test("cookie-authenticated writes reject a missing or foreign origin", () => {
    for (const origin of [undefined, "https://attacker.example"]) {
      const { state, res } = response();
      let passed = false;
      const req = { method: "POST", headers: { cookie: "aone_session=token" }, get: () => origin } as unknown as Request;
      requireSameOrigin(req, res, (() => { passed = true; }) as NextFunction);
      expect(state.code).toBe(403);
      expect(passed).toBe(false);
    }
    const { res } = response();
    let passed = false;
    const req = { method: "POST", headers: { cookie: "aone_session=token" }, get: () => new URL(environment.WEB_URL).origin } as unknown as Request;
    requireSameOrigin(req, res, (() => { passed = true; }) as NextFunction);
    expect(passed).toBe(true);
  });

  test("rate limit returns 429 after threshold and accepts a new window", async () => {
    let count = 0;
    const limiter = rateLimit("test", 2, 60, () => "client", async () => ++count);
    const req = { ip: "127.0.0.1" } as Request;
    for (const expected of [200, 200, 429]) {
      const { state, res } = response();
      let passed = false;
      await limiter(req, res, (() => { passed = true; }) as NextFunction);
      expect(state.code).toBe(expected);
      expect(passed).toBe(expected === 200);
    }
    count = 0;
    const { state, res } = response();
    await limiter(req, res, (() => undefined) as NextFunction);
    expect(state.code).toBe(200);
  });

  test("process-local counters work without an external service", async () => {
    const key = `test:${crypto.randomUUID()}`;
    expect(await consumeRate(key, 60)).toBe(1);
    expect(await consumeRate(key, 60)).toBe(2);
  });
});
