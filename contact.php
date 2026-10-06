<?php
/**
 * Contact page.
 *
 * Fully offline, so there is no mail server to send from.
 * Instead of a fake "message sent" form, this page shows
 * the real, working ways to reach the rental desk
 * (email link, phone, visiting hours).
 */
require_once __DIR__ . '/includes/header.php';

$pageTitle = 'Contact Us - RideEase';
$activeNav = 'contact';

$email = get_setting('company_email', 'support@rideease.local');
?>

<div class="container py-5">
  <h3 class="section-title">Contact Us</h3>
  <p class="section-subtitle">Questions about a booking, a vehicle, or your account?</p>

  <div class="row g-4">
    <div class="col-md-4">
      <a class="text-decoration-none" href="mailto:<?= e($email) ?>">
        <div class="card stat-card h-100">
          <div class="card-body text-center py-4">
            <div class="step-icon"><i class="bi bi-envelope-fill"></i></div>
            <h6 class="mt-2 mb-1">Email</h6>
            <p class="text-muted-2 small mb-0"><?= e($email) ?></p>
            <small class="text-muted-2">Click to open your mail app</small>
          </div>
        </div>
      </a>
    </div>
    <div class="col-md-4">
      <div class="card stat-card h-100">
        <div class="card-body text-center py-4">
          <div class="step-icon"><i class="bi bi-telephone-fill"></i></div>
          <h6 class="mt-2 mb-1">Phone</h6>
          <p class="text-muted-2 small mb-0">+91 98765 43210</p>
          <small class="text-muted-2">Rental desk, Mon-Sat</small>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card stat-card h-100">
        <div class="card-body text-center py-4">
          <div class="step-icon"><i class="bi bi-geo-alt-fill"></i></div>
          <h6 class="mt-2 mb-1">Visit Us</h6>
          <p class="text-muted-2 small mb-0">Vehicle Rental Desk<br>College Campus</p>
          <small class="text-muted-2">9:00 AM - 7:00 PM</small>
        </div>
      </div>
    </div>
  </div>

  <div class="card stat-card mt-4">
    <div class="card-header bg-white">
      <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Before you contact us</h6>
    </div>
    <div class="card-body">
      <ul class="mb-0">
        <li>Booking questions? Check
          <a href="<?= BASE_URL ?>/user/bookings.php">My Bookings</a> first -
          your booking status and payment details are there.</li>
        <li>Not registered yet?
          <a href="<?= BASE_URL ?>/register.php">Create an account</a> to book vehicles online.</li>
        <li>To change your name, phone or password, use the
          <a href="<?= BASE_URL ?>/user/profile.php">Profile</a> page after logging in.</li>
      </ul>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
