<?php
/**
 * Customer profile - view and update own details.
 *
 * Editable: full name, phone. Email stays fixed (it is the login name).
 * Password change requires the current password.
 */
require_once __DIR__ . '/../includes/auth.php';

$pageTitle = 'My Profile - RideEase';
$activeNav = 'profile';

$user  = current_user();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name          = trim((string)($_POST['full_name'] ?? ''));
    $phone         = trim((string)($_POST['phone'] ?? ''));
    $currentPass   = (string)($_POST['current_password'] ?? '');
    $newPass       = (string)($_POST['new_password'] ?? '');
    $confirmNewPass = (string)($_POST['confirm_new_password'] ?? '');

    if ($name === '') {
        $errors[] = 'Full name is required.';
    }

    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^[0-9+\-\s()]{7,18}$/', $phone)) {
        $errors[] = 'Please enter a valid phone number (7-18 digits).';
    }

    // Password change is optional - only validate if any field is filled
    $changingPassword = ($currentPass !== '' || $newPass !== '' || $confirmNewPass !== '');
    if ($changingPassword) {
        if (!password_verify($currentPass, $user['password'])) {
            $errors[] = 'Your current password is incorrect.';
        } elseif (strlen($newPass) < 8) {
            $errors[] = 'New password must be at least 8 characters long.';
        } elseif ($newPass !== $confirmNewPass) {
            $errors[] = 'New passwords do not match.';
        }
    }

    if (empty($errors)) {
        try {
            if ($changingPassword) {
                $hash = password_hash($newPass, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare(
                    'UPDATE users SET full_name = ?, phone = ?, password = ? WHERE user_id = ?'
                );
                $stmt->execute([$name, $phone, $hash, $user['user_id']]);
            } else {
                $stmt = $pdo->prepare('UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?');
                $stmt->execute([$name, $phone, $user['user_id']]);
            }

            // Refresh the session with the updated data
            $stmt = $pdo->prepare('SELECT * FROM users WHERE user_id = ?');
            $stmt->execute([$user['user_id']]);
            $_SESSION['user'] = $stmt->fetch();

            set_flash('success', 'Profile updated successfully.');
            redirect(BASE_URL . '/user/profile.php');
        } catch (PDOException $e) {
            error_log('RideEase profile update error: ' . $e->getMessage());
            $errors[] = 'Something went wrong. Please try again.';
        }
    }
}
?>

<div class="container py-4">
  <div class="row g-4">
    <!-- Account summary -->
    <div class="col-lg-4">
      <div class="card stat-card">
        <div class="card-body text-center py-4">
          <div class="step-icon" style="background:var(--rideease-primary)">
            <i class="bi bi-person-fill"></i>
          </div>
          <h5 class="mt-3 mb-1"><?= e($user['full_name']) ?></h5>
          <p class="text-muted-2 mb-0"><?= e($user['email']) ?></p>
          <hr>
          <ul class="list-unstyled text-start mb-0">
            <li class="mb-2">
              <i class="bi bi-telephone me-2 text-muted-2"></i><?= e($user['phone']) ?>
            </li>
            <li class="mb-2">
              <i class="bi bi-shield me-2 text-muted-2"></i>
              Account status:
              <span class="badge bg-success"><?= e($user['status']) ?></span>
            </li>
            <li class="mb-2">
              <i class="bi bi-calendar3 me-2 text-muted-2"></i>
              Member since: <?= e((new DateTime($user['created_at']))->format('M j, Y')) ?>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Edit form -->
    <div class="col-lg-8">
      <div class="card stat-card">
        <div class="card-header bg-white">
          <h6 class="mb-0"><i class="bi bi-pencil-square me-2"></i>Edit Profile</h6>
        </div>
        <div class="card-body">
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

          <form method="post" action="<?= e($_SERVER['PHP_SELF']) ?>">
            <div class="row g-3">
              <div class="col-md-6">
                <label for="full_name" class="form-label">Full Name</label>
                <input type="text" class="form-control" id="full_name" name="full_name"
                       value="<?= e($user['full_name']) ?>" maxlength="100" required>
              </div>
              <div class="col-md-6">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" class="form-control" id="email"
                       value="<?= e($user['email']) ?>" disabled
                       title="Email cannot be changed - it is your login name">
                <div class="form-text">Email cannot be changed (it is your login name).</div>
              </div>
              <div class="col-md-6">
                <label for="phone" class="form-label">Phone Number</label>
                <input type="tel" class="form-control" id="phone" name="phone"
                       value="<?= e($user['phone']) ?>" maxlength="20" required>
              </div>
            </div>

            <hr>

            <h6 class="mb-3 text-muted-2">
              <i class="bi bi-lock me-1"></i>Change Password <small>(optional)</small>
            </h6>
            <div class="row g-3">
              <div class="col-md-4">
                <label for="current_password" class="form-label">Current Password</label>
                <input type="password" class="form-control" id="current_password"
                       name="current_password" maxlength="255" autocomplete="current-password">
              </div>
              <div class="col-md-4">
                <label for="new_password" class="form-label">New Password</label>
                <input type="password" class="form-control" id="new_password"
                       name="new_password" maxlength="255" autocomplete="new-password">
                <div class="form-text">Minimum 8 characters.</div>
              </div>
              <div class="col-md-4">
                <label for="confirm_new_password" class="form-label">Confirm New Password</label>
                <input type="password" class="form-control" id="confirm_new_password"
                       name="confirm_new_password" maxlength="255" autocomplete="new-password">
              </div>
            </div>

            <div class="mt-4">
              <button type="submit" class="btn btn-rideease px-4">
                <i class="bi bi-check-lg me-1"></i>Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
