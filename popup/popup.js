document.getElementById("capture-btn").addEventListener("click", () => {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
    // Use chrome.storage.local to temporarily store the screenshot data
    chrome.storage.local.set({ screenshot: dataUrl }, function () {
      // Open a new tab for cropping
      chrome.tabs.create({
        url: chrome.runtime.getURL("../cropper/cropper.html"),
      });
    });
  });
});
