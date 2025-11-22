chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "toggleInspect") {
    chrome.scripting.executeScript({
      target: { tabId: msg.tabId },
      func: toggleInspectMode,
      args: [msg.value],
    });
  }
});

function toggleInspectMode(isInspecting) {
  window.isInspecting = isInspecting;
  if (!isInspecting) {
    document.querySelector(".selector-popup")?.remove();
  }
}
