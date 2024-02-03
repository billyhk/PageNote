// Constants
const PROJECT_NAME = "PageMark";
const CROPPED_IMAGE_STORAGE_KEY = "croppedImage";
const SCREENSHOT_URL_STORAGE_KEY = "screenshotUrl";
const EXCLUDE_FROM_LAYERS_LIST_KEY = "excludeFromLayersList";
const MAX_IMG_WIDTH = 1100;
const VISIBILITY_CONTROL_OPTIONS_PRESERVING_ASPECT = {
  mt: false, // middle top disable
  mb: false, // middle bottom disable
  ml: false, // middle left disable
  mr: false, // middle right disable
};

// Elements
const shapeSelectorMenu = document.getElementById("shape-selector_menu");
const shapeSelectorButton = document.getElementById("shape-selector_btn");
const exportButton = document.getElementById("export-btn");
const fileNameInput = document.getElementById("filename-input");
const layersList = document.getElementById("layers-list");
const notesInput = document.getElementById("notes-input");
const drawingIndicator = document.getElementById("drawing-enabled-indicator");

// Dynamic variables
let objectId = 0;

document.addEventListener("DOMContentLoaded", function () {
  var canvas = new fabric.Canvas("c", { selection: true });
  setCanvasSize(canvas);
  setCroppedImageAndUrlToBackground(canvas);
  initializeCanvasListeners(canvas);
  initializeElementListeners(canvas);
});

// /////////// //
//   HELPERS   //
// //////////  //

// INITIALIZE CANVAS

function initializeElementListeners(canvas) {
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
    const extraNodesAndRestorationData = prepareCanvasForExportWithNotes(
      canvas,
      notesText
    );
    const dataURL = canvas.toDataURL("image/png");

    restoreCanvasAfterExport(canvas, extraNodesAndRestorationData);
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

function setCroppedImageAndUrlToBackground(canvas) {
  chrome.storage.local.get(CROPPED_IMAGE_STORAGE_KEY, function (data) {
    const croppedImage = data[CROPPED_IMAGE_STORAGE_KEY];
    if (croppedImage) {
      fabric.Image.fromURL(croppedImage, function (img) {
        const imgSize = addCroppedImageToCanvas(canvas, img);
        setCanvasSize(canvas, imgSize);
        addUrlToCanvas(canvas, imgSize.width);
      });
    }
  });
}

function setCanvasSize(canvas, imgSize) {
  if (imgSize) {
    console.log(imgSize);
    canvas.setWidth(imgSize.width);
    canvas.setHeight(imgSize.height);
    return;
  }

  canvas.setWidth(window.innerWidth);
  canvas.setHeight(window.innerHeight);
}

function addUrlToCanvas(canvas, imgWidth) {
  chrome.storage.local.get([SCREENSHOT_URL_STORAGE_KEY], function (result) {
    var url = result[SCREENSHOT_URL_STORAGE_KEY];
    var padding = 7;
    var borderHeight = 30;
    var borderWidth = imgWidth ?? canvas.width;
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

      left: padding,
      top: padding,
      fontSize: 14,
      fontFamily: "Arial",
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

function addCroppedImageToCanvas(canvas, img) {
  let scaledHeight;
  let scaledWidth;

  if (img.width > MAX_IMG_WIDTH) {
    // Preserve Aspect Ratio
    const aspectRatio = img.height / img.width;
    scaledWidth = MAX_IMG_WIDTH;
    scaledHeight = scaledWidth * aspectRatio;

    // Set the image size to the new dimensions
    img.scaleToWidth(scaledWidth);
    img.scaleToHeight(scaledHeight);
  } else {
    // No scaling needed; use original dimensions
    scaledHeight = img.height;
    scaledWidth = img.width;
  }

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

  return { height: scaledHeight, width: scaledWidth };
}

// SHAPES

function addShape(selectedShape, canvas) {
  switch (selectedShape) {
    case "rectangle":
      enableRectangleDrawing(canvas);
      break;
    case "arrow":
      enableArrowDrawing(canvas);
      break;
    case "text":
      addText(canvas);
      break;
    default:
      console.log("Tool not implemented:", selectedShape);
  }
}

// SHAPE: RECTANGLE

function enableRectangleDrawing(canvas) {
  enableDrawing(canvas);

  let isDrawing = false;
  let originX, originY;
  let rect;

  canvas.on("mouse:down", function (o) {
    isDrawing = true;
    const pointer = canvas.getPointer(o.e);
    originX = pointer.x;
    originY = pointer.y;

    rect = new fabric.Rect({
      left: originX,
      top: originY,
      originX: "left",
      originY: "top",
      width: 1, // Initial small width to avoid errors
      height: 1, // Initial small height to avoid errors
      stroke: "red",
      strokeWidth: 2,
      fill: "",
      noScaleCache: false,
      strokeUniform: true,
      id: objectId++,
      customType: "Rectangle",
    });

    canvas.add(rect);
  });

  canvas.on("mouse:move", function (o) {
    if (!isDrawing) return;
    const pointer = canvas.getPointer(o.e);

    if (pointer.x < originX) {
      rect.set({ left: Math.abs(pointer.x) });
    }
    if (pointer.y < originY) {
      rect.set({ top: Math.abs(pointer.y) });
    }

    rect.set({ width: Math.abs(originX - pointer.x) });
    rect.set({ height: Math.abs(originY - pointer.y) });

    canvas.renderAll();
  });

  canvas.on("mouse:up", function (o) {
    isDrawing = false;
    disableDrawing(canvas);
  });
}

// SHAPE: ARROW

function addArrowHead(canvas, line) {
  const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
  const arrowHeadSize = 15; // Adjust size as needed

  // Calculate the arrowhead position
  const arrowHead = new fabric.Triangle({
    left: line.x2,
    top: line.y2,
    originX: "center",
    originY: "center",
    fill: "red",
    angle: (angle * 180) / Math.PI + 90, // Convert angle to degrees and adjust
    width: arrowHeadSize,
    height: arrowHeadSize,
    selectable: false,
    evented: false,
  });

  canvas.add(arrowHead);
  canvas.renderAll();

  // Group the line and arrowhead for easier manipulation
  const group = new fabric.Group([line, arrowHead], {
    id: objectId++,
    customType: "Arrow",
  });

  canvas.remove(line);
  canvas.remove(arrowHead);

  group.setControlsVisibility(VISIBILITY_CONTROL_OPTIONS_PRESERVING_ASPECT);
  canvas.add(group);
}

function enableArrowDrawing(canvas) {
  enableDrawing(canvas);

  let isDrawing = false;
  let arrowStartPoint = null;
  let line = null;

  canvas.on("mouse:down", function (o) {
    isDrawing = true;
    const pointer = canvas.getPointer(o.e);
    arrowStartPoint = [pointer.x, pointer.y];
    line = new fabric.Line(arrowStartPoint.concat(arrowStartPoint), {
      strokeWidth: 2,
      fill: "red",
      stroke: "red",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.add(line);
  });

  canvas.on("mouse:move", function (o) {
    if (!isDrawing) return;
    const pointer = canvas.getPointer(o.e);
    line.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
  });

  canvas.on("mouse:up", function () {
    isDrawing = false;
    // Add the arrowhead at the end of the line
    addArrowHead(canvas, line);
    disableDrawing(canvas);
  });
}

// SHAPE: TEXT

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
  text.setControlsVisibility(VISIBILITY_CONTROL_OPTIONS_PRESERVING_ASPECT);
  canvas.add(text);
}

// UTILITY

function enableDrawing(canvas) {
  canvas.defaultCursor = "crosshair";
  drawingIndicator.style.display = "block";
}

function disableDrawing(canvas) {
  canvas.defaultCursor = "default";
  drawingIndicator.style.display = "none";

  canvas.off("mouse:down");
  canvas.off("mouse:move");
  canvas.off("mouse:up");
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

function prepareCanvasForExportWithNotes(canvas, notesText) {
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

function restoreCanvasAfterExport(canvas, extraNodesAndRestorationData) {
  if (!extraNodesAndRestorationData) {
    return;
  }

  const { background, notes, originalWidth } = extraNodesAndRestorationData;

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
