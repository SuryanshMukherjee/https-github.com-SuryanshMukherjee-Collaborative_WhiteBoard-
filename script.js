
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");
let ioSocket = io.connect("http://localhost:8080/");


let sizePicker = document.getElementById("sizePicker");
let clearBtn = document.getElementById("clearBtn");
let eraserBtn = document.getElementById("eraserBtn");
let downloadBtn = document.getElementById("downloadBtn");

let currentColor = "#000000"; 
let currentSize = sizePicker.value;
let eraserActive = false;
let lastColor = currentColor;

let x, y;
let mouseDown = false;


document.querySelectorAll(".color-swatch").forEach(swatch => {
  swatch.addEventListener("click", (e) => {
    currentColor = e.target.dataset.color;
    ctx.strokeStyle = currentColor;
    eraserActive = false;
    eraserBtn.style.background = "#007bff";
    eraserBtn.innerText = "Eraser";
  });
});


sizePicker.oninput = () => {
  currentSize = sizePicker.value;
};


eraserBtn.onclick = () => {
  if (!eraserActive) {
    eraserActive = true;
    lastColor = currentColor;
    currentColor = "#FFFFFF"; 
    eraserBtn.style.background = "red";
    eraserBtn.innerText = "Drawing";
    shapePicker.value = "freehand";
    currentShape = "freehand";
  } else {
    eraserActive = false;
    currentColor = lastColor;
    eraserBtn.style.background = "#007bff";
    eraserBtn.innerText = "Eraser";
  }
};


const moveBtn = document.getElementById("moveBtn");
let moveMode = false;
let moveStart = { x: 0, y: 0 };
let moveOffset = { x: 0, y: 0 };
let tempImage = null;

moveBtn.onclick = () => {
  moveMode = !moveMode;

  if (moveMode) {
    moveBtn.style.background = "orange";
    moveBtn.innerText = "Moving...";
  } else {
    moveBtn.style.background = "#007bff";
    moveBtn.innerText = "Move";
  }
};


canvas.addEventListener("mousedown", (e) => {
  if (!moveMode) return;

  moveStart = { x: e.clientX, y: e.clientY };
  tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  mouseDown = true;
});


canvas.addEventListener("mousemove", (e) => {
  if (!moveMode || !mouseDown) return;

  const offsetX = e.clientX - moveStart.x;
  const offsetY = e.clientY - moveStart.y;

 
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(tempImage, offsetX, offsetY);
});


canvas.addEventListener("mouseup", (e) => {
  if (!moveMode) return;
  mouseDown = false;

  const offsetX = e.clientX - moveStart.x;
  const offsetY = e.clientY - moveStart.y;

  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(tempImage, offsetX, offsetY);

  
  const movedImage = canvas.toDataURL();
  ioSocket.emit("moveCanvas", { image: movedImage });

  
  moveMode = false;
  moveBtn.style.background = "#007bff";
  moveBtn.innerText = "Move";
});




clearBtn.onclick = () => {
  clearBoard();
  ioSocket.emit("clear");
};


downloadBtn.onclick = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const link = document.createElement("a");
  link.download = `Whiteboard_${timestamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};


function clearBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


let shapePicker = document.getElementById("shapePicker");
let currentShape = shapePicker.value;
let startX, startY;
let drawingShape = false;
let tempImageData = null;

shapePicker.onchange = () => {
  currentShape = shapePicker.value;
  drawingShape = false;
  mouseDown = false;
  ctx.beginPath(); 
  eraserActive = false;
  eraserBtn.style.background = "#007bff";
};

canvas.onmousedown = (e) => {
  if (moveMode) return; 
  startX = e.clientX;
  startY = e.clientY;
  mouseDown = true;

  
  if (currentShape !== "freehand") {
    drawingShape = true;
    tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } else {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ioSocket.emit("down", { x: startX, y: startY, color: currentColor, size: currentSize });
  }
};

canvas.onmousemove = (e) => {
  applyToolSettings();

  if (!mouseDown) return;
  let endX = e.clientX;
  let endY = e.clientY;

  if (drawingShape) {
    
    ctx.putImageData(tempImageData, 0, 0);
    drawShape(ctx, currentShape, startX, startY, endX, endY, currentColor, currentSize);
  } else {
    
    ioSocket.emit("draw", { x: e.clientX, y: e.clientY, color: currentColor, size: currentSize });
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  }
};

canvas.onmouseup = (e) => {
  applyToolSettings();

  if (!mouseDown) return;
  mouseDown = false;
  let endX = e.clientX;
  let endY = e.clientY;

  if (drawingShape) {
    drawShape(ctx, currentShape, startX, startY, endX, endY, currentColor, currentSize);
    ioSocket.emit("shapeDraw", { shape: currentShape, startX, startY, endX, endY, color: currentColor, size: currentSize });
    drawingShape = false;
    tempImageData = null;
  }

  
  ctx.beginPath();
};
// ---------------------------
// Tool Selection Logic
// ---------------------------
let toolPicker = document.getElementById("toolPicker");
let currentTool = toolPicker.value;

toolPicker.onchange = () => {
  currentTool = toolPicker.value;
  applyToolSettings();
};

// Function to apply the selected tool's properties
function applyToolSettings() {
  switch (currentTool) {
    case "pencil":
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      break;

    case "brush":
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      break;

    case "marker":
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      break;

    case "highlighter":
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      break;

    default:
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = currentSize;
  }
}





ioSocket.on("ondraw", ({ x, y, color, size }) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineTo(x, y);
  ctx.stroke();
});

ioSocket.on("ondown", ({ x, y, color, size }) => {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.moveTo(x, y);
});

ioSocket.on("clearBoard", () => clearBoard());

ioSocket.on("onMoveCanvas", (data) => {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = data.image;
});
ioSocket.on("onShapeDraw", (data) => {
  drawShape(ctx, data.shape, data.startX, data.startY, data.endX, data.endY, data.color, data.size);
});



function drawShape(ctx, shape, x1, y1, x2, y2, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();

  switch (shape) {
    case "line":
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;

    case "rectangle":
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      break;

    case "circle":
      let radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
      break;

    case "ellipse":
      ctx.ellipse(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        Math.abs(x2 - x1) / 2,
        Math.abs(y2 - y1) / 2,
        0, 0, 2 * Math.PI
      );
      break;

    case "triangle":
      ctx.moveTo(x1, y2);
      ctx.lineTo((x1 + x2) / 2, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      break;

    case "arrow":
      drawArrow(ctx, x1, y1, x2, y2);
      break;

    case "star":
      drawStar(ctx, (x1 + x2) / 2, (y1 + y2) / 2, 5, Math.abs(x2 - x1) / 2, Math.abs(x2 - x1) / 4);
      break;

    default:
      return;
  }

  ctx.stroke();
}


function drawArrow(ctx, fromX, fromY, toX, toY) {
  const headLength = 15;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}


function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let step = Math.PI / spikes;
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}




function openModal(modalId) {
  document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}


document.getElementById("learnBtn").onclick = () => openModal("learnModal");
document.getElementById("developedBtn").onclick = () => openModal("developedModal");
document.getElementById("helpBtn").onclick = () => openModal("helpModal");


document.getElementById("closeLearn").onclick = () => closeModal("learnModal");
document.getElementById("closeDeveloped").onclick = () => closeModal("developedModal");
document.getElementById("closeHelp").onclick = () => closeModal("helpModal");


window.onclick = (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
};

const themeBtn = document.getElementById("themeBtn");
let darkMode = false;

themeBtn.onclick = () => {
  darkMode = !darkMode;

  if (darkMode) {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️ Light Mode";
    canvas.style.background = "#121212";
  } else {
    document.body.classList.remove("dark");
    themeBtn.textContent = "🌙 Dark Mode";
    canvas.style.background = "#ffffff";
  }
};
