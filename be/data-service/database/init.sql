CREATE DATABASE IF NOT EXISTS generator_db;
USE generator_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runs (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NULL,
    prompt TEXT NOT NULL,
    template_id VARCHAR(100),
    design_id VARCHAR(100),
    status ENUM('pending','running','success','failed') DEFAULT 'pending',
    current_agent VARCHAR(50),
    zip_path VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed admin / password: admin123
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@gen.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'admin');