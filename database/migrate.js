const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'rideease_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

async function migrate() {
  const [tables] = await pool.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  const existingTables = new Set(tables.map((table) => table.TABLE_NAME));

  for (const requiredTable of ['admins', 'bikes']) {
    if (!existingTables.has(requiredTable)) {
      throw new Error(`Required table "${requiredTable}" is missing. Run schema.sql first.`);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('seller', 'customer') NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [userColumns] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['users']
  );
  const existingUserColumns = new Set(userColumns.map((column) => column.COLUMN_NAME));
  if (!existingUserColumns.has('username')) {
    await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER name');
  }

  await pool.query(
    "UPDATE users SET username = CONCAT('rider', id) WHERE username IS NULL OR TRIM(username) = ''"
  );
  const [userIndexes] = await pool.query(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['users', 'username']
  );
  if (!userIndexes.some((index) => index.INDEX_NAME === 'uq_users_username' || index.INDEX_NAME === 'username')) {
    await pool.query('ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)');
  }
  await pool.query('ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NOT NULL');

  const [bikeColumns] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['bikes']
  );
  const existingColumns = new Set(bikeColumns.map((column) => column.COLUMN_NAME));
  const bikeChanges = [
    ['seller_id', 'ALTER TABLE bikes ADD COLUMN seller_id INT NULL'],
    ['rental_price', 'ALTER TABLE bikes ADD COLUMN rental_price DECIMAL(10,2) NOT NULL DEFAULT 850.00'],
    ['approval_status', "ALTER TABLE bikes ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'"],
    ['seller_removed_at', 'ALTER TABLE bikes ADD COLUMN seller_removed_at DATETIME NULL']
  ];

  for (const [column, statement] of bikeChanges) {
    if (!existingColumns.has(column)) {
      await pool.query(statement);
    }
  }

  await pool.query(`
    UPDATE bikes
    SET image_url = CASE id
      WHEN 1 THEN '/images/bikes/bike_activa.jpg'
      WHEN 2 THEN '/images/bikes/bike_fzs.jpg'
      WHEN 3 THEN '/images/bikes/bike_classic.jpg'
      WHEN 4 THEN '/images/bikes/bike_pulsar.jpg'
      WHEN 5 THEN '/images/bikes/bike_apache.jpg'
      WHEN 6 THEN '/images/bikes/bike_splendor.jpg'
    END
    WHERE seller_id IS NULL
      AND (
        (id = 1 AND image_url = '/images/bikes/bike_activa.svg') OR
        (id = 2 AND image_url = '/images/bikes/bike_fzs.svg') OR
        (id = 3 AND image_url = '/images/bikes/bike_classic.svg') OR
        (id = 4 AND image_url = '/images/bikes/bike_pulsar.svg') OR
        (id = 5 AND image_url = '/images/bikes/bike_apache.svg') OR
        (id = 6 AND image_url = '/images/bikes/bike_splendor.svg')
      )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      customer_id INT NOT NULL,
      pickup_date DATE NOT NULL,
      return_date DATE NOT NULL,
      rate_per_day DECIMAL(10,2) NOT NULL,
      status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bookings_availability (vehicle_id, status, pickup_date, return_date),
      INDEX idx_bookings_customer (customer_id, created_at),
      CONSTRAINT fk_bookings_vehicle FOREIGN KEY (vehicle_id) REFERENCES bikes(id) ON DELETE RESTRICT,
      CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL UNIQUE,
      method ENUM('demo_upi', 'demo_card', 'cash') NOT NULL,
      reference VARCHAR(32) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [bookingColumns] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['bookings']
  );
  const existingBookingColumns = new Set(bookingColumns.map((column) => column.COLUMN_NAME));
  if (existingBookingColumns.has('total_days') || existingBookingColumns.has('total_amount')) {
    const [inconsistentBookings] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE ${existingBookingColumns.has('total_days') ? 'total_days <> DATEDIFF(return_date, pickup_date)' : '0'}
         OR ${existingBookingColumns.has('total_amount') ? 'total_amount <> ROUND(rate_per_day * DATEDIFF(return_date, pickup_date), 2)' : '0'}
    `);
    if (Number(inconsistentBookings[0].count)) {
      throw new Error('Cannot normalize bookings: stored duration or total disagrees with its dates and rate.');
    }
    const redundantBookingColumns = ['total_days', 'total_amount'].filter((column) => existingBookingColumns.has(column));
    await pool.query(`ALTER TABLE bookings ${redundantBookingColumns.map((column) => `DROP COLUMN ${column}`).join(', ')}`);
  }

  const [paymentColumns] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['payments']
  );
  const existingPaymentColumns = new Set(paymentColumns.map((column) => column.COLUMN_NAME));
  const redundantPaymentColumns = ['amount', 'status'].filter((column) => existingPaymentColumns.has(column));
  if (redundantPaymentColumns.length) {
    const amountMismatch = existingPaymentColumns.has('amount')
      ? 'p.amount <> ROUND(b.rate_per_day * DATEDIFF(b.return_date, b.pickup_date), 2)'
      : '0';
    const statusMismatch = existingPaymentColumns.has('status')
      ? "p.status <> CASE WHEN p.method = 'cash' THEN 'pay_on_pickup' ELSE 'simulated' END"
      : '0';
    const [inconsistentPayments] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE ${amountMismatch} OR ${statusMismatch}
    `);
    if (Number(inconsistentPayments[0].count)) {
      throw new Error('Cannot normalize payments: stored amount or status disagrees with its booking or method.');
    }
    await pool.query(`ALTER TABLE payments ${redundantPaymentColumns.map((column) => `DROP COLUMN ${column}`).join(', ')}`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL UNIQUE,
      rating TINYINT UNSIGNED NOT NULL,
      comment VARCHAR(1000) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
      CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rideease_sessions (
      sid VARCHAR(128) NOT NULL PRIMARY KEY,
      session_data MEDIUMTEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      INDEX idx_rideease_sessions_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [admins] = await pool.query('SELECT id, password FROM admins');
  for (const admin of admins) {
    if (!/^\$2[aby]\$\d{2}\$/.test(admin.password)) {
      const passwordHash = await bcrypt.hash(admin.password, 12);
      await pool.query('UPDATE admins SET password = ? WHERE id = ?', [passwordHash, admin.id]);
    }
  }

  console.log('[DB] Marketplace schema is up to date.');
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error('[DB] Database migration failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = migrate;
