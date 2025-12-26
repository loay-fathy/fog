const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: [true, 'Cart must belong to a user'],
    index: true, // Faster lookups by user
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Cart item must have a product'],
      },
      quantity: {
        type: Number,
        required: [true, 'Cart item must have a quantity'],
        min: [1, 'Quantity cannot be less than 1'],
        default: 1,
      },
      variant: {
        variantId: { type: String, required: [true, 'Variant ID is required'] },
        size: { type: String, required: [true, 'Variant size is required'] },
        color: { type: String, required: [true, 'Variant color is required'] },
      },
    },
  ],
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative'],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update `updatedAt`
cartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-find hook to populate product details
cartSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'items.product',
    select: 'title price discountPrice images description',
  });
  next();
});

// // Method to calculate total amount
// cartSchema.methods.calculateTotal = function () {
//   this.totalAmount = this.items.reduce((sum, item) => {
//     const price = item.product.discountPrice || item.product.price;
//     return sum + item.quantity * price;
//   }, 0);
//   return this.totalAmount;
// };

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;  