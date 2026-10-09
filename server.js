const crypto = require('crypto');
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const migrate = require('./database/migrate');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rideease_db'
};
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const pool = mysql.createPool({
  ...DATABASE_CONFIG,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  dateStrings: true
});

class MySQLSessionStore extends session.Store {
  constructor() {
    super();
    this.cleanupInterval = setInterval(() => {
      pool.query('DELETE FROM rideease_sessions WHERE expires_at <= ?', [Date.now()])
        .catch((error) => console.error('[SESSION STORE] Expired-session cleanup failed:', error.message));
    }, 900000);
    this.cleanupInterval.unref();
  }

  get(sessionId, callback) {
    pool.execute(
      'SELECT session_data FROM rideease_sessions WHERE sid = ? AND expires_at > ?',
      [sessionId, Date.now()]
    ).then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].session_data) : null)).catch(callback);
  }

  set(sessionId, sessionData, callback) {
    const expiresAt = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + 86400000;
    pool.execute(
      `INSERT INTO rideease_sessions (sid, session_data, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE session_data = VALUES(session_data), expires_at = VALUES(expires_at)`,
      [sessionId, JSON.stringify(sessionData), expiresAt]
    ).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback) {
    const expiresAt = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + 86400000;
    pool.execute('UPDATE rideease_sessions SET expires_at = ? WHERE sid = ?', [expiresAt, sessionId])
      .then(() => callback(null)).catch(callback);
  }

  destroy(sessionId, callback) {
    pool.execute('DELETE FROM rideease_sessions WHERE sid = ?', [sessionId])
      .then(() => callback(null)).catch(callback);
  }
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, UPLOADS_DIR),
  filename: (req, file, callback) => {
    callback(null, `bike-${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});
const imageUpload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Upload a JPG, PNG, or WebP photo.'));
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(session({
  name: 'rideease.sid',
  secret: process.env.SESSION_SECRET || 'rideease-local-development-session-secret',
  store: new MySQLSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000
  }
}));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function removeUploadedFile(file) {
  if (file) fs.unlink(file.path, (error) => {
    if (error && error.code !== 'ENOENT') console.error('[UPLOAD] Could not remove temporary file:', error.message);
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return sendError(res, 401, 'Please sign in to continue.');
    if (req.session.user.role !== role) return sendError(res, 403, 'This account cannot access that action.');
    next();
  };
}

function validateDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function renderPage(file) {
  return (req, res) => res.sendFile(path.join(PUBLIC_DIR, file));
}

app.get('/', renderPage('marketplace.html'));
app.get('/account', renderPage('account.html'));
app.get('/admin', renderPage('admin.html'));
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api', (req, res, next) => {
  req.apiPath = true;
  next();
});

app.get('/api/auth/session', (req, res) => {
  res.json({ success: true, user: req.session.user || null });
});

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== 'string' || password.length < 8 || password.length > 72 ||
      !['seller', 'customer'].includes(role)) {
    return sendError(res, 400, 'Enter a name, valid email, password (at least 8 characters), and customer or seller account type.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash, role]
    );
    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role };
    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.user = user;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return sendError(res, 409, 'An account with that email already exists.');
    throw error;
  }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password, role } = req.body || {};
  if (typeof password !== 'string' || !password || !['admin', 'seller', 'customer'].includes(role)) {
    return sendError(res, 400, 'Enter your password and choose a valid account type.');
  }

  let user;
  if (role === 'admin') {
    const username = typeof email === 'string' ? email.trim() : '';
    const [admins] = await pool.query('SELECT id, username, password FROM admins WHERE username = ? LIMIT 1', [username]);
    if (!admins.length || !(await bcrypt.compare(password, admins[0].password))) {
      return sendError(res, 401, 'The admin username or password is incorrect.');
    }
    user = { id: admins[0].id, name: admins[0].username, email: admins[0].username, role: 'admin' };
  } else {
    if (typeof email !== 'string' || !email.trim()) return sendError(res, 400, 'Enter your account email.');
    const [users] = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? AND role = ? LIMIT 1',
      [email.trim().toLowerCase(), role]
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
      return sendError(res, 401, 'The email or password is incorrect.');
    }
    user = { id: users[0].id, name: users[0].name, email: users[0].email, role: users[0].role };
  }

  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.user = user;
  await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  return res.json({ success: true, user });
}));

app.post('/api/auth/logout', asyncRoute(async (req, res) => {
  if (req.session) {
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
  }
  res.clearCookie('rideease.sid');
  res.json({ success: true });
}));

app.get('/api/bikes', asyncRoute(async (req, res) => {
  const [bikes] = await pool.query(`
    SELECT b.id, b.title, b.rental_price, b.km_driven, b.description, b.image_url,
           b.seller_id, b.created_at, r.average_rating, COALESCE(r.review_count, 0) AS review_count
    FROM bikes b
    LEFT JOIN (
      SELECT bookings.vehicle_id, AVG(reviews.rating) AS average_rating, COUNT(*) AS review_count
      FROM reviews
      JOIN bookings ON bookings.id = reviews.booking_id
      GROUP BY bookings.vehicle_id
    ) r ON r.vehicle_id = b.id
    WHERE b.approval_status = 'approved'
    ORDER BY b.created_at DESC, b.id DESC
  `);
  res.json({ success: true, count: bikes.length, bikes });
}));

app.post('/api/listings', requireRole('seller'), (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error) return sendError(res, 400, error.message || 'Could not upload the photo.');
    next();
  });
}, asyncRoute(async (req, res) => {
  const { title, price, km_driven: kmDriven, description } = req.body || {};
  const rentalPrice = Number(price);
  const kilometres = Number(kmDriven);
  if (!req.file) return sendError(res, 400, 'Choose a vehicle photo.');
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 150 ||
      !Number.isFinite(rentalPrice) || rentalPrice <= 0 || rentalPrice > 10000000 ||
      !Number.isInteger(kilometres) || kilometres < 0 || kilometres > 10000000 ||
      typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 5000) {
    removeUploadedFile(req.file);
    return sendError(res, 400, 'Check the title, positive daily price, kilometre reading, and description (at least 10 characters).');
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO bikes (title, price, rental_price, km_driven, description, image_url, seller_id, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [title.trim(), rentalPrice, rentalPrice, kilometres, description.trim(), `/uploads/${req.file.filename}`, req.session.user.id]
    );
    res.status(201).json({ success: true, message: 'Listing submitted. It will appear in the marketplace after admin approval.', id: result.insertId });
  } catch (error) {
    removeUploadedFile(req.file);
    throw error;
  }
}));

app.get('/api/listings/mine', requireRole('seller'), asyncRoute(async (req, res) => {
  const [listings] = await pool.query(
    `SELECT id, title, rental_price, km_driven, image_url, approval_status, created_at
     FROM bikes WHERE seller_id = ? ORDER BY created_at DESC, id DESC`,
    [req.session.user.id]
  );
  res.json({ success: true, listings });
}));

app.get('/api/bookings/mine', requireRole('customer'), asyncRoute(async (req, res) => {
  const [bookings] = await pool.query(
    `SELECT b.id, b.pickup_date, b.return_date, b.total_days, b.rate_per_day, b.total_amount,
            b.status, v.title, p.method AS payment_method, p.status AS payment_status, p.reference,
            r.rating AS review_rating, r.comment AS review_comment,
            (b.status = 'confirmed' AND b.return_date <= CURRENT_DATE()) AS review_eligible
     FROM bookings b
     JOIN bikes v ON v.id = b.vehicle_id
     JOIN payments p ON p.booking_id = b.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.customer_id = ?
     ORDER BY b.created_at DESC, b.id DESC`,
    [req.session.user.id]
  );
  res.json({ success: true, bookings });
}));

app.post('/api/bookings/:id/review', requireRole('customer'), asyncRoute(async (req, res) => {
  const bookingId = Number(req.params.id);
  const rating = Number(req.body && req.body.rating);
  const comment = req.body && req.body.comment;
  if (!Number.isInteger(bookingId) || bookingId <= 0 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      (comment !== undefined && (typeof comment !== 'string' || comment.trim().length > 1000))) {
    return sendError(res, 400, 'Choose a rating from 1 to 5 stars and keep your review under 1,000 characters.');
  }

  const [bookings] = await pool.query(
    `SELECT id FROM bookings
     WHERE id = ? AND customer_id = ? AND status = 'confirmed' AND return_date <= CURRENT_DATE()
     LIMIT 1`,
    [bookingId, req.session.user.id]
  );
  if (!bookings.length) {
    return sendError(res, 403, 'You can review a confirmed rental after its return date.');
  }

  try {
    await pool.query(
      'INSERT INTO reviews (booking_id, rating, comment) VALUES (?, ?, ?)',
      [bookingId, rating, typeof comment === 'string' ? comment.trim() : '']
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return sendError(res, 409, 'You have already reviewed this rental.');
    throw error;
  }

  res.status(201).json({ success: true, message: 'Thanks for rating your rental.' });
}));

app.post('/api/bookings', requireRole('customer'), asyncRoute(async (req, res) => {
  const { vehicleId, pickupDate, returnDate, paymentMethod } = req.body || {};
  const id = Number(vehicleId);
  if (!Number.isInteger(id) || id <= 0 || !validateDate(pickupDate) || !validateDate(returnDate) ||
      !['demo_upi', 'demo_card', 'cash'].includes(paymentMethod)) {
    return sendError(res, 400, 'Choose valid rental dates and a demo payment method.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const days = (Date.parse(`${returnDate}T00:00:00Z`) - Date.parse(`${pickupDate}T00:00:00Z`)) / 86400000;
  if (pickupDate < today || !Number.isInteger(days) || days < 1 || days > 90) {
    return sendError(res, 400, 'Choose a pickup date today or later and a return date 1 to 90 days after pickup.');
  }

  const connection = await pool.getConnection();
  let uploadedError;
  try {
    await connection.beginTransaction();
    const [bikes] = await connection.query(
      `SELECT id, title, rental_price, approval_status, seller_id
       FROM bikes WHERE id = ? FOR UPDATE`,
      [id]
    );
    if (!bikes.length || bikes[0].approval_status !== 'approved') {
      await connection.rollback();
      return sendError(res, 404, 'This vehicle is not available for rental.');
    }
    if (bikes[0].seller_id === req.session.user.id) {
      await connection.rollback();
      return sendError(res, 400, 'You cannot book your own listing.');
    }
    const [conflicts] = await connection.query(
      `SELECT id FROM bookings
       WHERE vehicle_id = ? AND status = 'confirmed'
         AND pickup_date < ? AND return_date > ?
       LIMIT 1`,
      [id, returnDate, pickupDate]
    );
    if (conflicts.length) {
      await connection.rollback();
      return sendError(res, 409, 'That vehicle is already booked for part of those dates.');
    }

    const total = Number((Number(bikes[0].rental_price) * days).toFixed(2));
    const [booking] = await connection.query(
      `INSERT INTO bookings
       (vehicle_id, customer_id, pickup_date, return_date, total_days, rate_per_day, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.session.user.id, pickupDate, returnDate, days, bikes[0].rental_price, total]
    );
    const reference = `RE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const paymentStatus = paymentMethod === 'cash' ? 'pay_on_pickup' : 'simulated';
    await connection.query(
      'INSERT INTO payments (booking_id, method, status, amount, reference) VALUES (?, ?, ?, ?, ?)',
      [booking.insertId, paymentMethod, paymentStatus, total, reference]
    );
    await connection.commit();
    res.status(201).json({
      success: true,
      message: paymentStatus === 'simulated'
        ? 'Demo payment simulated successfully. No money was charged.'
        : 'Booking confirmed. Payment is due on pickup; no money was collected.',
      booking: { id: booking.insertId, title: bikes[0].title, total_days: days, total_amount: total, payment_status: paymentStatus, reference }
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[BOOKING] Could not roll back transaction:', rollbackError.message);
    }
    uploadedError = error;
  } finally {
    connection.release();
  }
  if (uploadedError) throw uploadedError;
}));

app.get('/api/admin/listings', requireRole('admin'), asyncRoute(async (req, res) => {
  const [listings] = await pool.query(
    `SELECT b.id, b.title, b.rental_price, b.km_driven, b.description, b.image_url,
            b.approval_status, b.created_at, u.name AS seller_name, u.email AS seller_email
     FROM bikes b LEFT JOIN users u ON u.id = b.seller_id
     ORDER BY FIELD(b.approval_status, 'pending', 'approved', 'rejected'), b.created_at DESC, b.id DESC`
  );
  res.json({ success: true, listings });
}));

app.patch('/api/admin/listings/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || id <= 0 || !['approved', 'rejected'].includes(status)) {
    return sendError(res, 400, 'Choose a valid listing and approval decision.');
  }
  const [result] = await pool.query(
    'UPDATE bikes SET approval_status = ? WHERE id = ? AND seller_id IS NOT NULL',
    [status, id]
  );
  if (!result.affectedRows) return sendError(res, 404, 'Seller listing not found.');
  res.json({ success: true, message: status === 'approved' ? 'Listing approved and published.' : 'Listing rejected.' });
}));

app.get('/api/login', (req, res) => sendError(res, 405, 'Use POST /api/login to sign in.'));
app.post('/api/login', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return sendError(res, 400, 'Please enter both username and password.');
  }
  const [admins] = await pool.query('SELECT id, username, password FROM admins WHERE username = ? LIMIT 1', [username]);
  if (!admins.length || !(await bcrypt.compare(password, admins[0].password))) return sendError(res, 401, 'Invalid username or password.');
  const user = { id: admins[0].id, name: admins[0].username, email: admins[0].username, role: 'admin' };
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.user = user;
  await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  res.json({ success: true, message: `Welcome back, ${user.name}!`, admin: { id: user.id, username: user.name }, user });
}));

app.post('/api/upload-bike', requireRole('admin'), (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => error ? sendError(res, 400, error.message) : next());
}, asyncRoute(async (req, res) => {
  const { title, price, km_driven: kmDriven, description } = req.body || {};
  const rentalPrice = Number(price);
  const kilometres = Number(kmDriven);
  if (!req.file || typeof title !== 'string' || !title.trim() ||
      !Number.isFinite(rentalPrice) || rentalPrice <= 0 ||
      !Number.isInteger(kilometres) || kilometres < 0 ||
      typeof description !== 'string' || !description.trim()) {
    removeUploadedFile(req.file);
    return sendError(res, 400, 'Enter the vehicle details, daily rental price, and photo.');
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO bikes (title, price, rental_price, km_driven, description, image_url, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
      [title.trim(), rentalPrice, rentalPrice, kilometres, description.trim(), `/uploads/${req.file.filename}`]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    removeUploadedFile(req.file);
    throw error;
  }
}));

app.put('/api/bikes/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { title, price, km_driven: kmDriven, description } = req.body || {};
  if (!Number.isInteger(id) || id <= 0 || typeof title !== 'string' || !title.trim() ||
      !Number.isFinite(Number(price)) || Number(price) <= 0 ||
      !Number.isInteger(Number(kmDriven)) || Number(kmDriven) < 0 ||
      typeof description !== 'string' || !description.trim()) {
    return sendError(res, 400, 'Enter valid vehicle details.');
  }
  const [result] = await pool.query(
    'UPDATE bikes SET title = ?, price = ?, rental_price = ?, km_driven = ?, description = ? WHERE id = ?',
    [title.trim(), Number(price), Number(price), Number(kmDriven), description.trim(), id]
  );
  if (!result.affectedRows) return sendError(res, 404, 'Vehicle not found.');
  res.json({ success: true });
}));

app.delete('/api/bikes/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return sendError(res, 400, 'Invalid vehicle id.');
  const [rows] = await pool.query('SELECT image_url FROM bikes WHERE id = ?', [id]);
  if (!rows.length) return sendError(res, 404, 'Vehicle not found.');
  try {
    await pool.query('DELETE FROM bikes WHERE id = ?', [id]);
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') return sendError(res, 409, 'This vehicle has booking history and cannot be deleted.');
    throw error;
  }
  if (rows[0].image_url && rows[0].image_url.startsWith('/uploads/')) {
    removeUploadedFile({ path: path.join(UPLOADS_DIR, path.basename(rows[0].image_url)) });
  }
  res.json({ success: true });
}));

app.use('/api', (req, res) => sendError(res, 404, 'API endpoint not found.'));
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error.message);
  if (res.headersSent) return next(error);
  sendError(res, 500, 'Unexpected server error.');
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('Set SESSION_SECRET to a unique secret before starting in production.');
  }
  await migrate();
  app.listen(PORT, () => {
    console.log('==================================================');
    console.log('  RideEase server is running');
    console.log('  Marketplace : http://localhost:' + PORT);
    console.log('  Accounts    : http://localhost:' + PORT + '/account');
    console.log('  Admin       : http://localhost:' + PORT + '/admin');
    console.log('==================================================');
  });
}

startServer().catch((error) => {
  console.error('[STARTUP ERROR]', error.message);
  process.exitCode = 1;
});
