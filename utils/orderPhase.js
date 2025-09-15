// utils/orderMailer.js
const nodemailer = require("nodemailer");

const APP_NAME = process.env.APP_NAME || "Mosaic Biz Hub";
const BASE_URL = process.env.FRONTEND_URL;
const LOGO_URL = "https://app.mosaicbizhub.com/_next/image?url=%2Flogo.png&w=750&q=75";
const ORDERS_URL = `${BASE_URL}/customer/order`;

// Configure transporter (swap service/config as needed)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

/**
 * HTML wrapper with logo header and CTA button
 */
function wrapHtml({ title, bodyHtml }) {
  return `
  <div style="background:#f6f7fb;padding:24px 0;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(16,24,40,.06);overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #eef2f7;">
                <img src="${LOGO_URL}" alt="${APP_NAME} Logo" height="36" style="display:block"/>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px 24px">
                <h2 style="margin:0 0 8px 0;font-size:20px;line-height:28px;color:#0f172a;">${title}</h2>
                <div style="font-size:14px;line-height:22px;color:#334155;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 28px 24px">
                <a href="${ORDERS_URL}"
                   style="display:inline-block;text-decoration:none;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;font-weight:600;font-size:14px;">
                  View My Orders
                </a>
                <div style="margin-top:10px;font-size:12px;color:#6b7280;">
                  or copy & paste: ${ORDERS_URL}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #eef2f7;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </td>
            </tr>
          </table>
          <div style="font-size:11px;color:#94a3b8;margin-top:12px;">
            You’re receiving this because you have an order on ${APP_NAME}.
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

/**
 * Plain-text fallback
 */
function plainText({ title, lines = [] }) {
  return [
    `${title}`,
    "",
    ...lines,
    "",
    `View your orders: ${ORDERS_URL}`,
    "",
    `© ${new Date().getFullYear()} ${APP_NAME}`,
  ].join("\n");
}

/**
 * Send order status email to customer
 * @param {string} to - Customer email
 * @param {string|number} orderId - Order reference
 * @param {"accepted"|"rejected"} status - Status to notify
 */
async function sendOrderStatusEmail(to, orderId, status) {
  const isAccepted = status === "accepted";
  const title = isAccepted
    ? `Order #${orderId} Accepted`
    : `Order #${orderId} Rejected`;

  const bodyHtml = isAccepted
    ? `
      <p>Great news! Your order <strong>#${orderId}</strong> has been <strong>accepted by our partner</strong> and is now moving forward.</p>
      <p>We’ll keep you updated as it progresses to shipping or pickup.</p>
    `
    : `
      <p>We’re sorry—your order <strong>#${orderId}</strong> has been <strong>rejected</strong>.</p>
      <p>We truly appreciate your interest and apologize for the inconvenience. If payment was captured, a refund will be processed shortly.</p>
    `;

  const html = wrapHtml({ title, bodyHtml });

  const text = isAccepted
    ? plainText({
        title,
        lines: [
          `Your order #${orderId} has been accepted.`,
          `We’ll notify you with shipping details soon.`,
        ],
      })
    : plainText({
        title,
        lines: [
          `Your order #${orderId} has been rejected.`,
          `We appreciate your interest and apologize for the inconvenience.`,
          `If payment was captured, a refund will be processed shortly.`,
        ],
      });

  const mailOptions = {
    from: `"${APP_NAME}" <${process.env.MAIL_USER}>`,
    to,
    subject: `${APP_NAME} • ${title}`,
    html,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order status email sent to ${to} for order ${orderId} (${status})`);
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
}

module.exports = { sendOrderStatusEmail };
