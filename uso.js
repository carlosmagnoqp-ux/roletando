const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spin-button");
const resultBox = document.getElementById("result-box");
const wheelTitle = document.getElementById("wheel-title");
const wheelSubtitle = document.getElementById("wheel-subtitle");
const spinDatetime = document.getElementById("spin-datetime");
const pointer = document.querySelector(".pointer");
const wheelCenter = document.querySelector(".wheel-center");

let config;
let currentRotation = 0;
let spinning = false;
let renderedWheelSize = 420;
let audioContext = null;
let lastTickSliceIndex = null;
const CONFIG_URL = "./config.json";
const COOLDOWN_STORAGE_KEY = "roletaEdenLastSpinAt";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
let cooldownTimerId = null;
let dateTimeTimerId = null;
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

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playRouletteTick() {
  const context = ensureAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(1850, now);
  oscillator.frequency.exponentialRampToValueAtTime(1100, now + 0.03);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.Q.setValueAtTime(1.8, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.05);
}

function getSliceBoundaryIndex(rotationDeg) {
  const sliceSize = 360 / config.items.length;
  const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
  return Math.floor(normalizedRotation / sliceSize);
}

function syncRouletteTick(rotationDeg) {
  const sliceIndex = getSliceBoundaryIndex(rotationDeg);
  if (lastTickSliceIndex === null) {
    lastTickSliceIndex = sliceIndex;
    return;
  }

  if (sliceIndex !== lastTickSliceIndex) {
    playRouletteTick();
    lastTickSliceIndex = sliceIndex;
  }
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatFullDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(date);
}

function startDateTimeClock() {
  const renderNow = () => {
    spinDatetime.textContent = formatFullDateTime(new Date());
  };

  renderNow();

  if (dateTimeTimerId) {
    clearInterval(dateTimeTimerId);
  }

  dateTimeTimerId = window.setInterval(renderNow, 1000);
}

function getLastSpinAt() {
  const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getRemainingCooldown() {
  const lastSpinAt = getLastSpinAt();
  if (!lastSpinAt) return 0;

  const elapsed = Date.now() - lastSpinAt;
  return Math.max(0, COOLDOWN_MS - elapsed);
}

function updateCooldownState() {
  const remaining = getRemainingCooldown();
  const buttonLabel = config?.spinButtonText || defaultConfig.spinButtonText;

  if (remaining <= 0) {
    spinButton.disabled = false;
    spinButton.textContent = buttonLabel;

    if (cooldownTimerId) {
      clearInterval(cooldownTimerId);
      cooldownTimerId = null;
    }
    return;
  }

  spinButton.disabled = true;
  spinButton.textContent = `Disponivel em ${formatRemainingTime(remaining)}`;
}

function startCooldownTimer() {
  updateCooldownState();

  if (cooldownTimerId) {
    clearInterval(cooldownTimerId);
  }

  cooldownTimerId = window.setInterval(() => {
    updateCooldownState();
  }, 1000);
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

function wrapText(text, maxCharsPerLine = 14, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = visibleLines[maxLines - 1];
  visibleLines[maxLines - 1] = `${lastLine.slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
  return visibleLines;
}

function drawWheel(rotationDeg = 0) {
  const size = canvas.width;
  const radius = size / 2;
  const items = config.items;
  const sliceAngle = (Math.PI * 2) / items.length;
  const outerRadius = radius - 6;
  const dividerDotRadius = Math.max(3, size * 0.009);
  const dividerDotDistance = outerRadius - Math.max(10, size * 0.03);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(degToRad(rotationDeg));

  items.forEach((item, index) => {
    const startAngle = index * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, outerRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = config.textColor;
    ctx.shadowBlur = 0;

    const fontSize = Math.max(11, size * 0.032);
    const lineHeight = fontSize * 1.08;
    const textRadius = radius * 0.63;
    const maxCharsPerLine = size <= 320 ? 11 : 14;
    const lines = wrapText(item.label, maxCharsPerLine, 3);
    const totalHeight = (lines.length - 1) * lineHeight;

    ctx.font = `700 ${fontSize}px ${config.fontFamily}`;
    lines.forEach((line, lineIndex) => {
      const y = lineIndex * lineHeight - totalHeight / 2;
      ctx.fillText(line, textRadius, y);
    });
    ctx.restore();
  });

  items.forEach((_, index) => {
    const endAngle = (index + 1) * sliceAngle - Math.PI / 2;

    ctx.save();
    ctx.rotate(endAngle);
    ctx.beginPath();
    ctx.arc(dividerDotDistance, 0, dividerDotRadius, 0, Math.PI * 2);
    ctx.fillStyle = config.wheelBorderColor;
    ctx.shadowBlur = 0;
    ctx.fill();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
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
  if (spinning || getRemainingCooldown() > 0) {
    updateCooldownState();
    return;
  }

  ensureAudioContext();
  spinning = true;
  spinButton.disabled = true;
  resultBox.innerHTML = "<strong>Girando...</strong><span>Aguarde o resultado.</span>";

  const extraTurns = 6 + Math.floor(Math.random() * 3);
  const randomOffset = Math.random() * 360;
  const targetRotation = currentRotation + extraTurns * 360 + randomOffset;
  const duration = 5200;
  const start = performance.now();
  lastTickSliceIndex = getSliceBoundaryIndex(currentRotation);

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const rotation = currentRotation + (targetRotation - currentRotation) * eased;

    syncRouletteTick(rotation);
    drawWheel(rotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    currentRotation = targetRotation;
    const winner = pickWinner(currentRotation);
    const spinTimestamp = Date.now();
    localStorage.setItem(COOLDOWN_STORAGE_KEY, String(spinTimestamp));
    resultBox.innerHTML = `<strong>Voce ganhou: ${winner.label}</strong><span>Tire um print da tela e nos envie no WhatsApp para garantir seu brinde!</span>`;
    spinning = false;
    lastTickSliceIndex = null;
    startCooldownTimer();
  }

  requestAnimationFrame(animate);
}

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Nao foi possivel carregar o config.json.");
    }

    const data = await response.json();
    config = {
      ...defaultConfig,
      ...data,
      items: Array.isArray(data.items) && data.items.length >= 2
        ? data.items
        : defaultConfig.items,
    };
  } catch (error) {
    config = defaultConfig;
  }

  applyTheme(config);
  drawWheel(currentRotation);
  updateCooldownState();
  startDateTimeClock();
}

window.addEventListener("resize", () => {
  if (!config) return;

  const nextSize = getResponsiveWheelSize(config);
  if (nextSize === renderedWheelSize) return;

  applyTheme(config);
  drawWheel(currentRotation);
  updateCooldownState();
});

spinButton.addEventListener("click", spinWheel);
loadConfig();
