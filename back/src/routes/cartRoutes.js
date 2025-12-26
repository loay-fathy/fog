// routes/cartRoutes.js
const express = require("express");
const cartController = require("../controllers/cartController");
const isAuth = require("../utils/jwt");

const router = express.Router();

// Protect all cart routes
router.use(isAuth);

// Cart management
router
  .route("/")
  .get(cartController.getCart)
  .post(cartController.addToCart)
  .delete(cartController.clearCart);

// Sync local cart with server cart
router.route("/sync").post(cartController.syncCart);

// Update cart item
router.route("/items").patch(cartController.updateCartItem);

// Remove item from cart
router.route("/items/remove").delete(cartController.removeFromCart);

module.exports = router;