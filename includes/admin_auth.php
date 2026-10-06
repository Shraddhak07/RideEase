<?php
/**
 * Administrator authentication guard.
 *
 * Include this at the top of any admin-only page.
 * Normal customers are never allowed into the admin area -
 * they are redirected to the separate admin login page.
 */
require_once __DIR__ . '/../config/database.php';

if (current_admin() === null) {
    redirect(BASE_URL . '/admin/login.php');
}
