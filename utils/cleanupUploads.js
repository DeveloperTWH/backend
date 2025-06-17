// utils/cleanupUploads.js
const fs = require('fs');

const cleanupUploads = (files) => {
  if (!files) return;

  try {
    Object.values(files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error('Failed to delete temp file:', file.path, err);
          }
        });
      });
    });
  } catch (error) {
    console.error('Error during file cleanup:', error);
  }
};

module.exports = cleanupUploads;
