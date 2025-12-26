// controllers/cartController.js
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Helper to compare variants
const isVariantMatch = (itemVariant, reqVariant) =>
  itemVariant.variantId === reqVariant.variantId &&
  itemVariant.size === reqVariant.size &&
  itemVariant.color === reqVariant.color;

// Existing controllers...

// @desc Sync local cart with server cart
exports.syncCart = catchAsync(async (req, res, next) => {
  const { cart: localCart } = req.body; // Expecting { items: [{ productId, quantity, variant, _id }] }

  if (!localCart || !Array.isArray(localCart.items)) {
    return next(new AppError("Invalid local cart data", 400));
  }

  let serverCart = await Cart.findOne({ user: req.user.id });
  if (!serverCart) {
    serverCart = new Cart({ user: req.user.id, items: [] });
  }

  // Process each local cart item
  for (const localItem of localCart.items) {
    const { productId, quantity, variant } = localItem;

    if (!productId || !quantity || !variant || !variant.variantId) {
      continue; // Skip invalid items
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      continue; // Skip if product no longer exists
    }

    const productVariant = product.variants.find(
      (v) => v.variantId === variant.variantId
    );
    if (!productVariant || !isVariantMatch(productVariant, variant)) {
      continue; // Skip if variant doesn’t match
    }

    // Check stock
    const availableStock = productVariant.stock;
    if (availableStock < quantity) {
      continue; // Skip if insufficient stock
    }

    // Check if item exists in server cart
    const existingItem = serverCart.items.find(
      (item) =>
        item.product.equals(productId) && isVariantMatch(item.variant, variant)
    );

    if (existingItem) {
      // Update quantity (take max of local and server to preserve higher intent)
      const newQuantity = Math.max(existingItem.quantity, quantity);
      if (availableStock >= newQuantity) {
        existingItem.quantity = newQuantity;
      }
    } else {
      // Add new item
      serverCart.items.push({ product: productId, quantity, variant });
    }
  }

  await serverCart.save();

  res.status(200).json({
    status: "success",
    message: "Cart synced successfully",
    data: { cart: serverCart },
  });
});

// @desc Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(200).json({
      status: "success",
      data: { cart: { user: req.user.id, items: [], totalAmount: 0 } },
    });
  }

  // cart.calculateTotal();

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

// @desc Add product to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity, variant } = req.body;

  if (!productId || !quantity || !variant || !variant.variantId) {
    return next(
      new AppError("Product ID, quantity, and variant are required", 400)
    );
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) return next(new AppError("Product not found", 404));

  const productVariant = product.variants.find(
    (v) => v.variantId === variant.variantId
  );

  if (!productVariant || !isVariantMatch(productVariant, variant)) {
    return next(new AppError("Variant not found or mismatch", 404));
  }
  if (productVariant.stock < quantity) {
    return next(new AppError("Insufficient stock for this variant", 400));
  }

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = new Cart({ user: req.user.id, items: [] });
  }

  const existingItem = cart.items.find(
    (item) =>
      item.product.equals(productId) && isVariantMatch(item.variant, variant)
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (productVariant.stock < newQuantity) {
      return next(new AppError("Insufficient stock for this variant", 400));
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity, variant });
  }

  cart.totalAmount += (product.discountPrice || product.price) * quantity;

  //   cart.calculateTotal();
  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Product added to cart",
    data: { cart },
  });
});

// @desc Update cart item quantity by item _id
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId, quantity } = req.body;

  if (!itemId || !quantity || quantity < 1) {
    return next(new AppError("Valid item ID and quantity are required", 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError("Cart not found", 404));

  const item = cart.items.id(itemId); // Find item by _id
  if (!item) return next(new AppError("Item not found in cart", 404));

  const product = await Product.findOne({
    _id: item.product,
    isDeleted: false,
  });
  if (!product) return next(new AppError("Product not found", 404));

  const variant = product.variants.find(
    (v) => v.variantId === item.variant.variantId
  );
  if (!variant) return next(new AppError("Variant not found", 404));
  if (variant.stock < quantity) {
    return next(new AppError("Insufficient stock for this variant", 400));
  }

  item.quantity = quantity;
  //   await cart.calculateTotal();
  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Cart item updated",
    data: { cart },
  });
});

// @desc Remove an item from cart by item _id
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.query;

  if (!itemId) {
    return next(new AppError("Item ID is required", 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError("Cart not found", 404));

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((item) => !item._id.equals(itemId));

  if (cart.items.length === initialLength) {
    return next(new AppError("Item not found in cart", 404));
  }

  // await cart.calculateTotal();
  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Item removed from cart",
    data: { cart },
  });
});

// @desc Clear user's cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOneAndDelete({ user: req.user.id });
  if (!cart) return next(new AppError("Cart not found", 404));

  res.status(200).json({
    status: "success",
    message: "Cart cleared",
  });
});
