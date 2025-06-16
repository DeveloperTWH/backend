module.exports = (req, res, next) => {
  if (req.user.role !== 'business_owner') {
    return res.status(403).json({ message: 'Access denied: Business Owner only' });
  }
  next();
};
