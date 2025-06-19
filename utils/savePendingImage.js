
const PendingImage = require('../models/PendingImage'); 

const savePendingImage = async (fileUrl, userId) => {
  const newPendingImage = new PendingImage({
    fileUrl,                
    uploadedAt: new Date(), 
    userId,                 
  });

  await newPendingImage.save(); 
};

module.exports = savePendingImage;
