CREATE DATABASE IF NOT EXISTS shop_db;
USE shop_db;
CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2));
INSERT INTO products (name, price) VALUES ('Sản phẩm mẫu 1', 100000), ('Sản phẩm mẫu 2', 200000);