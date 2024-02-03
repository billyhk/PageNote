const IMAGE_STORAGE_KEY = "croppedImage";

document.addEventListener("DOMContentLoaded", function () {
  var canvas = new fabric.Canvas("c", { selection: true });

  // Set default size
  canvas.setWidth(window.innerWidth);
  canvas.setHeight(window.innerHeight);

  // Set size dynamically accordingly to cropped image size
  chrome.storage.local.get(IMAGE_STORAGE_KEY, function (data) {
    if (data[IMAGE_STORAGE_KEY]) {
      fabric.Image.fromURL(data[IMAGE_STORAGE_KEY], function (img) {
        // Match the canvas size to that of the image
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

  // Remove Shape
  document.addEventListener("keydown", function (event) {
    if (canvas.getActiveObject()?.isEditing) {
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      removeActiveObject(canvas);
    }
  });

  // Deactivate Focus
  document.addEventListener("keydown", function (event) {
    // Check if the Delete key is pressed
    if (event.key === "Escape") {
      removeActiveObject(canvas, false);
    }
  });

  // Handle adding/removing elements for the layers-list
  canvas.on("object:added", function () {
    updateLayersList(canvas);
  });

  canvas.on("object:removed", function () {
    updateLayersList(canvas);
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
    width: 60,
    height: 70,
    fill: "",

    // Border styles
    stroke: "red",
    strokeWidth: 2,
    noScaleCache: false,
    strokeUniform: true,

    customType: "Rectangle",
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

  var group = new fabric.Group(objs, {
    customType: "Arrow",
  });
  canvas.add(group);
}

function addText(canvas) {
  var text = new fabric.IText("Text", {
    left: 50,
    top: 50,
    fontFamily: "Arial",
    fill: "red",
    lineHeight: 1.1,
    fontSize: 28,
    customType: "Text",
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

function updateLayersList(canvas) {
  var layersList = document.getElementById("layers-list");
  var typeCount = {}; // Object to keep track of counts per type
  layersList.innerHTML = ""; // Initialize list

  canvas.getObjects().forEach(function (obj, index) {
    var objType = obj.customType || obj.type;
    if (!typeCount[objType]) {
      typeCount[objType] = 1;
    } else {
      typeCount[objType]++;
    }

    // Create a list item for each object
    var li = document.createElement("li");
    li.textContent = `${objType} ${typeCount[objType]}`;
    li.onclick = function () {
      canvas.setActiveObject(obj); // Set the clicked object as active
      canvas.renderAll();
    };

    layersList.appendChild(li);
  });
}

function removeActiveObject(canvas, shouldRemove = true) {
  var activeObject = canvas.getActiveObject();

  if (activeObject) {
    if (shouldRemove) {
      canvas.remove(activeObject);
    }

    // Deselect object and update canvas
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
}
