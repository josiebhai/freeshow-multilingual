import { convert, parseStanzas, type LanguageBox, type SongMetadata } from "../lib/convert";

interface BoxState extends LanguageBox {
  id: string;
}

interface State {
  boxes: BoxState[];
  metadata: SongMetadata;
  metadataOpen: boolean;
  /** Per-slide group label (e.g. "Verse"), indexed by slide index. */
  groupLabels: (string | undefined)[];
}

let nextId = 1;
const newId = () => `box-${nextId++}`;

const GROUP_LABEL_SUGGESTIONS = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Tag"];

function initialState(): State {
  return {
    boxes: [
      { id: newId(), label: "Language 1", code: "", text: "" },
      { id: newId(), label: "Language 2", code: "", text: "" },
    ],
    metadata: {},
    metadataOpen: false,
    groupLabels: [],
  };
}

function maxSlideCount(boxes: LanguageBox[]): number {
  return boxes.reduce((max, box) => Math.max(max, parseStanzas(box.text).length), 0);
}

export function mountApp(root: HTMLElement): void {
  const state = initialState();

  root.innerHTML = `
    <header class="app-header">
      <h1>FreeShow Multi-Language Lyrics Converter</h1>
      <p class="subtitle">
        Paste each language's lyrics into its own box. Get back text ready to paste into
        FreeShow's Quick Lyrics / Text edit box. Nothing you type here leaves your browser.
      </p>
    </header>

    <section class="metadata-section">
      <button type="button" id="metadata-toggle" class="link-button" aria-expanded="false" aria-controls="metadata-fields">
        + Add song details (optional)
      </button>
      <div id="metadata-fields" class="metadata-fields" hidden>
        <label>Title <input type="text" id="meta-title" /></label>
        <label>Author <input type="text" id="meta-author" /></label>
        <label>CCLI <input type="text" id="meta-ccli" /></label>
        <label>Copyright <input type="text" id="meta-copyright" /></label>
      </div>
    </section>

    <section id="boxes" class="boxes" aria-label="Language boxes"></section>

    <button type="button" id="add-box" class="secondary-button">+ Add language</button>

    <section id="slide-labels-section" class="slide-labels-section" hidden>
      <h2 class="slide-labels-heading">Slide labels (optional)</h2>
      <p class="subtitle">Name each slide (Verse, Chorus, Bridge...) — applies to every language on that slide.</p>
      <datalist id="group-label-suggestions">
        ${GROUP_LABEL_SUGGESTIONS.map((s) => `<option value="${escapeAttr(s)}"></option>`).join("")}
      </datalist>
      <div id="slide-labels" class="slide-labels"></div>
    </section>

    <section class="output-section">
      <div class="output-header">
        <h2>Output</h2>
        <div class="output-actions">
          <button type="button" id="copy-btn" class="primary-button" disabled>Copy to clipboard</button>
          <button type="button" id="download-btn" class="secondary-button" disabled>Download .txt</button>
        </div>
      </div>
      <div id="warnings" class="warnings" role="status" aria-live="polite"></div>
      <textarea id="output" class="output" readonly aria-label="Converted FreeShow text" placeholder="Paste lyrics above to see the converted output here."></textarea>
    </section>
  `;

  const boxesEl = root.querySelector<HTMLElement>("#boxes")!;
  const addBoxBtn = root.querySelector<HTMLButtonElement>("#add-box")!;
  const outputEl = root.querySelector<HTMLTextAreaElement>("#output")!;
  const warningsEl = root.querySelector<HTMLElement>("#warnings")!;
  const copyBtn = root.querySelector<HTMLButtonElement>("#copy-btn")!;
  const downloadBtn = root.querySelector<HTMLButtonElement>("#download-btn")!;
  const metadataToggle = root.querySelector<HTMLButtonElement>("#metadata-toggle")!;
  const metadataFields = root.querySelector<HTMLElement>("#metadata-fields")!;
  const metaTitle = root.querySelector<HTMLInputElement>("#meta-title")!;
  const metaAuthor = root.querySelector<HTMLInputElement>("#meta-author")!;
  const metaCcli = root.querySelector<HTMLInputElement>("#meta-ccli")!;
  const metaCopyright = root.querySelector<HTMLInputElement>("#meta-copyright")!;
  const slideLabelsSection = root.querySelector<HTMLElement>("#slide-labels-section")!;
  const slideLabelsEl = root.querySelector<HTMLElement>("#slide-labels")!;
  let renderedSlideCount = -1;

  metadataToggle.addEventListener("click", () => {
    state.metadataOpen = !state.metadataOpen;
    metadataFields.hidden = !state.metadataOpen;
    metadataToggle.setAttribute("aria-expanded", String(state.metadataOpen));
  });

  for (const [input, key] of [
    [metaTitle, "title"],
    [metaAuthor, "author"],
    [metaCcli, "ccli"],
    [metaCopyright, "copyright"],
  ] as const) {
    input.addEventListener("input", () => {
      state.metadata[key] = input.value;
      renderOutput();
    });
  }

  function renderBoxes() {
    boxesEl.innerHTML = "";
    state.boxes.forEach((box, index) => {
      const card = document.createElement("div");
      card.className = "box-card";
      card.innerHTML = `
        <div class="box-header">
          <label class="box-label-field">
            <span class="visually-hidden">Language label</span>
            <input type="text" class="box-label" value="${escapeAttr(box.label)}" aria-label="Language ${index + 1} label" />
          </label>
          <label class="box-code-field">
            <span class="visually-hidden">Language code</span>
            <input type="text" class="box-code" value="${escapeAttr(box.code ?? "")}" placeholder="code (e.g. en)" maxlength="8" aria-label="Language ${index + 1} code" />
          </label>
          <div class="box-controls">
            <button type="button" class="icon-button move-up" aria-label="Move ${escapeAttr(box.label)} up" ${index === 0 ? "disabled" : ""}>&uarr;</button>
            <button type="button" class="icon-button move-down" aria-label="Move ${escapeAttr(box.label)} down" ${index === state.boxes.length - 1 ? "disabled" : ""}>&darr;</button>
            <button type="button" class="icon-button remove-box" aria-label="Remove ${escapeAttr(box.label)}" ${state.boxes.length <= 1 ? "disabled" : ""}>&times;</button>
          </div>
        </div>
        <textarea class="box-text" aria-label="${escapeAttr(box.label)} lyrics" placeholder="Paste ${escapeAttr(box.label)} lyrics here. Separate verses/stanzas with a blank line.">${escapeHtml(box.text)}</textarea>
      `;

      card.querySelector<HTMLInputElement>(".box-label")!.addEventListener("input", (e) => {
        box.label = (e.target as HTMLInputElement).value;
        renderOutput();
      });
      card.querySelector<HTMLInputElement>(".box-code")!.addEventListener("input", (e) => {
        box.code = (e.target as HTMLInputElement).value;
        renderOutput();
      });
      card.querySelector<HTMLTextAreaElement>(".box-text")!.addEventListener("input", (e) => {
        box.text = (e.target as HTMLTextAreaElement).value;
        renderOutput();
      });
      card.querySelector<HTMLButtonElement>(".move-up")!.addEventListener("click", () => {
        if (index > 0) {
          [state.boxes[index - 1], state.boxes[index]] = [state.boxes[index], state.boxes[index - 1]];
          renderBoxes();
          renderOutput();
        }
      });
      card.querySelector<HTMLButtonElement>(".move-down")!.addEventListener("click", () => {
        if (index < state.boxes.length - 1) {
          [state.boxes[index + 1], state.boxes[index]] = [state.boxes[index], state.boxes[index + 1]];
          renderBoxes();
          renderOutput();
        }
      });
      card.querySelector<HTMLButtonElement>(".remove-box")!.addEventListener("click", () => {
        if (state.boxes.length > 1) {
          state.boxes.splice(index, 1);
          renderBoxes();
          renderOutput();
        }
      });

      boxesEl.appendChild(card);
    });
  }

  function renderSlideLabels() {
    const slideCount = maxSlideCount(state.boxes);
    slideLabelsSection.hidden = slideCount === 0;
    if (slideCount === renderedSlideCount) return;
    renderedSlideCount = slideCount;

    slideLabelsEl.innerHTML = "";
    for (let i = 0; i < slideCount; i++) {
      const row = document.createElement("label");
      row.className = "slide-label-row";
      row.innerHTML = `
        <span>Slide ${i + 1}</span>
        <input type="text" class="slide-label-input" list="group-label-suggestions"
          value="${escapeAttr(state.groupLabels[i] ?? "")}" placeholder="e.g. Verse"
          aria-label="Slide ${i + 1} group label" />
      `;
      row.querySelector<HTMLInputElement>(".slide-label-input")!.addEventListener("input", (e) => {
        state.groupLabels[i] = (e.target as HTMLInputElement).value;
        renderOutput();
      });
      slideLabelsEl.appendChild(row);
    }
  }

  function renderOutput() {
    const hasAnyText = state.boxes.some((box) => box.text.trim() !== "");
    const hasMetadata = Object.values(state.metadata).some((v) => v?.trim());

    renderSlideLabels();

    if (!hasAnyText && !hasMetadata) {
      outputEl.value = "";
      warningsEl.innerHTML = "";
      copyBtn.disabled = true;
      downloadBtn.disabled = true;
      return;
    }

    const result = convert(state.boxes, { metadata: state.metadata, groupLabels: state.groupLabels });
    outputEl.value = result.output;
    copyBtn.disabled = result.output === "";
    downloadBtn.disabled = result.output === "";

    warningsEl.innerHTML = "";
    for (const warning of result.warnings) {
      const div = document.createElement("div");
      div.className = "warning";
      div.textContent = `⚠ ${warning}`;
      warningsEl.appendChild(div);
    }
  }

  addBoxBtn.addEventListener("click", () => {
    const n = state.boxes.length + 1;
    state.boxes.push({ id: newId(), label: `Language ${n}`, code: "", text: "" });
    renderBoxes();
    renderOutput();
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(outputEl.value);
    } catch {
      outputEl.select();
      document.execCommand("copy");
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = original;
      copyBtn.classList.remove("copied");
    }, 1500);
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([outputEl.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = state.metadata.title?.trim() ? `${slugify(state.metadata.title)}.txt` : "freeshow-lyrics.txt";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  renderBoxes();
  renderOutput();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "freeshow-lyrics"
  );
}
