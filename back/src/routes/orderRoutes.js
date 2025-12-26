// routes/orderRoutes.js
const express = require("express");
const orderController = require("../controllers/orderController");
const isAuth = require("../utils/jwt");

const router = express.Router();

// Protect all routes with authentication
router.use(isAuth);

// User routes
router.route("/")
    .post(orderController.createOrder)      // Create order from cart
    .get(orderController.getUserOrders);    // Get all user orders

router.route("/:id")
    .get(orderController.getOrder)          // Get specific order
    .patch(orderController.updateOrderStatus) // Update order status
    .delete(orderController.cancelOrder);   // Cancel order

// Admin route
router.route("/admin")
    .get(orderController.getAllOrders);     // Get all orders (admin only)

module.exports = router;