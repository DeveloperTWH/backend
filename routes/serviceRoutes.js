const express = require('express');
const router = express.Router();
const { createService, getMyServices, deleteService, updateService, getServiceById } = require('../controllers/serviceController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

router.post(
  '/',
  authenticate,
  isBusinessOwner,
  createService
);


router.get(
  '/my-services',
  authenticate,
  isBusinessOwner,
  getMyServices
);

router.get(
  '/:id',
  authenticate,
  isBusinessOwner,
  getServiceById
);

router.delete(
  '/delete-service/:id',
  authenticate,
  isBusinessOwner,
  deleteService
);


router.put(
  '/:id',
  authenticate, 
  isBusinessOwner,
  updateService // controller method
);




router.get('/', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

module.exports = router;
