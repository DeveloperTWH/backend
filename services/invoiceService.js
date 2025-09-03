// services/invoiceService.js
const Order = require('../models/Order');
const { htmlToPdfBuffer } = require('../utils/pdfFromHtml');
const { invoiceHtmlForOrder } = require('../utils/invoiceHtml');

/**
 * Render invoice PDF from a fully-populated order object.
 * @param {Object} order - should contain userId{name,email}, businessId{businessName,email,address}, items.productId{title|name}
 * @returns {Buffer}
 */
async function renderInvoicePdfBufferForOrder(order) {
  const html = await invoiceHtmlForOrder({ order });
  return htmlToPdfBuffer(html);
}

/**
 * Fetches order by id, minimally populates, then renders PDF.
 * @param {string} orderId
 * @returns {Buffer}
 */
async function renderInvoicePdfById(orderId) {
  const order = await Order.findById(orderId)
    .populate({ path: 'userId', select: 'name email' })
    .populate({ path: 'businessId', select: 'businessName email address slug' })
    .populate({ path: 'items.productId', select: 'title name' })
    .lean();

  if (!order) {
    const e = new Error('Order not found');
    e.status = 404;
    throw e;
  }
  return renderInvoicePdfBufferForOrder(order);
}

module.exports = { renderInvoicePdfBufferForOrder, renderInvoicePdfById };
