<?php
/**
 * Customer logout.
 *
 * Clears the customer session and redirects to the login page.
 * (The session is kept alive only to carry the flash message.)
 */
require_once __DIR__ . '/config/database.php';

// Remove the customer's login data
unset($_SESSION['user']);

// Regenerate the session ID so the old session cannot be reused
session_regenerate_id(true);

set_flash('success', 'You have been logged out. See you soon!');
redirect(BASE_URL . '/login.php');
