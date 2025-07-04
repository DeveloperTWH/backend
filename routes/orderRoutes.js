const express = require('express');
const { createOrder } = require('../controllers/orderController');
const orderRouter = express.Router();

// Route to create an order
orderRouter.post('/create', createOrder);

module.exports = orderRouter;
