require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testUpload() {
  try {
    console.log("Starting S3 upload test...");

    // Pick a sample image from your project (or place a test.jpg in /seed/)
    const filePath = path.join(__dirname, "male-avatar copy.png"); // <- put a test.jpg in /seed
    const fileContent = fs.readFileSync(filePath);

    const fileName = `test/${uuidv4()}-test.jpg`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: fileContent,
      ContentType: "image/jpeg",
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log("✅ Upload successful! File URL:", fileUrl);
  } catch (error) {
    console.error("❌ S3 Upload Failed:", error);
  }
}

testUpload();
