const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'cloudshop-secret-key';

// In-memory users (remplacé par DB en prod)
const users = [];

app.get('/', (req, res) => {
  res.json({ service: 'auth', status: 'ok' });
});

app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { 
    id: users.length + 1, 
    username, 
    email, 
    password: hashedPassword 
  };
  users.push(user);

  const token = jwt.sign(
    { id: user.id, email: user.email }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  res.status(201).json({ 
    message: 'User created', 
    token,
    user: { id: user.id, username, email } 
  });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  res.json({ 
    message: 'Login successful', 
    token,
    user: { id: user.id, username: user.username, email } 
  });
});

app.get('/auth/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));