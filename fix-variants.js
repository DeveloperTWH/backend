// Quick fix: Remove invalid variant references
// Run this in MongoDB shell or MongoDB Compass

// Method 1: Remove the variants field entirely
db.products.updateOne(
  { _id: ObjectId("6983122e4935dfda678dde78") },
  { $unset: { variants: "" } }
)

// Method 2: Set variants to empty array
db.products.updateOne(
  { _id: ObjectId("6983122e4935dfda678dde78") },
  { $set: { variants: [] } }
)

// Check the result
db.products.findOne({ _id: ObjectId("6983122e4935dfda678dde78") })