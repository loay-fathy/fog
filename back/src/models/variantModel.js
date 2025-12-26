const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: [true, "A variant must belong to a product"],
  },
  color: {
    type: String,
    required: [true, "A variant must have a color"],
  },
  sizes: [
    {
      size: {
        type: String,
        required: [true, "Size is required"],
      },
      stock: {
        type: Number,
        required: [true, "Stock quantity is required"],
        min: [0, "Stock cannot be negative"],
      },
    },
  ],
});

const Variant = mongoose.model("Variant", variantSchema);
module.exports = Variant;
