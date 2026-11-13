const router = require('express').Router();
const db = require('../db');
const { sign } = require('../auth/jwt');
const { hash, compare } = require('../auth/hash');
const { protect } = require('../middlewares/auth');

router.post('/register', async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
        const [ex] = await db.query('SELECT id FROM users WHERE email=?', [email]);
        if (ex.length) return res.status(409).json({ success: false, message: 'Email exists' });
        const ph = await hash(password);
        const [r] = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES (?,?,?)', [email, ph, full_name]);
        const token = sign({ id: r.insertId, email, role: 'customer' });
        res.json({ success: true, data: { token, user: { id: r.insertId, email, role: 'customer' } } });
    } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
        if (!rows.length || !(await compare(password, rows[0].password_hash)))
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const u = rows[0];
        const token = sign({ id: u.id, email: u.email, role: u.role });
        res.json({ success: true, data: { token, user: { id: u.id, email: u.email, role: u.role, full_name: u.full_name } } });
    } catch (e) { next(e); }
});

router.get('/me', protect, async (req, res) => {
    const [rows] = await db.query('SELECT id,email,full_name,role FROM users WHERE id=?', [req.user.id]);
    res.json({ success: true, data: rows[0] });
});

module.exports = router;