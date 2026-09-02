import { describe, expect, it } from "vitest";
import { convert, parseStanzas, type LanguageBox } from "./convert";

describe("parseStanzas", () => {
  it("splits on blank-line runs and preserves internal line breaks", () => {
    expect(parseStanzas("line1\nline2\n\nline3")).toEqual([["line1", "line2"], ["line3"]]);
  });

  it("treats 2+ blank lines between stanzas as a single break (no phantom stanzas)", () => {
    // Acceptance test 5
    expect(parseStanzas("a\n\n\n\nb")).toEqual([["a"], ["b"]]);
  });

  it("trims leading/trailing blank lines", () => {
    expect(parseStanzas("\n\na\nb\n\n\n")).toEqual([["a", "b"]]);
  });

  it("returns no stanzas for empty input", () => {
    expect(parseStanzas("")).toEqual([]);
    expect(parseStanzas("   \n\n  ")).toEqual([]);
  });
});

describe("convert", () => {
  it("acceptance 1: two matching boxes, no codes, no groups", () => {
    const boxes: LanguageBox[] = [
      { label: "Tamil", text: "ta1a\nta1b\n\nta2a\n\nta3a" },
      { label: "English", text: "en1a\n\nen2a\n\nen3a" },
    ];
    const result = convert(boxes);
    expect(result.warnings).toEqual([]);
    expect(result.output).toBe(
      ["[#1]", "ta1a", "ta1b", "[#2]", "en1a"].join("\n") +
        "\n\n" +
        ["[#1]", "ta2a", "[#2]", "en2a"].join("\n") +
        "\n\n" +
        ["[#1]", "ta3a", "[#2]", "en3a"].join("\n"),
    );
    expect(result.output.endsWith("\n")).toBe(false);
  });

  it("acceptance 2: language codes produce [#N:code] markers", () => {
    const boxes: LanguageBox[] = [
      { label: "Tamil", code: "ta", text: "ta1" },
      { label: "English", code: "en", text: "en1" },
    ];
    const result = convert(boxes);
    expect(result.output).toBe(["[#1:ta]", "ta1", "[#2:en]", "en1"].join("\n"));
  });

  it("acceptance 3: three boxes number in order, reordering changes numbering", () => {
    const boxes: LanguageBox[] = [
      { label: "A", text: "a1" },
      { label: "B", text: "b1" },
      { label: "C", text: "c1" },
    ];
    const result = convert(boxes);
    expect(result.output).toBe(["[#1]", "a1", "[#2]", "b1", "[#3]", "c1"].join("\n"));

    const reordered = [boxes[2], boxes[0], boxes[1]];
    const reorderedResult = convert(reordered);
    expect(reorderedResult.output).toBe(["[#1]", "c1", "[#2]", "a1", "[#3]", "b1"].join("\n"));
  });

  it("acceptance 4: mismatched stanza counts warn and still emit an empty trailing textbox", () => {
    const boxA = Array.from({ length: 5 }, (_, i) => `a${i + 1}`).join("\n\n");
    const boxB = Array.from({ length: 4 }, (_, i) => `b${i + 1}`).join("\n\n");
    const boxes: LanguageBox[] = [
      { label: "Tamil", text: boxA },
      { label: "English", text: boxB },
    ];
    const result = convert(boxes);
    expect(result.stanzaCounts).toEqual([
      { label: "Tamil", count: 5 },
      { label: "English", count: 4 },
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Tamil: 5 stanzas");
    expect(result.warnings[0]).toContain("English: 4 stanzas");
    expect(result.firstMismatchIndex).toBe(4);

    const slides = result.output.split("\n\n");
    expect(slides).toHaveLength(5);
    expect(slides[4]).toBe("[#1]\na5\n[#2]");
  });

  it("acceptance 5: extra blank lines between stanzas don't create phantom stanzas", () => {
    const boxes: LanguageBox[] = [{ label: "A", text: "a1\n\n\n\na2" }];
    const result = convert(boxes);
    expect(result.stanzaCounts).toEqual([{ label: "A", count: 2 }]);
  });

  it("acceptance 7: a single language box still works as a slide splitter", () => {
    const boxes: LanguageBox[] = [{ label: "Only", text: "s1\n\ns2" }];
    const result = convert(boxes);
    expect(result.output).toBe(["[#1]", "s1"].join("\n") + "\n\n" + ["[#1]", "s2"].join("\n"));
  });

  it("acceptance 8: empty input in all boxes doesn't crash and yields empty output", () => {
    const boxes: LanguageBox[] = [
      { label: "A", text: "" },
      { label: "B", text: "" },
    ];
    const result = convert(boxes);
    expect(result.output).toBe("");
    expect(result.warnings).toEqual([]);
  });

  it("omits the :code suffix when no language code is set", () => {
    const boxes: LanguageBox[] = [{ label: "A", code: "", text: "x" }];
    const result = convert(boxes);
    expect(result.output).toBe("[#1]\nx");
  });

  it("emits metadata as Key=Value lines before the first slide", () => {
    const boxes: LanguageBox[] = [{ label: "A", text: "x" }];
    const result = convert(boxes, {
      metadata: { title: "Song Title", ccli: "1234567", copyright: "© 2011 Some Publisher", author: "John Doe | Jill Doe" },
    });
    expect(result.output).toBe(
      ["Title=Song Title", "Author=John Doe | Jill Doe", "CCLI=1234567", "Copyright=© 2011 Some Publisher", "", "[#1]", "x"].join("\n"),
    );
  });

  it("prepends a [GroupName] line for a labeled slide", () => {
    const boxes: LanguageBox[] = [{ label: "A", text: "x1\n\nx2" }];
    const result = convert(boxes, { groupLabels: ["Verse", "Chorus"] });
    const slides = result.output.split("\n\n");
    expect(slides[0]).toBe("[Verse]\n[#1]\nx1");
    expect(slides[1]).toBe("[Chorus]\n[#1]\nx2");
  });

  it("acceptance 9: a language code containing ']' produces a valid [#N:code] marker", () => {
    const boxes: LanguageBox[] = [{ label: "A", code: "en]", text: "x" }];
    const result = convert(boxes);
    expect(result.output).toBe("[#1:en]\nx");
  });

  it("acceptance 10: a group label containing ']' produces a valid [Group] line", () => {
    const boxes: LanguageBox[] = [{ label: "A", text: "x1" }];
    const result = convert(boxes, { groupLabels: ["Verse]"] });
    expect(result.output).toBe("[Verse]\n[#1]\nx1");
  });

  it("acceptance 11: a ':' in a language code or group label doesn't split into an extra marker segment", () => {
    const boxes: LanguageBox[] = [{ label: "A", code: "en:2", text: "x1" }];
    const result = convert(boxes, { groupLabels: ["Verse:1"] });
    expect(result.output).toBe("[Verse1]\n[#1:en2]\nx1");
  });

  it("acceptance 12: duplicate non-empty language codes across boxes trigger a warning naming both labels", () => {
    const boxes: LanguageBox[] = [
      { label: "English", code: "en", text: "e1" },
      { label: "Extra English", code: "en", text: "x1" },
    ];
    const result = convert(boxes);
    expect(result.warnings).toContain("Language code 'en' is used by more than one box (English, Extra English).");
  });

  it("acceptance 13: boxes with empty/unset codes don't trigger the duplicate-code warning", () => {
    const boxes: LanguageBox[] = [
      { label: "A", text: "a1" },
      { label: "B", code: "", text: "b1" },
    ];
    const result = convert(boxes);
    expect(result.warnings).toEqual([]);
  });
});
