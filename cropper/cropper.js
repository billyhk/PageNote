document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get("screenshot", function (data) {
    const img = document.getElementById("screenshot-img");
    img.src = data.screenshot;

    const cropper = new Cropper(img, {
      aspectRatio: NaN, // Free cropping
    });

    document.getElementById("crop-btn").addEventListener("click", function () {
      const croppedCanvas = cropper.getCroppedCanvas();
      // Handle the cropped image: save, download, etc.
      croppedCanvas.toBlob(function (blob) {
        // Example: Download the cropped image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cropped_image.png";
        document.body.appendChild(a); // Append to body temporarily
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      });
    });
  });
});
