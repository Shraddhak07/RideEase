# RideEase

**A stylish, modern e-commerce website for premium pre-owned bikes.**

RideEase is a complete, runnable college project: a dark-themed online showroom where customers browse pre-loaded pre-owned bikes, open full details in a pop-up, add bikes to a shopping cart and check out — plus a protected admin dashboard where the owner can add, edit, delete and photograph the entire inventory in real time.

Everything runs **locally from source** with Node.js, Express and MySQL. No cloud, no external APIs, no build step.

---

## Table of Contents

1. [What This App Is About](#what-this-app-is-about)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Dependency Packages](#dependency-packages)
5. [Serving The App From Source](#serving-the-app-from-source)
6. [Configuration](#configuration)
7. [Default Credentials](#default-credentials)
8. [Pages Walkthrough](#pages-walkthrough)
9. [API Reference](#api-reference)
10. [Database Schema](#database-schema)
11. [Project Structure](#project-structure)
12. [Demo Script For Presentation](#demo-script-for-presentation)
13. [Troubleshooting](#troubleshooting)
14. [Security Note](#security-note)
15. [License](#license)

---

## What This App Is About

The problem: second-hand bike sellers list vehicles on notice boards, spreadsheets and chat groups. Buyers have no way to see live stock, prices or mileage in one place.

RideEase solves that with two sides of one application:

* **Customer storefront (`/`)** — a single-page showroom that reads the live inventory from MySQL. Every bike card shows a photo, title, price and kilometres driven. Clicking a card opens a centred modal with the full description. Buyers build a shopping cart and see a running **Total Bill** before hitting *Proceed to Deal Checkout*.

* **Admin dashboard (`/admin`)** — a plain-text login protects a control room where the seller publishes new bikes with an uploaded photo, edits any listing (including swapping the image) and deletes sold vehicles. Changes appear instantly in the customer showroom because both sides read the same API.

The project is deliberately free of JWT, sessions and password hashing so the whole flow is easy to read, explain and debug during a college viva.

---

## Features

### Customer Storefront
* Sticky glass navigation header with the RideEase logo
* Floating **Shopping Cart button** with a live item counter badge
* Dynamic showroom grid fetched from `GET /api/bikes` (newest first)
* Loading spinner, empty state and network-error state for the grid
* **Vehicle detail modal** — click any card to view the full description, price, KM driven, condition and listing ID
* **Add to Cart** on both the card and the modal (duplicate protection with toast feedback)
* Slide-out **shopping cart panel** with thumbnails, per-item remove buttons, item count and a dynamically computed **Total Bill**
* **Proceed to Deal Checkout** → success alert simulation, cart cleared
* Cart persists in `localStorage` (survives a page refresh)
* Fully responsive (mobile / tablet / desktop), keyboard support (`Esc` closes overlays)

### Admin Dashboard
* Dark centred **login card**; on success it hides and reveals the dashboard
* **Add New Vehicle** sidebar form: title, price, KM driven, description and a single image upload with instant preview
* **Live Active Showroom** grid: thumbnails, prices, mileage, listing IDs and a live vehicle counter
* **Edit** any bike — modal pre-filled with current data, all fields editable, image optional (leave empty to keep the current photo, pick a new one to replace it)
* **Delete** any bike — confirmation prompt, row and its uploaded image are removed together
* Toast notifications for every success/failure, logout button, refresh button
* Client-side escaping of all database text before rendering

### Backend
* Express.js server with a `mysql2` connection pool
* `multer` disk storage with timestamped file names (`bike-<epoch>.<ext>`) to avoid collisions
* Input validation and friendly JSON error messages on every endpoint
* Orphan-file cleanup: if validation or the database fails after an image was written, the file is deleted
* Uploaded images that get replaced or deleted are removed from disk automatically (seed images are never touched)

---

## Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Runtime   | Node.js (18+)                                           |
| Backend   | Express.js                                              |
| Database  | MySQL / MariaDB, accessed with the native `mysql2` driver |
| Uploads   | `multer` middleware (multipart/form-data)               |
| Frontend  | Single-page application logic in vanilla JavaScript     |
| Styling   | Tailwind CSS via CDN, dark Slate-900 theme with amber/orange accents |
| Fonts     | Inter (Google Fonts)                                    |

**Not used (by design):** JWT, express-session, bcrypt, PHP, any front-end framework or bundler.

---

## Dependency Packages

### System packages (install once)

| Package           | Why it is needed                              | Version tested |
|-------------------|-----------------------------------------------|----------------|
| **Node.js**       | Runs `server.js`                              | 26.x (18+ works) |
| **npm**           | Installs the project dependencies             | 11.x           |
| **MySQL / MariaDB** | Stores admins and bikes                     | MariaDB 13.x / MySQL 8.x |
| Git *(optional)*  | To clone the repository                       | any            |

> **PHP is NOT required.** Earlier revisions of this project were written in PHP; the codebase has been fully converted to Node.js. You can uninstall XAMPP/LAMP entirely.

#### Install on Termux (Android)

```bash
pkg update && pkg upgrade
pkg install nodejs npm mariadb
mariadbd-safe &                 # start the database daemon
```

#### Install on Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y nodejs npm mariadb-server git
sudo systemctl start mariadb
```

#### Install on macOS (Homebrew)

```bash
brew install node mysql
brew services start mysql
```

#### Install on Windows

Install the LTS installer from [nodejs.org](https://nodejs.org), install MySQL Community Server (or XAMPP's MariaDB), then use *Git Bash* or *PowerShell* for the commands below.

### Project packages (installed by npm)

Declared in `package.json`:

| Package   | Purpose                                                 |
|-----------|---------------------------------------------------------|
| `express` | HTTP server, routing, static file serving               |
| `mysql2`  | MySQL driver with connection pooling and prepared statements |
| `multer`  | Handles multipart image uploads and writes them to `uploads/` |

They are installed automatically in step 2 below. Nothing else is required — the frontend uses the Tailwind CDN, so there is no build toolchain.

---

## Serving The App From Source

### Step 1 — Get the source

```bash
git clone https://github.com/Shraddhak07/RideEase.git
cd RideEase
```

*(Or simply open the project folder you already have.)*

### Step 2 — Install Node dependencies

```bash
npm install
```

This creates `node_modules/` with `express`, `mysql2` and `multer`.

### Step 3 — Create the database

Make sure the MySQL/MariaDB daemon is running, then load the schema:

```bash
mysql -u root -p < schema.sql
```

If your MySQL has no password (default on Termux/XAMPP), drop `-p`:

```bash
mysql -u root < schema.sql
```

The script drops and recreates `rideease_db`, creates the `admins` and `bikes` tables, inserts the default admin (`admin` / `admin123`) and seeds six demo bikes.

### Step 4 — (Optional) Set environment variables

Defaults work for a local XAMPP/Termux setup with root and an empty password. Override only if yours differ — see [Configuration](#configuration).

```bash
export DB_PASSWORD="your_mysql_password"
export PORT=3000
```

### Step 5 — Start the server

```bash
npm start
```

Equivalent to `node server.js`. You should see:

```
==================================================
  RideEase server is running
  Storefront : http://localhost:3000
  Admin      : http://localhost:3000/admin
==================================================
[DB] MySQL pool connected successfully.
```

### Step 6 — Open the app

| Page            | URL                               |
|-----------------|-----------------------------------|
| Storefront      | http://localhost:3000             |
| Admin dashboard | http://localhost:3000/admin       |

Stop the server with `Ctrl + C`.

---

## Configuration

All settings are read from environment variables in `server.js`:

| Variable      | Default        | Description                          |
|---------------|----------------|--------------------------------------|
| `PORT`        | `3000`         | HTTP port                            |
| `DB_HOST`     | `127.0.0.1`    | MySQL host                           |
| `DB_PORT`     | `3306`         | MySQL port                           |
| `DB_USER`     | `root`         | MySQL user                           |
| `DB_PASSWORD` | *(empty)*      | MySQL password                       |
| `DB_NAME`     | `rideease_db`  | Database name                        |

Example:

```bash
DB_USER=rideease DB_PASSWORD=secret PORT=8080 npm start
```

---

## Default Credentials

| Account | Username | Password   |
|---------|----------|------------|
| Admin   | `admin`  | `admin123` |

Stored in plain text in the `admins` table (see [Security Note](#security-note)).

---

## Pages Walkthrough

### `/` — Customer Storefront

1. The sticky header shows the logo and a floating cart pill with a counter badge.
2. The hero section links down to the showroom.
3. The **Showroom** grid loads every bike from the API — photo, title, price, KM driven, *View Details* and *Add to Cart*.
4. Clicking a card (or *View Details*) opens the centred modal with the full description and spec tiles.
5. *Add to Cart* pushes the bike into the cart; the header badge updates immediately.
6. The cart button opens the slide-out panel: items, remove buttons, **Total Bill**.
7. **Proceed to Deal Checkout** fires the success alert, empties the cart and closes the panel.

### `/admin` — Admin Dashboard

1. Sign in with `admin` / `admin123` (hint shown on the card).
2. The login card disappears and the dashboard appears.
3. **Add New Vehicle** (left): fill the form, pick an image (live preview), hit *Publish to Showroom*.
4. **Live Active Showroom** (right): the new bike appears after an automatic refresh.
5. **Edit** on any card opens the editor — change price, KM, description, or pick a new photo (empty file input keeps the current one).
6. **Delete** asks for confirmation, then removes the row and its uploaded image.
7. *Logout* returns to the login card.

---

## API Reference

Base URL: `http://localhost:3000`

### `POST /api/login`
Plain-text admin authentication.

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

`200` → `{"success":true,"message":"Welcome back, admin!","admin":{"id":1,"username":"admin"}}`
`401` → `{"success":false,"message":"Invalid username or password."}`

### `POST /api/upload-bike`
Multipart form: `title`, `price`, `km_driven`, `description` and one `image` file (jpg, jpeg, png, webp, gif, svg — max 5 MB).

```bash
curl -X POST http://localhost:3000/api/upload-bike \
  -F "title=KTM Duke 200" \
  -F "price=132000" \
  -F "km_driven=7400" \
  -F "description=Sharp handling, fresh tyres, all papers clear." \
  -F "image=@./bike.jpg"
```

`201` → bike object with the generated `image_url` (`/uploads/bike-<timestamp>.jpg`).

### `GET /api/bikes`
All bikes, newest first.

```bash
curl http://localhost:3000/api/bikes
```

```json
{ "success": true, "count": 6, "bikes": [ { "id": 6, "title": "Hero Splendor+", "price": "51000.00", "km_driven": 9800, "description": "...", "image_url": "/images/bikes/bike_splendor.svg", "created_at": "..." } ] }
```

### `PUT /api/bikes/:id`
Edit a bike. Send the same four fields; include `image` **only** to replace the photo (omit it to keep the current one).

```bash
curl -X PUT http://localhost:3000/api/bikes/3 \
  -F "title=Royal Enfield Classic 350" \
  -F "price=145000" \
  -F "km_driven=22300" \
  -F "description=Updated description."
```

### `DELETE /api/bikes/:id`
Deletes the bike and, if it was uploaded through the admin, its image file.

```bash
curl -X DELETE http://localhost:3000/api/bikes/3
```

### Error format

Every failure returns JSON: `{ "success": false, "message": "..." }` with a matching HTTP status (`400` validation, `401` login, `404` missing, `500` server/database).

---

## Database Schema

Database: **`rideease_db`** (InnoDB, `utf8mb4`) — created by `schema.sql`.

### `admins`

| Column     | Type         | Notes                     |
|------------|--------------|---------------------------|
| `id`       | INT, AI, PK  |                           |
| `username` | VARCHAR(50)  | UNIQUE                    |
| `password` | VARCHAR(255) | **Plain text**            |
| `created_at` | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP |

Seed: `admin` / `admin123`

### `bikes`

| Column        | Type            | Notes                     |
|---------------|-----------------|---------------------------|
| `id`          | INT, AI, PK     |                           |
| `title`       | VARCHAR(150)    | NOT NULL                  |
| `price`       | DECIMAL(10,2)   | NOT NULL                  |
| `km_driven`   | INT             | NOT NULL                  |
| `description` | TEXT            | NOT NULL                  |
| `image_url`   | VARCHAR(255)    | `/images/...` or `/uploads/...` |
| `created_at`  | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP — used for "newest first" ordering |

Seed: six pre-owned bikes (Activa 6G, FZ-S V3, Classic 350, Pulsar NS200, Apache RTR 160, Splendor+) with SVG photos in `public/images/bikes/`.

---

## Project Structure

```
RideEase/
├── server.js               # Express app: pool, static, multer, 5 API routes
├── schema.sql              # Creates rideease_db + seed data
├── package.json            # Dependencies and `npm start`
├── package-lock.json       # Locked dependency versions
├── public/                 # Served as the site root
│   ├── index.html          # Customer storefront
│   ├── admin.html          # Admin dashboard (also at /admin)
│   └── images/bikes/       # Seed bike photos
└── uploads/                # Images uploaded from the admin (git-ignored)
```

Static routing:

* `public/` → `/` (so `/index.html` and `/admin.html` are public)
* `uploads/` → `/uploads/`
* `/admin` → serves `public/admin.html`

---

## Demo Script For Presentation

1. `mysql -u root < schema.sql` → `npm start`
2. Open `/` → "6 bikes are already loaded, pulled live from MySQL."
3. Click a card → detail modal → *Add to Cart* → open the cart, show the **Total Bill**.
4. *Proceed to Deal Checkout* → success alert → cart empties.
5. Go to `/admin` → log in as `admin` / `admin123`.
6. Add a new bike with a photo → it appears in the live grid, then in the customer showroom after *Refresh Inventory*.
7. Edit its price and swap the photo → show the updated value in the storefront.
8. Delete a bike → confirm it disappears from the storefront.
9. Mention the design choices: plain-text auth and a `mysql2` connection pool with prepared statements.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Could not connect to MySQL` on startup | Start the daemon (`mariadbd-safe &`, `systemctl start mariadb`, or XAMPP Control Panel) and re-run `schema.sql`. |
| `ER_BAD_DB_ERROR` / table doesn't exist | Run `mysql -u root < schema.sql` again. |
| `Access denied for user 'root'` | Export `DB_USER` / `DB_PASSWORD` before `npm start`. |
| `EADDRINUSE: address already in use` | Another process owns port 3000: `PORT=3001 npm start`. |
| "Could not reach the server" in the browser | `server.js` is not running — check the terminal. |
| Showroom shows the error card | Same as above: the API is unreachable. |
| Uploaded image 404s | Confirm `uploads/` exists (the server creates it at boot). |
| Tailwind styles missing | The CDN needs an internet connection on first load. |

---

## Security Note

This project **intentionally skips security features** to stay readable for a college assignment:

* Admin passwords are stored and compared as plain text — no bcrypt, no hashing.
* There are no JWTs, cookies or server sessions; the browser simply keeps calling the API.
* Every request to the admin dashboard is trusted after login.

**Do not deploy this on a public server.** It is meant for local demos and coursework only. For production you would add hashed passwords, real sessions or tokens, HTTPS, rate limiting and file-type inspection.

What *is* done properly: SQL queries always use parameterised placeholders, all database text is HTML-escaped before rendering, uploads are size-limited and extension-filtered, and orphaned files are cleaned up automatically.

---

## License

MIT — built for academic use.
