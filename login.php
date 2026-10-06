<?php
/**
 * Customer login.
 *
 * Uses PHP sessions and password_verify() against the bcrypt hash
 * stored in the database. Error messages are intentionally generic
 * so attackers cannot discover which email addresses exist.
 */
require_once __DIR__ . '/includes/header.php';

// Already logged in? Send the customer to the dashboard.
if (current_user() !== null) {
    redirect(BASE_URL . '/user/dashboard.php');
}

$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim((string)($_POST['email'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($email === '' || $password === '') {
        $error = 'Please enter both your email and password.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Invalid email or password.';
    } else {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user === false || !password_verify($password, $user['password'])) {
            // Generic message - never reveal whether the email exists
            $error = 'Invalid email or password.';
        } elseif ($user['status'] !== 'Active') {
            $error = 'This account has been deactivated. Please contact the administrator.';
        } else {
            // Login successful - regenerate the session ID (session fixation protection)
            session_regenerate_id(true);
            $_SESSION['user'] = $user;

            set_flash('success', 'Welcome back, ' . $user['full_name'] . '!');
            redirect(BASE_URL . '/user/dashboard.php');
        }
    }
}
?>

<div class="container py-5">
  <div class="row justify-content-center">
    <div class="col-lg-4 col-md-6">
      <div class="card shadow-sm">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
            <div class="step-icon" style="background:var(--rideease-primary)">
              <i class="bi bi-box-arrow-in-right"></i>
            </div>
            <h3 class="mb-1">Customer Login</h3>
            <p class="text-muted-2 mb-0">Access your bookings and rentals</p>
          </div>

          <?php if ($error !== ''): ?>
            <div class="alert alert-danger"><?= e($error) ?></div>
          <?php endif; ?>

          <form method="post" action="<?= e($_SERVER['PHP_SELF']) ?>" novalidate>
            <div class="mb-3">
              <label for="email" class="form-label">Email Address</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" id="email" name="email"
                       value="<?= e($email) ?>" maxlength="100" required autofocus>
              </div>
            </div>

            <div class="mb-4">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control" id="password" name="password"
                       maxlength="255" required autocomplete="current-password">
              </div>
            </div>

            <button type="submit" class="btn btn-rideease w-100 py-2">
              <i class="bi bi-box-arrow-in-right me-1"></i>Login
            </button>
          </form>

          <hr>
          <p class="text-center mb-0">
            New to RideEase?
            <a href="<?= BASE_URL ?>/register.php" class="fw-semibold">Create an account</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
