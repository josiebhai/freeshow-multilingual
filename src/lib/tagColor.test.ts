import { describe, expect, it } from "vitest";
import { TAG_PALETTE, tagColorFor } from "./tagColor";

describe("tagColorFor", () => {
  it("is deterministic for the same code", () => {
    expect(tagColorFor("en")).toBe(tagColorFor("en"));
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(tagColorFor("EN")).toBe(tagColorFor(" en "));
  });

  it("falls back to the default color for blank/undefined codes", () => {
    expect(tagColorFor(undefined)).toBe(TAG_PALETTE[0]);
    expect(tagColorFor("   ")).toBe(TAG_PALETTE[0]);
  });

  it("only ever returns a palette color", () => {
    for (const code of ["en", "es", "fr", "de", "pt", "zh", "ar", "ta", "hi"]) {
      expect(TAG_PALETTE).toContain(tagColorFor(code));
    }
  });
});
