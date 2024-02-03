// Constants
const PROJECT_NAME = "PageMark";
const CROPPED_IMAGE_STORAGE_KEY = "croppedImage";
const SCREENSHOT_URL_STORAGE_KEY = "screenshotUrl";
const EXCLUDE_FROM_LAYERS_LIST_KEY = "excludeFromLayersList";

// Elements
const shapeSelectorMenu = document.getElementById("shape-selector_menu");
const shapeSelectorButton = document.getElementById("shape-selector_btn");
const exportButton = document.getElementById("export-btn");
const fileNameInput = document.getElementById("filename-input");
const layersList = document.getElementById("layers-list");
const notesInput = document.getElementById("notes-input");

// Dynamic variables
let objectId = 0;

document.addEventListener("DOMContentLoaded", function () {
  var canvas = new fabric.Canvas("c", { selection: true });

  // setCanvasSize(); // TODO: NOT WORKING
  addUrlToCanvas(canvas);
  setCroppedImageToBackground(canvas);
  initializeCanvasListeners(canvas);
  initializeElementListeners(canvas);
});

// HELPERS //

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

// SHAPES

function addRectangle(canvas) {
  var rect = new fabric.Rect({
    id: objectId++,
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
    id: objectId++,
    customType: "Arrow",
  });
  canvas.add(group);
}

function addText(canvas) {
  var text = new fabric.IText("Text", {
    id: objectId++,
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

// UTILITY

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

// LAYERS LIST

function updateLayersList(canvas) {
  var typeCount = {}; // Object to keep track of counts per type
  layersList.innerHTML = ""; // Initialize list

  canvas.getObjects().forEach(function (obj) {
    var shouldExcludeFromList = obj[EXCLUDE_FROM_LAYERS_LIST_KEY] ?? false;
    if (shouldExcludeFromList) return;

    var objType = obj.customType || obj.type;
    if (!typeCount[objType]) {
      typeCount[objType] = 1;
    } else {
      typeCount[objType]++;
    }

    // Create a list item for each object
    var li = document.createElement("li");
    li.setAttribute("data-id", obj.id);
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

function highlightActiveObjectInLayersList(activeObject) {
  clearHighlighting();
  var activeId = activeObject.id;
  var listItem = document.querySelector(
    `#layers-list li[data-id="${activeId}"]`
  );
  if (listItem) {
    listItem.classList.add("active");
  }
}

function clearHighlighting() {
  document.querySelectorAll("#layers-list li").forEach((li) => {
    li.classList.remove("active");
  });
}

// EXPORTING

function addUrlToCanvas(canvas) {
  chrome.storage.local.get([SCREENSHOT_URL_STORAGE_KEY], function (result) {
    var url = result[SCREENSHOT_URL_STORAGE_KEY];

    var borderHeight = 30; // Adjust as needed
    var borderWidth = canvas.width;
    var border = new fabric.Rect({
      id: objectId++,
      [EXCLUDE_FROM_LAYERS_LIST_KEY]: true,

      left: 0,
      top: 0,
      fill: "black",
      width: borderWidth,
      height: borderHeight,
      selectable: false,
      evented: false,
    });

    var text = new fabric.Text(url, {
      id: objectId++,
      [EXCLUDE_FROM_LAYERS_LIST_KEY]: true,

      left: 10, // Some padding
      top: 5, // Adjust based on border height
      fontSize: 14,
      fill: "white",
      selectable: false,
      evented: false,
    });

    // Add both the border and the text to the canvas
    canvas.add(border);
    canvas.add(text);

    // Ensure they are rendered below any existing objects
    border.moveTo(0);
    text.moveTo(1);

    // Re-adjust the positions of other objects on the canvas to account for the new header
    canvas.getObjects().forEach(function (obj) {
      if (obj !== border && obj !== text) {
        obj.set("top", obj.top + borderHeight);
      }
    });

    canvas.renderAll();
  });
}

function setFilename(filename) {
  var filename = fileNameInput.value.trim();

  // Default file name
  if (!filename) {
    const formattedDate = getFormattedDate(new Date());
    filename = `${PROJECT_NAME}_Export (${formattedDate})`; // Default filename
  }

  // Ensure the filename ends with .png
  filename += ".png";

  return filename;
}

function createAndTriggerAnchor(dataURL, filename) {
  var a = document.createElement("a");
  a.href = dataURL;
  a.download = filename; // Use the custom or default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function prepareCanvasForExportWithAdditionalData(canvas, notesText) {
  // Handle URL
  // TODO ...

  // Handle Notes
  if (!notesText) {
    return;
  }

  const originalWidth = canvas.width;
  const notesWidth = 200; // Width of the notes area
  const padding = 10; // Padding around the notes text

  // Temporarily resize the canvas to include the notes area
  canvas.setWidth(originalWidth + notesWidth);

  // Create the notes text
  const notes = new fabric.Textbox(notesText, {
    left: padding,
    top: padding,
    fontSize: 14,
    fill: "black",
    backgroundColor: "white", // Set background color for notes
    width: notesWidth - padding * 2, // Account for padding
    selectable: false,
    splitByGrapheme: true,
    [EXCLUDE_FROM_LAYERS_LIST_KEY]: true, // Exclude from layers list if needed
    id: objectId++,

    borderColor: "red",
  });

  // Create a white rectangle for the background if you want a distinct background
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    fill: "white",
    width: notesWidth,
    height: canvas.height,
    selectable: false,
    [EXCLUDE_FROM_LAYERS_LIST_KEY]: true, // Exclude from layers list if needed
    id: objectId++,

    borderColor: "blue",
    borderWidth: 1,
  });

  // Move all other objects to the right to make space for the notes
  canvas.getObjects().forEach((obj) => {
    if (obj !== background && obj !== notes) {
      obj.set({ left: obj.left + notesWidth }).setCoords();
    }
  });

  // Add the background and notes to the canvas
  canvas.add(background);
  canvas.add(notes);
  canvas.renderAll();

  return { background, notes, originalWidth }; // Return objects and original width for restoration
}

function restoreCanvasAfterExport(canvas, additionalData) {
  if (!additionalData) {
    return;
  }

  const { background, notes, originalWidth } = additionalData;

  // Remove the temporary notes and background
  canvas.remove(background);
  canvas.remove(notes);

  // Move objects back to their original positions
  canvas.getObjects().forEach((obj) => {
    obj.set({ left: obj.left - background.width }).setCoords();
  });

  // Restore the original canvas width
  canvas.setWidth(originalWidth);
  canvas.renderAll();
}

function setCroppedImageToBackground(canvas) {
  chrome.storage.local.get(CROPPED_IMAGE_STORAGE_KEY, function (data) {
    const croppedImage = data[CROPPED_IMAGE_STORAGE_KEY];
    if (croppedImage) {
      fabric.Image.fromURL(croppedImage, function (img) {
        // setCanvasSize(img) // TODO: NOT WORKING
        canvas.setWidth(img.width);
        canvas.setHeight(img.height);

        img.set({
          selectable: false, // Make it non-selectable
          evented: false, // Make it non-interactive
          [EXCLUDE_FROM_LAYERS_LIST_KEY]: true, // Exclude from layers list if needed
          id: objectId++,
        });

        // Add the image as the bottom-most object (acts as a background)
        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
      });
    }
  });
}

// INITIALIZE CANVAS

function initializeElementListeners(canvas) {
  shapeSelectorMenu.addEventListener("change", function (e) {
    addShape(e.target.value, canvas);
  });

  shapeSelectorButton.addEventListener("click", function () {
    addShape(shapeSelectorMenu.value, canvas);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Backspace" || event.key === "Delete") {
      if (!canvas.getActiveObject()?.isEditing) {
        removeActiveObject(canvas);
      }
    } else if (event.key === "Escape") {
      removeActiveObject(canvas, false);
    }
  });

  exportButton.addEventListener("click", function () {
    const filename = setFilename();
    const notesText = notesInput.value.trim();
    const additionalData = prepareCanvasForExportWithAdditionalData(
      canvas,
      notesText
      // url TODO: Add URL in the same way. Shouldn't be displayed in the UI
    );
    const dataURL = canvas.toDataURL("image/png");

    restoreCanvasAfterExport(canvas, additionalData);
    createAndTriggerAnchor(dataURL, filename);
  });
}

function initializeCanvasListeners(canvas) {
  canvas.on("object:added", function () {
    updateLayersList(canvas);
  });

  canvas.on("object:removed", function () {
    updateLayersList(canvas);
  });

  canvas.on("selection:created", function (e) {
    highlightActiveObjectInLayersList(e.selected[0]);
  });

  canvas.on("selection:updated", function (e) {
    highlightActiveObjectInLayersList(e.selected[0]);
  });

  canvas.on("selection:cleared", function () {
    clearHighlighting();
  });
}

// TODO: Figure out why this isn't working
// function setCanvasSize(img) {
//   if (img) {
//     canvas.setWidth(img.width);
//     canvas.setHeight(img.height);
//     return;
//   }

//   canvas.setWidth(window.innerWidth);
//   canvas.setHeight(window.innerHeight);
// }
