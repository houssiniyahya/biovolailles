import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("treats the home page as public", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("treats /login and its sub-paths as public", () => {
    expect(isPublicPath("/login")).toBe(true);
  });

  it("treats /tracabilite/:token as public (QR passport)", () => {
    expect(isPublicPath("/tracabilite/abc123")).toBe(true);
  });

  it("treats everything else as protected, including near-miss prefixes", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/lots/42")).toBe(false);
    expect(isPublicPath("/logindecoy")).toBe(false);
  });
});
