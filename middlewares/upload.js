const multer = require('multer');

// Use memory storage (file stored in buffer)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  },
});

module.exports = upload;
