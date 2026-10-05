import { describe, it, expect } from "vitest";

import { Result } from "../result.js";

describe("Result Class", () => {
  it("should create a successful result", () => {
    const result = Result.ok<number>(42);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBe(42);
    expect(() => result.error).toThrow("Cannot access error of a successful Result");
  });

  it("should create a failed result", () => {
    const error = new Error("Something went wrong");
    const result = Result.fail<number>(error);

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(error);
    expect(() => result.value).toThrow("Cannot access value of a failed Result");
  });

  it("should correctly map value on success", () => {
    const result = Result.ok(10).map((x) => x * 2);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(20);
  });

  it("should correctly map error on failure", () => {
    const result = Result.fail("error_code").mapError((err) => err.toUpperCase());

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("ERROR_CODE");
  });
});
