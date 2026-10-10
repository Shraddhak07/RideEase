# RideEase marketplace

RideEase supports three account roles:

- **Customers** create an account, choose an approved vehicle and rental dates,
  see their booking receipts under their account, and rate a confirmed rental
  after its return date.
- **Sellers** create an account, submit a vehicle photo, description, odometer
  reading and daily rental price, follow its approval status, and remove a
  listing they no longer want to rent.
- **Admins** sign in at `/admin` and approve or reject seller submissions. Only
  approved vehicles appear in the public marketplace. Signed-in admins can
  change their password from the dashboard after confirming the current one.

The marketplace footer links to the Terms and Conditions page and provides
tap-to-call and email contact links. Update the phone number and email in the
page footers if the support contacts change.

The booking dialog checks availability for the selected date range and marks
overlapping dates as sold out. The server repeats this check when confirming a
booking. Removing a seller listing hides it from future searches and bookings;
existing confirmed rentals and their review history remain intact.

Customers and sellers choose a unique username when creating an account and can
sign in with either that username or their email address. Existing accounts
continue to work with email; the migration assigns legacy accounts a username.

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

Customer booking cards show a date-based timeline for confirmation, pickup, the
rental period, and the scheduled return. Seller listing cards show confirmed
current and upcoming rental date ranges with a booked indicator. The timeline
reflects reservation dates; physical pickup and return handovers are coordinated
between the customer and seller and are not separately recorded by the app.

## Database normalization

Bookings store the rental dates and agreed daily-rate snapshot. Rental duration
and total are calculated from those values rather than persisted redundantly.
Payments store their booking, method, and reference; the payment amount is
derived from the booking, and the displayed demo status is derived from the
payment method. The migration checks legacy values against those derivations
before dropping the redundant columns. Bike `price` is the vehicle's purchase
value, while `rental_price` is the separate daily rental rate.
