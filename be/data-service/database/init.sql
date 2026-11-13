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

-- Mật khẩu là: 123456 (Đã mã hóa bcrypt CHUẨN)
INSERT IGNORE INTO users (email, password, role) VALUES 
('admin@admin.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');

-- Bảng lưu phiên chat
DROP TABLE IF EXISTS conversations;
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT, -- Thêm ID người dùng
    status VARCHAR(20) DEFAULT 'chatting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng lưu tin nhắn
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36),
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);