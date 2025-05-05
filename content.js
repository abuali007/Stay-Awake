// content.js

let intervalId = null;

function stayAwake(intervalSeconds = 1) {
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    window.dispatchEvent(new Event('mousemove')); // أو أي تفاعل خفيف
  }, intervalSeconds * 1000);
}

function stopAwake() {
  clearInterval(intervalId);
  intervalId = null;
}

// استقبال الأوامر من popup.js أو background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    stayAwake(request.interval || 1);
    sendResponse({ status: "started" });
  } else if (request.action === "stop") {
    stopAwake();
    sendResponse({ status: "stopped" });
  }
});
