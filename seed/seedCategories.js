const mongoose = require("mongoose");

const uri = "mongodb+srv://webdevelopmenttwh:gslF8QrdKKNfONlU@mosiac.dyjco5y.mongodb.net/mosaic?retryWrites=true&w=majority&appName=mosiac";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to mosaic DB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const categorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  isActive: { type: Boolean, default: true }
});

const ProductCategory = mongoose.model("productcategories", categorySchema);
const ServiceCategory = mongoose.model("servicecategories", categorySchema);
const FoodCategory = mongoose.model("foodcategories", categorySchema);

async function seed() {
  await ProductCategory.deleteMany({});
  await ServiceCategory.deleteMany({});
  await FoodCategory.deleteMany({});

  await ProductCategory.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" }
  ]);

  await ServiceCategory.insertMany([
    { name: "Plumbing", slug: "plumbing" },
    { name: "Home Cleaning", slug: "home-cleaning" }
  ]);

  await FoodCategory.insertMany([
    { name: "Restaurant", slug: "restaurant" },
    { name: "Bakery", slug: "bakery" }
  ]);

  console.log("✅ Dummy categories inserted into mosaic DB!");
  mongoose.connection.close();
}

seed();
