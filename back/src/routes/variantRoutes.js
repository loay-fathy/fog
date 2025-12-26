const express = require('express');
const variantController = require('../controllers/variantController');

const router = express.Router();

router
    .route('/')
    .post(variantController.createVariant)
    .get(variantController.getAllVariants);

router
    .route('/:id')
    .get(variantController.getVariant)
    .patch(variantController.updateVariant)
    .delete(variantController.deleteVariant);

module.exports = router;
