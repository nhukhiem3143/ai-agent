const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'app_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token không hợp lệ' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Không có quyền Admin' });
    next();
};

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

        const token = jwt.sign({ id: user.id, username: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: user.email, role: user.role });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, image, description } = req.body;
        const [result] = await pool.query('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', [name, price, image, description]);
        res.status(201).json({ id: result.insertId, name, price, image, description });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, image, description } = req.body;
        await pool.query('UPDATE products SET name = ?, price = ?, image = ?, description = ? WHERE id = ?', [name, price, image, description, req.params.id]);
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Xóa thành công' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => { console.log(`Server đang chạy tại http://localhost:${PORT}`); });