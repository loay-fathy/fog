// models/categoriesModel.js
const mongoose = require("mongoose");

const categoriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A category must have a name"],
        trim: true,
        minlength: [2, "Category name must be at least 2 characters"],
        maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
        type: String,
        required: [true, "A category must have a slug"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["product", "demographic", "collection"],
        required: [true, "A category must have a type"],
    },
    description: {
        type: String,
        trim: true, // Optional, not required
    },
    image: {
        type: String,
        default: "default-category.jpg",
    },
    parent: {
        type: mongoose.Schema.ObjectId,
        ref: "Categories",
        default: null,
    },
    productCount: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false, // For Women's, Men's collections
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for faster queries
categoriesSchema.index({ slug: 1, type: 1 });

// Validate parent exists
categoriesSchema.pre("save", async function (next) {
    if (this.parent) {
        const parentExists = await mongoose.model("Categories").findById(this.parent);
        if (!parentExists) {
            return next(new Error("Parent category does not exist"));
        }
    }
    next();
});

const Categories = mongoose.model("Categories", categoriesSchema);
module.exports = Categories;