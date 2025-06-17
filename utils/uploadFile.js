const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadFile = async (filePath, folder = 'business') => {
  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    const result = await cloudinary.uploader.upload(filePath, { folder });

    // Delete the local file after upload
   
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete local file:', err);
    }


    return result.secure_url;
  }

  throw new Error('Unsupported storage provider');
};
