<?php
/**
 * Customer dashboard.
 *
 * Shows a welcome message, booking statistics and quick links.
 */
require_once __DIR__ . '/../includes/auth.php';

$pageTitle = 'Dashboard - RideEase';
$activeNav = 'dashboard';

$user   = current_user();
$userId = (int) $user['user_id'];

// ---- Booking statistics for this customer ----
$stmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE user_id = ?');
$stmt->execute([$userId]);
$totalBookings = (int) $stmt->fetchColumn();

$countByStatus = function (string $status) use ($pdo, $userId): int {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE user_id = ? AND booking_status = ?');
    $stmt->execute([$userId, $status]);
    return (int) $stmt->fetchColumn();
};

$activeBookings    = $countByStatus('Active');
$completedBookings = $countByStatus('Completed');
$pendingBookings   = $countByStatus('Pending');

// ---- Recent bookings (latest 5) ----
$stmt = $pdo->prepare(
    "SELECT b.booking_id, b.pickup_date, b.return_date, b.total_amount, b.booking_status,
            v.brand, v.model, v.type
     FROM bookings b
     JOIN vehicles v ON v.vehicle_id = b.vehicle_id
     WHERE b.user_id = ?
     ORDER BY b.booking_date DESC, b.booking_id DESC
     LIMIT 5"
);
$stmt->execute([$userId]);
$recentBookings = $stmt->fetchAll();
?>

<div class="container py-4">
  <!-- Welcome banner -->
  <div class="hero rounded-4 mb-4" style="padding:2.2rem 2.5rem">
    <h4 class="mb-1">
      <i class="bi bi-hand-thumbs-up me-2"></i>Welcome, <?= e($user['full_name']) ?>!
    </h4>
    <p class="mb-0 opacity-75">Here is an overview of your rentals with RideEase.</p>
  </div>

  <!-- Statistics -->
  <div class="row g-4 mb-4">
    <div class="col-sm-6 col-xl-3">
      <div class="card stat-card h-100">
        <div class="card-body d-flex align-items-center">
          <div class="stat-icon text-white" style="background:#4361ee">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="ms-3">
            <div class="stat-value"><?= $totalBookings ?></div>
            <div class="text-muted-2 small">Total Bookings</div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-xl-3">
      <div class="card stat-card h-100">
        <div class="card-body d-flex align-items-center">
          <div class="stat-icon text-white" style="background:#0d9488">
            <i class="bi bi-lightning-charge"></i>
          </div>
          <div class="ms-3">
            <div class="stat-value"><?= $activeBookings ?></div>
            <div class="text-muted-2 small">Active Bookings</div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-xl-3">
      <div class="card stat-card h-100">
        <div class="card-body d-flex align-items-center">
          <div class="stat-icon text-white" style="background:#6b7280">
            <i class="bi bi-check2-circle"></i>
          </div>
          <div class="ms-3">
            <div class="stat-value"><?= $completedBookings ?></div>
            <div class="text-muted-2 small">Completed Rentals</div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-xl-3">
      <div class="card stat-card h-100">
        <div class="card-body d-flex align-items-center">
          <div class="stat-icon text-white" style="background:#d97706">
            <i class="bi bi-hourglass-split"></i>
          </div>
          <div class="ms-3">
            <div class="stat-value"><?= $pendingBookings ?></div>
            <div class="text-muted-2 small">Pending Bookings</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick links -->
  <div class="row g-4 mb-4">
    <div class="col-md-4">
      <a href="<?= BASE_URL ?>/vehicles.php" class="text-decoration-none">
        <div class="card stat-card h-100 border-primary border-opacity-25">
          <div class="card-body text-center py-4">
            <i class="bi bi-car-front display-5" style="color:var(--rideease-primary)"></i>
            <h6 class="mt-2 mb-1">Browse Vehicles</h6>
            <small class="text-muted-2">Find your next rental</small>
          </div>
        </div>
      </a>
    </div>
    <div class="col-md-4">
      <a href="<?= BASE_URL ?>/user/bookings.php" class="text-decoration-none">
        <div class="card stat-card h-100 border-primary border-opacity-25">
          <div class="card-body text-center py-4">
            <i class="bi bi-calendar2-week display-5" style="color:var(--rideease-primary)"></i>
            <h6 class="mt-2 mb-1">My Bookings</h6>
            <small class="text-muted-2">View &amp; manage your rentals</small>
          </div>
        </div>
      </a>
    </div>
    <div class="col-md-4">
      <a href="<?= BASE_URL ?>/user/profile.php" class="text-decoration-none">
        <div class="card stat-card h-100 border-primary border-opacity-25">
          <div class="card-body text-center py-4">
            <i class="bi bi-person-circle display-5" style="color:var(--rideease-primary)"></i>
            <h6 class="mt-2 mb-1">My Profile</h6>
            <small class="text-muted-2">Update your details</small>
          </div>
        </div>
      </a>
    </div>
  </div>

  <!-- Recent bookings -->
  <div class="card stat-card">
    <div class="card-header bg-white border-bottom-0 pt-3 px-4">
      <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recent Bookings</h6>
    </div>
    <div class="card-body px-4 pb-4">
      <?php if (empty($recentBookings)): ?>
        <p class="text-muted-2 mb-0">
          You have no bookings yet.
          <a href="<?= BASE_URL ?>/vehicles.php">Browse vehicles</a> to get started.
        </p>
      <?php else: ?>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Vehicle</th>
                <th>Pickup</th>
                <th>Return</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($recentBookings as $b): ?>
                <tr>
                  <td class="fw-semibold">#<?= (int) $b['booking_id'] ?></td>
                  <td><?= e($b['brand']) ?> <?= e($b['model']) ?>
                      <span class="text-muted-2 small"><?= e($b['type']) ?></span></td>
                  <td><?= e($b['pickup_date']) ?></td>
                  <td><?= e($b['return_date']) ?></td>
                  <td class="fw-semibold"><?= e(format_money($b['total_amount'])) ?></td>
                  <td><?= booking_status_pill($b['booking_status']) ?></td>
                  <td class="text-end">
                    <a href="<?= BASE_URL ?>/user/bookings.php" class="btn btn-sm btn-outline-primary">View</a>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
