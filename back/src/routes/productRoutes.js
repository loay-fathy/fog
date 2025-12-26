// routes/productRoutes.js
const express = require("express");
const productController = require("../controllers/productController");
const isAuth = require("../utils/jwt"); // Your authentication middleware

const router = express.Router();

// Public routes
router.route("/").get(productController.getAllProducts);
router.route("/:id").get(productController.getProduct);
router.route("/bulk").post(productController.getProductsBulk); // New bulk endpoint

// Protected routes (admin only)
router.route("/").post(isAuth, productController.createProduct);

router
  .route("/:id")
  .patch(isAuth, productController.updateProduct)
  .delete(isAuth, productController.deleteProduct);

// Variant-specific routes (admin only)
router
  .route("/:id/variants/:variantId/stock")
  .patch(isAuth, productController.updateVariantStock);

router
  .route("/:id/variants/:variantId")
  .patch(isAuth, productController.updateVariant);

module.exports = router;
