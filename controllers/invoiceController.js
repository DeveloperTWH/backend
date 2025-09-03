// controllers/invoiceController.js
const mongoose = require('mongoose');
const { renderInvoicePdfById } = require('../services/invoiceService');

async function getInvoicePdf(req, res) {
  try {
    const { id } = req.params;
    const { download } = req.query;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    // TODO (auth): ensure the requester is the order's customer or the vendor
    const pdf = await renderInvoicePdfById(id);
    const filename = `invoice-${id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      download === '1' || download === 'true'
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`
    );
    return res.send(pdf);
  } catch (err) {
    const code = err.status || 500;
    console.error('getInvoicePdf error:', err);
    return res.status(code).json({ error: err.message || 'Failed to generate invoice' });
  }
}

module.exports = { getInvoicePdf };
