// Importa funções do Firebase para autenticação Google
import { auth, googleProvider, signInWithPopup } from "./firebase-config.js";

// Detecta se está rodando localmente
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// Define a URL da API baseado no ambiente (local ou produção)
const API_ORIGIN = isLocal
  ? "http://localhost:8000"
  : "https://job-finder-tracker-production.up.railway.app";

// Constrói URL completa da API a partir de um path
function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${p}`;
}

// Endpoints da API
const ENDPOINTS = {
  applications: "/applications/",
  applicationById: (id) => `/applications/${id}`,
  register: "/auth/register",
  login: "/auth/login",
  me: "/users/me",
  changePassword: "/users/me/password",
  interviews: "/interviews/",
  interviewById: (id) => `/interviews/${id}`,
  upcomingInterviews: "/interviews/upcoming",
  notifications: "/notifications/",
};

// Estado global da aplicação
let token = localStorage.getItem("token");  // Token JWT armazenado
let currentUser = null;  // Dados do usuário autenticado
let notificationInterval = null;  // Interval ID para refresh de notificacoes

// Inicialização quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  hideLoading();

  // Configura listener para o input de chance
  const chanceInput = document.getElementById("inputChance");
  if (chanceInput) {
    chanceInput.addEventListener("input", (e) => {
      updateChanceIndicator(e.target.value);
    });
  }

  // Verifica se há token e exibe a tela apropriada
  if (token) {
    showDashboard();
    loadProfile();
    loadApplications();
    loadNotifications();
    startNotificationPolling();
  } else {
    showAuth();
  }
});

// ==================== LOADING ====================

// Exibe overlay de carregamento
function showLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "flex";
}

// Esconde overlay de carregamento
function hideLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "none";
}

// ==================== NAVEGAÇÃO ====================

// Alterna entre seções (Candidaturas / Perfil / Entrevistas)
function showSection(section) {
  const sectionApplications = document.getElementById("sectionApplications");
  const sectionProfile = document.getElementById("sectionProfile");
  const sectionInterviews = document.getElementById("sectionInterviews");

  const tabApplications = document.getElementById("tabApplications");
  const tabProfile = document.getElementById("tabProfile");
  const tabInterviews = document.getElementById("tabInterviews");

  // Esconde todas as seções
  if (sectionApplications) sectionApplications.style.display = "none";
  if (sectionProfile) sectionProfile.style.display = "none";
  if (sectionInterviews) sectionInterviews.style.display = "none";

  // Remove active de todas as tabs
  if (tabApplications) tabApplications.classList.remove("active");
  if (tabProfile) tabProfile.classList.remove("active");
  if (tabInterviews) tabInterviews.classList.remove("active");

  if (section === "profile") {
    if (sectionProfile) sectionProfile.style.display = "block";
    if (tabProfile) tabProfile.classList.add("active");
    loadProfile();
    return;
  }

  if (section === "interviews") {
    if (sectionInterviews) sectionInterviews.style.display = "block";
    if (tabInterviews) tabInterviews.classList.add("active");
    loadInterviews();
    loadUpcomingInterviews();
    return;
  }

  // Default: mostra candidaturas
  if (sectionApplications) sectionApplications.style.display = "block";
  if (tabApplications) tabApplications.classList.add("active");
}

// ==================== TELAS DE AUTENTICAÇÃO ====================

// Mostra tela de autenticação (login/registro)
function showAuth() {
  const auth = document.getElementById("authScreen");
  const dash = document.getElementById("dashboard");
  if (auth) auth.style.display = "flex";
  if (dash) dash.style.display = "none";
}

// Mostra dashboard principal
function showDashboard() {
  const auth = document.getElementById("authScreen");
  const dash = document.getElementById("dashboard");
  if (auth) auth.style.display = "none";
  if (dash) dash.style.display = "flex";
}

// Alterna para formulário de login
function showLogin() {
  const login = document.getElementById("loginForm");
  const reg = document.getElementById("registerForm");
  if (login) login.style.display = "block";
  if (reg) reg.style.display = "none";
}

// Alterna para formulário de registro
function showRegister() {
  const login = document.getElementById("loginForm");
  const reg = document.getElementById("registerForm");
  if (login) login.style.display = "none";
  if (reg) reg.style.display = "block";
}

// ==================== REGISTRO E LOGIN ====================

// Processa o formulário de registro de novo usuário
async function handleRegister(e) {
  e.preventDefault();
  showLoading();

  const email = document.getElementById("registerEmail")?.value?.trim();
  const password = document.getElementById("registerPassword")?.value;

  try {
    const response = await fetch(apiUrl(ENDPOINTS.register), {
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
  } finally {
    hideLoading();
  }
}

// Processa o formulário de login com email e senha
async function handleLogin(e) {
  e.preventDefault();
  showLoading();

  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value;

  try {
    const formData = new URLSearchParams();
    formData.append("username", email || "");
    formData.append("password", password || "");

    const response = await fetch(apiUrl(ENDPOINTS.login), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await safeJson(response);

    if (response.ok) {
      token = data.access_token;
      localStorage.setItem("token", token);

      showToast("Login realizado com sucesso!", "success");
      showDashboard();

      showSection("applications");
      loadProfile();
      loadApplications();
      loadNotifications();
      startNotificationPolling();
      showLoginReminders();
    } else {
      showToast(data?.detail || "Email ou senha incorretos", "error");
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// Realiza logout do usuário, limpando token e dados
function logout() {
  localStorage.removeItem("token");
  token = null;
  currentUser = null;
  stopNotificationPolling();
  showAuth();
  showToast("Logout realizado com sucesso", "success");
}

// ==================== PERFIL ====================

// Carrega dados do perfil do usuário autenticado e exibe na sidebar e seção de perfil
async function loadProfile() {
  if (!token) return;

  try {
    const response = await fetch(apiUrl(ENDPOINTS.me), {
      headers: authHeader(),
    });

    const data = await safeJson(response);

    if (response.ok) {
      currentUser = data;

      const userEmail = document.getElementById("userEmail");
      if (userEmail) userEmail.textContent = data.email;

      const profileEmail = document.getElementById("profileEmail");
      if (profileEmail) profileEmail.textContent = data.email;

      loadStats();
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      showToast(data?.detail || "Erro ao carregar perfil", "error");
    }
  } catch (err) {
  }
}

// Processa o formulário de alteração de senha do usuário
async function handleChangePassword(e) {
  e.preventDefault();
  showLoading();

  const current_password = document.getElementById("currentPassword")?.value || "";
  const new_password = document.getElementById("newPassword")?.value || "";
  const confirm_new_password = document.getElementById("confirmNewPassword")?.value || "";

  if (new_password.length < 6) {
    hideLoading();
    showToast("A nova senha deve ter no mínimo 6 caracteres", "error");
    return;
  }

  if (new_password !== confirm_new_password) {
    hideLoading();
    showToast("As senhas novas não coincidem", "error");
    return;
  }

  try {
    const response = await fetch(apiUrl(ENDPOINTS.changePassword), {
      method: "PUT",
      headers: {
        ...authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password,
        new_password,
        confirm_new_password,
      }),
    });

    if (response.status === 204) {
      showToast("Senha alterada com sucesso!", "success");
      document.getElementById("changePasswordForm")?.reset();
      return;
    }

    const data = await safeJson(response);

    if (response.status === 401) {
      showToast(data?.detail || "Senha atual incorreta", "error");
      return;
    }

    showToast(data?.detail || "Erro ao alterar senha", "error");
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// ==================== CANDIDATURAS ====================

// Carrega todas as candidaturas do usuário da API e renderiza na tela
async function loadApplications() {
  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.applications), {
      headers: authHeader(),
    });

    if (response.ok) {
      const applications = await safeJson(response);
      const list = Array.isArray(applications) ? applications : [];
      renderApplications(list);
      updateStats(list);
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao carregar candidaturas", "error");
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// Renderiza a lista de candidaturas como cards HTML no container
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

// Atualiza os contadores de status no dashboard (esperando, entrevista, rejeitado, total)
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

// Define o textContent de um elemento pelo ID
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// ==================== MODAL ====================

// Abre o modal para adicionar nova candidatura com campos limpos
function showAddModal() {
  setText("modalTitle", "Nova Candidatura");
  setText("submitBtn", "Salvar");

  const form = document.getElementById("applicationForm");
  if (form) form.reset();

  const editId = document.getElementById("editId");
  if (editId) editId.value = "";

  const today = new Date().toISOString().split("T")[0];
  const inputData = document.getElementById("inputData");
  if (inputData) inputData.value = today;

  updateChanceIndicator(50);

  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("active");
}

// Fecha o modal de candidatura
function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("active");
}

// Fecha o modal ao clicar fora do conteúdo (no overlay)
document.getElementById("modal")?.addEventListener("click", (e) => {
  if (e.target?.id === "modal") closeModal();
});

// Busca dados de uma candidatura pelo ID e abre o modal de edição
async function editApplication(id) {
  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.applicationById(id)), {
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
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao carregar candidatura", "error");
    }
  } catch (err) {
    showToast("Erro de conexão", "error");
  } finally {
    hideLoading();
  }
}

// Define o value de um input/select pelo ID
function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

// Processa o envio do formulário de candidatura (criação ou atualização)
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
      ? apiUrl(ENDPOINTS.applicationById(editId))
      : apiUrl(ENDPOINTS.applications);

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
      loadStats();
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao salvar candidatura", "error");
    }
  } catch (err) {
    showToast("Erro de conexão com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// Deleta uma candidatura após confirmação do usuário
async function deleteApplication(id) {
  if (!confirm("Tem certeza que deseja deletar esta candidatura?")) return;

  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.applicationById(id)), {
      method: "DELETE",
      headers: authHeader(),
    });

    if (response.ok) {
      showToast("Candidatura deletada!", "success");
      loadApplications();
      loadStats();
    } else if (response.status === 401) {
      logout();
      showToast("Sessão expirada. Faça login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao deletar candidatura", "error");
    }
  } catch (err) {
    showToast("Erro de conexão", "error");
  } finally {
    hideLoading();
  }
}

// ==================== UTILITÁRIOS ====================

// Atualiza a barra visual de chance (0-100%) no modal
function updateChanceIndicator(value) {
  const indicator = document.getElementById("chanceIndicator");
  if (indicator) indicator.style.width = `${Number(value) || 0}%`;
}

// Formata data de YYYY-MM-DD para formato brasileiro (DD/MM/AAAA)
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return isNaN(date.getTime()) ? String(dateString) : date.toLocaleDateString("pt-BR");
}

// Retorna o emoji correspondente ao status da candidatura
function getStatusIcon(status) {
  const icons = { esperando: "⏳", entrevista: "🎯", rejeitado: "❌" };
  return icons[status] || "📝";
}

// Retorna o texto em português correspondente ao status
function getStatusText(status) {
  const texts = { esperando: "Esperando", entrevista: "Entrevista", rejeitado: "Rejeitado" };
  return texts[status] || status;
}

// Exibe uma notificação toast temporária (sucesso ou erro) por 3 segundos
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Retorna o header de autorização com o token JWT
function authHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Extrai JSON de uma response de forma segura, retornando null em caso de erro
async function safeJson(response) {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Escapa caracteres HTML para prevenir XSS ao inserir conteúdo no DOM
function escapeHtml(v) {
  const s = String(v ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==================== ESTATÍSTICAS ====================

// Busca estatísticas do usuário na API e renderiza na seção de perfil
async function loadStats() {
  const container = document.getElementById('statsContainer');
  if (!container) {
    return;
  }

  try {
    const response = await fetch(apiUrl('/users/me/stats'), {
      headers: authHeader()
    });

    if (response.ok) {
      const stats = await response.json();
      renderStats(stats);
    } else {
      container.innerHTML = '<p class="loading-stats">❌ Erro ao carregar estatísticas</p>';
    }
  } catch (error) {
    container.innerHTML = '<p class="loading-stats">❌ Erro de conexão</p>';
  }
}

// Renderiza as estatísticas em cards HTML (resumo, performance, timeline)
function renderStats(stats) {
  const container = document.getElementById('statsContainer');
  if (!container) return;

  const formatMonth = (mesStr) => {
    if (!mesStr) return '—';
    const [year, month] = mesStr.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(month) - 1]}/${year}`;
  };

  const percEsperando = stats.total > 0 ? Math.round((stats.esperando / stats.total) * 100) : 0;
  const percEntrevista = stats.total > 0 ? Math.round((stats.entrevista / stats.total) * 100) : 0;
  const percRejeitado = stats.total > 0 ? Math.round((stats.rejeitado / stats.total) * 100) : 0;

  let diasUso = 0;
  if (stats.primeira_candidatura) {
    const primeira = new Date(stats.primeira_candidatura);
    const hoje = new Date();
    diasUso = Math.floor((hoje - primeira) / (1000 * 60 * 60 * 24));
  }

  if (stats.total === 0) {
    container.innerHTML = `
      <div class="empty-stats">
        <div class="empty-icon">📊</div>
        <h3>Nenhuma estatística ainda</h3>
        <p>Adicione sua primeira candidatura para ver suas estatísticas!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="stats-grid-profile">
      <div class="stat-card-profile">
        <h3>📊 Resumo Geral</h3>
        <div class="stat-row">
          <span>📝 Total de candidaturas:</span>
          <strong>${stats.total}</strong>
        </div>
        <div class="stat-row">
          <span>⏳ Esperando:</span>
          <strong>${stats.esperando} (${percEsperando}%)</strong>
        </div>
        <div class="stat-row">
          <span>🎯 Entrevistas:</span>
          <strong>${stats.entrevista} (${percEntrevista}%)</strong>
        </div>
        <div class="stat-row">
          <span>❌ Rejeitadas:</span>
          <strong>${stats.rejeitado} (${percRejeitado}%)</strong>
        </div>
      </div>

      <div class="stat-card-profile">
        <h3>📈 Performance</h3>
        <div class="stat-row">
          <span>💯 Taxa de conversão:</span>
          <strong class="${stats.taxa_conversao >= 20 ? 'text-success' : 'text-warning'}">${stats.taxa_conversao}%</strong>
        </div>
        <div class="stat-row">
          <span>🏢 Empresa top:</span>
          <strong>${stats.empresa_top || '—'} ${stats.empresa_top ? `(${stats.empresa_top_count}x)` : ''}</strong>
        </div>
        <div class="stat-row">
          <span>📅 Mês mais ativo:</span>
          <strong>${formatMonth(stats.mes_mais_ativo)} ${stats.mes_mais_ativo ? `(${stats.mes_mais_ativo_count})` : ''}</strong>
        </div>
      </div>

      <div class="stat-card-profile">
        <h3>🕐 Timeline</h3>
        <div class="stat-row">
          <span>🎬 Primeira candidatura:</span>
          <strong>${stats.primeira_candidatura ? formatDate(stats.primeira_candidatura) : '—'}</strong>
        </div>
        <div class="stat-row">
          <span>⭐ Última entrevista:</span>
          <strong>${stats.ultima_entrevista ? formatDate(stats.ultima_entrevista) : '—'}</strong>
        </div>
        <div class="stat-row">
          <span>📊 Dias de uso:</span>
          <strong>${diasUso} dias</strong>
        </div>
      </div>
    </div>
  `;
}

// ==================== SISTEMA DE TEMAS ====================

// Carrega o tema salvo no localStorage (dark por padrão)
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateToggleButton(savedTheme);
}

// Alterna entre tema escuro e claro
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateToggleButton(newTheme);
  
  showToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
}

// Atualiza o ícone e texto do botão toggle de tema
function updateToggleButton(theme) {
  const toggleSwitch = document.querySelector('.toggle-switch');
  const themeIcon = document.querySelector('.theme-icon');
  const themeText = document.querySelector('.theme-text');
  
  if (toggleSwitch) {
    if (theme === 'light') {
      toggleSwitch.classList.add('active');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light Mode';
    } else {
      toggleSwitch.classList.remove('active');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Dark Mode';
    }
  }
}

// Inicializa o tema assim que possível (antes ou depois do DOM carregar)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTheme);
} else {
  loadTheme();
}

// ==================== AUTENTICAÇÃO GOOGLE ====================

// Realiza login via Google OAuth usando Firebase popup e envia token ao backend
async function handleGoogleLogin() {
  showLoading();
  
  try {
    // Aguardar Firebase estar pronto
    await firebaseReady;
    
    if (!auth || !googleProvider) {
      throw new Error('Firebase não inicializado');
    }

    const result = await signInWithPopup(auth, googleProvider);

    const idToken = await result.user.getIdToken();

    const response = await fetch(apiUrl('/auth/google/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_token: idToken
      })
    });
    
    const data = await response.json();

    if (response.ok) {
      token = data.access_token;
      localStorage.setItem('token', token);

      if (data.user) {
        localStorage.setItem('user_name', data.user.name || '');
        localStorage.setItem('user_picture', data.user.picture || '');
      }

      showToast(`Bem-vindo, ${data.user.name || data.user.email}!`, 'success');
      showDashboard();
      loadProfile();
      loadApplications();
      loadNotifications();
      startNotificationPolling();
      showLoginReminders();
    } else {
      showToast(data.detail || 'Erro ao fazer login com Google', 'error');
    }
  } catch (error) {

    if (error.code === 'auth/popup-closed-by-user') {
      showToast('Login cancelado', 'error');
    } else if (error.code === 'auth/popup-blocked') {
      showToast('Popup bloqueado! Permita popups para este site.', 'error');
    } else {
      showToast('Erro ao fazer login com Google: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  } finally {
    hideLoading();
  }
}

// ==================== ENTREVISTAS ====================

// Carrega todas as entrevistas do usuario
async function loadInterviews() {
  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.interviews), {
      headers: authHeader(),
    });

    if (response.ok) {
      const interviews = await safeJson(response);
      const list = Array.isArray(interviews) ? interviews : [];
      renderInterviews(list);
      updateInterviewStats(list);
    } else if (response.status === 401) {
      logout();
      showToast("Sessao expirada. Faca login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao carregar entrevistas", "error");
    }
  } catch (err) {
    showToast("Erro de conexao com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// Carrega proximas entrevistas agendadas
async function loadUpcomingInterviews() {
  try {
    const response = await fetch(apiUrl(ENDPOINTS.upcomingInterviews), {
      headers: authHeader(),
    });

    if (response.ok) {
      const interviews = await safeJson(response);
      renderUpcomingInterviews(interviews || []);
    }
  } catch (err) {
  }
}

// Renderiza cards de proximas entrevistas
function renderUpcomingInterviews(interviews) {
  const container = document.getElementById("upcomingInterviewsList");
  if (!container) return;

  if (!interviews || interviews.length === 0) {
    container.innerHTML = '<p class="text-secondary">Nenhuma entrevista agendada</p>';
    return;
  }

  container.innerHTML = interviews.map(interview => `
    <div class="upcoming-interview-card" onclick="editInterview(${interview.id})">
      <div class="interview-date">${formatDateTime(interview.interview_datetime)}</div>
      <div class="interview-company">${escapeHtml(interview.application_empresa || '')}</div>
      <div class="interview-role">${escapeHtml(interview.application_nome || '')}</div>
      <span class="interview-type-badge">${getInterviewTypeText(interview.interview_type)}</span>
    </div>
  `).join("");
}

// Renderiza lista de entrevistas como cards
function renderInterviews(interviews) {
  const container = document.getElementById("interviewsList");
  const emptyState = document.getElementById("emptyInterviewState");

  if (!container || !emptyState) return;

  if (!interviews || interviews.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  container.innerHTML = interviews.map(interview => `
    <div class="interview-card" data-id="${interview.id}">
      <div class="interview-card-header">
        <div class="interview-card-title">
          <h4>${escapeHtml(interview.application_nome || 'Candidatura')}</h4>
          <span class="company-name">${escapeHtml(interview.application_empresa || '')}</span>
        </div>
        <div class="app-actions">
          <button class="icon-btn" onclick="editInterview(${interview.id})" title="Editar">&#9998;</button>
          <button class="icon-btn" onclick="deleteInterview(${interview.id})" title="Deletar">&#128465;</button>
        </div>
      </div>

      <div class="interview-card-meta">
        <div class="interview-meta-item">
          <span class="label">Data:</span>
          <span class="value">${formatDateTime(interview.interview_datetime)}</span>
        </div>
        <div class="interview-meta-item">
          <span class="label">Tipo:</span>
          <span class="value">${getInterviewTypeText(interview.interview_type)}</span>
        </div>
        ${interview.interviewer_name ? `
        <div class="interview-meta-item">
          <span class="label">Entrevistador:</span>
          <span class="value">${escapeHtml(interview.interviewer_name)}</span>
        </div>
        ` : ''}
        ${interview.duration_minutes ? `
        <div class="interview-meta-item">
          <span class="label">Duracao:</span>
          <span class="value">${interview.duration_minutes} min</span>
        </div>
        ` : ''}
      </div>

      ${interview.questions_asked || interview.pre_interview_notes ? `
      <div class="interview-card-content">
        <p class="interview-notes-preview">
          ${escapeHtml((interview.questions_asked || interview.pre_interview_notes || '').substring(0, 150))}...
        </p>
      </div>
      ` : ''}

      <div class="interview-card-footer">
        <span class="interview-status-badge ${interview.status}">
          ${getInterviewStatusIcon(interview.status)} ${getInterviewStatusText(interview.status)}
        </span>
        ${interview.self_rating ? `
        <div class="interview-rating">
          ${renderStars(interview.self_rating)}
        </div>
        ` : ''}
      </div>
    </div>
  `).join("");
}

// Atualiza estatisticas de entrevistas
function updateInterviewStats(interviews) {
  const stats = {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
    totalRating: 0,
    ratingCount: 0,
  };

  interviews.forEach(interview => {
    if (stats[interview.status] !== undefined) {
      stats[interview.status]++;
    }
    if (interview.self_rating) {
      stats.totalRating += interview.self_rating;
      stats.ratingCount++;
    }
  });

  setText("statScheduled", stats.scheduled);
  setText("statCompleted", stats.completed);
  setText("statCancelled", stats.cancelled + stats.rescheduled);

  const avgRating = stats.ratingCount > 0
    ? (stats.totalRating / stats.ratingCount).toFixed(1)
    : "-";
  setText("statAvgRating", avgRating);
}

// Abre modal para adicionar nova entrevista
async function showAddInterviewModal() {
  setText("interviewModalTitle", "Nova Entrevista");
  setText("submitInterviewBtn", "Salvar");

  const form = document.getElementById("interviewForm");
  if (form) form.reset();

  const editId = document.getElementById("editInterviewId");
  if (editId) editId.value = "";

  // Define datetime padrao para agora
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const inputDatetime = document.getElementById("inputInterviewDatetime");
  if (inputDatetime) inputDatetime.value = now.toISOString().slice(0, 16);

  // Carrega candidaturas para o dropdown
  await loadApplicationsForDropdown();

  updateRatingDisplay(3);

  const modal = document.getElementById("interviewModal");
  if (modal) modal.classList.add("active");
}

// Carrega candidaturas para o dropdown
async function loadApplicationsForDropdown() {
  const select = document.getElementById("inputInterviewApplication");
  if (!select) return;

  try {
    const response = await fetch(apiUrl(ENDPOINTS.applications), {
      headers: authHeader(),
    });

    if (response.ok) {
      const applications = await safeJson(response);
      select.innerHTML = '<option value="">Selecione a candidatura...</option>' +
        applications.map(app =>
          `<option value="${app.id}">${escapeHtml(app.nome)} - ${escapeHtml(app.empresa)}</option>`
        ).join("");
    }
  } catch (err) {
  }
}

// Fecha o modal de entrevista
function closeInterviewModal() {
  const modal = document.getElementById("interviewModal");
  if (modal) modal.classList.remove("active");
}

// Click fora do modal fecha
document.getElementById("interviewModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "interviewModal") closeInterviewModal();
});

// Busca entrevista e abre modal de edicao
async function editInterview(id) {
  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.interviewById(id)), {
      headers: authHeader(),
    });

    if (response.ok) {
      const interview = await safeJson(response);

      setText("interviewModalTitle", "Editar Entrevista");
      setText("submitInterviewBtn", "Atualizar");

      const editId = document.getElementById("editInterviewId");
      if (editId) editId.value = interview.id;

      await loadApplicationsForDropdown();

      setValue("inputInterviewApplication", interview.application_id);
      setValue("inputInterviewType", interview.interview_type);

      // Formata datetime para o input
      if (interview.interview_datetime) {
        const dt = new Date(interview.interview_datetime);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        setValue("inputInterviewDatetime", dt.toISOString().slice(0, 16));
      }

      setValue("inputInterviewDuration", interview.duration_minutes);
      setValue("inputInterviewStatus", interview.status);
      setValue("inputMeetingLink", interview.meeting_link);
      setValue("inputInterviewerName", interview.interviewer_name);
      setValue("inputInterviewerRole", interview.interviewer_role);
      setValue("inputPreInterviewNotes", interview.pre_interview_notes);
      setValue("inputQuestionsAsked", interview.questions_asked);
      setValue("inputAnswersNotes", interview.answers_notes);
      setValue("inputFeedbackReceived", interview.feedback_received);
      setValue("inputSelfRating", interview.self_rating || 3);
      setValue("inputPostInterviewNotes", interview.post_interview_notes);

      updateRatingDisplay(interview.self_rating || 3);

      document.getElementById("interviewModal")?.classList.add("active");
    } else if (response.status === 401) {
      logout();
      showToast("Sessao expirada. Faca login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao carregar entrevista", "error");
    }
  } catch (err) {
    showToast("Erro de conexao", "error");
  } finally {
    hideLoading();
  }
}

// Processa submit do formulario de entrevista
async function handleSubmitInterview(e) {
  e.preventDefault();
  showLoading();

  const editId = document.getElementById("editInterviewId")?.value;

  const interviewData = {
    application_id: parseInt(document.getElementById("inputInterviewApplication")?.value, 10),
    interview_type: document.getElementById("inputInterviewType")?.value,
    interview_datetime: document.getElementById("inputInterviewDatetime")?.value,
    duration_minutes: parseInt(document.getElementById("inputInterviewDuration")?.value, 10) || null,
    status: document.getElementById("inputInterviewStatus")?.value,
    meeting_link: document.getElementById("inputMeetingLink")?.value || null,
    interviewer_name: document.getElementById("inputInterviewerName")?.value || null,
    interviewer_role: document.getElementById("inputInterviewerRole")?.value || null,
    pre_interview_notes: document.getElementById("inputPreInterviewNotes")?.value || null,
    questions_asked: document.getElementById("inputQuestionsAsked")?.value || null,
    answers_notes: document.getElementById("inputAnswersNotes")?.value || null,
    feedback_received: document.getElementById("inputFeedbackReceived")?.value || null,
    self_rating: parseInt(document.getElementById("inputSelfRating")?.value, 10) || null,
    post_interview_notes: document.getElementById("inputPostInterviewNotes")?.value || null,
  };

  try {
    const url = editId
      ? apiUrl(ENDPOINTS.interviewById(editId))
      : apiUrl(ENDPOINTS.interviews);

    const method = editId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        ...authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(interviewData),
    });

    if (response.ok) {
      showToast(editId ? "Entrevista atualizada!" : "Entrevista criada!", "success");
      closeInterviewModal();
      loadInterviews();
      loadUpcomingInterviews();
    } else if (response.status === 401) {
      logout();
      showToast("Sessao expirada. Faca login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao salvar entrevista", "error");
    }
  } catch (err) {
    showToast("Erro de conexao com o servidor", "error");
  } finally {
    hideLoading();
  }
}

// Deleta uma entrevista apos confirmacao
async function deleteInterview(id) {
  if (!confirm("Tem certeza que deseja deletar esta entrevista?")) return;

  showLoading();

  try {
    const response = await fetch(apiUrl(ENDPOINTS.interviewById(id)), {
      method: "DELETE",
      headers: authHeader(),
    });

    if (response.ok) {
      showToast("Entrevista deletada!", "success");
      loadInterviews();
      loadUpcomingInterviews();
    } else if (response.status === 401) {
      logout();
      showToast("Sessao expirada. Faca login novamente.", "error");
    } else {
      const data = await safeJson(response);
      showToast(data?.detail || "Erro ao deletar entrevista", "error");
    }
  } catch (err) {
    showToast("Erro de conexao", "error");
  } finally {
    hideLoading();
  }
}

// Helpers para entrevistas
function getInterviewTypeText(type) {
  const types = {
    phone: "Telefone",
    video: "Video",
    in_person: "Presencial",
    technical: "Tecnica",
    behavioral: "Comportamental",
    hr: "RH"
  };
  return types[type] || type;
}

function getInterviewStatusText(status) {
  const texts = {
    scheduled: "Agendada",
    completed: "Realizada",
    cancelled: "Cancelada",
    rescheduled: "Reagendada"
  };
  return texts[status] || status;
}

function getInterviewStatusIcon(status) {
  const icons = {
    scheduled: "&#128197;",
    completed: "&#10003;",
    cancelled: "&#10007;",
    rescheduled: "&#128260;"
  };
  return icons[status] || "&#128221;";
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return "";
  const date = new Date(dateTimeStr);
  return isNaN(date.getTime())
    ? String(dateTimeStr)
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? "&#9733;" : "&#9734;";
  }
  return stars;
}

function updateRatingDisplay(value) {
  const display = document.getElementById("ratingValue");
  if (display) display.textContent = value;
}

// Event listener para slider de rating
document.getElementById("inputSelfRating")?.addEventListener("input", (e) => {
  updateRatingDisplay(e.target.value);
});

// ==================== NOTIFICACOES ====================

async function loadNotifications() {
  if (!token) return;

  try {
    const response = await fetch(apiUrl(ENDPOINTS.notifications), {
      headers: authHeader(),
    });

    if (response.ok) {
      const data = await safeJson(response);
      if (data) {
        updateNotificationBadge(data.total_count);
        renderNotificationDropdown(data);
      }
    }
  } catch (err) {
    // Silently fail
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge");
  const bell = document.getElementById("notificationBell");
  if (!badge || !bell) return;

  if (count > 0) {
    badge.style.display = "flex";
    badge.textContent = count > 9 ? "9+" : String(count);
    bell.classList.add("has-notifications");
  } else {
    badge.style.display = "none";
    badge.textContent = "0";
    bell.classList.remove("has-notifications");
  }
}

function renderNotificationDropdown(data) {
  const body = document.getElementById("notificationDropdownBody");
  if (!body) return;

  if (data.total_count === 0) {
    body.innerHTML = '<p class="notification-empty">Nenhuma entrevista proxima</p>';
    return;
  }

  let html = "";

  if (data.today.length > 0) {
    html += '<div class="notification-category today">Hoje</div>';
    html += data.today.map(item => renderNotificationItem(item, "today")).join("");
  }

  if (data.tomorrow.length > 0) {
    html += '<div class="notification-category tomorrow">Amanha</div>';
    html += data.tomorrow.map(item => renderNotificationItem(item, "tomorrow")).join("");
  }

  if (data.this_week.length > 0) {
    html += '<div class="notification-category this-week">Esta Semana</div>';
    html += data.this_week.map(item => renderNotificationItem(item, "this-week")).join("");
  }

  body.innerHTML = html;
}

function renderNotificationItem(item, category) {
  const time = formatDateTime(item.interview_datetime);
  const typeText = getInterviewTypeText(item.interview_type);
  const iconMap = { "today": "&#9888;", "tomorrow": "&#128197;", "this-week": "&#128198;" };

  return `
    <div class="notification-item" onclick="handleNotificationClick(${Number(item.id)})">
      <div class="notification-item-icon ${escapeHtml(category)}">
        ${iconMap[category] || "&#128198;"}
      </div>
      <div class="notification-item-content">
        <div class="notification-item-title">${escapeHtml(item.application_empresa)}</div>
        <div class="notification-item-subtitle">${escapeHtml(item.application_nome)} - ${escapeHtml(typeText)}</div>
        <div class="notification-item-time">${escapeHtml(time)}</div>
      </div>
    </div>
  `;
}

function toggleNotifications() {
  const dropdown = document.getElementById("notificationDropdown");
  if (!dropdown) return;

  dropdown.classList.toggle("active");

  if (dropdown.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeNotificationsOnOutsideClick);
    }, 0);
  }
}

function closeNotificationsOnOutsideClick(e) {
  const wrapper = document.getElementById("notificationBellWrapper");
  if (wrapper && !wrapper.contains(e.target)) {
    const dropdown = document.getElementById("notificationDropdown");
    if (dropdown) dropdown.classList.remove("active");
    document.removeEventListener("click", closeNotificationsOnOutsideClick);
  }
}

function handleNotificationClick(interviewId) {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) dropdown.classList.remove("active");

  showSection("interviews");
  editInterview(interviewId);
}

function startNotificationPolling() {
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(loadNotifications, 5 * 60 * 1000);
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

async function showLoginReminders() {
  if (!token) return;

  try {
    const response = await fetch(apiUrl(ENDPOINTS.notifications), {
      headers: authHeader(),
    });

    if (response.ok) {
      const data = await safeJson(response);
      if (!data) return;

      if (data.today.length > 0) {
        const count = data.today.length;
        const msg = count === 1
          ? "Voce tem 1 entrevista hoje!"
          : `Voce tem ${count} entrevistas hoje!`;
        setTimeout(() => showToast(msg, "error"), 3500);
      } else if (data.tomorrow.length > 0) {
        const count = data.tomorrow.length;
        const msg = count === 1
          ? "Voce tem 1 entrevista amanha"
          : `Voce tem ${count} entrevistas amanha`;
        setTimeout(() => showToast(msg, "success"), 3500);
      }
    }
  } catch (err) {
    // Silently fail
  }
}

// Expõe as funções globalmente para uso via onclick/onsubmit no HTML
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleChangePassword = handleChangePassword;
window.handleSubmitApplication = handleSubmitApplication;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showSection = showSection;
window.logout = logout;
window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.editApplication = editApplication;
window.deleteApplication = deleteApplication;
window.toggleTheme = toggleTheme;
window.showAddInterviewModal = showAddInterviewModal;
window.closeInterviewModal = closeInterviewModal;
window.editInterview = editInterview;
window.deleteInterview = deleteInterview;
window.handleSubmitInterview = handleSubmitInterview;
window.toggleNotifications = toggleNotifications;
window.handleNotificationClick = handleNotificationClick;