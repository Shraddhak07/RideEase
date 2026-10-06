<?php
/**
 * Customer registration.
 *
 * Server-side validation:
 *   - all fields required
 *   - valid email address
 *   - valid phone number
 *   - password (min 8 chars) + confirmation must match
 *   - email must be unique
 * Passwords are hashed with password_hash() (bcrypt) - never stored in plain text.
 */
require_once __DIR__ . '/includes/header.php';

// Already logged in? Send the customer to the dashboard.
if (current_user() !== null) {
    redirect(BASE_URL . '/user/dashboard.php');
}

$errors = [];
$name = $email = $phone = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name     = trim((string)($_POST['full_name'] ?? ''));
    $email    = trim((string)($_POST['email'] ?? ''));
    $phone    = trim((string)($_POST['phone'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $confirm  = (string)($_POST['confirm_password'] ?? '');

    // ---- Validation ----
    if ($name === '') {
        $errors[] = 'Full name is required.';
    }

    if ($email === '') {
        $errors[] = 'Email address is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    } else {
        // Prevent duplicate email addresses
        $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() !== false) {
            $errors[] = 'An account with this email already exists. Please <a href="' . BASE_URL . '/login.php">login</a> instead.';
        }
    }

    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^[0-9+\-\s()]{7,18}$/', $phone)) {
        $errors[] = 'Please enter a valid phone number (7-18 digits).';
    }

    if ($password === '') {
        $errors[] = 'Password is required.';
    } elseif (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters long.';
    }

    if ($confirm === '') {
        $errors[] = 'Please confirm your password.';
    } elseif ($password !== '' && $password !== $confirm) {
        $errors[] = 'Passwords do not match.';
    }

    // ---- Create the account ----
    if (empty($errors)) {
        try {
            $hash = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare(
                "INSERT INTO users (full_name, email, phone, password, status)
                 VALUES (?, ?, ?, ?, 'Active')"
            );
            $stmt->execute([$name, $email, $phone, $hash]);

            set_flash('success', 'Registration successful! Please login with your new account.');
            redirect(BASE_URL . '/login.php');
        } catch (PDOException $e) {
            // Race condition on the unique email index, or any DB problem
            error_log('RideEase registration error: ' . $e->getMessage());
            $errors[] = 'Something went wrong while creating your account. Please try again.';
        }
    }
}
?>

<div class="container py-5">
  <div class="row justify-content-center">
    <div class="col-lg-5 col-md-7">
      <div class="card shadow-sm">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
            <div class="step-icon" style="background:var(--rideease-primary)">
              <i class="bi bi-person-plus-fill"></i>
            </div>
            <h3 class="mb-1">Create Account</h3>
            <p class="text-muted-2 mb-0">Join RideEase and rent cars &amp; bikes in minutes</p>
          </div>

          <?php if (!empty($errors)): ?>
            <div class="alert alert-danger">
              <strong>Please fix the following:</strong>
              <ul class="mb-0 mt-2">
                <?php foreach ($errors as $err): ?>
                  <li><?= e($err) ?></li>
                <?php endforeach; ?>
              </ul>
            </div>
          <?php endif; ?>

          <form method="post" action="<?= e($_SERVER['PHP_SELF']) ?>" novalidate>
            <div class="mb-3">
              <label for="full_name" class="form-label">Full Name</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" id="full_name" name="full_name"
                       value="<?= e($name) ?>" maxlength="100" required autofocus>
              </div>
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Email Address</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" id="email" name="email"
                       value="<?= e($email) ?>" maxlength="100" required>
              </div>
            </div>

            <div class="mb-3">
              <label for="phone" class="form-label">Phone Number</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                <input type="tel" class="form-control" id="phone" name="phone"
                       value="<?= e($phone) ?>" maxlength="20" required>
              </div>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control" id="password" name="password"
                       maxlength="255" required autocomplete="new-password">
              </div>
              <div class="form-text">Minimum 8 characters.</div>
            </div>

            <div class="mb-4">
              <label for="confirm_password" class="form-label">Confirm Password</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                <input type="password" class="form-control" id="confirm_password" name="confirm_password"
                       maxlength="255" required autocomplete="new-password">
              </div>
            </div>

            <button type="submit" class="btn btn-rideease w-100 py-2">
              <i class="bi bi-person-plus me-1"></i>Register
            </button>
          </form>

          <hr>
          <p class="text-center mb-0">
            Already have an account?
            <a href="<?= BASE_URL ?>/login.php" class="fw-semibold">Login here</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
