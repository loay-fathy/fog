// controllers/productController.js
const Product = require("../models/productModel");
const Categories = require("../models/categoriesModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// @desc Get multiple products by IDs (public endpoint for cart display)
exports.getProductsBulk = catchAsync(async (req, res, next) => {
    const { productIds } = req.body;

    // Validate input
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return next(new AppError("Please provide an array of product IDs", 400));
    }

    // Check if all IDs are valid MongoDB ObjectIds
    const invalidIds = productIds.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
        return next(new AppError(`Invalid product IDs: ${invalidIds.join(", ")}`, 400));
    }

    // Fetch products
    const products = await Product.find({
        _id: { $in: productIds },
        isDeleted: false,
    })
        .select("title price discountPrice images categories variants")
        .populate("categories", "name slug")
        .lean();

    // Log missing products
    if (products.length < productIds.length) {
        const foundIds = products.map((p) => p._id.toString());
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        console.warn(`Some products not found: ${missingIds.join(", ")}`);
    }

    res.status(200).json({
        status: "success",
        results: products.length,
        data: { products },
    });
});

// @desc Get all products with pagination, filtering, and limited fields
exports.getAllProducts = catchAsync(async (req, res, next) => {
    let { page = 1, limit = 10, categories, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };
    let categoryIds = [];

    if (categories) {
        const rawCategories = Array.isArray(categories)
            ? categories
            : categories.split(",");

        const validObjectIds = rawCategories.filter((id) =>
            mongoose.isValidObjectId(id)
        );
        const slugs = rawCategories.filter((id) => !mongoose.isValidObjectId(id));

        if (slugs.length > 0) {
            const docs = await Categories.find({ slug: { $in: slugs } }).select("_id");
            categoryIds.push(...docs.map((doc) => doc._id));
        }

        categoryIds.push(...validObjectIds);

        const existingCategories = await Categories.find({ _id: { $in: categoryIds } });
        if (existingCategories.length !== categoryIds.length) {
            return next(new AppError("One or more categories not found", 400));
        }

        query.categories = { $all: categoryIds };
    }

    if (search) {
        const matchedCategories = await Categories.find({
            name: { $regex: search, $options: "i" },
        }).select("_id");

        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { categories: { $in: matchedCategories.map((c) => c._id) } },
        ];
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(query)
        .select("title price discountPrice images categories variants")
        .populate("categories", "name slug")
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json({
        status: "success",
        results: products.length,
        totalProducts,
        totalPages,
        data: { products },
    });
});

// @desc Get a single product by ID
exports.getProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return next(new AppError("Invalid product ID", 400));
    }

    const product = await Product.findOne({ _id: id, isDeleted: false }).populate(
        "categories",
        "name slug"
    );

    if (!product) {
        return next(new AppError("No product found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: { product },
    });
});

// @desc Create a new product
exports.createProduct = catchAsync(async (req, res, next) => {
    const {
        title,
        description,
        price,
        discountPrice,
        categories,
        sku,
        variants,
        images,
        material,
    } = req.body;

    // Validate input
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return next(new AppError("A product must belong to at least one category", 400));
    }
    if (!variants || variants.length === 0) {
        return next(new AppError("A product must have at least one variant", 400));
    }

    // Validate category IDs
    const invalidIds = categories.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
        return next(new AppError(`Invalid category IDs: ${invalidIds.join(", ")}`, 400));
    }
    const existingCategories = await Categories.find({ _id: { $in: categories } });
    if (existingCategories.length !== categories.length) {
        const missingIds = categories.filter(
            (id) => !existingCategories.some((c) => c._id.equals(id))
        );
        return next(new AppError(`Categories not found: ${missingIds.join(", ")}`, 400));
    }

    const newProduct = await Product.create({
        title,
        description,
        price,
        discountPrice,
        categories,
        sku,
        variants,
        images,
        material,
    });

    // Update productCount in categories
    await Categories.updateMany(
        { _id: { $in: categories } },
        { $inc: { productCount: 1 } }
    );

    res.status(201).json({
        status: "success",
        data: { product: newProduct },
    });
});

// @desc Update a product
exports.updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { categories, ...updateData } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return next(new AppError("Invalid product ID", 400));
    }

    // Validate categories if provided
    if (categories) {
        if (!Array.isArray(categories) || categories.length === 0) {
            return next(new AppError("Categories must be a non-empty array", 400));
        }
        const invalidIds = categories.filter((id) => !mongoose.isValidObjectId(id));
        if (invalidIds.length > 0) {
            return next(new AppError(`Invalid category IDs: ${invalidIds.join(", ")}`, 400));
        }
        const existingCategories = await Categories.find({ _id: { $in: categories } });
        if (existingCategories.length !== categories.length) {
            const missingIds = categories.filter(
                (id) => !existingCategories.some((c) => c._id.equals(id))
            );
            return next(new AppError(`Categories not found: ${missingIds.join(", ")}`, 400));
        }
    }

    // Fetch current product to compare categories
    const currentProduct = await Product.findOne({ _id: id, isDeleted: false });
    if (!currentProduct) {
        return next(new AppError("No product found with that ID", 404));
    }

    // Update product
    const product = await Product.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { ...updateData, ...(categories && { categories }) },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!product) {
        return next(new AppError("No product found with that ID", 404));
    }

    // Update productCount if categories changed
    if (categories) {
        const oldCategories = currentProduct.categories.map((id) => id.toString());
        const newCategories = categories.map((id) => id.toString());

        const removedCategories = oldCategories.filter((id) => !newCategories.includes(id));
        const addedCategories = newCategories.filter((id) => !oldCategories.includes(id));

        if (removedCategories.length > 0) {
            await Categories.updateMany(
                { _id: { $in: removedCategories } },
                { $inc: { productCount: -1 } }
            );
        }
        if (addedCategories.length > 0) {
            await Categories.updateMany(
                { _id: { $in: addedCategories } },
                { $inc: { productCount: 1 } }
            );
        }
    }

    res.status(200).json({
        status: "success",
        data: { product },
    });
});

// @desc Soft delete a product
exports.deleteProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return next(new AppError("Invalid product ID", 400));
    }

    const product = await Product.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
    );

    if (!product) {
        return next(new AppError("No product found with that ID", 404));
    }

    // Decrease productCount in categories
    await Categories.updateMany(
        { _id: { $in: product.categories } },
        { $inc: { productCount: -1 } }
    );

    res.status(200).json({
        status: "success",
        message: "Product deleted successfully",
    });
});

// @desc Update stock for a variant
exports.updateVariantStock = catchAsync(async (req, res, next) => {
    const { id, variantId } = req.params;
    const { quantityChange } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return next(new AppError("Invalid product ID", 400));
    }
    if (!quantityChange || !Number.isInteger(quantityChange)) {
        return next(new AppError("Quantity change must be an integer", 400));
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
        return next(new AppError("No product found with that ID", 404));
    }

    await product.updateStock(variantId, quantityChange);

    res.status(200).json({
        status: "success",
        data: { product },
    });
});

// @desc Add or update a variant
exports.updateVariant = catchAsync(async (req, res, next) => {
    const { id, variantId } = req.params;
    const { color, size, stock } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return next(new AppError("Invalid product ID", 400));
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
        return next(new AppError("No product found with that ID", 404));
    }

    const variant = product.variants.find((v) => v.variantId === variantId);
    if (variant) {
        // Update existing variant
        if (color) variant.color = color;
        if (size) variant.size = size;
        if (stock !== undefined) variant.stock = stock;
    } else {
        // Add new variant
        product.variants.push({ variantId, color, size, stock });
    }

    await product.save();

    res.status(200).json({
        status: "success",
        data: { product },
    });
});