<?php
/**
 * About page - what RideEase is and why it exists.
 */
require_once __DIR__ . '/includes/header.php';

$pageTitle = 'About Us - RideEase';
$activeNav = 'about';
?>

<div class="container py-5">
  <div class="hero rounded-4 mb-5" style="padding:3rem">
    <h2 class="mb-2">About RideEase</h2>
    <p class="lead mb-0 opacity-75">
      A simple, fully offline vehicle rental management system
      built for college campuses.
    </p>
  </div>

  <div class="row g-5">
    <div class="col-lg-8">
      <h3 class="section-title">What we do</h3>
      <p class="section-subtitle">Making vehicle rentals as easy as booking a cab</p>
      <p>
        RideEase helps colleges and hostels manage a small fleet of cars and bikes.
        Students can browse the fleet, check real-time availability, book with
        transparent pricing, and receive a printable confirmation - all without
        leaving the campus network.
      </p>
      <p>
        For the administration side, staff can manage vehicles, bookings,
        customers, payments and returns, including automatic late-return fees.
        Everything runs on a standard LAMP stack (PHP 8 + MySQL), so there is
        no monthly cloud cost and no dependency on the internet.
      </p>

      <h4 class="mt-4 mb-3">Features</h4>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-person-plus-fill me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Customer accounts</strong><br><small class="text-muted-2">Secure registration &amp; login with hashed passwords</small></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-calendar-check-fill me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Online booking</strong><br><small class="text-muted-2">Server-side price calculation and double-booking prevention</small></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-cash-coin-fill me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Payment simulation</strong><br><small class="text-muted-2">UPI, card, or cash on pickup</small></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-printer-fill me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Printable confirmation</strong><br><small class="text-muted-2">Show your receipt at the counter</small></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-speedometer2 me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Admin dashboard</strong><br><small class="text-muted-2">Stats, vehicle &amp; booking management</small></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex">
            <i class="bi bi-clock-history-fill me-2" style="color:var(--rideease-primary)"></i>
            <div><strong>Late fee automation</strong><br><small class="text-muted-2">Late days &times; configurable fee per day</small></div>
          </div>
        </div>
      </div>

      <h4 class="mt-5 mb-3">Technology</h4>
      <p class="text-muted-2">
        RideEase is a core-PHP application (no frameworks) using HTML5, CSS3,
        Bootstrap 5 and JavaScript on the front end, and PHP 8 with MySQL
        (PDO prepared statements) on the back end. All assets are bundled
        locally - the system works with the internet completely disconnected.
      </p>
    </div>

    <div class="col-lg-4">
      <div class="card stat-card">
        <div class="card-body text-center py-4">
          <div class="step-icon"><i class="bi bi-mortarboard-fill"></i></div>
          <h5 class="mt-2 mb-1">College Project</h5>
          <p class="text-muted-2 small mb-0">
            Built as a complete, working management system
            for a college vehicle rental service.
          </p>
        </div>
      </div>
      <div class="card stat-card mt-4">
        <div class="card-body py-4">
          <h6 class="mb-3"><i class="bi bi-geo-alt me-1"></i>Location</h6>
          <p class="small text-muted-2 mb-1">College Campus</p>
          <p class="small text-muted-2 mb-1">
            <i class="bi bi-envelope me-1"></i><?= e(get_setting('company_email', 'support@rideease.local')) ?>
          </p>
          <p class="small text-muted-2 mb-0">
            <i class="bi bi-clock me-1"></i>Mon - Sat, 9:00 AM - 7:00 PM
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
