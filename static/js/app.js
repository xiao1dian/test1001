const form = document.getElementById("research-form");
const topicInput = document.getElementById("topic");
const languageSelect = document.getElementById("language");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const btnSpinner = submitBtn.querySelector(".btn-spinner");
const loadingPanel = document.getElementById("loading-panel");
const loadingStep = document.getElementById("loading-step");
const loadingBarFill = document.getElementById("loading-bar-fill");
const errorBanner = document.getElementById("error-banner");
const resultsSection = document.getElementById("results");
const emptyState = document.getElementById("empty-state");
const resultsTitle = document.getElementById("results-title");
const resultsLang = document.getElementById("results-lang");
const resultsCount = document.getElementById("results-count");
const resultsArgs = document.getElementById("results-args");
const institutionBadges = document.getElementById("institution-badges");
const overviewContent = document.getElementById("overview-content");
const blockText = document.getElementById("block-text");
const affirmativeList = document.getElementById("affirmative-list");
const negativeList = document.getElementById("negative-list");
const statisticsList = document.getElementById("statistics-list");
const sourcesList = document.getElementById("sources-list");
const sourceFilter = document.getElementById("source-filter");
const copyBlocksBtn = document.getElementById("copy-blocks");
const downloadBlocksBtn = document.getElementById("download-blocks");
const speechSidebar = document.getElementById("speech-sidebar");
const mobileSpeechBtn = document.getElementById("mobile-speech-btn");
const debateFormatSelect = document.getElementById("debate-format");
const speechTypeSelect = document.getElementById("speech-type");
const speechSideSelect = document.getElementById("speech-side");
const generateSpeechBtn = document.getElementById("generate-speech-btn");
const speechOutput = document.getElementById("speech-output");
const speechLabel = document.getElementById("speech-label");
const speechStats = document.getElementById("speech-stats");
const speechText = document.getElementById("speech-text");
const copySpeechBtn = document.getElementById("copy-speech-btn");
const downloadSpeechBtn = document.getElementById("download-speech-btn");
const feedbackSpeechBtn = document.getElementById("feedback-speech-btn");
const feedbackInput = document.getElementById("feedback-input");
const analyzeFeedbackBtn = document.getElementById("analyze-feedback-btn");
const feedbackOutput = document.getElementById("feedback-output");
const speechEnhancedBadge = document.getElementById("speech-enhanced-badge");

let lastSpeechMeta = null;
let aiCoachEnabled = false;

const tabCounts = {
  aff: document.getElementById("tab-count-aff"),
  neg: document.getElementById("tab-count-neg"),
  stats: document.getElementById("tab-count-stats"),
  sources: document.getElementById("tab-count-sources"),
};

let lastResearchData = null;
let allSources = [];
let formatCatalog = {};
let loadingInterval = null;

const LOADING_STEPS = [
  "Querying encyclopedic databases…",
  "Retrieving university research archives…",
  "Accessing policy institute publications…",
  "Structuring affirmative and opposition blocks…",
  "Compiling citations and bibliography…",
];

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnLabel.classList.toggle("hidden", loading);
  btnSpinner.classList.toggle("hidden", !loading);
  loadingPanel.classList.toggle("hidden", !loading);

  if (loading) {
    resultsSection.classList.add("hidden");
    emptyState.classList.add("hidden");
    let step = 0;
    loadingBarFill.style.width = "5%";
    loadingStep.textContent = LOADING_STEPS[0];
    loadingInterval = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      loadingStep.textContent = LOADING_STEPS[step];
      loadingBarFill.style.width = `${Math.min(15 + step * 18, 92)}%`;
    }, 2200);
  } else {
    clearInterval(loadingInterval);
    loadingBarFill.style.width = "100%";
  }
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideError() {
  errorBanner.classList.add("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

function setTabCount(el, n) {
  if (!el) return;
  if (n > 0) {
    el.textContent = n;
    el.style.display = "inline-flex";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

async function copyText(text, btn, okLabel, defaultLabel) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = okLabel;
    setTimeout(() => { btn.textContent = defaultLabel; }, 2000);
  } catch {
    btn.textContent = "Copy failed";
  }
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderArgumentList(listEl, items, side) {
  listEl.innerHTML = "";
  if (!items || items.length === 0) {
    listEl.innerHTML = "<li class='empty-msg'><p>No points extracted — try a more specific debate resolution.</p></li>";
    return;
  }
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = side === "aff" ? "arg-aff" : "arg-neg";
    const copyPayload = `${item.point}\n\n${item.evidence}\n\nSource: ${item.source_title || ""} ${item.source_url || ""}`;
    li.innerHTML = `
      <div class="arg-number">${idx + 1}</div>
      <div class="arg-body">
        <div class="arg-head">
          <strong>${escapeHtml(item.point)}</strong>
          <button type="button" class="copy-arg-btn" title="Copy this argument">Copy</button>
        </div>
        <p class="arg-evidence">${escapeHtml(item.evidence)}</p>
        <div class="arg-source">
          <span class="inst-pill">${escapeHtml(item.institution || "Source")}</span>
          ${item.source_url ? `<a href="${escapeAttr(item.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.source_title || "View source")}</a>` : ""}
        </div>
      </div>
    `;
    li.querySelector(".copy-arg-btn").addEventListener("click", (e) => {
      copyText(copyPayload, e.target, "Copied", "Copy");
    });
    listEl.appendChild(li);
  });
}

function renderStatistics(items) {
  statisticsList.innerHTML = "";
  if (!items || items.length === 0) {
    statisticsList.innerHTML = "<li class='empty-msg'><p>No statistics found for this topic.</p></li>";
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${escapeHtml(item.stat)}</strong>
      <p class="arg-evidence">${escapeHtml(item.context)}</p>
      <div class="arg-source">
        <span class="inst-pill">${escapeHtml(item.institution || "Source")}</span>
        ${item.source_url ? `<a href="${escapeAttr(item.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.source_title || "View source")}</a>` : ""}
      </div>
    `;
    statisticsList.appendChild(li);
  });
}

function renderSources(sources) {
  const filter = (sourceFilter?.value || "").toLowerCase();
  const filtered = filter
    ? sources.filter((s) =>
        `${s.title} ${s.institution} ${s.snippet} ${s.content}`.toLowerCase().includes(filter)
      )
    : sources;

  sourcesList.innerHTML = "";
  if (!filtered.length) {
    sourcesList.innerHTML = "<li class='empty-msg'><p>No sources match your filter.</p></li>";
    return;
  }
  filtered.forEach((src, idx) => {
    const li = document.createElement("li");
    const excerpt = src.content || src.snippet || "";
    li.innerHTML = `
      <div class="source-header">
        <span class="source-index">#${idx + 1}</span>
        <span class="inst-pill inst-pill-lg">${escapeHtml(src.institution || src.type || "Web")}</span>
        <span class="source-type-tag">${escapeHtml(src.institution_type || src.type || "web")}</span>
      </div>
      <h4>${escapeHtml(src.title)}</h4>
      <p class="source-excerpt">${escapeHtml(excerpt)}</p>
      <a class="source-link" href="${escapeAttr(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.url)}</a>
    `;
    sourcesList.appendChild(li);
  });
}

function renderOverview(blocks) {
  const parts = [];
  if (blocks.definitions?.length) {
    blocks.definitions.forEach((d) => {
      parts.push(`<div class="overview-block"><h4>Definition</h4><p>${escapeHtml(d.definition)}</p></div>`);
    });
  }
  if (blocks.overview) {
    blocks.overview.split("\n\n").forEach((para) => {
      if (para.trim()) {
        parts.push(`<div class="overview-block"><p>${escapeHtml(para.trim())}</p></div>`);
      }
    });
  }
  overviewContent.innerHTML = parts.join("") || "<p class='empty-msg'>No overview available.</p>";
}

function renderInstitutions(institutions) {
  institutionBadges.innerHTML = "";
  (institutions || []).forEach((name) => {
    const span = document.createElement("span");
    span.className = "inst-badge";
    span.textContent = name;
    institutionBadges.appendChild(span);
  });
}

function showResults(data) {
  lastResearchData = data;
  allSources = data.sources || [];
  sessionStorage.setItem("dr_last_topic", data.topic);

  emptyState.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  resultsSection.classList.add("fade-in");
  speechSidebar.classList.remove("hidden");
  mobileSpeechBtn.classList.remove("hidden");
  speechOutput.classList.add("hidden");

  resultsTitle.textContent = data.topic;
  resultsLang.textContent = `Language: ${data.language.toUpperCase()}`;
  resultsCount.textContent = `${data.source_count} sources retrieved`;
  const affN = data.blocks.affirmative?.length || 0;
  const negN = data.blocks.negative?.length || 0;
  resultsArgs.textContent = `${affN + negN} arguments identified`;

  setTabCount(tabCounts.aff, affN);
  setTabCount(tabCounts.neg, negN);
  setTabCount(tabCounts.stats, data.blocks.key_statistics?.length || 0);
  setTabCount(tabCounts.sources, data.source_count || 0);

  renderInstitutions(data.institutions);
  renderOverview(data.blocks);
  blockText.textContent = data.blocks.block_text || "";
  renderArgumentList(affirmativeList, data.blocks.affirmative, "aff");
  renderArgumentList(negativeList, data.blocks.negative, "neg");
  renderStatistics(data.blocks.key_statistics);
  renderSources(allSources);

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `panel-${name}`);
    });
  });
});

copyBlocksBtn.addEventListener("click", () =>
  copyText(blockText.textContent, copyBlocksBtn, "Copied", "Copy")
);

downloadBlocksBtn.addEventListener("click", () => {
  const name = (lastResearchData?.topic || "debate-blocks").slice(0, 40).replace(/[^\w\s-]/g, "");
  downloadFile(blockText.textContent, `${name}-blocks.txt`);
});

sourceFilter?.addEventListener("input", () => renderSources(allSources));

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    topicInput.value = chip.dataset.topic;
    form.requestSubmit();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  try {
    const resp = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topicInput.value.trim(),
        language: languageSelect.value,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }
    showResults(data);
  } catch {
    showError("Network error — check your connection or try again.");
  } finally {
    setLoading(false);
  }
});

async function loadFormats() {
  try {
    const resp = await fetch("/api/formats");
    formatCatalog = await resp.json();
    updateSpeechTypeOptions();
  } catch {
    formatCatalog = {
      pf: { speeches: { constructive: { label: "Team Constructive", minutes: 4 }, rebuttal: { label: "Team Rebuttal", minutes: 4 }, summary: { label: "Summary Speech", minutes: 3 }, final_focus: { label: "Final Focus", minutes: 2 } } },
    };
    updateSpeechTypeOptions();
  }
}

function updateSpeechTypeOptions() {
  const fmt = debateFormatSelect.value;
  const info = formatCatalog[fmt];
  speechTypeSelect.innerHTML = "";
  if (!info?.speeches) return;

  Object.entries(info.speeches).forEach(([key, meta]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${meta.label} (${meta.minutes} min)`;
    if (meta.side === "aff") opt.dataset.side = "aff";
    else if (meta.side === "neg") opt.dataset.side = "neg";
    speechTypeSelect.appendChild(opt);
  });
  syncSideFromSpeechType();
}

function syncSideFromSpeechType() {
  const forcedSide = speechTypeSelect.selectedOptions[0]?.dataset?.side;
  if (forcedSide) {
    speechSideSelect.value = forcedSide;
    speechSideSelect.disabled = true;
  } else {
    speechSideSelect.disabled = false;
  }
}

debateFormatSelect.addEventListener("change", updateSpeechTypeOptions);
speechTypeSelect.addEventListener("change", syncSideFromSpeechType);

generateSpeechBtn.addEventListener("click", async () => {
  if (!lastResearchData) {
    showError("Run research on a topic first.");
    return;
  }
  generateSpeechBtn.disabled = true;
  generateSpeechBtn.textContent = aiCoachEnabled ? "Writing with AI…" : "Generating…";

  try {
    const resp = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: lastResearchData.topic,
        blocks: lastResearchData.blocks,
        format: debateFormatSelect.value,
        speech_type: speechTypeSelect.value,
        side: speechSideSelect.value,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showError(data.error || "Could not generate speech.");
      return;
    }
    speechOutput.classList.remove("hidden");
    speechLabel.textContent = `${data.format_name} — ${data.speech_label}`;
    const enhancedNote =
      data.generation_mode === "ai"
        ? " · written with AI from your sources"
        : data.llm_enhanced
          ? " · AI-polished"
          : data.llm_available
            ? ""
            : " · template draft";
    speechStats.textContent = `${data.word_count} words · ~${data.estimated_minutes} min read · target ${data.target_minutes} min${enhancedNote}`;
    speechText.textContent = data.speech_text;
    feedbackInput.value = data.speech_text;
    lastSpeechMeta = {
      target_minutes: data.target_minutes,
      topic: lastResearchData.topic,
      side: data.side,
    };
    if (data.llm_enhanced) {
      speechEnhancedBadge.textContent =
        data.generation_mode === "ai" ? "Written with AI from your research" : "AI-enhanced delivery";
      speechEnhancedBadge.classList.remove("hidden");
    } else {
      speechEnhancedBadge.classList.add("hidden");
    }
    speechSidebar.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    showError("Failed to generate speech.");
  } finally {
    generateSpeechBtn.disabled = false;
    generateSpeechBtn.textContent = "Generate Speech";
  }
});

copySpeechBtn.addEventListener("click", () =>
  copyText(speechText.textContent, copySpeechBtn, "Copied", "Copy")
);

downloadSpeechBtn.addEventListener("click", () => {
  const name = (lastResearchData?.topic || "speech").slice(0, 40).replace(/[^\w\s-]/g, "");
  downloadFile(speechText.textContent, `${name}-speech.txt`);
});

function renderFeedback(data) {
  const cats = Object.values(data.categories || {})
    .map((c) => `<div class="feedback-cat"><span>${c.label}</span><div class="feedback-bar"><div style="width:${c.score}%"></div></div></div>`)
    .join("");

  const strengths = (data.strengths || []).map((s) => `<li class="feedback-good">${s}</li>`).join("");
  const improvements = (data.improvements || []).map((s) => `<li class="feedback-fix">${s}</li>`).join("");

  let aiBlock = "";
  if (data.ai_coaching) {
    const tips = (data.ai_coaching.delivery_tips || []).map((t) => `<li>${t}</li>`).join("");
    const top3 = (data.ai_coaching.top_3_improvements || []).map((t) => `<li>${t}</li>`).join("");
    aiBlock = `
      <div class="feedback-ai">
        <p class="feedback-ai-summary">${data.ai_coaching.coaching_summary || ""}</p>
        ${top3 ? `<ul class="feedback-list">${top3}</ul>` : ""}
        ${tips ? `<p class="feedback-subhead">Delivery tips</p><ul class="feedback-list">${tips}</ul>` : ""}
      </div>`;
  }

  feedbackOutput.innerHTML = `
    <div class="feedback-score-card">
      <div class="feedback-grade">${data.grade}</div>
      <div class="feedback-score-detail">
        <strong>${data.score}/100</strong>
        <span>${data.word_count} words · ~${data.estimated_minutes} min · target ${data.target_minutes} min</span>
      </div>
    </div>
    ${cats}
    ${strengths ? `<p class="feedback-subhead">Strengths</p><ul class="feedback-list">${strengths}</ul>` : ""}
    ${improvements ? `<p class="feedback-subhead">Improve</p><ul class="feedback-list">${improvements}</ul>` : ""}
    ${aiBlock}
    ${data.llm_available && !data.ai_coaching ? `<p class="feedback-note">Set OPENAI_API_KEY for AI coaching tips.</p>` : ""}
  `;
  feedbackOutput.classList.remove("hidden");
}

async function requestFeedback(text) {
  if (!text.trim()) {
    showError("Paste or generate a speech first.");
    return;
  }
  analyzeFeedbackBtn.disabled = true;
  feedbackSpeechBtn && (feedbackSpeechBtn.disabled = true);
  const prevLabel = analyzeFeedbackBtn.textContent;
  analyzeFeedbackBtn.textContent = "Analyzing…";

  try {
    const resp = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speech_text: text,
        topic: lastSpeechMeta?.topic || lastResearchData?.topic || "",
        side: lastSpeechMeta?.side || speechSideSelect.value,
        target_minutes: lastSpeechMeta?.target_minutes || 4,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showError(data.error || "Could not analyze speech.");
      return;
    }
    renderFeedback(data);
    feedbackOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    showError("Failed to analyze speech.");
  } finally {
    analyzeFeedbackBtn.disabled = false;
    feedbackSpeechBtn && (feedbackSpeechBtn.disabled = false);
    analyzeFeedbackBtn.textContent = prevLabel;
  }
}

feedbackSpeechBtn?.addEventListener("click", () => requestFeedback(speechText.textContent));
analyzeFeedbackBtn?.addEventListener("click", () => requestFeedback(feedbackInput.value));

mobileSpeechBtn?.addEventListener("click", () => {
  speechSidebar.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== topicInput) {
    e.preventDefault();
    topicInput.focus();
  }
});

const saved = sessionStorage.getItem("dr_last_topic");
if (saved && !topicInput.value) topicInput.placeholder = `Last: ${saved.slice(0, 50)}…`;

loadFormats();

async function loadAiStatus() {
  try {
    const resp = await fetch("/api/ai-status");
    const data = await resp.json();
    aiCoachEnabled = !!data.available;
    const banner = document.getElementById("ai-status-banner");
    if (banner && data.available) {
      banner.innerHTML = `<span class="ai-status-dot ai-on"></span><span>AI Coach active (${data.model || "OpenAI"})</span>`;
      banner.classList.add("ai-active");
    }
  } catch {
    /* ignore */
  }
}

loadAiStatus();

const localHint = document.getElementById("local-url-hint");
if (localHint && (location.hostname === "localhost" || location.hostname.endsWith(".localhost") || location.hostname === "127.0.0.1")) {
  localHint.textContent = `Running locally · ${location.origin}`;
  localHint.hidden = false;
}
