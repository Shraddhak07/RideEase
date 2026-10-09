-- ============================================================
--  RideEase - Database Setup Script
--  Database : rideease_db
--  Engine   : MySQL / MariaDB (InnoDB, utf8mb4)
--  Usage    : mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS rideease_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE rideease_db;

-- ------------------------------------------------------------
-- Table: admins (seed password is hashed during application startup)
-- Default account: admin / admin123
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  username  VARCHAR(50)  NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO admins (username, password) VALUES
('admin', 'admin123');

-- ------------------------------------------------------------
-- Table: bikes  (premium pre-owned bike inventory)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bikes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150)   NOT NULL,
  price       DECIMAL(10,2)  NOT NULL,
  km_driven   INT            NOT NULL,
  description TEXT           NOT NULL,
  image_url   VARCHAR(255)   NOT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed inventory (demo showroom data)
-- ------------------------------------------------------------
INSERT INTO bikes (id, title, price, km_driven, description, image_url) VALUES
(1, 'Honda Activa 6G', 68500.00, 12400,
 'Single-owner Activa 6G in mint condition. Always serviced at the authorised Honda centre, new tyres fitted last month, all documents and insurance valid. Perfect daily runner for city college commute.',
 '/images/bikes/bike_activa.jpg'),

(2, 'Yamaha FZ-S V3', 84000.00, 18500,
 'Sporty FZ-S Version 3 with smooth fuel-injected engine. No accident history, original paint on every panel, battery recently replaced. Great pick for riders who want style plus mileage.',
 '/images/bikes/bike_fzs.jpg'),

(3, 'Royal Enfield Classic 350', 148500.00, 22300,
 'Well-maintained Classic 350 with the refined J-series engine. Regular oil changes, stock exhaust, zero modifications, complete service booklet available. A weekend cruiser that still feels new.',
 '/images/bikes/bike_classic.jpg'),

(4, 'Bajaj Pulsar NS200', 96500.00, 15600,
 'Pulsar NS200 owned by an enthusiast. Chain and sprockets recently changed, brakes bedded in, tyres above 70 percent life. Fast, aggressive and ready for both city runs and highway trips.',
 '/images/bikes/bike_pulsar.jpg'),

(5, 'TVS Apache RTR 160', 73500.00, 19800,
 'Apache RTR 160 in stock condition with excellent mileage. Ride and handling are tight, no oil leakage, engine runs quietly. Ideal first bike for students on a sensible budget.',
 '/images/bikes/bike_apache.jpg'),

(6, 'Hero Splendor+', 51000.00, 9800,
 'Lowest mileage Splendor+ in the lot with under ten thousand kilometres on the odometer. Ultra economical, cheap to maintain, new battery and fresh service done before listing.',
 '/images/bikes/bike_splendor.jpg')
ON DUPLICATE KEY UPDATE id = id;
