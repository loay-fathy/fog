// controllers/categoriesController.js
const Categories = require("../models/categoriesModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const slugify = require("slugify");

// Get all categories
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { type, featured } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (featured === "true") filter.isFeatured = true;

  const categories = await Categories.find(filter);

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: { categories },
  });
});

// Get single category by slug
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Categories.findOne({ slug: req.params.slug });

  if (!category) {
    return next(new AppError("No category found with that slug", 404));
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
});

// controllers/categoriesController.js (partial update)
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  const { page = 1, limit = 20, sort = "" } = req.query;

  const category = await Categories.findOne({ slug });
  if (!category) {
    return next(new AppError("No category found with that slug", 404));
  }

  const query = Product.find({ categories: category._id, isDeleted: false })
    .select("title price discountPrice images categories variants")
    .populate("categories", "name slug");
  if (sort) query.sort(sort); // e.g., "title", "-price"

  const products = await query
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();
  const total = await Product.countDocuments({
    categories: category._id,
    isDeleted: false,
  });

  res.status(200).json({
    status: "success",
    results: products.length,
    total,
    totalPages: Math.ceil(total / limit),
    data: { products },
  });
});

// Create new category
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, type, description, image, parent, isFeatured } = req.body;

  // Generate slug
  const slug = slugify(name, { lower: true, strict: true });

  const newCategory = await Categories.create({
    name,
    slug,
    type,
    description,
    image: image || "default-category.jpg",
    parent: parent || null,
    isFeatured: isFeatured || false,
  });

  res.status(201).json({
    status: "success",
    data: { category: newCategory },
  });
});

// Update category
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, type, description, image, parent, isFeatured } = req.body;

  const updateData = { type, description, image, parent, isFeatured };
  if (name) {
    updateData.name = name;
    updateData.slug = slugify(name, { lower: true, strict: true });
  }

  const category = await Categories.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!category) {
    return next(new AppError("No category found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
});

// Delete category
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Categories.findByIdAndDelete(req.params.id);

  if (!category) {
    return next(new AppError("No category found with that ID", 404));
  }

  // Remove category from products
  await Product.updateMany(
    { categories: req.params.id },
    { $pull: { categories: req.params.id } }
  );

  res.status(204).json({
    status: "success",
    data: null,
  });
});
