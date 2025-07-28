require("dotenv").config();
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");

// Pass the URL as a command-line argument
const fileUrl = process.argv[2];

if (!fileUrl) {
  console.error("❌ Please provide a file URL to delete");
  process.exit(1);
}

(async () => {
  console.log("Attempting to delete:", fileUrl);
  await deleteCloudinaryFile(fileUrl);
  console.log("✅ Done");
})();
