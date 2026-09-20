import { sealData, unsealData } from "iron-session";
import { describe, expect, it } from "vitest";
import { sessionOptions } from "./config";

/**
 * Exercises the actual encryption round-trip the session cookie goes through,
 * without needing a real Next.js request (next/headers' cookies() only works
 * inside one). getCurrentSession()/login() build on exactly this primitive.
 */
describe("session sealing (iron-session)", () => {
  const password = sessionOptions.password as string;

  it("round-trips session data through seal/unseal", async () => {
    const payload = { userId: "user-1", role: "SUPER_ADMIN", scopeType: "GLOBAL", scopeId: null };
    const sealed = await sealData(payload, { password, ttl: sessionOptions.ttl });
    const unsealed = await unsealData(sealed, { password, ttl: sessionOptions.ttl });
    expect(unsealed).toEqual(payload);
  });

  it("resolves a wrong-password unseal to an empty session rather than throwing", async () => {
    // iron-session deliberately swallows bad-hmac/wrong-password/expired errors and returns {}
    // (a tampered or stale cookie degrades to "logged out", not a crash) — see iron-session's
    // unsealData source (createUnsealData) for the exact error messages it catches.
    const payload = { userId: "user-1" };
    const sealed = await sealData(payload, { password });
    const unsealed = await unsealData<{ userId?: string }>(sealed, {
      password: "a-completely-different-32-char-password!!",
    });
    expect(unsealed).toEqual({});
  });

  it("treats an empty payload as an unauthenticated session", async () => {
    const sealed = await sealData({}, { password });
    const unsealed = await unsealData<{ userId?: string }>(sealed, { password });
    expect(unsealed.userId).toBeUndefined();
  });
});
