const router = require('express').Router();
router.post('/login', (req, res) => res.json({ success: true, message: 'Login OK' }));
module.exports = router;
