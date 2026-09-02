import { describe, expect, it } from "vitest";
import { TAG_PALETTE, groupColorFor, tagColorFor } from "./tagColor";

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

describe("groupColorFor", () => {
  it("gives each built-in slide-label preset a distinct color", () => {
    const presets = ["Verse", "Chorus", "Bridge", "Intro", "Outro"];
    const colors = presets.map((preset) => groupColorFor(preset));
    expect(new Set(colors).size).toBe(presets.length);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(groupColorFor("VERSE")).toBe(groupColorFor(" verse "));
  });

  it("falls back to the hashed tag color for non-preset labels", () => {
    expect(groupColorFor("Testimony")).toBe(tagColorFor("Testimony"));
  });

  it("falls back to the default color for blank/undefined labels", () => {
    expect(groupColorFor(undefined)).toBe(TAG_PALETTE[0]);
    expect(groupColorFor("   ")).toBe(TAG_PALETTE[0]);
  });
});
