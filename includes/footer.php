<?php
/**
 * Common page footer.
 * Closes <main>, prints the site footer and loads LOCAL JS.
 */
require_once __DIR__ . '/../config/database.php';
?>
</main>

<!-- ================= Footer ================= -->
<footer class="rideease-footer mt-5">
  <div class="container py-4">
    <div class="row g-4">
      <div class="col-md-4">
        <h5 class="mb-3"><i class="bi bi-speedometer2 me-1"></i>RideEase</h5>
        <p class="text-light opacity-75 mb-0">
          A simple, fully offline Bike &amp; Car Rental Management System.
          Built with PHP 8, MySQL and Bootstrap 5.
        </p>
      </div>
      <div class="col-md-4">
        <h6 class="mb-3">Quick Links</h6>
        <ul class="list-unstyled mb-0">
          <li class="mb-1"><a class="footer-link" href="<?= BASE_URL ?>/index.php">Home</a></li>
          <li class="mb-1"><a class="footer-link" href="<?= BASE_URL ?>/vehicles.php">Browse Vehicles</a></li>
          <li class="mb-1"><a class="footer-link" href="<?= BASE_URL ?>/about.php">About Us</a></li>
          <li class="mb-1"><a class="footer-link" href="<?= BASE_URL ?>/contact.php">Contact</a></li>
        </ul>
      </div>
      <div class="col-md-4">
        <h6 class="mb-3">Contact</h6>
        <ul class="list-unstyled text-light opacity-75 mb-0">
          <li class="mb-1"><i class="bi bi-envelope me-2"></i><?= e(get_setting('company_email', 'support@rideease.local')) ?></li>
          <li class="mb-1"><i class="bi bi-geo-alt me-2"></i>College Campus, City</li>
          <li class="mb-1"><i class="bi bi-clock me-2"></i>Mon - Sat, 9:00 AM - 7:00 PM</li>
        </ul>
      </div>
    </div>
    <hr class="text-light opacity-25">
    <p class="text-center text-light opacity-50 mb-0 small">
      &copy; <?= date('Y') ?> <?= e(SITE_NAME) ?>. Offline demo project - all data is stored locally.
    </p>
  </div>
</footer>

<!-- LOCAL scripts only - no CDN, works fully offline -->
<script src="<?= BASE_URL ?>/assets/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="<?= BASE_URL ?>/assets/js/script.js"></script>
</body>
</html>
