const Mongoose = require("mongoose");
const { check, body, validationResult, sanitizeBody } = require('express-validator');
const response = require('../helpers/Response')
exports.checkOffer=[
    body('network_id').exists().withMessage('Network Name is Mandatory').trim().escape(),
    body('advertiser_offer_id').optional().trim().escape(),
    body('platform_id').optional().trim().escape(),
    body('advertiser_id').exists().withMessage('Advertiser Name is Mandatory').trim().escape(),
    body('thumbnail').optional().trim().escape(),
    body('offer_name').exists().withMessage('Offer Name is Mandatory').trim().escape(),
    body('description').optional().trim().escape(),
    body('kpi').optional().trim().escape(),
    body('preview_url').optional().trim().escape(),
    body('tracking_link').optional().trim().escape(),
    body('expired_url').optional().trim().escape(),
    body('start_date').optional().trim().escape().isISO8601().toDate(),
    body('end_date').optional().trim().escape().isISO8601().toDate(),
    body('currency').exists().withMessage('Currency is Mandatory').trim().escape(),
    body('revenue').optional().trim().escape().isFloat(),
    body('revenue_type').exists().withMessage('Revenue Type is Mandatory').trim().escape().isAlpha(),
    body('payout').optional().trim().escape(),
    body('payout_type').optional().trim().escape(),
    body('approvalRequired').optional().trim().escape(),
    body('isCapEnabled').exists().withMessage('Specify whether Approval is required or not!!').trim().escape(),
    body('isTargeting').exists().withMessage('Specify whether Targeting is required or not!!').trim().escape(),
    body('offer_visible').exists().withMessage('Specify whether Offer is visible or not!!').trim().escape(),
    body('offer_status').exists().withMessage('Status of Offer is Mandatory').trim().escape(),
    sanitizeBody('description'),
    sanitizeBody('kpi'),
    sanitizeBody('offer_name'),
    (req,res,next)=>{
        const errors = validationResult(req);
        errorss= response.error();
        errorss.error=errors.array();
        if (!errors.isEmpty()) {
            return res.send(errorss);
        }
        next();
    },
];
