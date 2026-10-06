# RideEase - Bike & Car Rental Management System

A complete, fully offline vehicle rental web application. Customers can browse and rent cars and bikes; administrators manage vehicles, bookings, payments, customers and returns with automatic late-fee calculation.

Built with **Core PHP 8**, **MySQL** and **Bootstrap 5** — no frameworks, no CDN links, no cloud services. Runs 100% offline on XAMPP.

---

## ✨ Features

### Customer
- Register & login (passwords hashed with `password_hash()`)
- Browse & search vehicles with filters (type, brand, price range, availability)
- View vehicle details
- Select pickup/return dates with live rental-cost calculation
- Overlapping-booking prevention (a vehicle cannot be double-booked)
- Simulated payment (UPI / Debit-Credit Card / Cash on Pickup)
- Booking confirmation with printable receipt (browser print, no online PDF service)
- Booking history & cancellation of eligible bookings
- Profile management

### Administrator
- Separate admin login (customers can never reach admin pages)
- Dashboard with live statistics (customers, vehicles, active rentals, revenue…)
- Vehicle management (add / edit / delete / change availability, duplicate registration-number prevention)
- Booking management (approve, reject, cancel, activate, complete)
- Return processing with automatic late-fee calculation
  (`Late Fee = Late Days × Late Fee Per Day`, fee configurable by admin)
- Customer management (search, view booking history, activate/deactivate)
- Payment & transaction history

## 🛠 Technologies Used

| Layer | Technology |
|---|---|
| Backend | Core PHP 8+ (no framework) |
| Database | MySQL / MariaDB (via XAMPP) |
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5.3 (local), Bootstrap Icons 1.11 (local) |
| Server | Apache (XAMPP) |
| Access layer | PDO with real prepared statements |

## 📁 Folder Structure

```
RideEase/
├── index.php                 Homepage
├── vehicles.php              Vehicle listing + filters
├── vehicle_details.php       Single vehicle page
├── booking.php               Date selection + cost calculation
├── payment.php               Simulated payment
├── booking_confirmation.php  Confirmation + printable receipt
├── login.php / register.php / logout.php
├── user/                     Customer area (dashboard, bookings, profile)
├── admin/                    Admin area (login, dashboard, vehicles,
│                             bookings, customers, payments, returns)
├── config/database.php       PDO connection + helpers + settings
├── includes/                 header.php, footer.php, auth.php, admin_auth.php
├── assets/
│   ├── bootstrap/            Local Bootstrap 5.3.3 CSS/JS (no CDN)
│   ├── css/style.css         Custom theme
│   ├── js/script.js          Client-side helpers
│   └── images/vehicles/     Local vehicle images (SVG)
├── database/rideease.sql     Full schema + sample data
└── README.md
```

## 🗄 Database Structure

Database: `rideease`

| Table | Purpose |
|---|---|
| `users` | Customers (email unique, bcrypt password, Active/Inactive) |
| `admins` | Admin accounts (username unique, bcrypt password) |
| `vehicles` | Cars & bikes (registration number unique, rent, deposit, availability) |
| `bookings` | Rental transactions with dates, amounts, status |
| `payments` | Payment transactions (transaction ID unique, status) |
| `returns` | Actual return date, late days, late fee |
| `settings` | Admin-configurable values (late fee/day, default deposit, currency) |

Foreign keys: `bookings.user_id → users`, `bookings.vehicle_id → vehicles`,
`payments.booking_id → bookings`, `returns.booking_id → bookings`.

## 📥 Installation (XAMPP)

1. **Install XAMPP** from [apachefriends.org](https://www.apachefriends.org) (Windows installer).
2. **Start Apache and MySQL** from the XAMPP Control Panel.
3. **Copy the `RideEase` folder** into `C:\xampp\htdocs\` (so the URL is `http://localhost/RideEase/`).
4. **Create the database:** open `http://localhost/phpmyadmin` → **New** → name `rideease` → **Import** → choose `database/rideease.sql` → **Go**.
   *(Or from a terminal: `mysql -u root < database/rideease.sql`)*
5. **Configure the connection** in `config/database.php` if your XAMPP uses a non-default MySQL password:
   ```php
   define('DB_USER', 'root');
   define('DB_PASS', '');        // your MySQL root password
   ```
   Also make sure `BASE_URL` matches the folder name (`/RideEase`).

## ▶️ How to Run

Open your browser and go to:

```
http://localhost/RideEase/
```

## 🔑 Default Login Credentials

| Role | Username / Email | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| Sample customer | `aarav.sharma@example.com` | `password123` |

*(All 6 sample customers use the password `password123`. Change the admin password after first login.)*

## 🌐 Offline Requirements

The application is **completely offline**:
- Bootstrap, Bootstrap Icons and all JS/CSS are stored locally in `assets/`
- All vehicle images are stored locally in `assets/images/vehicles/`
- No Firebase, cloud DB, online auth, payment gateway, map or font CDNs
- Payment is a **simulation** — no real money is transferred
- The only requirement is a local XAMPP stack (Apache + MySQL + PHP)

## 🔒 Security Features

- `password_hash()` / `password_verify()` (bcrypt) — never plain-text passwords
- PDO prepared statements — no SQL injection
- `htmlspecialchars()` on all output
- Server-side price calculation (browser-submitted amounts are never trusted)
- Overlap check before every booking (prevents double booking)
- Past pickup dates, return-before-pickup, Maintenance/Unavailable vehicles all rejected
- Separate PHP sessions for customer and admin areas
- Raw database errors are logged, never shown to visitors

## 🚀 Future Improvements

- Email/SMS notifications (requires an SMTP server)
- Real payment gateway integration
- Vehicle availability calendar view
- Rental reports & CSV export
- Customer loyalty / pricing rules
- Multi-language support

## 📄 License

Free to use for educational/college project purposes.
