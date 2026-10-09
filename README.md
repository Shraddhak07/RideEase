# RideEase

RideEase is a locally hosted bike-rental marketplace built with Node.js,
Express, and MySQL/MariaDB. Customers can find approved bikes, book rental
dates, and leave verified reviews. Sellers can submit bikes for admin review.
Payments are simulated for demonstration only; no money is collected.

## Features

- Search approved bikes by name, description, mileage, or daily rental price.
- Customer and seller registration and login with bcrypt password hashing.
- Seller dashboard for photo uploads, listing submissions, and approval status.
- Admin dashboard to approve or reject seller listings.
- Customer bookings with server-calculated totals and overlapping-booking
  prevention.
- Demo UPI/card payment records and cash-on-pickup records; no payment provider
  or real card details are used.
- One 1–5 star review per eligible completed rental, with average ratings and
  verified review counts shown on bike cards.
- MySQL-backed sessions.
- Responsive marketplace, account, and admin pages.

## Requirements

- Node.js 18 or later and npm.
- MySQL or MariaDB, running locally or reachable from the app.

## Setup

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

   Open [http://localhost:3000](http://localhost:3000).

Set `PORT` to change the local server port. Database defaults are
`127.0.0.1:3306`, database `rideease_db`, user `root`, and an empty password;
use environment variables rather than editing source code to change them.

## Pages

- `/` — public marketplace, bike search, ratings, and booking dialog.
- `/account` — customer and seller registration, login, and dashboard.
- `/admin` — admin login and listing approvals.

The local demo admin account is **`admin` / `admin123`**. Change the password
before exposing the app beyond a trusted local development environment.

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
database/       Database migration
docs/           Marketplace documentation
public/         Marketplace, account, admin pages, scripts, styles, and photos
src/            Shared database helpers
uploads/        Seller-uploaded bike photos (created at runtime)
schema.sql      Initial database and demo inventory
server.js       Express app and API routes
```

The included sample vehicle photos and their credits are documented in
`public/images/bikes/ATTRIBUTION.md`.
