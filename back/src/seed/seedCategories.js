// scripts/seedCategories.js
const mongoose = require("mongoose");
const Categories = require("../models/categoriesModel");
require("dotenv").config();

const seedCategories = async () => {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );

  await Categories.deleteMany({});

  await Categories.insertMany([
    {
      name: "Women's Collection",
      slug: "womens",
      type: "demographic",
      description: "Discover the latest trends in women's fashion",
      image: "https://images.unsplash.com/photo-1524634126442-357e0a263dc0",
      isFeatured: true,
      productCount: 50,
    },
    {
      name: "Men's Collection",
      slug: "mens",
      type: "demographic",
      description: "Elevate your style with our men's fashion essentials",
      image: "https://images.unsplash.com/photo-1610216706921-0e5b1e689e24",
      isFeatured: true,
      productCount: 40,
    },
    {
      name: "Kids",
      slug: "kids",
      type: "demographic",
      description: "Fun and durable clothing for kids",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
      productCount: 25,
    },
    {
      name: "T-Shirts",
      slug: "t-shirts",
      type: "product",
      description: "Casual and stylish T-Shirts for all",
      image: "https://images.unsplash.com/photo-1576871337622-98d48e1f3678",
      productCount: 30,
    },
    {
      name: "Shirts",
      slug: "shirts",
      type: "product",
      description: "Elegant and versatile shirts",
      image: "https://images.unsplash.com/photo-1598033129183-c4f52c8f7b6b",
      productCount: 20,
    },
    {
      name: "Pants",
      slug: "pants",
      type: "product",
      description: "Comfortable and trendy pants",
      image: "https://images.unsplash.com/photo-1591195853828-11ae692ba6bc",
      productCount: 20,
    },
    {
      name: "Summer 2024",
      slug: "summer-2024",
      type: "collection",
      description: "Bright and breezy summer essentials",
      image: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d",
      productCount: 15,
    },
  ]);

  console.log("Categories seeded!");
  mongoose.connection.close();
};

seedCategories().catch((err) => console.error(err));
