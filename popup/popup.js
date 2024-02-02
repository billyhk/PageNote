// In popup.js
document.getElementById("capture-btn").addEventListener("click", () => {
  // Capture the entire visible tab
  chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
    // Convert the data URL to a Blob
    const blob = dataURItoBlob(dataUrl);

    // Create a URL for the Blob
    const blobUrl = URL.createObjectURL(blob);

    // Create a download link and trigger the download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "screenshot.png"; // TODO: Rename based on user input
    a.click();

    // Clean up the URL object
    URL.revokeObjectURL(blobUrl);
  });
});

// Helper function to convert Data URI to Blob
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mimeString });
}

// document.getElementById("capture-btn").addEventListener("click", () => {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     chrome.scripting.executeScript({
//       target: { tabId: tabs[0].id },
//       function: initiateCapture,
//     });
//   });
// });

// function initiateCapture() {
//   let startX, startY, endX, endY;
//   const overlay = document.createElement("div");
//   overlay.setAttribute(
//     "style",
//     `
//         position: fixed;
//         top: 0;
//         left: 0;
//         width: 100vw;
//         height: 100vh;
//         background-color: rgba(0,0,0,0.5);
//         cursor: crosshair;
//         z-index: 10000;
//     `
//   );
//   document.body.appendChild(overlay);

//   overlay.addEventListener(
//     "mousedown",
//     (e) => {
//       startX = e.clientX;
//       startY = e.clientY;
//       const selectionBox = document.createElement("div");
//       selectionBox.setAttribute("id", "selectionBox");
//       selectionBox.setAttribute(
//         "style",
//         `
//             position: absolute;
//             top: ${startY}px;
//             left: ${startX}px;
//             border: 2px solid #fff;
//             z-index: 10001;
//         `
//       );
//       overlay.appendChild(selectionBox);

//       function mouseMoveHandler(e) {
//         const width = e.clientX - startX;
//         const height = e.clientY - startY;
//         selectionBox.style.width = `${width}px`;
//         selectionBox.style.height = `${height}px`;
//       }

//       function mouseUpHandler() {
//         endX = e.clientX;
//         endY = e.clientY;
//         document.removeEventListener("mousemove", mouseMoveHandler);
//         document.removeEventListener("mouseup", mouseUpHandler);
//         // Now you have startX, startY, endX, endY as the coordinates of your selection
//         overlay.remove(); // Remove or hide the overlay after selection
//         captureSelection(startX, startY, endX, endY); // Placeholder for the capture function
//       }

//       document.addEventListener("mousemove", mouseMoveHandler);
//       document.addEventListener("mouseup", mouseUpHandler, { once: true });
//     },
//     { once: true }
//   );
// }

// function captureSelection(startX, startY, endX, endY) {
//   // Capture the entire visible tab
//   chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
//     // Create an Image to load the screenshot data
//     let img = new Image();
//     img.onload = function () {
//       // Create a canvas element to manipulate the image
//       let canvas = document.createElement("canvas");
//       const scale = window.devicePixelRatio; // Consider device pixel ratio for high-DPI displays
//       canvas.width = (endX - startX) * scale; // Calculate the width of the selected area
//       canvas.height = (endY - startY) * scale; // Calculate the height of the selected area
//       let ctx = canvas.getContext("2d");

//       // Draw the cropped area on the canvas
//       // Adjust startX, startY, width, and height by scale if necessary
//       ctx.drawImage(
//         img,
//         startX * scale,
//         startY * scale,
//         canvas.width,
//         canvas.height,
//         0,
//         0,
//         canvas.width,
//         canvas.height
//       );

//       // Convert the canvas content to a data URL and download it
//       downloadImage(canvas.toDataURL("image/png"));
//     };
//     img.src = dataUrl; // Set the captured screenshot as the source of the image
//   });
// }

// chrome.tabs.captureVisibleTab(null, {}, function (dataUrl) {
//   let img = new Image();
//   img.onload = function () {
//     let canvas = document.createElement("canvas");
//     canvas.width = endX - startX; // Use the dimensions from your selection
//     canvas.height = endY - startY;
//     let ctx = canvas.getContext("2d");
//     ctx.drawImage(img, -startX, -startY);
//     let croppedDataUrl = canvas.toDataURL("image/png");
//     downloadImage(croppedDataUrl); // Function to download the image
//   };
//   img.src = dataUrl;
// });

// function downloadImage(dataUrl) {
//   const a = document.createElement("a");
//   a.href = dataUrl;
//   a.download = "screenshot.png";
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
// }
