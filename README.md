# RideEase

RideEase is a locally hosted bike-rental marketplace built with Node.js,
Express, and MySQL/MariaDB. It lets shoppers browse approved bikes, book
rental dates, leave verified reviews, and manage a simple demo marketplace
workflow from a single app.

This project is designed for local development and demonstration. It simulates
payments, stores sessions in MySQL, and includes separate customer, seller, and
admin experiences.

## Why RideEase?

RideEase solves a common marketplace problem: a simple, working rental flow
without relying on a payment gateway or external services. Sellers can list
bikes, admins can approve or reject listings, and customers can rent using a
clean web interface.

## Features

- Search approved bikes by name, description, mileage, or daily rental price.
- Customer and seller registration with unique usernames, username-or-email
  login, and bcrypt password hashing.
- Seller dashboard for photo uploads, listing submissions, and approval status.
- Admin dashboard to approve or reject seller listings.
- Customer bookings with server-calculated totals and overlapping-booking
  prevention, including a sold-out status for reserved dates.
- Seller listing removal hides bikes from future customers while preserving
  existing confirmed rentals.
- Demo UPI/card payment records and cash-on-pickup records; no payment provider
  or real card details are used.
- One 1–5 star review per eligible completed rental, with average ratings and
  verified review counts shown on bike cards.
- MySQL-backed sessions.
- Responsive marketplace, account, and admin pages.
- Normalized booking and payment records: rental duration and totals are
  calculated from dates and the agreed daily rate rather than stored twice.

## Tech stack

- Node.js 18+
- Express.js
- MySQL or MariaDB
- MySQL2 client
- Bcrypt for password hashing
- Express Session with MySQL persistence
- HTML, CSS, and vanilla JavaScript for the front-end

## Requirements

- Node.js 18 or later and npm.
- MySQL or MariaDB, running locally or reachable from the app.

## Quick start

1. Install project dependencies:

   ```sh
   npm ci
   ```

2. Create the database and initial demo inventory by running `schema.sql` with
   your MySQL/MariaDB client (or open and execute the file in MySQL Workbench):

   ```sh
   mysql -u root -p < schema.sql
   ```

   This creates the `rideease_db` database and seeds six sample bikes. The
   script uses `IF NOT EXISTS` and does not replace existing bike rows.

3. Configure the database connection if it differs from the local defaults.
   Use `.env.example` as a reference to set `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER`, and `DB_PASSWORD` in your shell or hosting environment. Set
   `SESSION_SECRET` to a unique, long random value outside local development.
   The app reads environment variables directly and does not load a `.env` file
   automatically.

4. Run the marketplace migration:

   ```sh
   npm run db:migrate
   ```

   The migration adds the account, booking, review, and persistent-session
   tables and marketplace fields. It is safe to rerun. The server also runs it
   automatically before listening.

5. Start the app:

   ```sh
   npm start
   ```

6. Open the app in your browser:

   ```text
   http://localhost:3000
   ```

## Demo accounts

- Admin: `admin` / `admin123`
- Customer and seller accounts can be created from the account page.

Change the default admin password before exposing the app beyond a trusted local
development environment.

## Pages

- `/` — public marketplace, bike search, ratings, and booking dialog.
- `/account` — customer and seller registration, login, and dashboard.
- `/admin` — admin login and listing approvals.
- `/terms` — project terms and usage notes.

## Business rules and data model

The marketplace tables follow 3NF: bookings store the dates and agreed daily
rate, while rental days, totals, and payment status are derived when needed.
`npm run db:migrate` checks existing stored values before removing their
redundant copies.

Set `PORT` to change the local server port. Database defaults are
`127.0.0.1:3306`, database `rideease_db`, user `root`, and an empty password;
use environment variables rather than editing source code to change them.

## Reviews and demo payments

Customers can review only their own confirmed rental after its return date.
Each booking accepts one review with a rating from 1 to 5 and an optional
comment.

The server calculates rental prices from the selected dates and bike's daily
rate. UPI and card choices create simulated payment records; cash is recorded
as due on pickup. RideEase does not collect payment credentials, contact a
payment provider, or move money.

## Project layout

```text
database/       Migration and schema helpers
docs/           Marketplace documentation
public/         Marketplace, account, admin pages, scripts, styles, and photos
src/            Shared database helpers
uploads/        Seller-uploaded bike photos (created at runtime)
schema.sql      Initial database and demo inventory
server.js       Express app and API routes
```

The included sample vehicle photos and their credits are documented in
`public/images/bikes/ATTRIBUTION.md`.

## Notes

- The app is intended for local demo use and learning.
- The included bike images have attribution notes in the project assets.
- Running the app in production should use a strong `SESSION_SECRET` and a
  non-default admin password.
