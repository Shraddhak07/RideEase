<?php
/**
 * Vehicle details page.
 *
 * Shows the full vehicle information, pricing summary
 * and a "Book Now" call to action. Related vehicles
 * (same type, currently available) are shown below.
 *
 * Invalid or unknown vehicle_id shows a friendly
 * "not found" page instead of a raw error.
 */
require_once __DIR__ . '/includes/header.php';

$activeNav = 'vehicles';

$vehicleId = (int) ($_GET['vehicle_id'] ?? 0);

$stmt = $pdo->prepare('SELECT * FROM vehicles WHERE vehicle_id = ? LIMIT 1');
$stmt->execute([$vehicleId]);
$vehicle = $stmt->fetch();

// ---- Unknown vehicle -> friendly 404 page ----
if ($vehicle === false) {
    $pageTitle = 'Vehicle Not Found - RideEase';
    ?>
    <div class="container py-5 text-center">
      <i class="bi bi-car-front display-1 text-muted-2"></i>
      <h2 class="mt-3">Vehicle not found</h2>
      <p class="text-muted-2">
        The vehicle you are looking for does not exist or has been removed.
      </p>
      <a href="<?= BASE_URL ?>/vehicles.php" class="btn btn-rideease mt-2">
        <i class="bi bi-arrow-left me-1"></i>Back to Vehicles
      </a>
    </div>
    <?php
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$pageTitle = $vehicle['brand'] . ' ' . $vehicle['model'] . ' - RideEase';

// ---- Next date this vehicle is free (if it is out on rent right now) ----
$stmt = $pdo->prepare(
    "SELECT MAX(return_date) AS rented_until
     FROM bookings
     WHERE vehicle_id = ?
       AND booking_status IN ('Pending','Confirmed','Active')
       AND return_date >= CURDATE()"
);
$stmt->execute([$vehicleId]);
$rentedUntil = $stmt->fetchColumn();

// ---- Related vehicles: same type, available, not this one ----
$stmt = $pdo->prepare(
    "SELECT * FROM vehicles
     WHERE type = ?
       AND availability = 'Available'
       AND vehicle_id <> ?
     ORDER BY rent_per_day DESC
     LIMIT 3"
);
$stmt->execute([$vehicle['type'], $vehicleId]);
$related = $stmt->fetchAll();

$isAvailable = ((string) $vehicle['availability'] === 'Available');
$lateFee = late_fee_per_day();
?>

<div class="container py-4">

  <!-- Breadcrumb -->
  <nav aria-label="breadcrumb" class="mb-3">
    <ol class="breadcrumb">
      <li class="breadcrumb-item"><a href="<?= BASE_URL ?>/index.php">Home</a></li>
      <li class="breadcrumb-item"><a href="<?= BASE_URL ?>/vehicles.php">Vehicles</a></li>
      <li class="breadcrumb-item active" aria-current="page">
        <?= e($vehicle['brand']) ?> <?= e($vehicle['model']) ?>
      </li>
    </ol>
  </nav>

  <div class="row g-4">
    <!-- ============ Left: image + description ============ -->
    <div class="col-lg-7">
      <div class="card stat-card">
        <img src="<?= BASE_URL ?>/assets/images/vehicles/<?= e($vehicle['image']) ?>"
             class="img-vehicle-lg card-img-top"
             alt="<?= e($vehicle['brand'] . ' ' . $vehicle['model']) ?>">
        <div class="card-body">
          <h5 class="mb-3"><i class="bi bi-file-earmark-text me-2"></i>About this <?= e(strtolower($vehicle['type'])) ?></h5>
          <p class="mb-0"><?= e($vehicle['description']) ?></p>
        </div>
      </div>

      <!-- Specifications -->
      <div class="card stat-card mt-4">
        <div class="card-header bg-white">
          <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Specifications</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-car-front me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Type</small><strong><?= e($vehicle['type']) ?></strong></div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-people me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Seating Capacity</small><strong><?= (int) $vehicle['seating_capacity'] ?> seats</strong></div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-fuel-pump me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Fuel Type</small><strong><?= e($vehicle['fuel_type']) ?></strong></div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-gear me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Transmission</small><strong><?= e($vehicle['transmission']) ?></strong></div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-card-text me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Registration No.</small><strong><?= e($vehicle['registration_number']) ?></strong></div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-p-circle me-2 text-muted-2"></i>
                <div><small class="text-muted-2 d-block">Status</small><strong><?= availability_badge((string) $vehicle['availability']) ?></strong></div>
              </div>
            </div>
          </div>
          <?php if ($rentedUntil !== false && $rentedUntil !== null && !$isAvailable): ?>
            <hr>
            <p class="text-muted-2 small mb-0">
              <i class="bi bi-info-circle me-1"></i>
              Currently out on rent. Expected back by
              <strong><?= e($rentedUntil) ?></strong>.
            </p>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- ============ Right: booking summary ============ -->
    <div class="col-lg-5">
      <div class="card stat-card">
        <div class="card-header bg-white">
          <h5 class="mb-0">
            <?= e($vehicle['brand']) ?> <?= e($vehicle['model']) ?>
            <span class="text-muted-2 small"><?= e($vehicle['type']) ?></span>
          </h5>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="price-badge">
              <?= e(format_money($vehicle['rent_per_day'])) ?>
              <small class="text-muted-2 fw-normal"> /day</small>
            </span>
            <?= availability_badge((string) $vehicle['availability']) ?>
          </div>

          <div class="summary-box mb-3">
            <div class="row">
              <span class="col-6 text-muted-2">Rental rate</span>
              <span class="col-6 text-end"><?= e(format_money($vehicle['rent_per_day'])) ?> /day</span>
            </div>
            <div class="row">
              <span class="col-6 text-muted-2">Security deposit</span>
              <span class="col-6 text-end"><?= e(format_money($vehicle['security_deposit'])) ?></span>
            </div>
            <div class="row">
              <span class="col-6 text-muted-2">Late return fee</span>
              <span class="col-6 text-end"><?= e(format_money($lateFee)) ?> /day</span>
            </div>
            <div class="row total-row">
              <span class="col-6">Pay at pickup</span>
              <span class="col-6 text-end"><?= e(format_money($vehicle['security_deposit'])) ?> +</span>
            </div>
          </div>
          <p class="text-muted-2 small">
            <i class="bi bi-info-circle me-1"></i>
            The security deposit is fully refundable at return.
            The exact rental total is calculated from your dates on the booking page.
          </p>

          <?php if ($isAvailable): ?>
            <?php if (current_user() !== null): ?>
              <a href="<?= BASE_URL ?>/book.php?vehicle_id=<?= (int) $vehicle['vehicle_id'] ?>"
                 class="btn btn-rideease btn-lg w-100">
                <i class="bi bi-calendar-plus me-1"></i>Book This <?= e($vehicle['type']) ?>
              </a>
            <?php else: ?>
              <a href="<?= BASE_URL ?>/login.php" class="btn btn-rideease btn-lg w-100">
                <i class="bi bi-box-arrow-in-right me-1"></i>Login to Book
              </a>
              <p class="text-muted-2 small text-center mt-2 mb-0">
                New here? <a href="<?= BASE_URL ?>/register.php">Create an account</a>
              </p>
            <?php endif; ?>
          <?php else: ?>
            <button class="btn btn-outline-secondary btn-lg w-100" disabled>
              <i class="bi bi-clock-history me-1"></i>
              Currently <?= e($vehicle['availability']) ?>
            </button>
            <p class="text-muted-2 small text-center mt-2 mb-0">
              Browse <a href="<?= BASE_URL ?>/vehicles.php?availability=Available">similar available vehicles</a>.
            </p>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ Related vehicles ============ -->
  <?php if (!empty($related)): ?>
    <div class="mt-5">
      <h4 class="section-title">Similar Available Vehicles</h4>
      <p class="section-subtitle">Other <?= e(strtolower($vehicle['type'])) ?>s you can rent right now</p>
      <div class="row g-4">
        <?php foreach ($related as $v): ?>
          <?= vehicle_card($v) ?>
        <?php endforeach; ?>
      </div>
    </div>
  <?php endif; ?>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
