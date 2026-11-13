const router = require('express').Router();
const db = require('../db');
const { protect } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');

router.post('/', async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const { customer_name, phone, address, cart_items } = req.body;
        if (!cart_items?.length) return res.status(400).json({ success: false, message: 'Empty cart' });
        const total = cart_items.reduce((s, i) => s + i.price * i.quantity, 0);
        await conn.beginTransaction();
        const [r] = await conn.query(
            'INSERT INTO orders (customer_name,phone,address,total) VALUES (?,?,?,?)',
            [customer_name, phone, address, total]
        );
        for (const it of cart_items) {
            await conn.query('INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (?,?,?,?)',
                [r.insertId, it.product_id, it.quantity, it.price]);
        }
        await conn.commit();
        res.status(201).json({ success: true, data: { order_id: r.insertId } });
    } catch (e) { await conn.rollback(); next(e); }
    finally { conn.release(); }
});

router.get('/', protect, requireRole('admin'), async (_, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (e) { next(e); }
});

module.exports = router;