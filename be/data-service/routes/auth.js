const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../middlewares/auth');

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

        const [ex] = await db.query('SELECT id FROM users WHERE email=?', [email]);
        if (ex.length) return res.status(409).json({ success: false, message: 'Email đã tồn tại' });

        const ph = await bcrypt.hash(password, 10);
        const [r] = await db.query('INSERT INTO users (email, password_hash) VALUES (?,?)', [email, ph]);

        const token = sign({ id: r.insertId, email });
        res.json({ success: true, token, user: { id: r.insertId, email } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
        if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
            return res.status(401).json({ success: false, message: 'Sai email hoặc mật khẩu' });
        }
        const u = rows[0];
        const token = sign({ id: u.id, email: u.email });
        res.json({ success: true, token, user: { id: u.id, email: u.email } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;