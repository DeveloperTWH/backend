// mailer/orderPaid.js
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

const APP_URL = process.env.APP_URL || "https://app.minorityownedbusiness.info";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.MAIL_USER;

const transporter =
  global.__MAILER__ ||
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
  });

const escapeHtml = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
   .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
   .replace(/'/g, "&#039;");

const currencyDecimals = (code = "USD") => {
  const c = String(code).toUpperCase();
  // common currencies; expand if needed
  if (["JPY", "KRW"].includes(c)) return 0;
  return 2; // USD, EUR, INR, etc.
};
const toMajor = (amountMinor = 0, code = "USD") =>
  Number(amountMinor) / Math.pow(10, currencyDecimals(code));
const fmt = (amountMajor = 0, code = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: String(code).toUpperCase() }).format(amountMajor);
  } catch {
    return `${String(code).toUpperCase()} ${Number(amountMajor).toFixed(2)}`;
  }
};

// Build a PDF invoice from your Order schema
function buildInvoicePdf({ order }) {
  const currency = order.currency || "USD";
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header
  const orderNo = order.groupOrderId || order._id?.toString();
  doc.fontSize(18).text("Mosaic Biz Hub — Invoice");
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#666")
    .text(`Order: ${orderNo}`, { continued: true })
    .text(`    Date: ${new Date(order.updatedAt || Date.now()).toLocaleString()}`);
  doc.moveDown();

  // Parties
  const businessName = order.businessId?.businessName || "Vendor";
  const customerName = order.userId?.name || "Customer";
  const customerEmail = order.userId?.email || "";

  doc.fillColor("#111").fontSize(12).text("Billed To:", { underline: true });
  doc.fontSize(10).text(customerName);
  if (customerEmail) doc.text(customerEmail);
  const a = order.shippingAddress || {};
  const addr = [a.fullName, a.addressLine1, a.addressLine2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(", ");
  if (addr) doc.text(addr);
  doc.moveDown(0.75);

  doc.fontSize(12).text("Seller:", { underline: true });
  doc.fontSize(10).text(businessName);
  if (order.businessId?.email) doc.text(order.businessId.email);
  doc.moveDown();

  // Items
  doc.fontSize(11).text("Items", { underline: true }).moveDown(0.25);
  doc.fontSize(10);
  doc.text("Name", 40, doc.y, { continued: true });
  doc.text("SKU", 220, doc.y, { continued: true });
  doc.text("Options", 300, doc.y, { continued: true });
  doc.text("Qty", 420, doc.y, { continued: true });
  doc.text("Unit", 460, doc.y, { continued: true });
  doc.text("Total", 520, doc.y);
  doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor("#ccc").stroke();

  let subtotalMajor = 0;
  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach((it) => {
    const prodName = it.productId?.name || it.productId?.title || "Item";
    const options = [it.size, it.color].filter(Boolean).join(" / ");
    const sku = it.sku || "";
    const qty = Number(it.quantity || 1);
    // NOTE: your schema doesn't state minor/major for item.price; we'll treat it as MAJOR.
    const unitMajor = Number(it.price || 0);
    const lineMajor = unitMajor * qty;
    subtotalMajor += lineMajor;

    doc.moveDown(0.35);
    doc.fillColor("#111").text(String(prodName).slice(0, 36), 40, doc.y, { continued: true });
    doc.text(String(sku).slice(0, 16), 220, doc.y, { continued: true });
    doc.text(String(options).slice(0, 18), 300, doc.y, { continued: true });
    doc.text(qty.toString(), 420, doc.y, { continued: true });
    doc.text(fmt(unitMajor, currency), 460, doc.y, { continued: true });
    doc.text(fmt(lineMajor, currency), 520, doc.y);
  });

  // Totals
  const totalMajor = toMajor(order.totalAmount || 0, currency); // authoritative total from schema (minor → major)
  doc.moveDown();
  const startX = 420;
  const line = (label, val) => {
    doc.text(label, startX, doc.y, { continued: true });
    doc.text(fmt(val, currency), 500, doc.y);
  };
  doc.fontSize(10);
  line("Subtotal:", subtotalMajor);
  doc.fontSize(11).moveDown(0.3);
  line("Total:", totalMajor);

  // Footer
  doc.moveDown();
  doc.fontSize(9).fillColor("#666")
    .text(`Payment ID: ${order.paymentId || ""}`)
    .text(`Support: ${SUPPORT_EMAIL}`);

  doc.end();
  return done;
}

function baseLayout({ heading, introHtml, ctaHref, ctaText }) {
  return `
  <div style="margin:0;padding:0;background:#f6f8fa;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f8fa;">
      <tr><td align="center" style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td align="center" style="padding:24px 24px 8px;">
            <img src="cid:platformLogo" alt="Mosaic Biz Hub" width="120" style="display:block;margin:0 auto 8px;" />
            <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;margin:12px 0 0;color:#111827;">${heading}</h1>
            ${introHtml || ""}
            ${ctaHref ? `<div style="height:8px;"></div><a href="${ctaHref}" style="display:inline-block;background:#0d6efd;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;padding:10px 16px;border-radius:8px;">${escapeHtml(ctaText || "Open Dashboard")}</a>` : ""}
          </td></tr>
          <tr><td align="center" style="padding:16px;background:#f9fafb;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#9ca3af;margin:0;">&copy; ${new Date().getFullYear()} Mosaic Biz Hub. All rights reserved.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function customerIntro({ order, businessName }) {
  const orderNo = order.groupOrderId || order._id?.toString();
  return `
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#374151;margin:8px 0 0;">
    Hi ${escapeHtml(order.userId?.name || "there")},<br/>
    Your payment to <strong>${escapeHtml(businessName)}</strong> is confirmed. Order <strong>#${escapeHtml(orderNo)}</strong> is now placed.
  </p>
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7280;margin:10px 0 0;">
    We've attached your invoice (PDF). You can view your order any time from your account.
  </p>`;
}

function vendorIntro({ order, businessName }) {
  const orderNo = order.groupOrderId || order._id?.toString();
  const itemCount = (order.items || []).reduce((n, it) => n + Number(it.quantity || 1), 0);
  return `
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#374151;margin:8px 0 0;">
    Hi ${escapeHtml(businessName)},<br/>
    You received a <strong>paid order</strong> <strong>#${escapeHtml(orderNo)}</strong> with ${itemCount} item${itemCount === 1 ? "" : "s"}.
  </p>
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7280;margin:10px 0 0;">
    The customer invoice is attached. Manage this order in your Partners dashboard.
  </p>`;
}

/**
 * Send order-paid emails to customer + vendor with a PDF invoice.
 * Expects order populated with: userId{name,email}, vendorId{name,email}, businessId{businessName,slug,email,owner{email}}, items.productId{name|title}
 */
exports.sendOrderPaidEmails = async ({ order, currency, customerEmails = [], vendorEmails = [] }) => {
    console.log({ order, currency, customerEmails, vendorEmails });
    
  const businessName = order.businessId?.businessName || "Vendor";
  const businessSlug = order.businessId?.slug || "";
  const partnersUrl = `${APP_URL}/partners/${encodeURIComponent(businessSlug)}`;

  // Build PDF once
  const pdf = await buildInvoicePdf({ order });
  const invoiceFileName = `invoice-${order.groupOrderId || order._id}.pdf`;

  const attachments = [
    { filename: "logo.png", path: "https://app.minorityownedbusiness.info/_next/image?url=%2Flogo.png&w=750&q=75", cid: "platformLogo" },
    { filename: invoiceFileName, content: pdf, contentType: "application/pdf" },
  ];

  // CUSTOMER EMAIL
  if (customerEmails.length) {
    const customerHtml = baseLayout({
      heading: "🧾 Payment received — your order is confirmed",
      introHtml: customerIntro({ order, businessName }),
      ctaHref: `${APP_URL}/customer/orders/`, // TODO: adjust to your real customer order route
      ctaText: "View Your Order",
    });
    const orderNo = order.groupOrderId || order._id?.toString();
    const customerText = [
      `Hi ${order.userId?.name || "there"},`,
      ``,
      `Your payment to ${businessName} is confirmed.`,
      `Order #${orderNo} is placed.`,
      `View your order: ${APP_URL}/orders/${order._id}`,
      ``,
      `Invoice attached (PDF).`,
      ``,
      `— Mosaic Biz Hub Team`,
    ].join("\n");

    await transporter.sendMail({
      from: `"Mosaic Biz Hub" <${process.env.MAIL_USER}>`,
      to: customerEmails,
      subject: `✅ Order #${orderNo} confirmed`,
      text: customerText,
      html: customerHtml,
      attachments,
      headers: { "X-Entity-Ref-ID": `order-paid-customer-${order._id}-${Date.now()}` },
    });
  }

  // VENDOR EMAIL
  if (vendorEmails.length) {
    const vendorHtml = baseLayout({
      heading: "💸 You’ve received a paid order",
      introHtml: vendorIntro({ order, businessName }),
      ctaHref: `${partnersUrl}/orders`, // TODO: adjust to your real partners order detail route
      ctaText: "Open Partners Dashboard",
    });
    const orderNo = order.groupOrderId || order._id?.toString();
    const vendorText = [
      `Hi ${businessName},`,
      ``,
      `You received a paid order #${orderNo}.`,
      `Manage: ${partnersUrl}/orders/${order._id}`,
      ``,
      `Customer invoice attached (PDF).`,
      ``,
      `— Mosaic Biz Hub Team`,
    ].join("\n");

    await transporter.sendMail({
      from: `"Mosaic Biz Hub" <${process.env.MAIL_USER}>`,
      to: vendorEmails,
      subject: `🛍️ New paid order #${orderNo}`,
      text: vendorText,
      html: vendorHtml,
      attachments,
      headers: { "X-Entity-Ref-ID": `order-paid-vendor-${order._id}-${Date.now()}` },
    });
  }
};
