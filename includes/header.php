<?php
/**
 * Common page header.
 *
 * Every page must include this AFTER its own logic. It prints:
 *   - the HTML <head> with LOCAL CSS (Bootstrap + Bootstrap Icons + custom)
 *   - the site navigation bar (changes with login state)
 *   - flash messages (once)
 *
 * Set $pageTitle and $activeNav before including:
 *   $pageTitle = 'Vehicles'; $activeNav = 'vehicles';
 */
require_once __DIR__ . '/../config/database.php';

$pageTitle = isset($pageTitle) ? $pageTitle : SITE_NAME . ' - Bike & Car Rental';
$activeNav = $activeNav ?? '';

$isAdmin  = current_admin() !== null;
$isUser   = current_user() !== null;

/**
 * Build a nav link; marks it active when it matches $activeNav.
 */
function nav_link(string $url, string $label, string $key = '', string $icon = ''): string
{
    global $activeNav;
    $cls = 'nav-link' . ($activeNav === $key ? ' active' : '');
    $iconHtml = $icon !== '' ? "<i class=\"bi $icon me-1\"></i>" : '';
    return "<a class=\"$cls\" href=\"$url\">$iconHtml$label</a>";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($pageTitle) ?></title>
  <meta name="description" content="RideEase - Bike & Car Rental Management System">
  <!-- LOCAL assets only - no CDN, works fully offline -->
  <link rel="stylesheet" href="<?= BASE_URL ?>/assets/bootstrap/css/bootstrap.min.css">
  <link rel="stylesheet" href="<?= BASE_URL ?>/assets/bootstrap/icons/bootstrap-icons.min.css">
  <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/style.css">
</head>
<body class="d-flex flex-column min-vh-100">

<!-- ================= Navigation ================= -->
<nav class="navbar navbar-expand-lg navbar-dark rideease-nav sticky-top">
  <div class="container">
    <a class="navbar-brand fw-bold" href="<?= BASE_URL ?>/index.php">
      <i class="bi bi-speedometer2 me-1"></i>RideEase
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
            aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav me-auto">
        <?= nav_link(BASE_URL . '/index.php',    'Home',     'home',     'bi-house') ?>
        <?= nav_link(BASE_URL . '/vehicles.php', 'Vehicles', 'vehicles', 'bi-car-front') ?>
        <?= nav_link(BASE_URL . '/about.php',    'About',    'about',    'bi-info-circle') ?>
        <?= nav_link(BASE_URL . '/contact.php',  'Contact',  'contact',  'bi-envelope') ?>
      </ul>
      <ul class="navbar-nav">
        <?php if ($isAdmin): ?>
          <li class="nav-item"><span class="nav-link disabled"><i class="bi bi-shield-lock me-1"></i>Admin</span></li>
          <li class="nav-item"><?= nav_link(BASE_URL . '/admin/dashboard.php', 'Dashboard', 'admin') ?></li>
          <li class="nav-item"><a class="nav-link" href="<?= BASE_URL ?>/admin/logout.php"><i class="bi bi-box-arrow-right me-1"></i>Logout</a></li>
        <?php elseif ($isUser): ?>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="userMenu" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-person-circle me-1"></i><?= e($_SESSION['user']['full_name']) ?>
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
              <li><a class="dropdown-item" href="<?= BASE_URL ?>/user/dashboard.php"><i class="bi bi-speedometer me-2"></i>Dashboard</a></li>
              <li><a class="dropdown-item" href="<?= BASE_URL ?>/user/bookings.php"><i class="bi bi-calendar-check me-2"></i>My Bookings</a></li>
              <li><a class="dropdown-item" href="<?= BASE_URL ?>/user/profile.php"><i class="bi bi-person me-2"></i>Profile</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="<?= BASE_URL ?>/logout.php"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
            </ul>
          </li>
        <?php else: ?>
          <?= nav_link(BASE_URL . '/login.php', 'Login', 'login', 'bi-box-arrow-in-right') ?>
          <?= nav_link(BASE_URL . '/register.php', 'Register', 'register', 'bi-person-plus') ?>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>

<!-- ================= Flash messages ================= -->
<div class="container mt-3">
<?php $flash = get_flash(); if ($flash): ?>
  <div class="alert alert-<?= e($flash['type']) ?> alert-dismissible fade show" role="alert">
    <?= e($flash['message']) ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
<?php endif; ?>
</div>

<!-- ================= Page content ================= -->
<main class="flex-grow-1">
