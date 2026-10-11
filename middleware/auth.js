const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_jwt_school_production_key_2026';

// Authenticate JWT token and attach user + tenant context
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. Please log in.' });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    req.user = decoded;
    
    // Resolve tenant school_id:
    // If user is super_admin, they can specify school_id or defaults to 1.
    // For school_admin, teacher, student, parent, their school_id is bound server-side.
    if (!req.user.schoolId) {
      req.user.schoolId = 1; // Default tenant
    }

    next();
  });
};

// Require specific role(s)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
  SECRET_KEY
};
