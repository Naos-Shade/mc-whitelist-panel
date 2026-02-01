// DOM Elements
const loginSection = document.getElementById('login-section');
const panelSection = document.getElementById('panel-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const addForm = document.getElementById('add-form');
const addError = document.getElementById('add-error');
const addSuccess = document.getElementById('add-success');
const usernameInput = document.getElementById('username');
const isBedrockCheckbox = document.getElementById('is-bedrock');
const whitelistContainer = document.getElementById('whitelist-container');
const refreshBtn = document.getElementById('refresh-btn');
const serverStatus = document.getElementById('server-status');

// API calls
async function api(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  return response.json();
}

// Check authentication status
async function checkAuth() {
  try {
    const data = await api('/api/auth');
    if (data.authenticated) {
      showPanel();
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin();
  }
}

// Show/hide sections
function showLogin() {
  loginSection.classList.remove('hidden');
  panelSection.classList.add('hidden');
}

function showPanel() {
  loginSection.classList.add('hidden');
  panelSection.classList.remove('hidden');
  loadWhitelist();
  loadServerStatus();
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const password = document.getElementById('password').value;

  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });

    if (data.success) {
      showPanel();
    } else {
      loginError.textContent = data.error || 'Erreur de connexion';
    }
  } catch (error) {
    loginError.textContent = 'Erreur de connexion au serveur';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  showLogin();
});

// Load whitelist
async function loadWhitelist() {
  whitelistContainer.innerHTML = '<p class="loading">Chargement...</p>';

  try {
    const data = await api('/api/whitelist');

    if (data.error) {
      whitelistContainer.innerHTML = `<p class="error">${data.error}</p>`;
      return;
    }

    if (data.players.length === 0) {
      whitelistContainer.innerHTML = '<p class="empty-list">Aucun joueur dans la whitelist</p>';
      return;
    }

    const html = `
      <div class="player-list">
        ${data.players.map(player => {
          const isBedrock = player.startsWith('.');
          return `
            <div class="player-item">
              <div class="player-info">
                <span class="player-icon">${isBedrock ? '📱' : '💻'}</span>
                <span class="player-name">${escapeHtml(player)}</span>
                <span class="player-badge ${isBedrock ? 'bedrock' : ''}">${isBedrock ? 'Bedrock' : 'Java'}</span>
              </div>
              <button class="btn btn-danger" onclick="removePlayer('${escapeHtml(player)}')">Supprimer</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    whitelistContainer.innerHTML = html;
  } catch (error) {
    whitelistContainer.innerHTML = '<p class="error">Impossible de charger la whitelist</p>';
  }
}

// Load server status
async function loadServerStatus() {
  try {
    const data = await api('/api/status');

    if (data.online) {
      serverStatus.textContent = `Serveur: ${data.playersOnline}/${data.maxPlayers} joueurs`;
      serverStatus.className = 'status status-online';
    } else {
      serverStatus.textContent = 'Serveur: Hors ligne';
      serverStatus.className = 'status status-offline';
    }
  } catch (error) {
    serverStatus.textContent = 'Serveur: Erreur';
    serverStatus.className = 'status status-offline';
  }
}

// Add player
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.textContent = '';
  addSuccess.textContent = '';

  const username = usernameInput.value.trim();
  const isBedrock = isBedrockCheckbox.checked;

  if (!username) {
    addError.textContent = 'Veuillez entrer un pseudo';
    return;
  }

  try {
    const data = await api('/api/whitelist', {
      method: 'POST',
      body: JSON.stringify({ username, isBedrock })
    });

    if (data.success) {
      addSuccess.textContent = `${data.username} ajouté à la whitelist!`;
      usernameInput.value = '';
      isBedrockCheckbox.checked = false;
      loadWhitelist();

      setTimeout(() => {
        addSuccess.textContent = '';
      }, 3000);
    } else {
      addError.textContent = data.error || 'Erreur lors de l\'ajout';
    }
  } catch (error) {
    addError.textContent = 'Erreur de connexion au serveur';
  }
});

// Remove player
async function removePlayer(username) {
  if (!confirm(`Supprimer ${username} de la whitelist ?`)) {
    return;
  }

  try {
    const data = await api(`/api/whitelist/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });

    if (data.success) {
      loadWhitelist();
    } else {
      alert(data.error || 'Erreur lors de la suppression');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
  }
}

// Refresh button
refreshBtn.addEventListener('click', () => {
  loadWhitelist();
  loadServerStatus();
});

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-refresh every 30 seconds
setInterval(() => {
  if (!panelSection.classList.contains('hidden')) {
    loadServerStatus();
  }
}, 30000);

// Initialize
checkAuth();
