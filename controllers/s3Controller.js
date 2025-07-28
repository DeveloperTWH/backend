const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

exports.getPresignedUrl = async (req, res) => {
    // console.log("Generating presigned URL for S3 upload...");
    try {
        const { fileName, fileType } = req.query;

        if (!fileName || !fileType) {
            // console.log("❌ Missing fileName or fileType in query parameters", fileName, fileType);

            return res.status(400).json({ error: "fileName and fileType are required" });
        }

        const bucketName = process.env.AWS_S3_BUCKET;
        const key = `uploads/products/${Date.now()}-${fileName}`; // Organized folder structure

        // ✅ Generate Presigned URL for PUT operation
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min expiry
        const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        // console.log(uploadUrl, "Presigned URL generated successfully" , fileUrl);


        res.json({ uploadUrl, fileUrl }); // Frontend will use uploadUrl to upload & store fileUrl in DB
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        res.status(500).json({ error: "Failed to generate presigned URL" });
    }
};
