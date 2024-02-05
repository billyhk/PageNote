const CROPPED_IMAGE_STORAGE_KEY = "croppedImage";
const SCREENSHOT_IMAGE_STORAGE_KEY = "screenshot";

const img = document.getElementById("screenshot-img");
const cropButton = document.getElementById("crop-btn");
const skipButton = document.getElementById("skip-btn");

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(SCREENSHOT_IMAGE_STORAGE_KEY, function (data) {
    img.src = data[SCREENSHOT_IMAGE_STORAGE_KEY];

    const cropper = new Cropper(img, {
      aspectRatio: NaN, // Freesolo cropping
    });

    cropButton.addEventListener("click", function () {
      const croppedCanvas = cropper.getCroppedCanvas();
      croppedCanvas.toBlob(function (blob) {
        blobToDataUrl(blob, function (dataUrl) {
          navigateToEditorWithImage(dataUrl);
        });
      });
    });

    skipButton.addEventListener("click", function () {
      navigateToEditorWithImage(img.src);
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

function navigateToEditorWithImage(imageDataUrl) {
  chrome.storage.local.set(
    { [CROPPED_IMAGE_STORAGE_KEY]: imageDataUrl },
    function () {
      chrome.tabs.update({
        url: chrome.runtime.getURL("../editor/editor.html"),
      });
    }
  );
}
