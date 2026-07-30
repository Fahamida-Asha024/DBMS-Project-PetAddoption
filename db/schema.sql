

CREATE DATABASE IF NOT EXISTS pet_adoption;
USE pet_adoption;


CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('staff', 'manager', 'adopter') NOT NULL DEFAULT 'adopter',
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  age INT NOT NULL DEFAULT 0,
  gender ENUM('Male', 'Female') NOT NULL,
  status ENUM('Available', 'Adopted') NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS adopters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS adoptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pet_id INT NOT NULL,
  adopter_id INT NOT NULL,
  adoption_date DATE NOT NULL,
  assigned_staff_id INT NULL,
  delivery_status ENUM('Pending', 'Assigned', 'Delivered') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (adopter_id) REFERENCES adopters(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pet_id INT NOT NULL,
  vaccine_name VARCHAR(100) NOT NULL,
  date_administered DATE NOT NULL,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);


INSERT IGNORE INTO users (username, password_hash, role, name, email, phone, address) VALUES
('staff',   '$2a$10$CwTycUXWue0Thq9StjUM0uJ8kbozgO4KX5D4A2y0V6f4b7l0k2f1S', 'staff',   'Staff Member',   'staff@paws.com',   '01711000111', 'Dhaka'),
('manager', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8kbozgO4KX5D4A2y0V6f4b7l0k2f1S', 'manager', 'Manager User',   'manager@paws.com', '01933000333', 'Gulshan, Dhaka');


INSERT INTO pets (name, type, breed, age, gender, status)
SELECT * FROM (
  SELECT 'Bella',    'Dog',    'Labrador',      2, 'Female', 'Available' UNION ALL
  SELECT 'Whiskers', 'Cat',    'Persian',       1, 'Male',   'Available' UNION ALL
  SELECT 'Max',      'Dog',    'Beagle',        3, 'Male',   'Adopted'   UNION ALL
  SELECT 'Luna',     'Cat',    'Siamese',       2, 'Female', 'Available' UNION ALL
  SELECT 'Rocky',    'Dog',    'Bulldog',       4, 'Male',   'Available' UNION ALL
  SELECT 'Coco',     'Rabbit', 'Holland Lop',   1, 'Female', 'Adopted'   UNION ALL
  SELECT 'Simba',    'Cat',    'Maine Coon',    3, 'Male',   'Available'
) AS seed_data(name, type, breed, age, gender, status)
WHERE NOT EXISTS (SELECT 1 FROM pets);
SELECT * FROM pets;
SELECT * FROM users;
SELECT * FROM adopters;
SELECT * FROM adoptions;
SELECT * FROM vaccinations;