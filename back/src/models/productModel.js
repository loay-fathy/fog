// models/productModel.js
const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  variantId: {
    type: String,
    required: [true, "A variant must have a variant ID"],
    trim: true,
  },
  color: {
    type: String,
    required: [true, "A variant must have a color"],
    trim: true,
  },
  size: {
    type: String,
    required: [true, "A variant must have a size"],
    trim: true,
  },
  stock: {
    type: Number,
    required: [true, "A variant must have a stock quantity"],
    min: [0, "Stock cannot be negative"],
    default: 0,
  },
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "A product must have a title"],
    trim: true,
    maxlength: [100, "Title must be 100 characters or less"],
  },
  description: {
    type: String,
    required: [true, "A product must have a description"],
    trim: true,
    maxlength: [1000, "Description must be 1000 characters or less"],
  },
  price: {
    type: Number,
    required: [true, "A product must have a price"],
    min: [0, "Price cannot be negative"],
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function (value) {
        return value === undefined || (value < this.price && value >= 0);
      },
      message:
        "Discount price must be below the regular price and non-negative",
    },
  },
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: [true, "A product must belong to at least one category"],
    },
  ],
  sku: {
    type: String,
    required: [true, "A product must have a SKU"],
    unique: true,
    trim: true,
    index: true,
  },
  variants: {
    type: [variantSchema],
    required: [true, "A product must have at least one variant"],
    validate: {
      validator: (v) => v.length > 0,
      message: "A product must have at least one variant",
    },
  },
  images: {
    type: [String],
    required: [true, "A product must have at least one image"],
    validate: {
      validator: (v) => v.length > 0,
      message: "A product must have at least one image",
    },
  },
  material: {
    type: String,
    required: [true, "A product must have a material"],
    trim: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update `updatedAt`
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-validate hook to check categories existence
productSchema.pre("save", async function (next) {
  try {
    const categoryExists = await mongoose
      .model("Categories")
      .find({ _id: { $in: this.categories } });
    if (categoryExists.length !== this.categories.length) {
      return next(new Error("One or more referenced categories do not exist"));
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Populate categories in queries
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "categories",
    select: "name slug type",
  });
  next();
});

// Method to update stock for a variant
productSchema.methods.updateStock = async function (variantId, quantityChange) {
  const variant = this.variants.find((v) => v.variantId === variantId);
  if (!variant) throw new Error("Variant not found");
  if (variant.stock + quantityChange < 0) throw new Error("Insufficient stock");
  variant.stock += quantityChange;
  await this.save();
};

// Indexes for performance
productSchema.index({ title: "text" });
productSchema.index({ categories: 1 });
productSchema.index({ sku: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
