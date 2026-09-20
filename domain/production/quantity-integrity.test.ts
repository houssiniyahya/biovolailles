import { describe, expect, it } from "vitest";
import { validateFeedStockBalance, validateProcessingYield, validateTransferQuantity } from "./quantity-integrity";

describe("validateTransferQuantity", () => {
  it("accepts a transfer within the available quantity", () => {
    expect(validateTransferQuantity(100, 50).ok).toBe(true);
  });

  it("rejects a transfer exceeding the available quantity", () => {
    expect(validateTransferQuantity(100, 150).ok).toBe(false);
  });

  it("rejects a non-positive transfer", () => {
    expect(validateTransferQuantity(100, 0).ok).toBe(false);
  });
});

describe("validateProcessingYield", () => {
  it("accepts output + losses + rejects equalling the incoming quantity", () => {
    expect(validateProcessingYield(100, 80, 15, 5).ok).toBe(true);
  });

  it("rejects a mismatched balance", () => {
    expect(validateProcessingYield(100, 80, 10, 5).ok).toBe(false);
  });
});

describe("validateFeedStockBalance", () => {
  it("accepts initial + entries - consumption = final", () => {
    expect(validateFeedStockBalance(1000, 500, 300, 1200).ok).toBe(true);
  });

  it("rejects a mismatched final stock", () => {
    expect(validateFeedStockBalance(1000, 500, 300, 1000).ok).toBe(false);
  });
});
