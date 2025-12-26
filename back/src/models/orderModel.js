const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  products: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
        required: [true, "Order must contain products"],
      },
      title: {
        type: String,
        required: [true, "Product must have a title"],
      },
      description: {
        type: String,
        required: [true, "Product must have a description"],
      },
      size: { type: String, required: true },
      color: { type: String, required: true },
      quantity: {
        type: Number,
        required: [true, "Product quantity is required"],
        min: [1, "Quantity cannot be less than 1"],
      },
      price: {
        type: Number,
        required: [true, "Product price is required"],
      },
      images: {
        type: [String],
        required: [true, "Product must have images"],
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: [true, "Order must have a total amount"],
  },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    required: [true, "Payment method is required"],
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Populate user and product details when querying
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name email",
  }).populate({
    path: "products.product",
    select: "name price images",
  });
  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
