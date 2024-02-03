const CROPPED_IMAGE_STORAGE_KEY = "croppedImage";
const SCREENSHOT_IMAGE_STORAGE_KEY = "screenshot";

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(SCREENSHOT_IMAGE_STORAGE_KEY, function (data) {
    const img = document.getElementById("screenshot-img");
    img.src = data[SCREENSHOT_IMAGE_STORAGE_KEY];

    const cropper = new Cropper(img, {
      aspectRatio: NaN, // Free cropping
    });

    document.getElementById("crop-btn").addEventListener("click", function () {
      const croppedCanvas = cropper.getCroppedCanvas();

      croppedCanvas.toBlob(function (blob) {
        blobToDataUrl(blob, function (dataUrl) {
          chrome.storage.local.set(
            { [CROPPED_IMAGE_STORAGE_KEY]: dataUrl },
            function () {
              chrome.tabs.update({
                url: chrome.runtime.getURL("../editor/editor.html"),
              });
            }
          );
        });
      });
    });
  });
});

function blobToDataUrl(blob, callback) {
  const reader = new FileReader();
  reader.onload = function () {
    callback(reader.result);
  };
  reader.readAsDataURL(blob);
}

// TODO: Remove if not needed
// function cleanupLocalStorage() {
//   chrome.storage.local.remove(CROPPED_IMAGE_STORAGE_KEY);
//   chrome.storage.local.remove(SCREENSHOT_IMAGE_STORAGE_KEY);
// }
