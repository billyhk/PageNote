// Constants
const PROJECT_NAME = "PageNote";
const CROPPED_IMAGE_STORAGE_KEY = "croppedImage";
const SCREENSHOT_URL_STORAGE_KEY = "screenshotUrl";
const EXCLUDE_FROM_LAYERS_LIST_KEY = "excludeFromLayersList";
const VISIBILITY_CONTROL_OPTIONS_PRESERVING_ASPECT = {
  mt: false, // middle top disable
  mb: false, // middle bottom disable
  ml: false, // middle left disable
  mr: false, // middle right disable
};
const CUSTOM_TYPES = {
  ARROW: "Arrow",
  RECTANGLE: "Rectangle",
  TEXT: "Text",
  PATH: "Path",
};
const DEFAULT_COLOR = "red";

// Elements //
// Shape Selector
const shapeSelectorMenu = document.getElementById("shape-selector_menu");
const shapeSelectorButton = document.getElementById("shape-selector_btn");

// Image Selector
const openAddImageModalButton = document.getElementById("add-image-btn");
const imagePlacementModal = document.getElementById("image-placement-modal");
const closeImagePlacementModalButton = document.getElementById(
  "close-image-placement-modal-btn"
);
const imageSelectorFileInput = document.getElementById("image-selector");
const imagePlacementModalButtons = document.querySelectorAll(
  "#image-placement-modal button"
);

// Export
const exportButton = document.getElementById("export-btn");
const fileNameInput = document.getElementById("filename-input");

// Side Panels
const toggleLayersPanelCollapsedBtn =
  document.getElementById("toggle-layers-btn");
const toggleNotesPanelCollapsedBtn =
  document.getElementById("toggle-notes-btn");

// Notes
const notesPanel = document.getElementById("notes-panel");
const notesInput = document.getElementById("notes-input");

// Layers
const layersList = document.getElementById("layers-list");
const drawingIndicator = document.getElementById("drawing-enabled-indicator");
const layersPanel = document.getElementById("layers-panel");
const colorSelector = document.getElementById("color-selector");

// Reset
const resetButton = document.getElementById("reset-btn");

// Dynamic variables
let objectId = 0;
let MAX_IMG_WIDTH = 1100;
let MAX_IMG_HEIGHT = 1100;

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
  document.addEventListener("keydown", function (event) {
    if (event.key === "Backspace" || event.key === "Delete") {
      if (!canvas.getActiveObject()?.isEditing) {
        removeActiveObject(canvas);
        return;
      }
    }
    if (event.key === "Escape") {
      removeActiveObject(canvas, false);
      disableDrawing(canvas);
      return;
    }
  });

  shapeSelectorMenu.addEventListener("change", function () {
    disableDrawing(canvas);
  });

  shapeSelectorButton.addEventListener("click", function () {
    addShape(shapeSelectorMenu.value, canvas);
  });

  colorSelector.addEventListener("change", function (e) {
    const selectedColor = e.target.value;
    applyColorToSelection(canvas, selectedColor);
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

  toggleLayersPanelCollapsedBtn.addEventListener("click", function () {
    const layersPanel = document.getElementById("layers-panel");
    layersPanel.classList.toggle("collapsed");

    this.innerHTML = layersPanel.classList.contains("collapsed")
      ? "&#8594;"
      : "&#8592;"; // Right arrow for collapsed, left arrow for expanded
  });

  toggleNotesPanelCollapsedBtn.addEventListener("click", function () {
    notesPanel.classList.toggle("collapsed");

    this.innerHTML = notesPanel.classList.contains("collapsed")
      ? "&#8594;"
      : "&#8592;"; // Right arrow for collapsed, left arrow for expanded

    notesInput.disabled = !notesInput.disabled; // Toggle disabled state
  });

  drawingIndicator.addEventListener("click", function () {
    toggleDrawingMode(canvas, false);
  });

  openAddImageModalButton.addEventListener("click", openImagePlacementModal);

  imagePlacementModalButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const side = this.getAttribute("data-side");
      if (imageSelectorFileInput.files.length > 0) {
        const file = imageSelectorFileInput.files[0];
        adjustCanvasAndAddImage(canvas, file, side);
        closeImagePlacementModal();
      }
    });
  });

  closeImagePlacementModalButton.addEventListener(
    "click",
    closeImagePlacementModal
  );

  resetButton.addEventListener("click", function () {
    window.location.reload();
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
    updateColorSelectorVisibility(canvas);
    highlightActiveObjectInLayersList(e.selected);
    updateColorSelectorValue(e.selected);
  });

  canvas.on("selection:updated", function (e) {
    updateColorSelectorVisibility(canvas);
    highlightActiveObjectInLayersList(e.selected);
    updateColorSelectorValue(e.selected);
  });

  canvas.on("selection:cleared", function () {
    updateColorSelectorVisibility(canvas);
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

    // Adjust canvas height to accommodate the URL banner
    canvas.setHeight(canvas.height + borderHeight);

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
  const scaledSize = calculateImgSizeAndScaleImgToWidth(img);

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

  return scaledSize;
}

function adjustCanvasAndAddImage(canvas, file, side) {
  const imageUrl = URL.createObjectURL(file);

  fabric.Image.fromURL(imageUrl, function (img) {
    // Use the helper function to get scaled dimensions
    const scaledSize = calculateImgSizeAndScaleImgToWidth(img);

    // Increase max size because we have more images
    MAX_IMG_WIDTH *= 2;
    MAX_IMG_HEIGHT *= 2;

    // Determine new canvas dimensions and calculate the shift for existing objects
    let newCanvasWidth = canvas.width;
    let newCanvasHeight = canvas.height;
    let shiftX = 0;
    let shiftY = 0;

    switch (side) {
      case "left":
        newCanvasWidth += scaledSize.width;
        newCanvasWidth = Math.min(newCanvasWidth, MAX_IMG_WIDTH);
        shiftX = scaledSize.width; // Shift existing objects to the right
        break;
      case "right":
        newCanvasWidth += scaledSize.width;
        newCanvasWidth = Math.min(newCanvasWidth, MAX_IMG_WIDTH);
        // No shift needed; new image goes to the right
        break;
      case "top":
        newCanvasHeight += scaledSize.height;
        newCanvasHeight = Math.min(newCanvasHeight, MAX_IMG_HEIGHT);
        shiftY = scaledSize.height; // Shift existing objects down
        break;
      case "bottom":
        newCanvasHeight += scaledSize.height;
        newCanvasHeight = Math.min(newCanvasHeight, MAX_IMG_HEIGHT);
        // No shift needed; new image goes to the bottom
        break;
    }

    // Update canvas size
    canvas.setWidth(newCanvasWidth);
    canvas.setHeight(newCanvasHeight);

    // Shift existing canvas objects
    canvas.forEachObject(function (obj) {
      obj
        .set({
          left: obj.left + shiftX,
          top: obj.top + shiftY,
        })
        .setCoords(); // Update object coordinates after moving
    });

    // Set new image position
    switch (side) {
      case "left":
        img.set({ left: 0, top: (canvas.height - img.getScaledHeight()) / 2 });
        break;
      case "right":
        img.set({
          left: canvas.width - scaledSize.width, // Adjusted to use scaledSize.width
          top: (canvas.height - img.getScaledHeight()) / 2,
        });
        break;
      case "top":
        img.set({ top: 0, left: (canvas.width - img.getScaledWidth()) / 2 });
        break;
      case "bottom":
        img.set({
          top: canvas.height - scaledSize.height, // Adjusted to use scaledSize.height
          left: (canvas.width - img.getScaledWidth()) / 2,
        });
        break;
    }

    // Add the image to the canvas and render
    canvas.add(
      img.set({
        [EXCLUDE_FROM_LAYERS_LIST_KEY]: true,
      })
    );
    canvas.renderAll();

    URL.revokeObjectURL(imageUrl);
  });
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
    case "draw":
      toggleDrawingMode(canvas, true);
      break;
    default:
      console.log("Tool not implemented:", selectedShape);
  }
}

// SHAPE: FREE DRAWING

function toggleDrawingMode(canvas, enable) {
  canvas.isDrawingMode = enable;
  if (enable) {
    enableDrawing(canvas);
    canvas.freeDrawingBrush.color = DEFAULT_COLOR;
    canvas.freeDrawingBrush.width = 5;
  } else {
    disableDrawing(canvas);
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
      stroke: DEFAULT_COLOR,
      strokeWidth: 2,
      fill: "",
      noScaleCache: false,
      strokeUniform: true,
      id: objectId++,
      customType: CUSTOM_TYPES.RECTANGLE,
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
    fill: DEFAULT_COLOR,
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
    fill: DEFAULT_COLOR,
    customType: CUSTOM_TYPES.ARROW,
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
      fill: DEFAULT_COLOR,
      stroke: DEFAULT_COLOR,
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
    fill: DEFAULT_COLOR,
    lineHeight: 1.1,
    fontSize: 28,
    customType: CUSTOM_TYPES.TEXT,
  });
  text.setControlsVisibility(VISIBILITY_CONTROL_OPTIONS_PRESERVING_ASPECT);
  canvas.add(text);
}

// DRAWING

function enableDrawing(canvas) {
  canvas.defaultCursor = "crosshair";
  drawingIndicator.style.display = "block";

  // Disable object-selection while drawing
  canvas.forEachObject(function (o) {
    o.selectable = false;
    o.evented = false;
  });
}

function disableDrawing(canvas) {
  canvas.isDrawingMode = false;

  canvas.defaultCursor = "default";
  drawingIndicator.style.display = "none";

  // Enable object-selection
  canvas.forEachObject(function (o) {
    if (!o[EXCLUDE_FROM_LAYERS_LIST_KEY]) {
      o.selectable = true;
      o.evented = true;
    }
  });

  canvas.off("mouse:down");
  canvas.off("mouse:move");
  canvas.off("mouse:up");
}

// COLOR

function applyColorToSelection(canvas, selectedColor) {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;

  if (activeObject.type === "activeSelection") {
    activeObject.forEachObject((obj) => {
      updateColorPropertiesByType(obj, selectedColor);
    });
    canvas.requestRenderAll();
    return;
  }

  updateColorPropertiesByType(activeObject, selectedColor);
  canvas.requestRenderAll();
}

function updateColorPropertiesByType(activeObject, selectedColor) {
  setUpdatedArrowColorProperties(activeObject, selectedColor);
  setUpdatedRectableBorderColorProperties(activeObject, selectedColor);
  setUpdatedPathColorProperties(activeObject, selectedColor);
  setUpdatedTextColorProperties(activeObject, selectedColor);
}

function setUpdatedPathColorProperties(activeObject, selectedColor) {
  if (activeObject.type === CUSTOM_TYPES.PATH.toLowerCase()) {
    activeObject.set({ stroke: selectedColor });
  }
}

function setUpdatedRectableBorderColorProperties(activeObject, selectedColor) {
  if (activeObject.customType === CUSTOM_TYPES.RECTANGLE) {
    activeObject.set({ stroke: selectedColor });
  }
}

function setUpdatedTextColorProperties(activeObject, selectedColor) {
  if (activeObject.customType === CUSTOM_TYPES.TEXT) {
    activeObject.set({ fill: selectedColor });
  }
}

function setUpdatedArrowColorProperties(activeObject, selectedColor) {
  if (activeObject.customType === CUSTOM_TYPES.ARROW) {
    const updatedProperties = { fill: selectedColor, stroke: selectedColor };
    activeObject.set(updatedProperties);

    activeObject._objects.forEach((obj) => {
      if (obj.type === "line") {
        obj.set(updatedProperties);
      }
      if (obj.type === "triangle") {
        obj.set(updatedProperties);
      }
    });
  }
}

function updateColorSelectorVisibility(canvas) {
  const activeObject = canvas.getActiveObject();
  colorSelector.style.display = activeObject ? "block" : "none";
}

function updateColorSelectorValue(activeObjects) {
  // Initialize a set to track unique colors
  let uniqueColors = new Set();

  // Iterate over each object in the group to collect unique colors
  activeObjects.forEach((obj) => {
    const color = obj.stroke ?? obj.fill;
    uniqueColors.add(color);
  });

  // If multiple unique colors are found, use the placeholder option
  if (uniqueColors.size > 1) {
    colorSelector.value = ""; // Set to the placeholder option value
    return;
  }

  // If there's only one unique color, set the selector to that color
  colorSelector.value = uniqueColors.values().next().value ?? "";
  return;
}

// UTILITY
function calculateImgSizeAndScaleImgToWidth(img) {
  const scaledSize = {
    height: 0,
    width: 0,
  };

  const aspectRatio = img.height / img.width;
  const scaleImgToWidth = function () {
    // Set the image size to the new dimensions
    img.scaleToWidth(scaledSize.width);
    img.scaleToHeight(scaledSize.height);
  };

  if (img.width > MAX_IMG_WIDTH) {
    scaledSize.width = MAX_IMG_WIDTH;
    scaledSize.height = scaledSize.width * aspectRatio;
    scaleImgToWidth();
    return scaledSize;
  }

  if (img.height > MAX_IMG_HEIGHT) {
    scaledSize.height = MAX_IMG_HEIGHT;
    scaledSize.width = scaledSize.height * aspectRatio;
    scaleImgToWidth();
    return scaledSize;
  }

  scaledSize.height = img.height;
  scaledSize.width = img.width;
  return scaledSize;
}

function capitalizeFirstLetter(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function openImagePlacementModal() {
  imagePlacementModal.style.display = "flex";
}

function closeImagePlacementModal() {
  imageSelectorFileInput.value = "";
  imagePlacementModal.style.display = "none";
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
    li.textContent = `${capitalizeFirstLetter(objType)} ${typeCount[objType]}`;
    li.onclick = function () {
      canvas.setActiveObject(obj); // Set the clicked object as active
      highlightActiveObjectInLayersList([obj]);
      canvas.renderAll();
    };

    layersList.appendChild(li);
  });
}

function removeActiveObject(canvas, shouldRemove = true) {
  var activeObject = canvas.getActiveObject();

  if (activeObject) {
    if (shouldRemove) {
      if (activeObject._objects?.length) {
        activeObject._objects.forEach(function (obj) {
          canvas.remove(obj);
        });
      }
      canvas.remove(activeObject);
    }

    // Deselect object and update canvas
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
}

function highlightActiveObjectInLayersList(activeObjects) {
  clearHighlighting();

  activeObjects.forEach((obj) => {
    const listItem = document.querySelector(
      `#layers-list li[data-id="${obj.id}"]`
    );
    if (listItem) {
      listItem.classList.add("active");
    }
  });
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

    borderColor: DEFAULT_COLOR,
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
