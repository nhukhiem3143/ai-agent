const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

exports.protect = (req, res, next) => {
  // BỎ QUA KIỂM TRA ĐỐI VỚI REQUEST OPTIONS (CORS PREFLIGHT)
  if (req.method === 'OPTIONS') {
    return next();
  }

  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }
  
  try {
    req.user = jwt.verify(h.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

exports.sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
