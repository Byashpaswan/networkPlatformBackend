const { body, check, validationResult } = require('express-validator');

exports.validateAdvertiserData = [
  body('name')
    .exists().withMessage('Advertiser Name is mandatory')
    .not().isEmpty().withMessage('Advertiser Name can not be blank')
    .matches('^[a-zA-Z ]+$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  body('company')
    .exists().withMessage('Company Name is mandatory')
    .not().isEmpty().withMessage('Company Name can not be blank')
    .matches("^[A-Za-z0-9]{1}(?!.*?[_&'.-]{2})(?!.*?[ ]{2})[A-Za-z0-9, _&'.-]{1,500}$")
    .withMessage("Only alphabets and some special characters ( ,_&'.-) are allowed")
    .trim().escape(),

  body('address')
    .exists().withMessage('address is mandatory')
    .not().isEmpty().withMessage('Address can not be blank')
    .trim().escape(),

  body('locality')
    .optional({ checkFalsy: true })
    .trim().escape(),

  body('city')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  body('state')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  body('pincode')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z0-9]*$').withMessage('Only alphabets and numbers are allowed')
    .trim().escape(),

  body('country')
    .exists().withMessage('Country name is required')
    .not().isEmpty().withMessage('country can not be blank')
    .matches('^[a-zA-Z-. ]+$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  body('advertiserPhone')
    .optional({ checkFalsy: true })
    .matches('^(0|[1-9][0-9]{9})$').withMessage('Phone number can have only 10 digits')
    .isLength({ min: 10, max: 10 }).withMessage('Only 10 digits number is Allowed')
    .trim().escape(),

  body('status')
    .exists().withMessage('Advertiser Status is mandatory')
    .not().isEmpty().withMessage('Advertiser Status Should be Active or Inactive')
    .matches('\b(Active|InActive)\b').withMessage('Publisher Status Should be Active or Inactive')
    .trim().escape(),

  body('accountManagerName')
    .exists().withMessage('Manager Name is mandatory')
    .not().isEmpty().withMessage('Manager Name can not be blank')
    .matches('^[a-zA-Z ]*$').withMessage('only alphabets are allowed')
    .trim().escape(),

  body('accountManagerEmail')
    .exists().withMessage('Manager Email is mandatory')
    .not().isEmpty().withMessage('Manager email can not be blank')
    .isEmail().withMessage('manager email address is not valid')
    .trim().escape(),

  body('managerPhone')
    .optional({ checkFalsy: true })
    .matches('^(0|[1-9][0-9]{9})$').withMessage('Manager Phone NUmber can have only 10 digits')
    .isLength({ min: 10, max: 10 }).withMessage('Only 10 digits are Allowed')
    .trim().escape(),

  body('managerSkypeId')
    .optional({ checkFalsy: true })
    .matches('^[0-9a-zA-Z,-.:_@]*$').withMessage('Manager SkypeId can contain only alphabets, digits and -.:@_,')
    .trim().escape(),

  body('skypeId')
    .optional({ checkFalsy: true })
    .matches('^[0-9a-zA-Z,-.:_@]*$').withMessage('SkypeId can contain only alphabets, digits and -.:@_,')
    .trim().escape(),

  body('email')
    .exists().withMessage('Advertiser Email is mandatory')
    .isEmail().withMessage('email id not valid')
    .trim().escape(),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors[0])
    }
    next();
  }
];
