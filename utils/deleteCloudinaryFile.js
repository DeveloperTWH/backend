const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Initialize S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const deleteCloudinaryFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    // Extract the S3 Key from the URL
    const key = fileUrl.split(".amazonaws.com/")[1];
    if (!key) throw new Error("Invalid S3 URL");

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted from S3: ${key}`);
  } catch (err) {
    console.error("Failed to delete S3 file:", err.message);
  }
};

module.exports = deleteCloudinaryFile;
