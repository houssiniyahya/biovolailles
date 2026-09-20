import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the correct password against its own hash", () => {
    const hash = hashPassword("Demo1234!");
    expect(verifyPassword("Demo1234!", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("Demo1234!");
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashPassword("Demo1234!");
    const b = hashPassword("Demo1234!");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored hashes instead of throwing", () => {
    expect(verifyPassword("Demo1234!", "not-a-valid-hash")).toBe(false);
  });
});
