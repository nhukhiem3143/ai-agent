const router = require('express').Router();
const db = require('../db');
const { protect } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');

router.get('/', async (_, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE is_active=TRUE');
        res.json({ success: true, data: rows });
    } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE id=?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (e) { next(e); }
});

router.post('/', protect, requireRole('admin'), async (req, res, next) => {
    try {
        const { name, price, stock, image, category, description } = req.body;
        const [r] = await db.query(
            'INSERT INTO products (name,price,stock,image,category,description,created_by) VALUES (?,?,?,?,?,?,?)',
            [name, price, stock || 0, image, category, description, req.user.id]
        );
        res.status(201).json({ success: true, data: { id: r.insertId } });
    } catch (e) { next(e); }
});

router.put('/:id', protect, requireRole('admin'), async (req, res, next) => {
    try {
        const { name, price, stock, image, category, description } = req.body;
        await db.query(
            'UPDATE products SET name=?,price=?,stock=?,image=?,category=?,description=? WHERE id=?',
            [name, price, stock, image, category, description, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { next(e); }
});

router.delete('/:id', protect, requireRole('admin'), async (req, res, next) => {
    try {
        await db.query('UPDATE products SET is_active=FALSE WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { next(e); }
});

module.exports = router;