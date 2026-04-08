const authPanel = document.getElementById("auth-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const configForm = document.getElementById("config-form");
const credentialsForm = document.getElementById("credentials-form");
const loginFeedback = document.getElementById("login-feedback");
const configFeedback = document.getElementById("config-feedback");
const credentialsFeedback = document.getElementById("credentials-feedback");
const wheelSizeValue = document.getElementById("wheel-size-value");
const STORAGE_KEYS = {
  config: "roletaEdenConfig",
  credentials: "roletaEdenCredentials",
};

const defaultCredentials = {
  username: "admin",
  password: "1234",
};

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

let authenticated = false;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSavedCredentials() {
  return readJson(STORAGE_KEYS.credentials, defaultCredentials);
}

function getSavedConfig() {
  return readJson(STORAGE_KEYS.config, defaultConfig);
}

function setFeedback(element, message, type) {
  element.textContent = message;
  element.className = `feedback ${type}`;
}

function itemsToText(items) {
  return items.map((item) => `${item.label} | ${item.color}`).join("\n");
}

function textToItems(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, color] = line.split("|").map((part) => part.trim());
      return {
        label,
        color: color || "#cccccc",
      };
    })
    .filter((item) => item.label);
}

function fillConfigForm(config) {
  document.getElementById("title").value = config.title;
  document.getElementById("subtitle").value = config.subtitle;
  document.getElementById("spinButtonText").value = config.spinButtonText;
  document.getElementById("wheelSize").value = config.wheelSize;
  document.getElementById("fontFamily").value = config.fontFamily;
  document.getElementById("backgroundStart").value = config.backgroundStart;
  document.getElementById("backgroundEnd").value = config.backgroundEnd;
  document.getElementById("pointerColor").value = config.pointerColor;
  document.getElementById("centerColor").value = config.centerColor;
  document.getElementById("wheelBorderColor").value = config.wheelBorderColor;
  document.getElementById("textColor").value = config.textColor;
  document.getElementById("shadowColor").value = config.shadowColor;
  document.getElementById("items").value = itemsToText(config.items);
  wheelSizeValue.textContent = `${config.wheelSize}px`;
}

async function loadConfig() {
  fillConfigForm(getSavedConfig());
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const data = getSavedCredentials();

  if (username !== data.username || password !== data.password) {
    setFeedback(loginFeedback, "Login ou senha invalidos.", "error");
    return;
  }

  authenticated = true;
  authPanel.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  setFeedback(loginFeedback, "", "");
  await loadConfig();
});

document.getElementById("wheelSize").addEventListener("input", (event) => {
  wheelSizeValue.textContent = `${event.target.value}px`;
});

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!authenticated) return;

  const config = {
    title: document.getElementById("title").value.trim(),
    subtitle: document.getElementById("subtitle").value.trim(),
    spinButtonText: document.getElementById("spinButtonText").value.trim(),
    wheelSize: Number(document.getElementById("wheelSize").value),
    fontFamily: document.getElementById("fontFamily").value.trim(),
    backgroundStart: document.getElementById("backgroundStart").value,
    backgroundEnd: document.getElementById("backgroundEnd").value,
    pointerColor: document.getElementById("pointerColor").value,
    centerColor: document.getElementById("centerColor").value,
    wheelBorderColor: document.getElementById("wheelBorderColor").value,
    textColor: document.getElementById("textColor").value,
    shadowColor: document.getElementById("shadowColor").value.trim(),
    items: textToItems(document.getElementById("items").value),
  };

  if (config.items.length < 2) {
    setFeedback(
      configFeedback,
      "Adicione pelo menos dois itens na roleta.",
      "error"
    );
    return;
  }

  writeJson(STORAGE_KEYS.config, config);
  setFeedback(configFeedback, "Configuracao salva com sucesso.", "success");
});

credentialsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    currentUsername: document.getElementById("currentUsername").value.trim(),
    currentPassword: document.getElementById("currentPassword").value,
    newUsername: document.getElementById("newUsername").value.trim(),
    newPassword: document.getElementById("newPassword").value,
  };

  const data = getSavedCredentials();

  if (
    payload.currentUsername !== data.username ||
    payload.currentPassword !== data.password
  ) {
    setFeedback(
      credentialsFeedback,
      "Credenciais atuais invalidas.",
      "error"
    );
    return;
  }

  if (!payload.newUsername || !payload.newPassword) {
    setFeedback(
      credentialsFeedback,
      "Novo login e senha sao obrigatorios.",
      "error"
    );
    return;
  }

  writeJson(STORAGE_KEYS.credentials, {
    username: payload.newUsername,
    password: payload.newPassword,
  });
  credentialsForm.reset();
  setFeedback(
    credentialsFeedback,
    "Login e senha atualizados neste navegador com sucesso.",
    "success"
  );
});

if (!localStorage.getItem(STORAGE_KEYS.credentials)) {
  writeJson(STORAGE_KEYS.credentials, defaultCredentials);
}

if (!localStorage.getItem(STORAGE_KEYS.config)) {
  writeJson(STORAGE_KEYS.config, defaultConfig);
}
