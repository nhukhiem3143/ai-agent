const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'secret';
exports.sign = (p) => jwt.sign(p, SECRET, { expiresIn: '7d' });
exports.verify = (t) => jwt.verify(t, SECRET);