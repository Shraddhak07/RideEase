<?php
/**
 * Vehicle listing.
 *
 * Search (brand/model keyword) and filters:
 *   type, brand, availability, price range
 * Sort: name, price low->high, price high->low.
 *
 * Everything is passed through GET so a filtered view
 * can be bookmarked or shared. All values are bound
 * as PDO parameters; the sort column comes from a
 * whitelist, never from user input.
 */
require_once __DIR__ . '/includes/header.php';

$pageTitle = 'Browse Vehicles - RideEase';
$activeNav = 'vehicles';

// ---- Filter / search parameters ----
$search       = trim((string)($_GET['search'] ?? ''));
$type         = (string)($_GET['type'] ?? '');
$brand        = (string)($_GET['brand'] ?? '');
$availability = (string)($_GET['availability'] ?? '');
$minPrice     = (string)($_GET['min_price'] ?? '');
$maxPrice     = (string)($_GET['max_price'] ?? '');
$sort         = (string)($_GET['sort'] ?? 'name');

// ---- Build the WHERE clause safely ----
$where  = [];
$params = [];

if ($search !== '') {
    $where[] = '(brand LIKE ? OR model LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
}

if ($type === 'Car' || $type === 'Bike') {
    $where[] = 'type = ?';
    $params[] = $type;
}

if ($brand !== '') {
    $where[] = 'brand = ?';
    $params[] = $brand;
}

if (in_array($availability, ['Available', 'Unavailable', 'Maintenance'], true)) {
    $where[] = 'availability = ?';
    $params[] = $availability;
}

if ($minPrice !== '' && is_numeric($minPrice)) {
    $where[] = 'rent_per_day >= ?';
    $params[] = (float) $minPrice;
}

if ($maxPrice !== '' && is_numeric($maxPrice)) {
    $where[] = 'rent_per_day <= ?';
    $params[] = (float) $maxPrice;
}

$sql = 'SELECT * FROM vehicles';
if ($where !== []) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}

// ---- Sorting (whitelisted - user input never touches SQL directly) ----
$sortMap = [
    'name'       => 'brand ASC, model ASC',
    'price_asc'  => 'rent_per_day ASC',
    'price_desc' => 'rent_per_day DESC',
];
$sql .= ' ORDER BY ' . ($sortMap[$sort] ?? $sortMap['name']);

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$vehicles = $stmt->fetchAll();

// ---- Distinct brands for the filter dropdown ----
$brands = $pdo->query('SELECT DISTINCT brand FROM vehicles ORDER BY brand')
    ->fetchAll(PDO::FETCH_COLUMN);

/** Keep the current filter values in the form inputs. */
function fval(string $key): string
{
    return htmlspecialchars((string)($_GET[$key] ?? ''), ENT_QUOTES, 'UTF-8');
}
function selected(string $key, string $value): string
{
    return (isset($_GET[$key]) && $_GET[$key] === $value) ? ' selected' : '';
}
?>

<div class="container py-4">
  <h3 class="section-title">Browse Vehicles</h3>
  <p class="section-subtitle">
    <?= count($vehicles) ?> vehicle<?= count($vehicles) === 1 ? '' : 's' ?> found
  </p>

  <div class="row g-4">
    <!-- ============ Filters (left column) ============ -->
    <div class="col-lg-3">
      <div class="card stat-card">
        <div class="card-header bg-white">
          <h6 class="mb-0"><i class="bi bi-funnel me-2"></i>Filters</h6>
        </div>
        <div class="card-body">
          <form method="get" action="<?= e($_SERVER['PHP_SELF']) ?>">
            <div class="mb-3">
              <label for="search" class="form-label">Search</label>
              <input type="search" class="form-control" id="search" name="search"
                     value="<?= fval('search') ?>" placeholder="Brand or model...">
            </div>

            <div class="mb-3">
              <label for="type" class="form-label">Vehicle Type</label>
              <select class="form-select" id="type" name="type">
                <option value="">All Types</option>
                <option value="Car"<?= selected('type', 'Car') ?>>Cars</option>
                <option value="Bike"<?= selected('type', 'Bike') ?>>Bikes</option>
              </select>
            </div>

            <div class="mb-3">
              <label for="brand" class="form-label">Brand</label>
              <select class="form-select" id="brand" name="brand">
                <option value="">All Brands</option>
                <?php foreach ($brands as $b): ?>
                  <option value="<?= e($b) ?>"<?= selected('brand', $b) ?>><?= e($b) ?></option>
                <?php endforeach; ?>
              </select>
            </div>

            <div class="mb-3">
              <label for="availability" class="form-label">Availability</label>
              <select class="form-select" id="availability" name="availability">
                <option value="">Any</option>
                <option value="Available"<?= selected('availability', 'Available') ?>>Available</option>
                <option value="Unavailable"<?= selected('availability', 'Unavailable') ?>>Unavailable</option>
                <option value="Maintenance"<?= selected('availability', 'Maintenance') ?>>Maintenance</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Price / day (<?= e(get_setting('currency_symbol', '₹')) ?>)</label>
              <div class="row g-2">
                <div class="col-6">
                  <input type="number" class="form-control" name="min_price"
                         value="<?= fval('min_price') ?>" placeholder="Min" min="0" step="1">
                </div>
                <div class="col-6">
                  <input type="number" class="form-control" name="max_price"
                         value="<?= fval('max_price') ?>" placeholder="Max" min="0" step="1">
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label for="sort" class="form-label">Sort By</label>
              <select class="form-select" id="sort" name="sort">
                <option value="name"<?= selected('sort', 'name') ?>>Name (A-Z)</option>
                <option value="price_asc"<?= selected('sort', 'price_asc') ?>>Price: Low to High</option>
                <option value="price_desc"<?= selected('sort', 'price_desc') ?>>Price: High to Low</option>
              </select>
            </div>

            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-rideease">
                <i class="bi bi-funnel me-1"></i>Apply Filters
              </button>
              <a href="<?= e($_SERVER['PHP_SELF']) ?>" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ============ Results (right column) ============ -->
    <div class="col-lg-9">
      <?php if (empty($vehicles)): ?>
        <div class="card stat-card">
          <div class="card-body text-center py-5">
            <i class="bi bi-car-front display-1 text-muted-2"></i>
            <h5 class="mt-3">No vehicles match your filters</h5>
            <p class="text-muted-2">Try widening the price range or clearing some filters.</p>
            <a href="<?= e($_SERVER['PHP_SELF']) ?>" class="btn btn-rideease">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Clear All Filters
            </a>
          </div>
        </div>
      <?php else: ?>
        <div class="row g-4">
          <?php foreach ($vehicles as $v): ?>
            <?= vehicle_card($v) ?>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
