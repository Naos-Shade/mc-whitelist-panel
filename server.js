const express = require('express');
const { Rcon } = require('rcon-client');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const RCON_HOST = process.env.RCON_HOST || '127.0.0.1';
const RCON_PORT = parseInt(process.env.RCON_PORT) || 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'changeme';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Sessions storage
const sessions = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// RCON helper with better error handling
async function rcon(command) {
  let client = null;
  try {
    client = new Rcon({
      host: RCON_HOST,
      port: RCON_PORT,
      password: RCON_PASSWORD,
      timeout: 5000
    });

    // Handle connection errors
    client.on('error', (err) => {
      console.error('RCON connection error:', err.message);
    });

    await client.connect();
    const response = await client.send(command);
    await client.end();
    return response;
  } catch (error) {
    console.error('RCON Error:', error.message);
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
    return null;
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (token && sessions[token]) {
    return next();
  }
  res.status(401).json({ error: 'Non connecté' });
}

// Routes
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = { created: Date.now() };
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization;
  if (token) delete sessions[token];
  res.json({ success: true });
});

app.get('/api/whitelist', requireAuth, async (req, res) => {
  const response = await rcon('whitelist list');
  if (!response) {
    return res.status(500).json({ error: 'Impossible de contacter le serveur' });
  }

  // Parse response: "There are X whitelisted players: player1, player2"
  const match = response.match(/:\s*(.+)$/);
  const players = match
    ? match[1].split(',').map(p => p.trim()).filter(p => p)
    : [];

  res.json({ players });
});

app.post('/api/whitelist', requireAuth, async (req, res) => {
  let { username, isBedrock } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Pseudo requis' });
  }

  // Sanitize
  username = username.trim().replace(/[^a-zA-Z0-9_\.]/g, '');
  if (username.length < 1 || username.length > 32) {
    return res.status(400).json({ error: 'Pseudo invalide' });
  }

  // Add dot prefix for Bedrock
  if (isBedrock && !username.startsWith('.')) {
    username = '.' + username;
  }

  const response = await rcon(`whitelist add ${username}`);
  if (!response) {
    return res.status(500).json({ error: 'Impossible de contacter le serveur' });
  }

  res.json({ success: true, message: `${username} ajouté!`, username });
});

app.delete('/api/whitelist/:username', requireAuth, async (req, res) => {
  const { username } = req.params;

  const response = await rcon(`whitelist remove ${username}`);
  if (!response) {
    return res.status(500).json({ error: 'Impossible de contacter le serveur' });
  }

  res.json({ success: true, message: `${username} supprimé` });
});

app.get('/api/status', requireAuth, async (req, res) => {
  const response = await rcon('list');
  if (!response) {
    return res.json({ online: false });
  }

  const match = response.match(/There are (\d+) of (\d+)/);
  res.json({
    online: true,
    playersOnline: match ? parseInt(match[1]) : 0,
    maxPlayers: match ? parseInt(match[2]) : 0
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Panel whitelist démarré sur le port ${PORT}`);
  console.log(`🎮 RCON: ${RCON_HOST}:${RCON_PORT}`);
});
