const SCREENSHOT_IMAGE_STORAGE_KEY = "screenshot";
const SCREENSHOT_URL_STORAGE_KEY = "screenshotUrl";

const captureScreenshotBtn = document.getElementById("capture-btn");

captureScreenshotBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    var url = currentTab.url;
    chrome.storage.local.set(
      { [SCREENSHOT_URL_STORAGE_KEY]: url },
      function () {
        console.log("URL is saved.");
      }
    );
  });

  chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
    chrome.storage.local.set(
      { [SCREENSHOT_IMAGE_STORAGE_KEY]: dataUrl },
      function () {
        chrome.tabs.create({
          url: chrome.runtime.getURL("../../../src/Pages/Cropper/index.html"),
        });
      }
    );
  });
});
