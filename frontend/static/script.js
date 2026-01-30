// API Configuration
const API_URL = window.location.origin; // Usa a mesma URL do frontend
let token = localStorage.getItem('token');
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    hideLoading();
    if (token) {
        showDashboard();
        loadApplications();
    } else {
        showAuth();
    }

    // Update chance indicator on input
    const chanceInput = document.getElementById('inputChance');
    if (chanceInput) {
        chanceInput.addEventListener('input', (e) => {
            updateChanceIndicator(e.target.value);
        });
    }
});

// Loading
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Auth Functions
function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    showLoading();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Conta criada com sucesso! Faça login.', 'success');
            showLogin();
            document.getElementById('loginEmail').value = email;
        } else {
            showToast(data.detail || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    showLoading();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            token = data.access_token;
            localStorage.setItem('token', token);
            currentUser = { email };
            showToast('Login realizado com sucesso!', 'success');
            showDashboard();
            loadApplications();
        } else {
            showToast(data.detail || 'Email ou senha incorretos', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    showAuth();
    showToast('Logout realizado com sucesso', 'success');
}

// Load Applications
async function loadApplications() {
    showLoading();

    try {
        const response = await fetch(`${API_URL}/applications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const applications = await response.json();
            renderApplications(applications);
            updateStats(applications);
        } else if (response.status === 401) {
            logout();
            showToast('Sessão expirada. Faça login novamente.', 'error');
        } else {
            showToast('Erro ao carregar candidaturas', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Render Applications
function renderApplications(applications) {
    const container = document.getElementById('applicationsList');
    const emptyState = document.getElementById('emptyState');

    if (applications.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    container.innerHTML = applications.map(app => `
        <div class="application-card" data-id="${app.id}">
            <div class="app-header">
                <div class="app-title">
                    <h3>${app.nome}</h3>
                    <p class="app-empresa">🏢 ${app.empresa}</p>
                </div>
                <div class="app-actions">
                    <button class="icon-btn" onclick="editApplication(${app.id})" title="Editar">
                        ✏️
                    </button>
                    <button class="icon-btn" onclick="deleteApplication(${app.id})" title="Deletar">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="app-info">
                <div class="info-item">
                    <span class="info-label">📅 Data:</span>
                    <span class="info-value">${formatDate(app.data)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">💼 Cargo:</span>
                    <span class="info-value">${app.role}</span>
                </div>
            </div>

            <div class="app-footer">
                <span class="status-badge ${app.status}">
                    ${getStatusIcon(app.status)} ${getStatusText(app.status)}
                </span>
                <div class="chance-display">
                    <span>Chance:</span>
                    <strong>${app.chance}%</strong>
                </div>
            </div>
        </div>
    `).join('');
}

// Update Stats
function updateStats(applications) {
    const stats = {
        esperando: 0,
        entrevista: 0,
        rejeitado: 0,
        total: applications.length
    };

    applications.forEach(app => {
        if (stats[app.status] !== undefined) {
            stats[app.status]++;
        }
    });

    document.getElementById('statEsperando').textContent = stats.esperando;
    document.getElementById('statEntrevista').textContent = stats.entrevista;
    document.getElementById('statRejeitado').textContent = stats.rejeitado;
    document.getElementById('statTotal').textContent = stats.total;
}

// Show Add Modal
function showAddModal() {
    document.getElementById('modalTitle').textContent = 'Nova Candidatura';
    document.getElementById('submitBtn').textContent = 'Salvar';
    document.getElementById('applicationForm').reset();
    document.getElementById('editId').value = '';
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inputData').value = today;
    
    updateChanceIndicator(50);
    
    document.getElementById('modal').classList.add('active');
}

// Edit Application
async function editApplication(id) {
    showLoading();

    try {
        const response = await fetch(`${API_URL}/applications/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const app = await response.json();
            
            document.getElementById('modalTitle').textContent = 'Editar Candidatura';
            document.getElementById('submitBtn').textContent = 'Atualizar';
            document.getElementById('editId').value = app.id;
            document.getElementById('inputNome').value = app.nome;
            document.getElementById('inputEmpresa').value = app.empresa;
            document.getElementById('inputData').value = app.data;
            document.getElementById('inputRole').value = app.role;
            document.getElementById('inputStatus').value = app.status;
            document.getElementById('inputChance').value = app.chance;
            
            updateChanceIndicator(app.chance);
            
            document.getElementById('modal').classList.add('active');
        } else {
            showToast('Erro ao carregar candidatura', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Handle Submit Application
async function handleSubmitApplication(e) {
    e.preventDefault();
    showLoading();

    const editId = document.getElementById('editId').value;
    const applicationData = {
        nome: document.getElementById('inputNome').value,
        empresa: document.getElementById('inputEmpresa').value,
        data: document.getElementById('inputData').value,
        role: document.getElementById('inputRole').value,
        status: document.getElementById('inputStatus').value,
        chance: parseInt(document.getElementById('inputChance').value)
    };

    try {
        const url = editId 
            ? `${API_URL}/applications/${editId}`
            : `${API_URL}/applications`;
        
        const method = editId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(applicationData)
        });

        if (response.ok) {
            showToast(
                editId ? 'Candidatura atualizada!' : 'Candidatura criada!',
                'success'
            );
            closeModal();
            loadApplications();
        } else {
            const data = await response.json();
            showToast(data.detail || 'Erro ao salvar candidatura', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Delete Application
async function deleteApplication(id) {
    if (!confirm('Tem certeza que deseja deletar esta candidatura?')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_URL}/applications/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showToast('Candidatura deletada!', 'success');
            loadApplications();
        } else {
            showToast('Erro ao deletar candidatura', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Close Modal
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// Update Chance Indicator
function updateChanceIndicator(value) {
    const indicator = document.getElementById('chanceIndicator');
    if (indicator) {
        indicator.style.width = `${value}%`;
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function getStatusIcon(status) {
    const icons = {
        'esperando': '⏳',
        'entrevista': '🎯',
        'rejeitado': '❌'
    };
    return icons[status] || '📝';
}

function getStatusText(status) {
    const texts = {
        'esperando': 'Esperando',
        'entrevista': 'Entrevista',
        'rejeitado': 'Rejeitado'
    };
    return texts[status] || status;
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on outside click
document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});