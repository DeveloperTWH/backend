const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,     // your email
    pass: process.env.MAIL_PASSWORD, // app password
  },
});

exports.sendWelcomeEmail = async (to, vendorName) => {
  const mailOptions = {
    from: `"Mosaic Biz Hub" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Welcome to Mosaic Biz Hub!',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f9f9f9; padding: 20px;">
        <img src="cid:platformLogo" alt="Mosaic Biz Hub Logo" style="max-width: 150px; margin-bottom: 20px;">
        <h2 style="color: #333;">Welcome to Mosaic Biz Hub, ${vendorName}!</h2>
        <p style="color: #555; font-size: 16px;">
          We’re excited to have you join our platform. Mosaic Biz Hub is here to help you grow your business and connect with new opportunities.
        </p>
        <p style="color: #555; font-size: 16px;">
          Explore, engage, and make the most out of your journey with us.
        </p>
        <a href="https://app.mosaicbizhub.com" 
           style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #0d6efd; color: #fff; text-decoration: none; border-radius: 5px;">
           Visit Platform
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #888;">
          &copy; ${new Date().getFullYear()} Mosaic Biz Hub. All rights reserved.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: 'logo.png',
        path: 'https://app.mosaicbizhub.com/_next/image?url=%2Flogo.png&w=750&q=75',
        cid: 'platformLogo', // same CID as used in the <img src="cid:...">
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};
