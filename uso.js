const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spin-button");
const resultBox = document.getElementById("result-box");
const wheelTitle = document.getElementById("wheel-title");
const wheelSubtitle = document.getElementById("wheel-subtitle");
const pointer = document.querySelector(".pointer");
const wheelCenter = document.querySelector(".wheel-center");

let config;
let currentRotation = 0;
let spinning = false;
let renderedWheelSize = 420;
const STORAGE_KEY = "roletaEdenConfig";
const defaultConfig = {
  title: "Roleta de Brindes",
  subtitle: "Gire a roleta, descubra seu brinde e tire um print da tela.",
  spinButtonText: "Girar roleta",
  pointerColor: "#f4f1de",
  centerColor: "#ffffff",
  backgroundStart: "#17324d",
  backgroundEnd: "#0a1724",
  wheelBorderColor: "#ffffff",
  textColor: "#ffffff",
  shadowColor: "rgba(0, 0, 0, 0.25)",
  wheelSize: 420,
  fontFamily: "'Trebuchet MS', sans-serif",
  items: [
    { label: "Caneca", color: "#e76f51" },
    { label: "Chaveiro", color: "#2a9d8f" },
    { label: "Desconto 10%", color: "#e9c46a" },
    { label: "Camiseta", color: "#264653" },
    { label: "Brinde Surpresa", color: "#f4a261" },
    { label: "Squeeze", color: "#8ab17d" },
  ],
};

function getSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultConfig;
  } catch (error) {
    return defaultConfig;
  }
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function applyTheme(nextConfig) {
  document.documentElement.style.setProperty("--bg-start", nextConfig.backgroundStart);
  document.documentElement.style.setProperty("--bg-end", nextConfig.backgroundEnd);
  document.body.style.fontFamily = nextConfig.fontFamily;
  wheelTitle.textContent = nextConfig.title;
  wheelSubtitle.textContent = nextConfig.subtitle;
  spinButton.textContent = nextConfig.spinButtonText;
  pointer.style.borderTopColor = nextConfig.pointerColor;
  wheelCenter.style.background = nextConfig.centerColor;

  const size = getResponsiveWheelSize(nextConfig);
  renderedWheelSize = size;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
}

function getResponsiveWheelSize(nextConfig) {
  const configuredSize = Number(nextConfig.wheelSize) || 420;
  const viewportWidth = window.innerWidth || configuredSize;
  const horizontalPadding = viewportWidth <= 640 ? 56 : 96;
  return Math.max(260, Math.min(configuredSize, viewportWidth - horizontalPadding));
}

function drawWheel(rotationDeg = 0) {
  const size = canvas.width;
  const radius = size / 2;
  const items = config.items;
  const sliceAngle = (Math.PI * 2) / items.length;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(degToRad(rotationDeg));

  items.forEach((item, index) => {
    const startAngle = index * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 6, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = config.textColor;
    ctx.font = `bold ${Math.max(16, size * 0.04)}px ${config.fontFamily}`;
    ctx.fillText(item.label, radius - 24, 10);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = config.wheelBorderColor;
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.restore();
}

function pickWinner(finalRotation) {
  const normalizedRotation = ((finalRotation % 360) + 360) % 360;
  const pointerAngle = (360 - normalizedRotation) % 360;
  const sliceSize = 360 / config.items.length;
  const winnerIndex = Math.floor(pointerAngle / sliceSize) % config.items.length;
  return config.items[winnerIndex];
}

function spinWheel() {
  if (spinning) return;
  spinning = true;
  resultBox.innerHTML = "<strong>Girando...</strong><span>Aguarde o resultado.</span>";

  const extraTurns = 6 + Math.floor(Math.random() * 3);
  const randomOffset = Math.random() * 360;
  const targetRotation = currentRotation + extraTurns * 360 + randomOffset;
  const duration = 5200;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const rotation = currentRotation + (targetRotation - currentRotation) * eased;

    drawWheel(rotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    currentRotation = targetRotation;
    const winner = pickWinner(currentRotation);
    resultBox.innerHTML = `<strong>Voce ganhou: ${winner.label}</strong><span>Tire um print da tela para registrar o brinde.</span>`;
    spinning = false;
  }

  requestAnimationFrame(animate);
}

async function loadConfig() {
  config = getSavedConfig();
  applyTheme(config);
  drawWheel(currentRotation);
}

window.addEventListener("resize", () => {
  if (!config) return;

  const nextSize = getResponsiveWheelSize(config);
  if (nextSize === renderedWheelSize) return;

  applyTheme(config);
  drawWheel(currentRotation);
});

spinButton.addEventListener("click", spinWheel);
loadConfig();
