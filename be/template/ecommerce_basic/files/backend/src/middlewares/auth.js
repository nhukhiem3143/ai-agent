const { verify } = require('../auth/jwt');
exports.protect = (req, res, next) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try { req.user = verify(h.slice(7)); next(); }
    catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};