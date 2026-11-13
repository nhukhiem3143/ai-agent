const router = require('express').Router();
router.post('/', (req, res) => res.json({ success: true, message: 'Generate OK' }));
module.exports = router;
