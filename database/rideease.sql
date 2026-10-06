-- ============================================================
--  RideEase - Bike & Car Rental Management System
--  Database: rideease
--  MySQL / MariaDB dump (schema + sample data)
--
--  Import: phpMyAdmin > rideease > Import > rideease.sql
--  OR:     mysql -u root < rideease.sql
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Create & select database
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `rideease`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE `rideease`;

-- ------------------------------------------------------------
-- Drop existing tables (safe re-import)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `returns`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `vehicles`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;

-- ------------------------------------------------------------
-- Table: settings  (admin-configurable system settings)
-- ------------------------------------------------------------
CREATE TABLE `settings` (
  `setting_id`   INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key`  VARCHAR(50)  NOT NULL UNIQUE,
  `setting_value` TEXT        NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('late_fee_per_day', '100.00'),
  ('default_security_deposit', '2000.00'),
  ('currency_symbol', '₹'),
  ('company_name', 'RideEase'),
  ('company_email', 'support@rideease.local');

-- ------------------------------------------------------------
-- Table: users  (customers)
-- Passwords are bcrypt hashes generated with password_hash().
-- All sample customers use the password:  password123
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `user_id`    INT AUTO_INCREMENT PRIMARY KEY,
  `full_name`  VARCHAR(100) NOT NULL,
  `email`      VARCHAR(100) NOT NULL UNIQUE,
  `phone`      VARCHAR(20)  NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `status`     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`user_id`, `full_name`, `email`, `phone`, `password`, `status`) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@example.com',  '9876543210', '$2y$10$jK0QCM4XilcykQAeLpv7SuAVklAVQncDm2Igtj3PGkif8Ljr0UFa6', 'Active'),
(2, 'Priya Patel',  'priya.patel@example.com',   '9812345678', '$2y$10$VeTXgtq083wFPk1U3aO9oO4ptIppjBee6XPe/P7fakMrEvzsI8MM6', 'Active'),
(3, 'Rohan Verma',  'rohan.verma@example.com',   '9988776655', '$2y$10$eF15DDnupz9FtYV/4cl2huErXo9774Q0UHKZzzXRArP3dcqOKuYDm', 'Active'),
(4, 'Sneha Gupta',  'sneha.gupta@example.com',   '9090909090', '$2y$10$6vb/LsEHmmSpIoK2viGkNuXCaijldR0i0BrpZ2/caJwelYEBGxEm6', 'Active'),
(5, 'Arjun Mehta',  'arjun.mehta@example.com',   '9876501234', '$2y$10$L38PGG27GhITqkzBEaj5y.HXTCuMnm/aJridT1nfCL6MvTP5xv0Zq', 'Active'),
(6, 'Diya Nair',    'diya.nair@example.com',     '9811223344', '$2y$10$LWiSwYc1wZDLrlC9DcLPBO6fJpn0bi/O6LsDXWFVUyL0YNRr9.J9S', 'Active');

-- ------------------------------------------------------------
-- Table: admins
-- Default admin account:   username: admin    password: admin123
-- ------------------------------------------------------------
CREATE TABLE `admins` (
  `admin_id`   INT AUTO_INCREMENT PRIMARY KEY,
  `username`   VARCHAR(50)  NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `admins` (`username`, `password`) VALUES
('admin', '$2y$10$VKLW91daaJ.VSWPTQtQsY.hoD00gzyHvoAqBLlEdKaAluoYc3EGsq');

-- ------------------------------------------------------------
-- Table: vehicles
-- ------------------------------------------------------------
CREATE TABLE `vehicles` (
  `vehicle_id`         INT AUTO_INCREMENT PRIMARY KEY,
  `type`               ENUM('Bike','Car') NOT NULL,
  `brand`              VARCHAR(50)  NOT NULL,
  `model`              VARCHAR(50)  NOT NULL,
  `registration_number` VARCHAR(20) NOT NULL UNIQUE,
  `fuel_type`          VARCHAR(20)  NOT NULL,
  `transmission`       VARCHAR(20)  NOT NULL,
  `seating_capacity`   INT          NOT NULL,
  `rent_per_day`       DECIMAL(10,2) NOT NULL,
  `security_deposit`   DECIMAL(10,2) NOT NULL,
  `description`        TEXT,
  `image`              VARCHAR(255),
  `availability`       ENUM('Available','Unavailable','Maintenance') NOT NULL DEFAULT 'Available',
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `vehicles` (`vehicle_id`, `type`, `brand`, `model`, `registration_number`, `fuel_type`, `transmission`, `seating_capacity`, `rent_per_day`, `security_deposit`, `description`, `image`, `availability`) VALUES
(1, 'Car', 'Maruti Suzuki', 'Swift',        'MH12AB1234', 'Petrol',  'Manual',    5, 1500.00, 3000.00, 'Fuel-efficient hatchback, perfect for city commutes and short weekend trips.', 'car_swift.svg',        'Available'),
(2, 'Car', 'Hyundai',       'Creta',        'MH12CD5678', 'Diesel',  'Automatic', 5, 2800.00, 5000.00, 'Stylish compact SUV with strong performance and comfort features.',               'car_creta.svg',        'Available'),
(3, 'Car', 'Toyota',        'Innova Crysta','MH12EF9012', 'Diesel',  'Automatic', 7, 3500.00, 6000.00, 'Spacious 7-seater MPV ideal for family travel and group outings.',               'car_innova.svg',       'Available'),
(4, 'Car', 'Honda',         'City',         'MH12GH3456', 'Petrol',  'Manual',    5, 2000.00, 4000.00, 'Reliable premium sedan with smooth ride and good fuel economy.',                 'car_city.svg',         'Available'),
(5, 'Car', 'Mahindra',      'Scorpio-N',    'MH12IJ7890', 'Diesel',  'Manual',    7, 3200.00, 5500.00, 'Bold rugged SUV built for highways and off-road weekends.',                      'car_scorpio.svg',      'Maintenance'),
(6, 'Car', 'Tata',          'Nexon',        'MH12KL0123', 'Petrol',  'Automatic', 5, 2200.00, 4500.00, 'Compact SUV with modern design and safety ratings.',                             'car_nexon.svg',        'Unavailable'),
(7, 'Bike', 'Honda',        'Activa 6G',    'MH12MN3456', 'Petrol',  'Automatic', 2, 350.00,  1000.00, 'Economical scooter, great for daily city rides.',                              'bike_activa.svg',      'Available'),
(8, 'Bike', 'Yamaha',       'FZ-S',         'MH12OP7890', 'Petrol',  'Manual',    2, 500.00,  1200.00, 'Sporty commuter bike with sharp handling and mileage.',                          'bike_fzs.svg',         'Available'),
(9, 'Bike', 'Royal Enfield','Classic 350',  'MH12QR1234', 'Petrol',  'Manual',    2, 700.00,  1500.00, 'Classic retro styling with a refined thump, ideal for leisure rides.',           'bike_classic.svg',     'Available'),
(10,'Bike', 'Bajaj',        'Pulsar NS200', 'MH12ST5678', 'Petrol',  'Manual',    2, 550.00,  1200.00, 'Performance commuter with sporty looks and strong brakes.',                      'bike_pulsar.svg',      'Available'),
(11,'Bike', 'TVS',          'Apache RTR 160','MH12UV9012','Petrol',  'Manual',    2, 450.00,  1000.00, 'Lightweight sporty bike with race-derived suspension.',                          'bike_apache.svg',      'Maintenance'),
(12,'Bike', 'Hero',         'Splendor+',    'MH12WX3456', 'Petrol',  'Manual',    2, 300.00,  800.00,  'India''s most popular mileage king, ultra economical.',                         'bike_splendor.svg',    'Available');

-- ------------------------------------------------------------
-- Table: bookings
-- Sample "today" assumed around 2026-10-06.
-- ------------------------------------------------------------
CREATE TABLE `bookings` (
  `booking_id`     INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT NOT NULL,
  `vehicle_id`     INT NOT NULL,
  `pickup_date`    DATE NOT NULL,
  `return_date`    DATE NOT NULL,
  `total_days`     INT NOT NULL,
  `rental_amount`  DECIMAL(10,2) NOT NULL,
  `security_deposit` DECIMAL(10,2) NOT NULL,
  `late_fee`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount`   DECIMAL(10,2) NOT NULL,
  `booking_status` ENUM('Pending','Confirmed','Active','Completed','Cancelled','Rejected') NOT NULL DEFAULT 'Pending',
  `booking_date`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_user`    FOREIGN KEY (`user_id`)    REFERENCES `users` (`user_id`)    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `bookings` (`booking_id`, `user_id`, `vehicle_id`, `pickup_date`, `return_date`, `total_days`, `rental_amount`, `security_deposit`, `late_fee`, `total_amount`, `booking_status`) VALUES
-- Completed rental (on time): Swift, 3 days
(1, 1, 1,  '2026-09-10', '2026-09-13', 3,  4500.00, 3000.00,   0.00,  7500.00, 'Completed'),
-- Completed rental (returned 2 days late): Activa, 2 days + late fee 200
(2, 2, 7,  '2026-09-20', '2026-09-22', 2,   700.00, 1000.00, 200.00,  1900.00, 'Completed'),
-- Currently on rent: Creta, 5 days (active)
(3, 3, 2,  '2026-10-04', '2026-10-09', 5, 14000.00, 5000.00,   0.00, 19000.00, 'Active'),
-- Pending request: FZ-S, 2 days
(4, 1, 8,  '2026-10-10', '2026-10-12', 2,  1000.00, 1200.00,   0.00,  2200.00, 'Pending'),
-- Confirmed future booking: Innova, 3 days
(5, 4, 3,  '2026-10-15', '2026-10-18', 3, 10500.00, 6000.00,   0.00, 16500.00, 'Confirmed'),
-- Cancelled booking: Classic 350, 3 days (refunded)
(6, 5, 9,  '2026-09-01', '2026-09-04', 3,  2100.00, 1500.00,   0.00,  3600.00, 'Cancelled'),
-- Completed rental (on time): Splendor+, 2 days
(7, 6, 12, '2026-09-25', '2026-09-27', 2,   600.00,  800.00,   0.00,  1400.00, 'Completed');

-- ------------------------------------------------------------
-- Table: payments
-- ------------------------------------------------------------
CREATE TABLE `payments` (
  `payment_id`     INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id`     INT NOT NULL,
  `transaction_id` VARCHAR(50) NOT NULL UNIQUE,
  `amount`         DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL,
  `payment_status` ENUM('Pending','Paid','Failed','Refunded') NOT NULL DEFAULT 'Pending',
  `payment_date`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `payments` (`payment_id`, `booking_id`, `transaction_id`, `amount`, `payment_method`, `payment_status`, `payment_date`) VALUES
(1, 1, 'TXN20260910100001',  7500.00, 'UPI',                'Paid',     '2026-09-09 14:22:10'),
(2, 2, 'TXN20260919100002',  1700.00, 'Debit/Credit Card',  'Paid',     '2026-09-19 09:15:44'),
(3, 3, 'TXN20261003100003', 19000.00, 'UPI',                'Paid',     '2026-10-03 18:40:02'),
(4, 4, 'TXN20261005100004',  2200.00, 'Cash on Pickup',     'Pending',  '2026-10-05 11:05:31'),
(5, 5, 'TXN20261005100005', 16500.00, 'Debit/Credit Card',  'Paid',     '2026-10-05 16:52:18'),
(6, 6, 'TXN20260831100006',  3600.00, 'UPI',                'Refunded', '2026-08-31 13:10:55'),
(7, 7, 'TXN20260924100007',  1400.00, 'UPI',                'Paid',     '2026-09-24 10:28:47');

-- ------------------------------------------------------------
-- Table: returns  (vehicle return + late fee records)
-- ------------------------------------------------------------
CREATE TABLE `returns` (
  `return_id`           INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id`          INT NOT NULL,
  `actual_return_date`  DATE NOT NULL,
  `late_days`           INT NOT NULL DEFAULT 0,
  `late_fee`            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `return_status`       VARCHAR(20) NOT NULL,
  `processed_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_returns_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `returns` (`return_id`, `booking_id`, `actual_return_date`, `late_days`, `late_fee`, `return_status`) VALUES
-- Booking 1: returned on time
(1, 1, '2026-09-13', 0,    0.00, 'Completed'),
-- Booking 2: returned 2 days late -> 2 x 100 = 200 late fee
(2, 2, '2026-09-24', 2,  200.00, 'Completed'),
-- Booking 7: returned on time
(3, 7, '2026-09-27', 0,    0.00, 'Completed');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ============================================================
--  End of RideEase database dump
-- ============================================================



