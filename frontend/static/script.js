// ==============================
// Job Tracker - Frontend Script
// ==============================

// Detect environment
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// IMPORTANT:
// - Local: backend em http://localhost:8000
// - Prod: backend em Railway (HTTPS)
const PROD_API_ORIGIN = "https://job-finder-tracker-production.up.railway.app";

// If your app is served under /app (like https://.../app),
// some backends are also mounted under /app. Your screenshot showed /app/applications.
// So we auto-detect and set API_PREFIX accordingly in production.
const API_PREFIX = !isLocal && window.location.pathname.startsWith("/app")
  ? "/app"
  : "";

// Base API origin
const API_ORIGIN = isLocal ? "http://localhost:8000" : PROD_API_ORIGIN;

// Force HTTPS in production (avoid mixed content if something changes)
const SAFE_API_ORIGIN = isLocal
  ? API_ORIGIN
  : API_ORIGIN.replace(/^http:\/\//i, "https://");

// Helper: always build API URLs here
function apiUrl(path) {
  // Ensure path starts with /
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SAFE_API_ORIGIN}${API_PREFIX}${p}`;
}

let token = localStorage.getItem("token");
let currentUser = null;

// Debug (remove if you want)
console.log("ENV:", isLocal ? "local" : "prod");
console.log("API_ORIGIN:", SAFE_API_ORIGIN);
console.log("API_PREFIX:", API_PREFIX);
console.log("Example applications URL:", apiUrl("/applications"));

// ------------------------------
// Initialize
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  hideLoading();

  // Update chance indicator on input
  const chanceInput = document.getElementById("inputChance");
  if (chanceInput) {
    chanceInput.addEventListener("input", (e) => {
      updateChanceIndicator(e.target.value);
    });
  }

  if (token) {
    showDashboard();
    loadApplications();
  } else {
    showAuth();
  }
});

// ------------------------------
// Loading
// ------------------------------
function showLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "flex";
}

function hideLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "none";
}

// ------------------------------
// Auth Screens
// ------------------------------
function showAuth() {
  const auth = document.getElementById("authScreen");
  const dash = document.getElementById("dashboard");
  if (auth) auth.style.display = "flex";
  if (dash) dash.style.display = "none";
}

function showDashboard() {
  const auth = document.getElementById("authScreen");
  const dash = document.getElementById("dashboard");
  if (auth) auth.style.display = "none";
  if (dash) dash.style.display = "flex";

  if (currentUser) {
    const userEmail = document.getElementById("userEmail");
    if (userEmail) userEmail.textContent = currentUser.email;
  }
}

function showLogin() {
  const login = document.getElementById("loginForm");
  const reg = document.getElementById("registerForm");
  if (login) login.style.display = "block";
  if (reg) reg.style.display = "none";
}

function showRegister() {
  const login = document.getElementById("loginForm");
  const reg = document.getElementById("registerForm");
  if (login) login.style.display = "none";
  if (reg) reg.style.display = "block";
}

// ------------------------------
// Register
// ------------------------------
async function handleRegister(e) {
  e.preventDefault();
  showLoading();

  const email = document.getElementById("registerEmail")?.value?.trim();
  const password = document.getElementById("registerPassword")?.value;

  try {
    const response = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await safeJson(response);

    if (response.ok) {
      showToast("Conta criada com sucesso! Faça login.", "success");
      showLogin();
      const loginEmail = document.getElementById("loginEmail");
      if (loginEmail) loginEmail.value = email || "";
    } else {
      showToast(data?.detail || "Erro ao criar conta", "error");
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ------------------------------
// Login
// ------------------------------
async function handleLogin(e) {
  e.preventDefault();
  showLoading();

  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value;

  try {
    const formData = new URLSearchParams();
    formData.append("username", email || "");
    formData.append("password", password || "");

    const response = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await safeJson(response);

    if (response.ok) {
      token = data.access_token;
      localStorage.setItem("token", token);
      currentUser = { email };
      showToast("Login realizado com sucesso!", "success");
      showDashboard();
      loadApplications();
    } else {
      showToast(data?.detail || "Email ou senha incorretos", "error");
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ------------------------------
// Logout
// ------------------------------
function logout() {
  localStorage.removeItem("token");
  token = null;
  currentUser = null;
  showAuth();
  showToast("Logout realizado com sucesso", "success");
}

// ------------------------------
// Load Applications
// ------------------------------
async function loadApplications() {
  showLoading();

  try {
    const response = await fetch(apiUrl("/applications"), {
      headers: authHeader(),
    });

    if (response.ok) {
      const applications = await safeJson(response);
      renderApplications(Array.isArray(applications) ? applications : []);
      updateStats(Array.isArray(applications) ? applications : []);
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      showToast("Erro ao carregar candidaturas", "error");
      console.error("loadApplications status:", response.status);
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ------------------------------
// Render Applications
// ------------------------------
function renderApplications(applications) {
  const container = document.getElementById("applicationsList");
  const emptyState = document.getElementById("emptyState");

  if (!container || !emptyState) return;

  if (!applications || applications.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  container.innerHTML = applications
    .map(
      (app) => `
      <div class="application-card" data-id="${escapeHtml(app.id)}">
        <div class="app-header">
          <div class="app-title">
            <h3>${escapeHtml(app.nome)}</h3>
            <p class="app-empresa">🏢 ${escapeHtml(app.empresa)}</p>
          </div>
          <div class="app-actions">
            <button class="icon-btn" onclick="editApplication(${Number(app.id)})" title="Editar">✏️</button>
            <button class="icon-btn" onclick="deleteApplication(${Number(app.id)})" title="Deletar">🗑️</button>
          </div>
        </div>

        <div class="app-info">
          <div class="info-item">
            <span class="info-label">📅 Data:</span>
            <span class="info-value">${formatDate(app.data)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">💼 Cargo:</span>
            <span class="info-value">${escapeHtml(app.role)}</span>
          </div>
        </div>

        <div class="app-footer">
          <span class="status-badge ${escapeHtml(app.status)}">
            ${getStatusIcon(app.status)} ${getStatusText(app.status)}
          </span>
          <div class="chance-display">
            <span>Chance:</span>
            <strong>${Number(app.chance) || 0}%</strong>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// ------------------------------
// Update Stats
// ------------------------------
function updateStats(applications) {
  const stats = {
    esperando: 0,
    entrevista: 0,
    rejeitado: 0,
    total: applications.length,
  };

  applications.forEach((app) => {
    if (stats[app.status] !== undefined) stats[app.status]++;
  });

  setText("statEsperando", stats.esperando);
  setText("statEntrevista", stats.entrevista);
  setText("statRejeitado", stats.rejeitado);
  setText("statTotal", stats.total);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// ------------------------------
// Modal
// ------------------------------
function showAddModal() {
  setText("modalTitle", "Nova Candidatura");
  setText("submitBtn", "Salvar");

  const form = document.getElementById("applicationForm");
  if (form) form.reset();

  const editId = document.getElementById("editId");
  if (editId) editId.value = "";

  // Set today's date as default
  const today = new Date().toISOString().split("T")[0];
  const inputData = document.getElementById("inputData");
  if (inputData) inputData.value = today;

  updateChanceIndicator(50);

  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("active");
}

// Close modal on outside click
document.getElementById("modal")?.addEventListener("click", (e) => {
  if (e.target?.id === "modal") closeModal();
});

// ------------------------------
// Edit Application
// ------------------------------
async function editApplication(id) {
  showLoading();

  try {
    const response = await fetch(apiUrl(`/applications/${id}`), {
      headers: authHeader(),
    });

    if (response.ok) {
      const app = await safeJson(response);

      setText("modalTitle", "Editar Candidatura");
      setText("submitBtn", "Atualizar");

      const editId = document.getElementById("editId");
      if (editId) editId.value = app.id;

      setValue("inputNome", app.nome);
      setValue("inputEmpresa", app.empresa);
      setValue("inputData", app.data);
      setValue("inputRole", app.role);
      setValue("inputStatus", app.status);
      setValue("inputChance", app.chance);

      updateChanceIndicator(app.chance);

      document.getElementById("modal")?.classList.add("active");
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      showToast("Erro ao carregar candidatura", "error");
      console.error("editApplication status:", response.status);
    }
  } catch (err) {
    showToast("Erro de conexão", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

// ------------------------------
// Submit Application (Create/Update)
// ------------------------------
async function handleSubmitApplication(e) {
  e.preventDefault();
  showLoading();

  const editId = document.getElementById("editId")?.value;

  const applicationData = {
    nome: document.getElementById("inputNome")?.value?.trim(),
    empresa: document.getElementById("inputEmpresa")?.value?.trim(),
    data: document.getElementById("inputData")?.value,
    role: document.getElementById("inputRole")?.value?.trim(),
    status: document.getElementById("inputStatus")?.value,
    chance: parseInt(document.getElementById("inputChance")?.value, 10) || 0,
  };

  try {
    const url = editId
      ? apiUrl(`/applications/${editId}`)
      : apiUrl("/applications");

    const method = editId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        ...authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(applicationData),
    });

    if (response.ok) {
      showToast(editId ? "Candidatura atualizada!" : "Candidatura criada!", "success");
      closeModal();
      loadApplications();
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao salvar candidatura", "error");
      console.error("handleSubmitApplication status:", response.status, data);
    }
  } catch (err) {
    showToast("Erro de conexão", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ------------------------------
// Delete Application
// ------------------------------
async function deleteApplication(id) {
  if (!confirm("Tem certeza que deseja deletar esta candidatura?")) return;

  showLoading();

  try {
    const response = await fetch(apiUrl(`/applications/${id}`), {
      method: "DELETE",
      headers: authHeader(),
    });

    if (response.ok) {
      showToast("Candidatura deletada!", "success");
      loadApplications();
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      showToast("Erro ao deletar candidatura", "error");
      console.error("deleteApplication status:", response.status);
    }
  } catch (err) {
    showToast("Erro de conexão", "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ------------------------------
// Chance Indicator
// ------------------------------
function updateChanceIndicator(value) {
  const indicator = document.getElementById("chanceIndicator");
  if (indicator) indicator.style.width = `${Number(value) || 0}%`;
}

// ------------------------------
// Utils
// ------------------------------
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return isNaN(date.getTime()) ? String(dateString) : date.toLocaleDateString("pt-BR");
}

function getStatusIcon(status) {
  const icons = { esperando: "⏳", entrevista: "🎯", rejeitado: "❌" };
  return icons[status] || "📝";
}

function getStatusText(status) {
  const texts = { esperando: "Esperando", entrevista: "Entrevista", rejeitado: "Rejeitado" };
  return texts[status] || status;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

function authHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Safe JSON parse even when body is empty / not json
async function safeJson(response) {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Small XSS protection for card rendering
function escapeHtml(v) {
  const s = String(v ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
