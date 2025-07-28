// const cron = require('node-cron');
// const PendingImage = require('../models/PendingImage');
// const Product = require('../models/Product');
// const ProductVariant = require('../models/ProductVariant');
// const deleteCloudinaryFile = require('../utils/deleteCloudinaryFile');

// // Cron job to delete images that are older than 10 minutes
// cron.schedule('* * * * *', async () => {
//   try {
//     const tenMinutesAgo = new Date(new Date().getTime() - 1 * 60000); // 10 minutes ago
//     const pendingImages = await PendingImage.find({
//       uploadedAt: { $lt: tenMinutesAgo }, // Images older than 10 minutes
//     });
//     console.log("Running cron job");

//     if (pendingImages.length > 0) {
//       console.log(`Found ${pendingImages.length} unused image(s) to delete.`);

//       const deletePromises = pendingImages.map(async (image) => {
//         try {
//           // Check if the image URL is linked to any product or variant
//           const isImageInProduct = await Product.exists({ coverImage: image.fileUrl });
//           const isImageInVariant = await ProductVariant.exists({ images: image.fileUrl });

//           // If the image is linked to a product or variant, don't delete it
//           if (isImageInProduct || isImageInVariant) {
//             console.log(`Skipping image ${image.fileUrl} because it's associated with a product or variant.`);
//             await PendingImage.deleteOne({ _id: image._id }); 
//             return; // Skip deletion if the image is in use
//           }

//           // Delete the image from Cloudinary
//           await deleteCloudinaryFile(image.fileUrl);

//           // Delete the image record from the PendingImage collection
//           await PendingImage.deleteOne({ _id: image._id });

//           console.log(`Deleted unused image from Cloudinary: ${image.fileUrl}`);
//         } catch (err) {
//           console.error(`Error deleting image ${image.fileUrl}:`, err.message);
//         }
//       });

//       // Wait for all deletions to finish
//       await Promise.all(deletePromises);
//     } else {
//       console.log('No images found that are older than 10 minutes.');
//     }
//   } catch (err) {
//     console.error('Error in cron job for deleting unused images:', err.message);
//   }
// });
