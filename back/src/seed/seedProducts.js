// scripts/seedProducts.js
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const Product = require("../models/productModel");
const Categories = require("../models/categoriesModel");

// MongoDB Connection
async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://loayfathy404:loayfathy2004@shop.jhvhe5v.mongodb.net/e-commerce?retryWrites=true&w=majority&appName=shop",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

// Function to generate random variants
function generateVariants() {
  const sizes = ["S", "M", "L", "XL"];
  const colors = ["Red", "Blue", "Black", "White", "Green", "Gray"];

  return Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => ({
    variantId: faker.string.uuid(),
    size: faker.helpers.arrayElement(sizes),
    color: faker.helpers.arrayElement(colors),
    stock: faker.number.int({ min: 0, max: 100 }),
  }));
}

// Function to generate a single fake product
async function generateFakeProduct() {
  // Fetch categories
  const categories = await Categories.find();
  if (!categories.length) {
    throw new Error(
      "No categories found in database. Please seed categories first."
    );
  }

  // Group categories by type
  const productCategories = categories.filter((c) => c.type === "product");
  const demographicCategories = categories.filter(
    (c) => c.type === "demographic"
  );
  const collectionCategories = categories.filter(
    (c) => c.type === "collection"
  );

  // Ensure at least one product type and demographic exist
  if (!productCategories.length || !demographicCategories.length) {
    throw new Error("Missing product or demographic categories.");
  }

  // Select categories for the product
  const selectedCategories = [
    faker.helpers.arrayElement(productCategories)._id, // One product type (e.g., T-Shirts)
    faker.helpers.arrayElement(demographicCategories)._id, // One demographic (e.g., Men)
  ];

  // Optionally add a collection (50% chance)
  if (collectionCategories.length && faker.datatype.boolean()) {
    selectedCategories.push(
      faker.helpers.arrayElement(collectionCategories)._id
    );
  }

  const price = parseFloat(faker.commerce.price({ min: 100, max: 1000 }));
  return {
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price,
    discountPrice: faker.datatype.boolean()
      ? parseFloat(faker.commerce.price({ min: 50, max: price - 1 }))
      : undefined,
    categories: selectedCategories, // Array of category IDs
    sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`, // Unique SKU
    images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      faker.image.urlPicsumPhotos()
    ),
    material: faker.commerce.productMaterial(),
    isDeleted: false,
    variants: generateVariants(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
  };
}

// Seed function
async function seedProducts(numProducts = 100) {
  try {
    await connectDB();

    // Clear existing non-deleted products
    await Product.deleteMany({ isDeleted: { $ne: true } });
    console.log("Existing non-deleted products removed.");

    // Generate and insert fake products
    const products = [];
    for (let i = 0; i < numProducts; i++) {
      products.push(await generateFakeProduct());
    }

    await Product.insertMany(products, { ordered: false });
    console.log(`${numProducts} products successfully seeded!`);

    // Update productCount in categories
    const categoryCounts = await Product.aggregate([
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
    ]);

    for (const { _id, count } of categoryCounts) {
      await Categories.findByIdAndUpdate(_id, { productCount: count });
    }
    console.log("Category product counts updated.");
  } catch (error) {
    console.error("Error seeding products:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Run the seeding function
if (require.main === module) {
  seedProducts();
}

// Export for reuse
module.exports = { seedProducts, generateFakeProduct };
