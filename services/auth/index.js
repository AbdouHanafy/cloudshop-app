const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowOrigin = requestOrigin && corsOrigins.includes(requestOrigin)
    ? requestOrigin
    : corsOrigins[0];
  res.header('Access-Control-Allow-Origin', allowOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'cloudshop-secret-key';
const SERVICE_METADATA = {
  product: 'cloudshop-learn',
  service: 'auth',
  status: 'ok',
  domain: 'e-learning',
};

const users = [];

function sendValidationError(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readBearerToken(authorizationHeader) {
  return authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : null;
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
    expiresIn: '24h',
  });
}

app.get('/', (req, res) => {
  res.json({
    ...SERVICE_METADATA,
    capabilities: ['register', 'login', 'token-verification'],
  });
});

app.get('/health', (req, res) => {
  res.json({
    ...SERVICE_METADATA,
    cors_origins: corsOrigins,
    security: {
      jwt_configured: Boolean(JWT_SECRET),
    },
  });
});

app.post('/auth/register', async (req, res) => {
  const username = normalizeText(req.body.username);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!username || !email || !password) {
    return sendValidationError(res, 'All fields are required');
  }

  if (!email.includes('@')) {
    return sendValidationError(res, 'A valid email address is required');
  }

  if (username.length < 3) {
    return sendValidationError(res, 'Username must be at least 3 characters');
  }

  if (password.length < 8) {
    return sendValidationError(res, 'Password must be at least 8 characters');
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
  };
  users.push(user);

  res.status(201).json({
    message: 'Registration successful',
    token: createToken(user),
    user: { id: user.id, username: user.username, email: user.email },
  });
});

app.post('/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!email || !password) {
    return sendValidationError(res, 'Email and password are required');
  }

  const user = users.find((existingUser) => existingUser.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    message: 'Login successful',
    token: createToken(user),
    user: { id: user.id, username: user.username, email: user.email },
  });
});

app.get('/auth/verify', (req, res) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

app.get('/auth/me', (req, res) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      user: {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
