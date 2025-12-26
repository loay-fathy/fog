const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createOrder = catchAsync(async (req, res, next) => {
  const { paymentMethod, shippingAddress, guestCart } = req.body;

  if (!paymentMethod || !shippingAddress) {
    return next(
      new AppError("Payment method and shipping address are required", 400)
    );
  }

  let orderItems = [];
  let userId = null;

  // === AUTHENTICATED USER ===
  if (req.user) {
    userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      console.log(cart);
      return next(new AppError("Cart is empty or not found", 404));
    }

    orderItems = cart.items.map((item) => {
      const product = item.product;
      return {
        product: product._id,
        description: product.description,
        title: product.title,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        price: product.discountPrice || product.price,
        images: product.images,
      };
    });

    // Validate stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find(
        (v) => v.size === item.size && v.color === item.color
      );
      if (!variant || variant.stock < item.quantity) {
        return next(
          new AppError(`Insufficient stock for product: ${product.title}`, 400)
        );
      }
    }

    // Delete cart
    await Cart.findOneAndDelete({ user: userId });

    // === GUEST USER ===
  } else if (guestCart && Array.isArray(guestCart) && guestCart.length > 0) {
    const productIds = guestCart.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), product);
    });

    for (const item of guestCart) {
      const product = productMap.get(item.productId);
      if (!product) {
        return next(new AppError(`Product not found: ${item.productId}`, 404));
      }

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId
      );

      if (!variant) {
        return next(
          new AppError(`Variant not found for product: ${product.title}`, 404)
        );
      }

      if (variant.stock < item.quantity) {
        return next(
          new AppError(`Insufficient stock for product: ${product.title}`, 400)
        );
      }

      orderItems.push({
        product: product._id,
        description: product.description,
        title: product.title,
        size: variant.size, // use variant size here
        color: variant.color, // use variant color here
        quantity: item.quantity,
        price: product.discountPrice || product.price,
        images: product.images,
      });
    }
  } else {
    return next(new AppError("No cart data provided", 400));
  }

  // === Create Order ===
  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const orderData = {
    products: orderItems,
    totalAmount,
    paymentMethod,
    shippingAddress,
    status: "pending",
  };

  if (userId) {
    orderData.user = userId;
  }

  const order = await Order.create(orderData);

  res.status(201).json({
    status: "success",
    message: "Order created successfully",
    data: { order },
  });
});

// @desc    Get all orders for the logged-in user
// @route   GET /api/v1/orders
// @access  Private
exports.getUserOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

// @desc    Get a specific order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

  if (!order) {
    return next(
      new AppError("Order not found or you don’t have access to it", 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// @desc    Update order status (e.g., for admins or after payment)
// @route   PATCH /api/v1/orders/:id
// @access  Private (Admin or User with conditions)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return next(new AppError("Status is required", 400));
  }

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid status value", 400));
  }

  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) {
    return next(
      new AppError("Order not found or you don’t have access to it", 404)
    );
  }

  // Optional: Add role-based checks (e.g., only admins can update to 'shipped')
  // if (req.user.role !== 'admin' && status !== 'cancelled') {
  //     return next(new AppError("Only admins can update order status beyond cancellation", 403));
  // }

  order.status = status;
  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order status updated successfully",
    data: { order },
  });
});

// @desc    Cancel an order (user-initiated)
// @route   DELETE /api/v1/orders/:id
// @access  Private
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

  if (!order) {
    return next(
      new AppError("Order not found or you don’t have access to it", 404)
    );
  }

  if (order.status === "shipped" || order.status === "delivered") {
    return next(
      new AppError(
        "Cannot cancel an order that has been shipped or delivered",
        400
      )
    );
  }

  order.status = "cancelled";
  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order cancelled successfully",
    data: { order },
  });
});

// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders/admin
// @access  Private (Admin)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  // Assuming req.user.role is set by isAuth middleware
  if (req.user.role !== "admin") {
    return next(
      new AppError("You are not authorized to access all orders", 403)
    );
  }

  const orders = await Order.find();

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});
