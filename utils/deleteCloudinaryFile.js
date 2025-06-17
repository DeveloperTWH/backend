const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteCloudinaryFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const uploadIndex = fileUrl.indexOf('/upload/');
    if (uploadIndex === -1) throw new Error('Invalid Cloudinary URL');

    let path = fileUrl.substring(uploadIndex + 8); // skip "/upload/"
    path = path.replace(/^v\d+\//, ''); // remove version like v1234567890/
    const publicId = path.replace(/\.[^/.]+$/, ''); // remove extension
    const result = await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary file:', err.message);
  }
};

module.exports = deleteCloudinaryFile;
