const catchAsync = require("./catchAsync");
const AppError = require("./appError");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

module.exports = isAuth = catchAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(
            new AppError('The user belonging to this token no longer exists.', 401)
        );
    }

    req.user = currentUser;
    next();
});
