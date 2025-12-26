// routes/categoriesRoutes.js
const express = require("express");
const categoriesController = require("../controllers/categoriesController");
const isAuth = require("../utils/jwt");

const router = express.Router();

// Public routes
router.route("/").get(categoriesController.getAllCategories);
router.route("/:slug").get(categoriesController.getCategory);
router.route("/:slug/products").get(categoriesController.getProductsByCategory);

// Admin routes
router.use(isAuth); // Assuming isAuth includes admin check
router.route("/").post(categoriesController.createCategory);
router
    .route("/:id")
    .patch(categoriesController.updateCategory)
    .delete(categoriesController.deleteCategory);

module.exports = router;