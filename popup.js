document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleInspect");
  let isInspecting = false;

  toggleBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    isInspecting = !isInspecting;

    chrome.runtime.sendMessage({
      action: "toggleInspect",
      value: isInspecting,
      tabId: tab.id,
    });

    toggleBtn.textContent = isInspecting ? "Stop Inspect" : "Start Inspect";
  });
});
