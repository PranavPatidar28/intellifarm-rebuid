import assert from "node:assert";
import { describe, it } from "node:test";
import { formatCurrency, formatDate, formatNumber } from "./format.ts";

describe("formatDate", () => {
  it("should return 'Not set' for null", () => {
    assert.strictEqual(formatDate(null), "Not set");
  });

  it("should return 'Not set' for undefined", () => {
    assert.strictEqual(formatDate(undefined), "Not set");
  });

  it("should return 'Not set' for empty string", () => {
    assert.strictEqual(formatDate(""), "Not set");
  });

  it("should format a date correctly in en-IN locale", () => {
    // Use year, month (0-indexed), day to be timezone-agnostic
    // January 1st, 2023
    const date = new Date(2023, 0, 1);
    const result = formatDate(date);
    // en-IN with day: numeric, month: short, year: numeric
    assert.match(result, /1 Jan 2023/);
  });

  it("should format a date string correctly", () => {
    // Use a string that includes time to avoid UTC parsing issues
    const result = formatDate("2023-05-20T12:00:00");
    assert.match(result, /20 May 2023/);
  });
});

describe("formatNumber", () => {
  it("should format numbers according to en-IN locale", () => {
    const result = formatNumber(100000);
    // en-IN uses 1,00,000 format
    // Using \u00A0 or \s for potential non-breaking spaces
    assert.match(result, /1,00,000/);
  });
});

describe("formatCurrency", () => {
  it("should format currency in INR", () => {
    const result = formatCurrency(5000);
    // Should include ₹ symbol and be formatted
    assert.match(result, /₹/);
    assert.match(result, /5,000/);
  });
});
