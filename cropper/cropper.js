const IMAGE_STORAGE_KEY = "croppedImage";

document.addEventListener("DOMContentLoaded", function () {
  // Cleanup localStorage
  chrome.storage.local.remove(IMAGE_STORAGE_KEY);

  chrome.storage.local.get("screenshot", function (data) {
    const img = document.getElementById("screenshot-img");
    img.src = data.screenshot;

    const cropper = new Cropper(img, {
      aspectRatio: NaN, // Free cropping
    });

    document.getElementById("crop-btn").addEventListener("click", function () {
      const croppedCanvas = cropper.getCroppedCanvas();

      croppedCanvas.toBlob(function (blob) {
        blobToDataUrl(blob, function (dataUrl) {
          chrome.storage.local.set({ croppedImage: dataUrl }, function () {
            chrome.tabs.update({
              url: chrome.runtime.getURL("../editor/editor.html"),
            });
          });
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
