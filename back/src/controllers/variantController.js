const Variant = require('../models/variantModel');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVariants = catchAsync(async (req, res, next) => {
    const variants = await Variant.find().populate('product', 'title mainImage price');

    res.status(200).json({
        status: 'success',
        results: variants.length,
        data: { variants }
    });
});

exports.getVariant = catchAsync(async (req, res, next) => {
    const variant = await Variant.findById(req.params.id).populate('product', 'title mainImage price');

    if (!variant) {
        return next(new AppError('No variant found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { variant }
    });
});

exports.createVariant = catchAsync(async (req, res, next) => {
    const { product } = req.body;

    // Check if the product exists before adding a variant
    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
        return next(new AppError('Product not found', 404));
    }

    const newVariant = await Variant.create(req.body);

    res.status(201).json({
        status: 'success',
        data: { variant: newVariant }
    });
});

exports.updateVariant = catchAsync(async (req, res, next) => {
    const variant = await Variant.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!variant) {
        return next(new AppError('No variant found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { variant }
    });
});

exports.deleteVariant = catchAsync(async (req, res, next) => {
    const variant = await Variant.findByIdAndDelete(req.params.id);

    if (!variant) {
        return next(new AppError('No variant found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
