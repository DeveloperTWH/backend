const Order = require('../models/Order');
const ProductVariant = require('../models/ProductVariant');
const { processPayment } = require('../utils/paymentGateway'); // Utility function to process payment
const { isValidPhoneNumber } = require('libphonenumber-js'); // For validating international phone numbers

// Create Order and Process Payment
const createOrder = async (req, res) => {
  const { userId, shippingAddress, orderItems, paymentDetails } = req.body;

  try {
    // Step 1: Validate the provided address object
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.country || !shippingAddress.pincode || !shippingAddress.phoneNumber) {
      return res.status(400).json({ message: 'All address fields are required' });
    }

    // Validate phone number using libphonenumber
    if (!isValidPhoneNumber(shippingAddress.phoneNumber, shippingAddress.country)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Optional: Validate address format (regex validation for pincode)
    const validPincode = /^[0-9]{5,6}$/;  // Pincode validation (5-6 digits)
    if (!validPincode.test(shippingAddress.pincode)) {
      return res.status(400).json({ message: 'Invalid pincode format' });
    }

    // Step 2: Validate stock availability for each item in the order
    for (let item of orderItems) {
      const productVariant = await ProductVariant.findById(item.productVariantId);
      if (productVariant.isDeleted) {
        return res.status(400).json({ message: `Product variant is no longer available.` });
      }

      const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
      if (!sizeVariant || sizeVariant.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${productVariant.productId} ${item.size}` });
      }
    }

    // Step 3: Calculate total amount for the order
    let totalAmount = 0;
    for (let item of orderItems) {
      const productVariant = await ProductVariant.findById(item.productVariantId);
      const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
      const price = sizeVariant.salePrice || sizeVariant.price;  // Apply sale price if valid
      totalAmount += price * item.quantity;
    }

    // Step 4: Create the order, embedding the shipping address directly in the order
    const order = new Order({
      userId,
      shippingAddress,  // Directly embed the validated address
      orderItems,
      totalAmount,
      paymentStatus: 'pending',
      transactionId: paymentDetails.transactionId,
      orderStatus: 'pending',
      orderStatusHistory: [{ status: 'pending' }],
    });

    await order.save();  // Save the order to the database

    // Step 5: Process payment
    const paymentStatus = await processPayment(paymentDetails);
    if (paymentStatus === 'success') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'completed';
      await order.save();  // Update the order with payment details

      // Step 6: Update stock after successful payment
      for (let item of orderItems) {
        const productVariant = await ProductVariant.findById(item.productVariantId);
        const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
        sizeVariant.stock -= item.quantity;
        await productVariant.save();  // Save the updated product variant with new stock
      }

      res.status(201).json({ success: true, order });  // Send the created order as response
    } else {
      res.status(400).json({ message: 'Payment Failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to process the order' });
  }
};

module.exports = { createOrder };
