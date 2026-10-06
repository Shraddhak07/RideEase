<?php
/**
 * Customer authentication guard.
 *
 * Include this at the top of any customer-only page.
 * Redirects visitors to the login page when no customer session exists.
 */
require_once __DIR__ . '/../config/database.php';

if (current_user() === null) {
    set_flash('warning', 'Please login to access that page.');
    redirect(BASE_URL . '/login.php');
}
