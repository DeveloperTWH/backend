module.exports = (req, res, next) => {
  if (req.user.role !== 'business_owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Business Owner or Admin only' });
  }
  next();
};
