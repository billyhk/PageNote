document.addEventListener("DOMContentLoaded", function () {
  var canvas = new fabric.Canvas("c", { selection: true });
  canvas.setWidth(window.innerWidth);
  canvas.setHeight(window.innerHeight);

  chrome.storage.local.get("annotatedImage", function (data) {
    if (data.annotatedImage) {
      fabric.Image.fromURL(data.annotatedImage, function (img) {
        // Match the canvas size with that of the image
        canvas.setWidth(img.width);
        canvas.setHeight(img.height);

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: canvas.width / img.width,
          scaleY: canvas.height / img.height,
        });
      });
    }
  });

  // Tool selector handler
  document
    .getElementById("shape-selector_btn")
    .addEventListener("click", function () {
      var selectedShape = document.getElementById("shape-selector_menu").value;
      addShape(selectedShape, canvas);
    });

  // Export
  document.getElementById("export-btn").addEventListener("click", function () {
    var dataURL = canvas.toDataURL({ format: "png", quality: 0.8 });
    var filename = document.getElementById("filename-input").value.trim();

    // Provide a default filename if none is entered
    if (!filename) {
      const formattedDate = getFormattedDate(new Date());
      filename = `PageMark_Export (${formattedDate})`; // Default filename
    }

    // Ensure the filename ends with .png
    filename += ".png";

    // Proceed to create an anchor tag and trigger the download
    var a = document.createElement("a");
    a.href = dataURL;
    a.download = filename; // Use the custom or default filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Remove Shape
  document.addEventListener("keydown", function (event) {
    if (canvas.getActiveObject()?.isEditing) {
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      // Get the active object from the canvas
      var activeObject = canvas.getActiveObject();

      // Check if there is an active object selected
      if (activeObject) {
        // Remove the active object from the canvas
        canvas.remove(activeObject);

        // Deselect the object and update the canvas
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  });

  // Deactivate Focus
  document.addEventListener("keydown", function (event) {
    // Check if the Delete key is pressed
    if (event.key === "Escape") {
      // Get the active object from the canvas
      var activeObject = canvas.getActiveObject();

      // Check if there is an active object selected
      if (activeObject) {
        // Deselect the object and update the canvas
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  });
});

function addShape(selectedShape, canvas) {
  switch (selectedShape) {
    case "rectangle":
      addRectangle(canvas);
      break;
    case "arrow":
      addArrow(canvas);
      break;
    case "text":
      addText(canvas);
      break;
    default:
      console.log("Tool not implemented:", selectedShape);
  }
}

function addRectangle(canvas) {
  var rect = new fabric.Rect({
    left: 100,
    top: 100,
    fill: "transparent",
    stroke: "red",
    width: 60,
    height: 70,
    angle: 90,
  });

  canvas.add(rect);
}

function addArrow(canvas) {
  var fromx = 0,
    fromy = 100,
    tox = 100,
    toy = 100;

  var line = new fabric.Line([fromx, fromy, tox, toy], {
    left: 75,
    top: 70,
    stroke: "red",
  });

  var arrowHead = new fabric.Triangle({
    width: 10,
    height: 10,
    fill: "red",
    left: 180,
    top: 65,
    angle: 90,
  });

  var objs = [line, arrowHead];

  var alltogetherObj = new fabric.Group(objs);
  canvas.add(alltogetherObj);
}

function addText(canvas) {
  var text = new fabric.IText("Text", {
    left: 50,
    top: 50,
    fontFamily: "Arial",
    fill: "red",
    lineHeight: 1.1,
    fontSize: 14,
  });

  canvas.add(text);
}

function getFormattedDate(date) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "AuG",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  return `${monthNames[monthIndex]} ${day}, ${year}`;
}
