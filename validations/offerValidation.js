const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;
const { body, validationResult, sanitizeBody } = require('express-validator');
const response = require('../helpers/Response');

function isValidObjectId(value) {
    if (value == null || value == '' || value == 'null' || (ObjectId.isValid(value) && (new ObjectId(value) == value))) {
        return true;
    } else {
        return false;
    }
}

exports.checkOffer = [
    body('category').optional(),
    body('advertiser_offer_id').trim().notEmpty().withMessage('Advertiser offer id is mandatory!'),
    body('platform_id').optional({ nullable: true }).trim().custom(isValidObjectId).withMessage('Invalid ObjectId!'),
    body('platform_name').optional().trim(),
    body('advertiser_id').trim().custom(isValidObjectId).withMessage('Invalid ObjectId!'),
    body('advertiser_name').trim().notEmpty().withMessage('Advertiser name is mandatory!'),
    body('thumbnail').optional().trim(),
    body('offer_name').trim().notEmpty().withMessage('Offer name is mandatory!'),
    body('description').optional().trim(),
    body('kpi').optional().trim(),
    body('preview_url').optional().trim(),
    body('tracking_link').optional().trim(),
    body('expired_url').optional().trim(),
    body('redirection_method').optional().trim(),
    body('start_date').optional().trim().isISO8601().withMessage("Invalid start date!").toDate(),
    body('end_date').optional().trim().isISO8601().withMessage("Invalid end date!").toDate(),
    body('currency').trim().notEmpty().withMessage('Currency is mandatory!'),
    body('revenue').optional().trim().isFloat().withMessage('Invalid revenue!'),
    body('revenue_type').trim().notEmpty().withMessage('Revenue type is mandatory!'),
    body('payout').optional().trim().isFloat().withMessage('Invalid payout!'),
    body('payout_type').optional().trim(),
    body('payout_type').trim().notEmpty().withMessage('Payout type is mandatory!'),
    body('approvalRequired').optional().trim().isBoolean().withMessage('Approval required should be true or false!'),
    body('isCapEnabled').optional().trim().isBoolean().withMessage('Cap enabled should be true or false!'),
    body('offer_capping').optional(),
    body('isTargeting').optional().trim().isBoolean().withMessage('Enable targeting should be true or false!'),
    body('isgoalEnabled').optional().trim().isBoolean().withMessage('Enable goals should be true or false!'),
    body('geo_targeting').optional(),
    body('device_targeting').optional(),
    body('creative').optional(),
    body('goal').optional(),
    body('offer_visible').trim().notEmpty().withMessage('Offer visible is mandatory!'),
    body('status_label').trim().notEmpty().withMessage('Offer status label is mandatory!'),
    body('status').trim().notEmpty().withMessage('Offer status is mandatory!'),
    body('publisher_offers').optional(),
    body('version').optional().trim(),
    body('isApiOffer').optional().trim().isBoolean().withMessage('Is api offer should be true or false!'),
    body('advertiser_platform_id').trim().optional({ nullable: true }).custom(isValidObjectId).withMessage('Invalid ObjectId!'),
    body('liveType').optional().trim(),
    body('app_id').trim().optional(),

    // sanitizeBody('thumbnail'),
    // sanitizeBody('description'),
    // sanitizeBody('kpi'),
    // sanitizeBody('offer_name'),
    // sanitizeBody('preview_url'),
    // sanitizeBody('tracking_link'),
    // sanitizeBody('expired_url'),
    (req, res, next) => {
        const errors = validationResult(req);
        errorss = response.error();
        errorss.error = errors.array();
        if (!errors.isEmpty()) {
            return res.send(errorss);
        }
        next();
    },
];
