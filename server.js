/* ============================================================
 *  RideEase - Express Backend Server
 *  Stack : Node.js + Express.js + MySQL (mysql2) + Multer
 *  Auth  : Plain-text admin login (college demo - no JWT/session)
 * ============================================================ */

const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------
 * 1. MySQL connection pool (mysql2)
 * ---------------------------------------------------------- */
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rideease_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4'
});

pool
  .getConnection()
  .then((connection) => {
    console.log('[DB] MySQL pool connected successfully.');
    connection.release();
  })
  .catch((err) => {
    console.error('[DB] Could not connect to MySQL:');
    console.error('     ' + err.message);
    console.error('     Make sure MariaDB/MySQL is running and "rideease_db" exists (run schema.sql).');
  });

/* ------------------------------------------------------------
 * 2. Static folders: public/ (site) + uploads/ (bike images)
 * ---------------------------------------------------------- */
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());

/* ------------------------------------------------------------
 * 3. Multer disk storage - timestamp based file names
 * ---------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `bike-${timestamp}${safeExt}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* ------------------------------------------------------------
 * 4. Helper
 * ---------------------------------------------------------- */
function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function discardFile(req) {
  if (req.file) {
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

/* ============================================================
 * API 1 : POST /api/login  (plain-text admin credentials)
 * ============================================================ */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return sendError(res, 400, 'Please enter both username and password.');
    }

    const [rows] = await pool.query(
      'SELECT id, username, password FROM admins WHERE username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0 || rows[0].password !== password) {
      return sendError(res, 401, 'Invalid username or password.');
    }

    const admin = rows[0];
    return res.json({
      success: true,
      message: `Welcome back, ${admin.username}!`,
      admin: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    return sendError(res, 500, 'Server error while logging in. Please try again.');
  }
});

/* ============================================================
 * API 2 : POST /api/upload-bike  (multipart form + image)
 * ============================================================ */
app.post('/api/upload-bike', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? err.message
        : err.message || 'Image upload failed.';
      return sendError(res, 400, message);
    }

    try {
      const fail = (status, message) => {
        discardFile(req);
        return sendError(res, status, message);
      };

      const { title, price, km_driven, description } = req.body;

      if (!title || !price || !km_driven || !description) {
        return fail(400, 'Please fill in title, price, kilometres driven and description.');
      }

      if (!req.file) {
        return fail(400, 'Please select a bike image to upload.');
      }

      const numericPrice = Number(price);
      const numericKm = Number(km_driven);

      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return fail(400, 'Price must be a valid positive number.');
      }

      if (!Number.isInteger(numericKm) || numericKm < 0) {
        return fail(400, 'Kilometres driven must be a valid whole number.');
      }

      const imageUrl = '/uploads/' + req.file.filename;

      const [result] = await pool.query(
        'INSERT INTO bikes (title, price, km_driven, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [title.trim(), numericPrice, numericKm, description.trim(), imageUrl]
      );

      const [rows] = await pool.query('SELECT * FROM bikes WHERE id = ?', [result.insertId]);

      return res.status(201).json({
        success: true,
        message: `"${title.trim()}" added to the showroom successfully.`,
        bike: rows[0]
      });
    } catch (dbErr) {
      console.error('[UPLOAD-BIKE ERROR]', dbErr.message);
      discardFile(req);
      return sendError(res, 500, 'Could not save the bike. Please try again.');
    }
  });
});

/* ============================================================
 * API 3 : GET /api/bikes  (all bikes, newest first)
 * ============================================================ */
app.get('/api/bikes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, price, km_driven, description, image_url, created_at FROM bikes ORDER BY created_at DESC, id DESC'
    );

    return res.json({
      success: true,
      count: rows.length,
      bikes: rows
    });
  } catch (err) {
    console.error('[BIKES ERROR]', err.message);
    return sendError(res, 500, 'Could not load the showroom inventory.');
  }
});

/* ------------------------------------------------------------
 * Image cleanup helper (only touches files inside /uploads)
 * ---------------------------------------------------------- */
function removeStoredImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/* ============================================================
 * API 4 : PUT /api/bikes/:id  (edit bike, optional new image)
 * ============================================================ */
app.put('/api/bikes/:id', (req, res) => {
  const bikeId = Number(req.params.id);
  if (!Number.isInteger(bikeId) || bikeId <= 0) {
    return sendError(res, 400, 'Invalid bike id.');
  }

  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? err.message
        : err.message || 'Image upload failed.';
      return sendError(res, 400, message);
    }

    try {
      const fail = (status, message) => {
        discardFile(req);
        return sendError(res, status, message);
      };

      const { title, price, km_driven, description } = req.body;

      if (!title || !price || !km_driven || !description) {
        return fail(400, 'Please fill in title, price, kilometres driven and description.');
      }

      const numericPrice = Number(price);
      const numericKm = Number(km_driven);

      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return fail(400, 'Price must be a valid positive number.');
      }

      if (!Number.isInteger(numericKm) || numericKm < 0) {
        return fail(400, 'Kilometres driven must be a valid whole number.');
      }

      const [existing] = await pool.query(
        'SELECT id, image_url FROM bikes WHERE id = ?',
        [bikeId]
      );

      if (existing.length === 0) {
        return fail(404, 'This bike no longer exists. It may have been deleted already.');
      }

      let imageUrl = existing[0].image_url;
      if (req.file) {
        imageUrl = '/uploads/' + req.file.filename;
        removeStoredImage(existing[0].image_url);
      }

      await pool.query(
        'UPDATE bikes SET title = ?, price = ?, km_driven = ?, description = ?, image_url = ? WHERE id = ?',
        [title.trim(), numericPrice, numericKm, description.trim(), imageUrl, bikeId]
      );

      const [rows] = await pool.query('SELECT * FROM bikes WHERE id = ?', [bikeId]);

      return res.json({
        success: true,
        message: `"${rows[0].title}" updated successfully.`,
        bike: rows[0]
      });
    } catch (dbErr) {
      console.error('[UPDATE-BIKE ERROR]', dbErr.message);
      discardFile(req);
      return sendError(res, 500, 'Could not update the bike. Please try again.');
    }
  });
});

/* ============================================================
 * API 5 : DELETE /api/bikes/:id  (remove bike + its image)
 * ============================================================ */
app.delete('/api/bikes/:id', async (req, res) => {
  const bikeId = Number(req.params.id);
  if (!Number.isInteger(bikeId) || bikeId <= 0) {
    return sendError(res, 400, 'Invalid bike id.');
  }

  try {
    const [existing] = await pool.query(
      'SELECT id, title, image_url FROM bikes WHERE id = ?',
      [bikeId]
    );

    if (existing.length === 0) {
      return sendError(res, 404, 'This bike no longer exists. It may have been deleted already.');
    }

    await pool.query('DELETE FROM bikes WHERE id = ?', [bikeId]);
    removeStoredImage(existing[0].image_url);

    return res.json({
      success: true,
      message: `"${existing[0].title}" has been removed from the showroom.`
    });
  } catch (err) {
    console.error('[DELETE-BIKE ERROR]', err.message);
    return sendError(res, 500, 'Could not delete the bike. Please try again.');
  }
});

/* ------------------------------------------------------------
 * Convenience routes
 * ---------------------------------------------------------- */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.use('/api', (req, res) => {
  sendError(res, 404, 'API endpoint not found.');
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  if (res.headersSent) return next(err);
  sendError(res, 500, 'Unexpected server error.');
});

/* ------------------------------------------------------------
 * 5. Start server
 * ---------------------------------------------------------- */
app.listen(PORT, () => {
  console.log('==================================================');
  console.log('  RideEase server is running');
  console.log('  Storefront : http://localhost:' + PORT);
  console.log('  Admin      : http://localhost:' + PORT + '/admin');
  console.log('==================================================');
});
