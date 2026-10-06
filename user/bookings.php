<?php
/**
 * My Bookings - the customer's booking history.
 *
 * Columns: Booking ID, Vehicle, Pickup, Return, Amount, Payment status,
 * Booking status, Action.
 *
 * Cancellation is only allowed while a booking is still eligible
 * (status Pending or Confirmed). Cancelling also refunds any paid
 * payment for the booking (simulated).
 */
require_once __DIR__ . '/../includes/auth.php';

$pageTitle = 'My Bookings - RideEase';
$activeNav = 'bookings';

$user   = current_user();
$userId = (int) $user['user_id'];

// ---- Handle cancellation ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cancel_booking_id'])) {
    $bookingId = (int) $_POST['cancel_booking_id'];

    // Only the booking owner can cancel - and only eligible statuses
    $stmt = $pdo->prepare(
        "SELECT booking_status FROM bookings
         WHERE booking_id = ? AND user_id = ? LIMIT 1"
    );
    $stmt->execute([$bookingId, $userId]);
    $status = $stmt->fetchColumn();

    if ($status === 'Pending' || $status === 'Confirmed') {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = ?"
            );
            $stmt->execute([$bookingId]);

            // Refund any paid payment for this booking (simulated)
            $stmt = $pdo->prepare(
                "UPDATE payments SET payment_status = 'Refunded'
                 WHERE booking_id = ? AND payment_status = 'Paid'"
            );
            $stmt->execute([$bookingId]);

            $pdo->commit();
            set_flash('success', 'Booking #' . $bookingId . ' has been cancelled'
                . ($status === 'Confirmed' ? ' and the payment refunded' : '') . '.');
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log('RideEase cancel booking error: ' . $e->getMessage());
            set_flash('danger', 'Could not cancel the booking. Please try again.');
        }
    } else {
        set_flash('warning', 'This booking can no longer be cancelled.');
    }

    redirect(BASE_URL . '/user/bookings.php');
}

// ---- Load all bookings for this customer ----
$stmt = $pdo->prepare(
    "SELECT b.booking_id, b.pickup_date, b.return_date, b.total_amount,
            b.booking_status, b.booking_date,
            p.payment_status,
            v.brand, v.model, v.type
     FROM bookings b
     JOIN vehicles v ON v.vehicle_id = b.vehicle_id
     LEFT JOIN payments p ON p.booking_id = b.booking_id
     WHERE b.user_id = ?
     ORDER BY b.booking_date DESC, b.booking_id DESC"
);
$stmt->execute([$userId]);
$bookings = $stmt->fetchAll();

/**
 * A booking can be cancelled while it is still Pending or Confirmed.
 */
function cancellation_eligible(string $status): bool
{
    return $status === 'Pending' || $status === 'Confirmed';
}
?>

<div class="container py-4">
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="mb-0"><i class="bi bi-calendar2-week me-2"></i>My Bookings</h4>
    <a href="<?= BASE_URL ?>/vehicles.php" class="btn btn-rideease">
      <i class="bi bi-plus-lg me-1"></i>New Booking
    </a>
  </div>

  <?php if (empty($bookings)): ?>
    <div class="card stat-card">
      <div class="card-body text-center py-5">
        <i class="bi bi-calendar-x display-1 text-muted-2"></i>
        <h5 class="mt-3">No bookings yet</h5>
        <p class="text-muted-2">When you rent a vehicle, your bookings will appear here.</p>
        <a href="<?= BASE_URL ?>/vehicles.php" class="btn btn-rideease mt-2">
          <i class="bi bi-car-front me-1"></i>Browse Vehicles
        </a>
      </div>
    </div>
  <?php else: ?>
    <div class="card stat-card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Vehicle</th>
                <th>Pickup Date</th>
                <th>Return Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($bookings as $b): ?>
                <?php $eligible = cancellation_eligible((string) $b['booking_status']); ?>
                <tr>
                  <td class="fw-semibold">#<?= (int) $b['booking_id'] ?></td>
                  <td>
                    <?= e($b['brand']) ?> <?= e($b['model']) ?>
                    <span class="text-muted-2 small"><?= e($b['type']) ?></span>
                  </td>
                  <td><?= e($b['pickup_date']) ?></td>
                  <td><?= e($b['return_date']) ?></td>
                  <td class="fw-semibold"><?= e(format_money($b['total_amount'])) ?></td>
                  <td><?= payment_status_pill((string) $b['payment_status']) ?></td>
                  <td><?= booking_status_pill((string) $b['booking_status']) ?></td>
                  <td class="text-end">
                    <?php if ($eligible): ?>
                      <form method="post" action="<?= e($_SERVER['PHP_SELF']) ?>" class="d-inline"
                            onsubmit="return confirm('Cancel this booking? Any paid amount will be refunded.');">
                        <input type="hidden" name="cancel_booking_id" value="<?= (int) $b['booking_id'] ?>">
                        <button type="submit" class="btn btn-sm btn-outline-danger">
                          <i class="bi bi-x-circle me-1"></i>Cancel
                        </button>
                      </form>
                    <?php else: ?>
                      <span class="text-muted-2 small">-</span>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <p class="text-muted-2 small mt-2 mb-0">
      <i class="bi bi-info-circle me-1"></i>
      Bookings can be cancelled (with a full refund of any payment) while they are
      still <strong>Pending</strong> or <strong>Confirmed</strong>.
    </p>
  <?php endif; ?>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
