/*************************************
 * UNIVERSAL SELECTOR TOOL - CONTENT JS
 *************************************/

let popup = null;
let miniPopup = null;
let miniPopupTimeout = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

/* ============================================================
   MAIN INSPECTOR LISTENER
============================================================ */
document.addEventListener("click", async (e) => {
  if (!window.isInspecting) return;

  if (e.target.closest(".selector-popup") || e.target.closest(".mini-popup")) return;

  e.preventDefault();
  e.stopPropagation();

  const target = e.target;

  document.querySelector(".selector-popup")?.remove();
  showMiniSelectorPopup(target);

  const best = generateBestSelector(target);
  const bestValue = best.value;
  const xpathAbs = generateAbsoluteXPath(target);
  const xpathRel = generateSmartRelativeXPath(target);

  popup = document.createElement("div");
  popup.className = "selector-popup";
  popup.innerHTML = `
    <div class="popup-header">
      <span class="drag-handle">⠿</span>
      <div class="tabs">
        <button class="tab active" data-lang="javascript">JavaScript</button>
        <button class="tab" data-lang="python">Python</button>
        <button class="tab" data-lang="java">Java</button>
        <button class="tab" data-lang="csharp">C#</button>
        <button class="tab" data-lang="generic">Generic</button>
      </div>
      <span class="close-btn">×</span>
    </div>
    <div class="frameworks"></div>
  `;
  document.body.appendChild(popup);

  attachDragEvents(popup);

  const frameworks = {
    javascript: [
      { name: "Playwright", code: `await page.locator('${bestValue}')` },
      { name: "Cypress", code: `cy.get('${bestValue}')` },
    ],
    python: [
      {
        name: "Selenium (Pytest)",
        code: best.type === "xpath"
          ? `driver.find_element(By.XPATH, "${bestValue}")`
          : `driver.find_element(By.CSS_SELECTOR, "${bestValue}")`,
      },
    ],
    java: [
      {
        name: "Selenium (TestNG)",
        code: best.type === "xpath"
          ? `WebElement el = driver.findElement(By.xpath("${bestValue}"));`
          : `WebElement el = driver.findElement(By.cssSelector("${bestValue}"));`,
      },
    ],
    csharp: [
      {
        name: "Selenium (NUnit)",
        code: best.type === "xpath"
          ? `driver.FindElement(By.XPath("${bestValue}"));`
          : `driver.FindElement(By.CssSelector("${bestValue}"));`,
      },
    ],
    generic: [
      { name: "Best Selector", code: bestValue },
      { name: "XPath (Absolute)", code: xpathAbs },
      { name: "XPath (Relative)", code: xpathRel },
      { name: "XPath (By Text)", code: `//*[text()='${target.innerText.trim()}']` },
      { name: "XPath (Contains Text)", code: `//*[contains(text(),'${target.innerText.trim()}')]` }
    ]
  };

  const fwContainer = popup.querySelector(".frameworks");

  function render(lang) {
    fwContainer.innerHTML = "";
    frameworks[lang].forEach(fw => {
      const isXPath = fw.name.toLowerCase().includes("xpath");
      const div = document.createElement("div");
      div.className = "fw-table";
      div.innerHTML = `
        <div class="fw-header">${fw.name}</div>
        <div class="fw-body">
          <div class="fw-code ${isXPath ? 'expanded' : ''}">${fw.code}</div>
          <button class="copy-btn">Copy</button>
        </div>
      `;
      fwContainer.appendChild(div);
    });
    bindCopyButtons();
  }

  render("javascript");

  popup.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      popup.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      render(tab.dataset.lang);
    });
  });

  popup.querySelector(".close-btn").addEventListener("click", () => popup.remove());

  const rect = target.getBoundingClientRect();
  popup.style.top = `${window.scrollY + rect.bottom + 10}px`;
  popup.style.left = `${window.scrollX + rect.left}px`;
});

/* ============================================================
   MINI SELECTOR POPUP
============================================================ */
function showMiniSelectorPopup(target) {
  if (miniPopup) miniPopup.remove();
  clearTimeout(miniPopupTimeout);

  const best = generateBestSelector(target).value;

  miniPopup = document.createElement("div");
  miniPopup.className = "mini-popup";
  miniPopup.innerHTML = `
    <span class="mini-text">${best}</span>
    <button class="mini-copy">📋</button>
  `;
  document.body.appendChild(miniPopup);

  const rect = target.getBoundingClientRect();
  miniPopup.style.top = `${window.scrollY + rect.top - 40}px`;
  miniPopup.style.left = `${window.scrollX + rect.left}px`;

  miniPopup.querySelector(".mini-copy").onclick = () => {
    navigator.clipboard.writeText(best);
  };

  miniPopupTimeout = setTimeout(() => fadeOutMiniPopup(), 2400);
}

function fadeOutMiniPopup() {
  if (!miniPopup) return;
  miniPopup.style.opacity = "0";
  setTimeout(() => miniPopup?.remove(), 300);
}

/* ============================================================
   SELECTOR GENERATION (BEST + RELATIVE + ABSOLUTE)
============================================================ */
function generateBestSelector(el) {
  if (el.id) return { type: "id", value: `#${el.id}` };

  if (el.getAttribute("name"))
    return { type: "name", value: `[name='${el.getAttribute("name")}']` };

  if (el.classList.length > 0) {
    const cls = Array.from(el.classList).map(c => `.${c}`).join("");
    return { type: "css", value: `${el.tagName.toLowerCase()}${cls}` };
  }

  return { type: "xpath", value: generateSmartRelativeXPath(el) };
}

function generateAbsoluteXPath(el) {
  if (el.id) return `//*[@id='${el.id}']`;
  if (el === document.body) return "/html/body";

  let ix = 1;
  let sib = el.previousElementSibling;

  while (sib) {
    if (sib.tagName === el.tagName) ix++;
    sib = sib.previousElementSibling;
  }

  return generateAbsoluteXPath(el.parentElement) + "/" + el.tagName.toLowerCase() + "[" + ix + "]";
}

function generateSmartRelativeXPath(el) {
  let cur = el;

  while (cur) {
    if (cur.id)
      return `//*[@id='${cur.id}']${buildSubPath(el, cur)}`;

    if (cur.classList.length > 0) {
      const cls = cur.classList[0];
      if (document.getElementsByClassName(cls).length === 1)
        return `//*[@class='${cls}']${buildSubPath(el, cur)}`;
    }

    cur = cur.parentElement;
  }

  return generateAbsoluteXPath(el);
}

function buildSubPath(el, root) {
  if (el === root) return "";

  let path = [];
  let cur = el;

  while (cur && cur !== root) {
    let ix = 1;
    let sib = cur.previousElementSibling;
    while (sib) {
      if (sib.tagName === cur.tagName) ix++;
      sib = sib.previousElementSibling;
    }
    path.unshift(`/${cur.tagName.toLowerCase()}[${ix}]`);
    cur = cur.parentElement;
  }

  return path.join("");
}

/* ============================================================
   DRAG POPUP
============================================================ */
function attachDragEvents(popup) {
  const handle = popup.querySelector(".drag-handle");

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragOffsetX = e.clientX - popup.offsetLeft;
    dragOffsetY = e.clientY - popup.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    popup.style.top = `${e.clientY - dragOffsetY}px`;
    popup.style.left = `${e.clientX - dragOffsetX}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

/* ============================================================
   COPY BUTTONS
============================================================ */
function bindCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.onclick = () => {
      navigator.clipboard.writeText(btn.previousElementSibling.textContent);
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = "Copy", 1000);
    };
  });
}

/* ============================================================
   EXPAND / COLLAPSE LONG XPATH
============================================================ */
document.addEventListener("click", (e) => {
  const box = e.target.closest(".fw-code");
  if (!box) return;
  document.querySelectorAll(".fw-code.expanded").forEach(el => {
    if (el !== box) el.classList.remove("expanded");
  });
  box.classList.toggle("expanded");
});

/* ============================================================
   CSS
============================================================ */
const style = document.createElement("style");
style.textContent = `
.selector-popup {
  position: absolute;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  color: #74c0fc;
  width: 340px;
  border: 1px solid #74c0fc;
  border-radius: 12px;
  padding-bottom: 10px;
  font-family: "Inter", sans-serif;
  box-shadow: 0 0 15px rgba(116,192,252,0.4);
  z-index: 999999;
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 6px;
  border-bottom: 1px solid #74c0fc;
}

.drag-handle {
  cursor: grab;
  margin-right: 6px;
  font-size: 18px;
  color: #74c0fc;
}

.tabs {
  flex: 1;
  display: flex;
  justify-content: space-between;
}

.tab {
  background: transparent;
  border: none;
  color: #a0aec0;
  cursor: pointer;
}

.tab.active {
  color: #74c0fc;
  border-bottom: 2px solid #74c0fc;
}

.close-btn {
  cursor: pointer;
  font-weight: bold;
  color: #74c0fc;
}

.fw-table {
  background: rgba(255,255,255,0.05);
  border: 1px solid #74c0fc;
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
}

.fw-code {
  background: rgba(0,0,0,0.25);
  padding: 6px;
  border-radius: 6px;
  max-height: 80px;
  overflow: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
  transition: 0.25s ease;
}

.fw-code.expanded {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(0,0,0,0.35);
}

.copy-btn {
  margin-top: 6px;
  border: 1px solid #74c0fc;
  background: transparent;
  color: #74c0fc;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
}

.mini-popup {
  position: absolute;
  background: #1e293b;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid #74c0fc;
  display: flex;
  gap: 6px;
  font-family: monospace;
  color: #74c0fc;
  z-index: 1000001;
}
`;
document.head.appendChild(style);
