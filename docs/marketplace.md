# RideEase marketplace

RideEase supports three account roles:

- **Customers** create an account, choose an approved vehicle and rental dates,
  see their booking receipts under their account, and rate a confirmed rental
  after its return date.
- **Sellers** create an account, submit a vehicle photo, description, odometer
  reading and daily rental price, then follow its approval status.
- **Admins** sign in at `/admin` and approve or reject seller submissions. Only
  approved vehicles appear in the public marketplace.

## Run locally

1. Install the dependencies with `npm ci`.
2. Create the `rideease_db` database and the demo seed data with
   `mysql -u root -p < schema.sql`.
3. Run `npm run db:migrate` to add the marketplace tables and persistent
   sessions to an existing RideEase database. The server also runs this
   idempotent migration before listening.
4. Start the app with `npm start`, then open `http://localhost:3000`.

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to match the
local MySQL/MariaDB server. For production, set a unique `SESSION_SECRET` before
starting the app. User and demo admin passwords are stored as bcrypt hashes.

The local seed admin account is `admin` / `admin123`; change it before using a
public deployment. The six original sample vehicles receive a demo rental rate
of ₹850/day during the migration; sellers choose a rate when submitting their
own listings.

## Demo rental checkout

The booking total is calculated on the server from the approved vehicle's
daily rate and the selected number of days. Overlapping confirmed reservations
are rejected. UPI and card options only create a simulated payment record; cash
is recorded as due on pickup. The app does not collect card details, contact a
payment provider, or move money.

Customer reviews are tied to the customer's own completed booking. Each rental
can receive one 1–5 star rating and an optional comment. Marketplace cards show
the average rating and verified review count.
