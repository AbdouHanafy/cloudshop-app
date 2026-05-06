const express = require('express');
const { Pool } = require('pg');

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
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cloudshop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: (process.env.DB_SSL || '').toLowerCase() === 'true'
    || (process.env.DB_HOST || '').endsWith('.postgres.database.azure.com')
    ? { rejectUnauthorized: false }
    : false,
});
const SERVICE_METADATA = {
  product: 'cloudshop-learn',
  service: 'enrollments',
  status: 'ok',
  domain: 'e-learning',
};
let dbReady = false;

function sendValidationError(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

pool
  .query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      course_id INTEGER NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      instructor VARCHAR(150) NOT NULL,
      progress INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      enrolled_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    )
  `)
  .then(() => {
    dbReady = true;
    console.log('Enrollments table ready');
  })
  .catch((err) => {
    dbReady = false;
    console.error('DB init error:', err.message);
  });

app.get('/', (req, res) => {
  res.json({
    ...SERVICE_METADATA,
    capabilities: ['enrollment-creation', 'progress-tracking', 'postgres-persistence'],
  });
});

app.get('/health', (req, res) => {
  pool
    .query('SELECT 1')
    .then(() => {
      dbReady = true;
      res.json({
        ...SERVICE_METADATA,
        cors_origins: corsOrigins,
        dependencies: [{ name: 'postgres', status: 'ok' }],
      });
    })
    .catch(() => {
      dbReady = false;
      res.status(503).json({
        ...SERVICE_METADATA,
        cors_origins: corsOrigins,
        dependencies: [{ name: 'postgres', status: 'unavailable' }],
      });
    });
});

app.get('/enrollments/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 ORDER BY enrolled_at DESC',
      [req.params.userId],
    );
    const items = result.rows;
    const completed = items.filter((enrollment) => enrollment.status === 'completed').length;
    res.json({
      user_id: req.params.userId,
      items,
      count: items.length,
      summary: {
        active: items.length - completed,
        completed,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/enrollments', async (req, res) => {
  const userId = normalizeText(req.body.user_id);
  const courseId = Number(req.body.course_id);
  const courseTitle = normalizeText(req.body.course_title);
  const category = normalizeText(req.body.category);
  const instructor = normalizeText(req.body.instructor);

  if (!dbReady) {
    return res.status(503).json({ error: 'Enrollment database not ready' });
  }

  if (!userId || !Number.isInteger(courseId) || courseId <= 0 || !courseTitle || !category || !instructor) {
    return sendValidationError(res, 'Missing or invalid enrollment fields');
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO enrollments (user_id, course_id, course_title, category, instructor)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET
          status = 'active',
          course_title = EXCLUDED.course_title,
          category = EXCLUDED.category,
          instructor = EXCLUDED.instructor
        RETURNING *
      `,
      [userId, courseId, courseTitle, category, instructor],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/enrollments/:id/progress', async (req, res) => {
  const enrollmentId = Number(req.params.id);
  const requestedProgress = Number(req.body.progress);
  const progress = Math.max(0, Math.min(100, requestedProgress));

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return sendValidationError(res, 'Enrollment id must be a positive number');
  }

  if (Number.isNaN(progress)) {
    return sendValidationError(res, 'Progress must be a number');
  }

  const status = progress >= 100 ? 'completed' : 'active';

  try {
    const result = await pool.query(
      'UPDATE enrollments SET progress = $1, status = $2 WHERE id = $3 RETURNING *',
      [progress, status, enrollmentId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => console.log(`Orders service running on port ${PORT}`));
