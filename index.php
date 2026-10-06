<?php
/**
 * Home page.
 *
 * Hero banner, live site statistics, featured vehicles
 * (available, top-priced first), and a "how it works" strip.
 */
require_once __DIR__ . '/includes/header.php';

$pageTitle = 'RideEase - Bike & Car Rental';
$activeNav = 'home';

// ---- Live statistics from the database ----
$totalVehicles = (int) $pdo->query('SELECT COUNT(*) FROM vehicles')->fetchColumn();
$availableVehicles = (int) $pdo->query(
    "SELECT COUNT(*) FROM vehicles WHERE availability = 'Available'"
)->fetchColumn();
$totalCustomers = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$totalRentals = (int) $pdo->query(
    "SELECT COUNT(*) FROM bookings WHERE booking_status IN ('Active','Completed')"
)->fetchColumn();

// ---- Featured vehicles: available, most premium first ----
$featured = $pdo->query(
    "SELECT * FROM vehicles
     WHERE availability = 'Available'
     ORDER BY rent_per_day DESC
     LIMIT 6"
)->fetchAll();
?>

<!-- ================= Hero ================= -->
<section class="hero">
  <div class="container">
    <div class="row align-items-center g-4">
      <div class="col-lg-7">
        <h1>Rent Cars &amp; Bikes<br>with Ease</h1>
        <p class="lead mb-4">
          RideEase is a simple, campus-friendly vehicle rental system.
          Browse our fleet, book in minutes, and pay at pickup -
          all handled offline, right on your college network.
        </p>
        <a href="<?= BASE_URL ?>/vehicles.php" class="btn btn-light btn-lg me-2">
          <i class="bi bi-car-front me-1"></i>Browse Vehicles
        </a>
        <a href="<?= BASE_URL ?>/register.php" class="btn btn-outline-light btn-lg">
          <i class="bi bi-person-plus me-1"></i>Get Started
        </a>
      </div>
      <div class="col-lg-5 text-center d-none d-lg-block">
        <i class="bi bi-speedometer2" style="font-size:11rem;opacity:.9"></i>
      </div>
    </div>
  </div>
</section>

<!-- ================= Stats ================= -->
<div class="container py-5">
  <div class="row g-4">
    <div class="col-6 col-md-3">
      <div class="card stat-card text-center h-100">
        <div class="card-body py-4">
          <div class="stat-value"><?= $availableVehicles ?></div>
          <div class="text-muted-2 small">Vehicles Available</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card stat-card text-center h-100">
        <div class="card-body py-4">
          <div class="stat-value"><?= $totalVehicles ?></div>
          <div class="text-muted-2 small">Total Fleet</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card stat-card text-center h-100">
        <div class="card-body py-4">
          <div class="stat-value"><?= $totalCustomers ?></div>
          <div class="text-muted-2 small">Registered Members</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card stat-card text-center h-100">
        <div class="card-body py-4">
          <div class="stat-value"><?= $totalRentals ?></div>
          <div class="text-muted-2 small">Rentals Completed</div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ================= Featured vehicles ================= -->
<div class="container pb-5">
  <h3 class="section-title">Featured Vehicles</h3>
  <p class="section-subtitle">Our most popular rentals - available right now</p>
  <div class="row g-4">
    <?php foreach ($featured as $v): ?>
      <?= str_replace('mb-4', 'mb-4', vehicle_card($v)) ?>
    <?php endforeach; ?>
  </div>
  <div class="text-center mt-2">
    <a href="<?= BASE_URL ?>/vehicles.php" class="btn btn-outline-primary px-4">
      <i class="bi bi-grid me-1"></i>View All Vehicles
    </a>
  </div>
</div>

<!-- ================= How it works ================= -->
<div class="py-5" style="background:var(--rideease-light)">
  <div class="container">
    <h3 class="section-title text-center">How It Works</h3>
    <p class="section-subtitle text-center">Renting takes less than five minutes</p>
    <div class="row g-4">
      <div class="col-md-4">
        <div class="card stat-card h-100">
          <div class="card-body text-center py-4">
            <div class="step-icon"><i class="bi bi-search"></i></div>
            <h5>1. Browse &amp; Choose</h5>
            <p class="text-muted-2 mb-0">Filter cars and bikes by type, brand, price and availability.</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card stat-card h-100">
          <div class="card-body text-center py-4">
            <div class="step-icon"><i class="bi bi-calendar-check"></i></div>
            <h5>2. Book &amp; Pay</h5>
            <p class="text-muted-2 mb-0">Pick your dates, see the exact price up front, and pay online or at pickup.</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card stat-card h-100">
          <div class="card-body text-center py-4">
            <div class="step-icon"><i class="bi bi-car-front"></i></div>
            <h5>3. Pick Up &amp; Drive</h5>
            <p class="text-muted-2 mb-0">Show your booking confirmation at the counter and hit the road.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ================= Why RideEase ================= -->
<div class="container py-5">
  <h3 class="section-title">Why RideEase?</h3>
  <p class="section-subtitle">Built for college campuses, by students</p>
  <div class="row g-4">
    <div class="col-md-6">
      <div class="d-flex">
        <div class="step-icon me-3" style="margin:0"><i class="bi bi-shield-check"></i></div>
        <div>
          <h6 class="mb-1">Transparent Pricing</h6>
          <p class="text-muted-2 small mb-0">Daily rate, security deposit and any late fees are shown before you confirm.</p>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="d-flex">
        <div class="step-icon me-3" style="margin:0"><i class="bi bi-calendar2-x"></i></div>
        <div>
          <h6 class="mb-1">No Double Bookings</h6>
          <p class="text-muted-2 small mb-0">The system automatically blocks dates that are already reserved.</p>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="d-flex">
        <div class="step-icon me-3" style="margin:0"><i class="bi bi-printer"></i></div>
        <div>
          <h6 class="mb-1">Printable Confirmation</h6>
          <p class="text-muted-2 small mb-0">Show your booking receipt at the pickup counter - no app needed.</p>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="d-flex">
        <div class="step-icon me-3" style="margin:0"><i class="bi bi-wifi-off"></i></div>
        <div>
          <h6 class="mb-1">Works Offline</h6>
          <p class="text-muted-2 small mb-0">Runs entirely on the college LAN - no internet, cloud or external services required.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ================= CTA ================= -->
<section class="hero mb-0" style="padding:3rem 0">
  <div class="container text-center">
    <h2 class="mb-3">Ready to hit the road?</h2>
    <p class="lead mb-4 opacity-75">Create a free account and book your first ride today.</p>
    <a href="<?= BASE_URL ?>/register.php" class="btn btn-light btn-lg">
      <i class="bi bi-person-plus me-1"></i>Create Free Account
    </a>
  </div>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
