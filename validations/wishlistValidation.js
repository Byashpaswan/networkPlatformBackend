const { check, validationResult } = require('express-validator');

exports.validateAppId = [
    check('app_id')
        .exists().withMessage("Please enter an app_id")
        .custom(function (value) {
            return String(value).match(/^[a-zA-Z][a-zA-Z0-9-.-_]+$/);
        }).withMessage("Please enter a valid app_id"),
    function (req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(errors);
        }
        next();
    },
];

exports.validateNetworkId = [
    check('network_id')
        .optional()
        .isAlphanumeric().withMessage("Please enter a valid network_id")
        .isLength({ min: 24, max: 24 }).withMessage("Please enter a valid network_id"),
    function (req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(errors);
        }
        next();
    },
];

exports.validateAppIdOptional = [
    check('app_id')
        .optional()
        .custom(function (value) {
            return String(value).match(/^[a-zA-Z][a-zA-Z0-9-.]+$/);
        }).withMessage("Please enter a valid app_id"),
    function (req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(errors);
        }
        next();
    },
];