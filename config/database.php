<?php
/**
 * RideEase - Database connection & core configuration
 *
 * Uses PDO with REAL prepared statements (ATTR_EMULATE_PREPARES = false).
 * All database errors are logged to the PHP error log and never shown
 * to visitors as raw SQL errors.
 *
 * Edit DB_* below to match your XAMPP MySQL setup.
 * Default XAMPP MySQL: host 127.0.0.1, user root, empty password.
 */

// ---- Database configuration ----
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'rideease');
define('DB_USER', 'root');
define('DB_PASS', '');            // default XAMPP MySQL root password is empty
define('DB_CHARSET', 'utf8mb4');

// ---- Site configuration ----
// Must match the folder name inside XAMPP's htdocs directory.
define('SITE_NAME', 'RideEase');
define('BASE_URL', '/RideEase');

// ---- Start session (exactly once, even if included repeatedly) ----
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ---- PDO connection ----
/** @var PDO|null */
$pdo = null;
try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // throw exceptions (never echo raw SQL)
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,                    // real prepared statements
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log('RideEase DB connection error: ' . $e->getMessage());
    die(
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        . '<title>RideEase - Database Error</title></head><body>'
        . '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:60px auto;'
        . 'padding:24px;border:1px solid #f5c2c7;background:#f8d7da;color:#842029;border-radius:10px">'
        . '<h2>Database connection error</h2>'
        . '<p>RideEase could not connect to the local MySQL database.</p>'
        . '<p>Please check that:</p><ul>'
        . '<li>XAMPP is running (Apache <strong>and</strong> MySQL/MariaDB)</li>'
        . '<li>The <code>rideease</code> database has been imported (see <code>database/rideease.sql</code>)</li>'
        . '<li>The credentials in <code>config/database.php</code> match your XAMPP setup</li>'
        . '</ul></div></body></html>'
    );
}

/* ============================================================
 *  Helper functions
 * ============================================================ */

/**
 * Read an admin-configurable setting from the `settings` table.
 * Values are cached per request.
 */
function get_setting(string $key, string $default = ''): string
{
    global $pdo;
    static $cache = [];
    if (!array_key_exists($key, $cache)) {
        $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1');
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        $cache[$key] = ($val === false) ? $default : (string)$val;
    }
    return $cache[$key];
}

/** Late fee charged per day for late returns (admin-configurable). */
function late_fee_per_day(): float
{
    return (float) get_setting('late_fee_per_day', '100.00');
}

/** Default security deposit suggested for new vehicles. */
function default_security_deposit(): float
{
    return (float) get_setting('default_security_deposit', '2000.00');
}

/** Format a money amount with the configured currency symbol. */
function format_money($amount): string
{
    return get_setting('currency_symbol', '₹') . number_format((float) $amount, 2);
}

/**
 * Flash messages: stored in the session, displayed once by the header.
 * Types: success, danger, warning, info.
 */
function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function get_flash(): ?array
{
    if (!empty($_SESSION['flash']) && is_array($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

/** Escape output for HTML context (output escaping). */
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/** Redirect helper (always call exit inside). */
function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/** Currently logged-in customer row, or null. */
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

/** Currently logged-in admin row, or null. */
function current_admin(): ?array
{
    return $_SESSION['admin'] ?? null;
}

/** Render a booking status as a styled pill badge. */
function booking_status_pill(string $status): string
{
    $map = [
        'Pending'   => 'status-pill status-pending',
        'Confirmed' => 'status-pill status-confirmed',
        'Active'    => 'status-pill status-active',
        'Completed' => 'status-pill status-completed',
        'Cancelled' => 'status-pill status-cancelled',
        'Rejected'  => 'status-pill status-rejected',
    ];
    $cls = $map[$status] ?? 'status-pill status-completed';
    return '<span class="' . $cls . '">' . e($status) . '</span>';
}

/** Render a payment status as a styled pill badge. */
function payment_status_pill(string $status): string
{
    $map = [
        'Pending'  => 'status-pill status-pending',
        'Paid'     => 'status-pill status-active',
        'Failed'   => 'status-pill status-cancelled',
        'Refunded' => 'status-pill status-confirmed',
    ];
    $cls = $map[$status] ?? 'status-pill status-completed';
    return '<span class="' . $cls . '">' . e($status) . '</span>';
}

/** Render a vehicle availability status as a badge. */
function availability_badge(string $availability): string
{
    $map = [
        'Available'   => 'badge badge-available',
        'Unavailable' => 'badge badge-unavailable',
        'Maintenance' => 'badge badge-maintenance',
    ];
    $cls = $map[$availability] ?? 'badge badge-unavailable';
    return '<span class="' . $cls . '">' . e($availability) . '</span>';
}

/**
 * Render a vehicle as a Bootstrap card (used on the home page
 * and the vehicle listing). Links to the vehicle details page.
 */
function vehicle_card(array $v): string
{
    $url = BASE_URL . '/vehicle_details.php?vehicle_id=' . (int) $v['vehicle_id'];
    $img = BASE_URL . '/assets/images/vehicles/' . e($v['image']);
    $name = e($v['brand'] . ' ' . $v['model']);
    return '
    <div class="col-md-6 col-lg-4 mb-4">
      <a href="' . $url . '" class="text-decoration-none">
        <div class="card vehicle-card h-100">
          <img src="' . $img . '" class="card-img-top" alt="' . $name . '">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h6 class="mb-0">' . $name . '</h6>
              ' . availability_badge((string) $v['availability']) . '
            </div>
            <div class="text-muted-2 small mb-2">'
              . e($v['type']) . ' &middot; ' . e($v['fuel_type']) . ' &middot; ' . e($v['transmission'])
            . '</div>
            <ul class="spec-list">
              <li><i class="bi bi-people me-2"></i>' . (int) $v['seating_capacity'] . ' seats</li>
              <li><i class="bi bi-shield me-2"></i>Deposit ' . e(format_money($v['security_deposit'])) . '</li>
            </ul>
            <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
              <span class="price-badge">' . e(format_money($v['rent_per_day']))
                . '<small class="text-muted-2 fw-normal"> /day</small></span>
              <span class="btn btn-sm btn-rideease">Details</span>
            </div>
          </div>
        </div>
      </a>
    </div>';
}

/**
 * Count bookings of a vehicle that overlap the given date range.
 * Only bookings that block a new rental are counted
 * (Pending, Confirmed, Active). Cancelled/Rejected/Completed do not block.
 *
 * Overlap rule: a range [pickup, return) overlaps [pickup_date, return_date)
 * when  pickup_date < return  AND  return_date > pickup.
 */
function count_overlapping_bookings(PDO $pdo, int $vehicleId, string $pickupDate, string $returnDate, int $excludeBookingId = 0): int
{
    $sql = "SELECT COUNT(*) FROM bookings
            WHERE vehicle_id = ?
              AND booking_status IN ('Pending','Confirmed','Active')
              AND pickup_date < ?
              AND return_date > ?";
    $params = [$vehicleId, $returnDate, $pickupDate];
    if ($excludeBookingId > 0) {
        $sql .= ' AND booking_id <> ?';
        $params[] = $excludeBookingId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}
