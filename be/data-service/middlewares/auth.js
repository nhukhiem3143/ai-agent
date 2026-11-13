const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, protect } = require('../middlewares/auth');
const { ok, fail } = require('../utils/response');

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return fail(res, 'Thiếu email/password');

        const [rows] = await db.query(`SELECT * FROM users WHERE email=?`, [email]);
        if (!rows.length) return fail(res, 'Sai thông tin', 401);

        const user = rows[0];
        if (!(await bcrypt.compare(password, user.password_hash)))
            return fail(res, 'Sai thông tin', 401);

        const token = sign({ id: user.id, email: user.email, role: user.role });
        ok(res, {
            token,
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
        });
    } catch (e) { next(e); }
});

router.get('/me', protect, async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT id, email, full_name, role FROM users WHERE id=?`, [req.user.id]
        );
        ok(res, rows[0]);
    } catch (e) { next(e); }
});

module.exports = router;