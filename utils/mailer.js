const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,     // your email
    pass: process.env.MAIL_PASSWORD, // app password
  },
});

exports.sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: `"Mosaic Biz Hub" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
