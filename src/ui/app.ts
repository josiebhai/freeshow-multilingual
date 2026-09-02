import { convert, parseStanzas, type LanguageBox, type SongMetadata } from "../lib/convert";
import { groupColorFor, tagColorForIndex } from "../lib/tagColor";

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

const GROUP_LABEL_PRESETS = ["Verse", "Chorus", "Bridge", "Intro", "Outro"];

const REPO_URL = "https://github.com/josiebhai/freeshow-multilingual";
const BUG_REPORT_URL = `${REPO_URL}/issues/new?template=bug_report.md`;
const FEATURE_REQUEST_URL = `${REPO_URL}/issues/new?template=feature_request.md`;

const ICONS = {
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
  remove: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.4 9.4 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>`,
  bug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>`,
  feature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.6.55 1 1.36 1 2.2V15h6v-.3c0-.84.4-1.65 1-2.2A6 6 0 0 0 12 2Z"/></svg>`,
};

const LOGO_SVG = `
  <svg class="app-logo" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="5" fill="#F0008C"/>
    <rect x="4" y="7" width="16" height="10" rx="3" fill="#B4005F"/>
    <rect x="7" y="9.3" width="10" height="5.4" rx="1.4" fill="#1B1E27"/>
  </svg>
`;

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What does this tool actually produce?",
    answer:
      "Plain text formatted with FreeShow's multi-language markers (like <code>[#1:en]</code>), ready to paste straight into FreeShow's Quick Lyrics / Text edit box.",
  },
  {
    question: "What should I put in the language code field?",
    answer:
      "A short ISO 639-1 code — <code>en</code>, <code>es</code>, <code>fr</code>, <code>de</code>, <code>pt</code> — FreeShow uses it to label each language layer. It's optional — leave it blank for a plain <code>[#1]</code> marker. Each language box gets its own color by position (1st, 2nd, 3rd...), so boxes stay easy to tell apart in the output even without a code.",
  },
  {
    question: "Is any of my data stored or uploaded?",
    answer:
      "No. There's no backend and no analytics — everything you type stays in this browser tab and disappears when you close it.",
  },
  {
    question: "Is this an official FreeShow product?",
    answer:
      "No — it's an independent companion tool built to work around a pending FreeShow feature request, not affiliated with or endorsed by the FreeShow project.",
  },
];

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
      ${LOGO_SVG}
      <h1>FreeShow Multi-Language Lyrics Converter</h1>
    </header>
    <p class="subtitle">
      Paste each language's lyrics into its own box. Get back text ready to paste into
      FreeShow's Quick Lyrics / Text edit box. Nothing you type here leaves your browser.
    </p>

    <section class="metadata-section">
      <button type="button" id="metadata-toggle" class="link-button" aria-expanded="false" aria-controls="metadata-fields" data-tip="Title, author, CCLI, copyright">
        ${ICONS.plus}
        Add song details (optional)
      </button>
      <div id="metadata-fields" class="metadata-fields" hidden>
        <label>Title <input type="text" id="meta-title" /></label>
        <label>Author <input type="text" id="meta-author" /></label>
        <label>CCLI <input type="text" id="meta-ccli" /></label>
        <label>Copyright <input type="text" id="meta-copyright" /></label>
      </div>
    </section>

    <section id="boxes" class="boxes" aria-label="Language boxes"></section>

    <button type="button" id="add-box" class="add-lang-button" data-tip="Add another language box">${ICONS.plus} Add language</button>

    <section id="slide-labels-section" class="slide-labels-section" hidden>
      <h2 class="slide-labels-heading">Slide labels (optional)</h2>
      <p class="subtitle">Name each slide (Verse, Chorus, Bridge...) — applies to every language on that slide.</p>
      <div id="slide-labels" class="slide-labels"></div>
    </section>

    <section class="output-section">
      <div class="output-header">
        <h2>Output</h2>
        <div class="output-actions">
          <button type="button" id="copy-btn" class="primary-button" disabled data-tip="Copies the text below">${ICONS.copy} Copy to clipboard</button>
          <button type="button" id="download-btn" class="secondary-button" disabled data-tip="Saves as a .txt file">${ICONS.download} Download .txt</button>
        </div>
      </div>
      <div id="warnings" class="warnings" role="status" aria-live="polite"></div>
      <div id="output" class="output" role="textbox" aria-readonly="true" aria-multiline="true" tabindex="0" aria-label="Converted FreeShow text"></div>
    </section>

    <section class="faq-section" aria-label="Frequently asked questions">
      <h2>FAQ</h2>
      <div class="faq-list">
        ${FAQ_ITEMS.map(
          (item) => `
          <details class="faq">
            <summary>${escapeHtml(item.question)}${ICONS.chevron}</summary>
            <p>${item.answer}</p>
          </details>
        `,
        ).join("")}
      </div>
    </section>

    <footer class="app-footer">
      <span>Not affiliated with or endorsed by FreeShow.</span>
      <div class="footer-links">
        <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">${ICONS.github} GitHub repo</a>
        <a href="${BUG_REPORT_URL}" target="_blank" rel="noopener noreferrer">${ICONS.bug} Report a bug</a>
        <a href="${FEATURE_REQUEST_URL}" target="_blank" rel="noopener noreferrer">${ICONS.feature} Request a feature</a>
      </div>
    </footer>
  `;

  const OUTPUT_PLACEHOLDER = "Paste lyrics above to see the converted output here.";

  const boxesEl = root.querySelector<HTMLElement>("#boxes")!;
  const addBoxBtn = root.querySelector<HTMLButtonElement>("#add-box")!;
  const outputEl = root.querySelector<HTMLElement>("#output")!;
  let lastOutputText = "";
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
      const tagColor = tagColorForIndex(index);
      card.innerHTML = `
        <div class="box-header">
          <label class="box-label-field">
            <span class="visually-hidden">Language label</span>
            <input type="text" class="box-label" value="${escapeAttr(box.label)}" aria-label="Language ${index + 1} label" />
          </label>
          <label class="box-code-field">
            <span class="visually-hidden">Language code</span>
            <span class="tag tag-${tagColor}" data-tip="ISO code, e.g. en (optional)">
              <input type="text" class="box-code tag-input" value="${escapeAttr(box.code ?? "")}" placeholder="code" maxlength="8" aria-label="Language ${index + 1} code" />
            </span>
          </label>
          <div class="box-controls">
            <button type="button" class="icon-button move-up" data-tip="Move up" aria-label="Move ${escapeAttr(box.label)} up" ${index === 0 ? "disabled" : ""}>${ICONS.up}</button>
            <button type="button" class="icon-button move-down" data-tip="Move down" aria-label="Move ${escapeAttr(box.label)} down" ${index === state.boxes.length - 1 ? "disabled" : ""}>${ICONS.down}</button>
            <button type="button" class="icon-button remove-box" data-tip="Remove language" aria-label="Remove ${escapeAttr(box.label)}" ${state.boxes.length <= 1 ? "disabled" : ""}>${ICONS.remove}</button>
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
      const currentValue = state.groupLabels[i] ?? "";

      const row = document.createElement("div");
      row.className = "slide-label-row";
      row.innerHTML = `
        <label>
          <span>Slide ${i + 1}</span>
          <div class="combobox">
            <div class="slide-tag-field">
              <span class="slide-color-dot" aria-hidden="true"></span>
              <input type="text" class="slide-label-input" value="${escapeAttr(currentValue)}"
                placeholder="e.g. Verse" autocomplete="off" role="combobox" aria-autocomplete="list"
                aria-expanded="false" aria-label="Slide ${i + 1} group label" />
            </div>
            <ul class="slide-label-suggestions" role="listbox" hidden></ul>
          </div>
        </label>
      `;

      const input = row.querySelector<HTMLInputElement>(".slide-label-input")!;
      const suggestionsEl = row.querySelector<HTMLUListElement>(".slide-label-suggestions")!;
      const dot = row.querySelector<HTMLElement>(".slide-color-dot")!;

      function updateDot(label: string) {
        const trimmed = label.trim();
        if (!trimmed) {
          dot.style.background = "var(--fg-dim)";
          dot.style.opacity = "0.35";
        } else {
          dot.style.background = `var(--tag-${groupColorFor(trimmed)}-fg)`;
          dot.style.opacity = "1";
        }
      }
      updateDot(currentValue);

      function showSuggestions() {
        const query = input.value.trim().toLowerCase();
        const matches = GROUP_LABEL_PRESETS.filter((preset) => preset.toLowerCase().includes(query));
        if (matches.length === 0) {
          suggestionsEl.hidden = true;
          input.setAttribute("aria-expanded", "false");
          return;
        }
        suggestionsEl.innerHTML = matches
          .map((preset) => `<li role="option"><button type="button" class="slide-label-suggestion">${escapeHtml(preset)}</button></li>`)
          .join("");
        suggestionsEl.hidden = false;
        input.setAttribute("aria-expanded", "true");
        suggestionsEl.querySelectorAll<HTMLButtonElement>(".slide-label-suggestion").forEach((btn, idx) => {
          // mousedown fires before the input's blur, so the click isn't lost
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            input.value = matches[idx];
            state.groupLabels[i] = matches[idx];
            updateDot(input.value);
            suggestionsEl.hidden = true;
            input.setAttribute("aria-expanded", "false");
            renderOutput();
          });
        });
      }

      input.addEventListener("focus", showSuggestions);
      input.addEventListener("input", () => {
        state.groupLabels[i] = input.value;
        updateDot(input.value);
        showSuggestions();
        renderOutput();
      });
      input.addEventListener("blur", () => {
        setTimeout(() => {
          suggestionsEl.hidden = true;
          input.setAttribute("aria-expanded", "false");
        }, 150);
      });

      slideLabelsEl.appendChild(row);
    }
  }

  function renderOutput() {
    const hasAnyText = state.boxes.some((box) => box.text.trim() !== "");
    const hasMetadata = Object.values(state.metadata).some((v) => v?.trim());

    renderSlideLabels();

    if (!hasAnyText && !hasMetadata) {
      lastOutputText = "";
      outputEl.innerHTML = `<span class="output-placeholder">${escapeHtml(OUTPUT_PLACEHOLDER)}</span>`;
      warningsEl.innerHTML = "";
      copyBtn.disabled = true;
      downloadBtn.disabled = true;
      return;
    }

    const result = convert(state.boxes, { metadata: state.metadata, groupLabels: state.groupLabels });
    lastOutputText = result.output;
    outputEl.innerHTML =
      result.output === ""
        ? `<span class="output-placeholder">${escapeHtml(OUTPUT_PLACEHOLDER)}</span>`
        : renderOutputHtml(result.output);
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
      await navigator.clipboard.writeText(lastOutputText);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = lastOutputText;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }
    const original = copyBtn.innerHTML;
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.innerHTML = original;
      copyBtn.classList.remove("copied");
    }, 1500);
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([lastOutputText], { type: "text/plain;charset=utf-8" });
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

/** Colors `[#N:code]` language markers and `[Group]` slide labels for display. Copy/download always use the plain source text. */
function renderOutputHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\[#(\d+)(?::.+)?\]$/);
      if (marker) {
        const boxIndex = Number(marker[1]) - 1;
        return `<span class="out-marker tag-${tagColorForIndex(boxIndex)}-fg">${escapeHtml(line)}</span>`;
      }
      const group = line.match(/^\[(.+)\]$/);
      if (group) {
        return `<span class="out-marker tag-${groupColorFor(group[1])}-fg">${escapeHtml(line)}</span>`;
      }
      return escapeHtml(line);
    })
    .join("\n");
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
