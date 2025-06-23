const { check, validationResult, body } = require('express-validator');

exports.extValidatePublisherData = [
  check('name')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Publisher Name can not be blank')
    .matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('company')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Company Name can not be blank')
    .matches('^[0-9a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),


  check('city')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('state')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('pincode')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z0-9]*$').withMessage('Only alphabets and number are allowed')
    .trim().escape(),

  check('country')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Country need to be selected')
    .trim().escape(),

  check('phone')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Phone number is required')
    .matches('^[0-9]*$').withMessage('Only number is Allowed')
    .isLength({ min: 10, max: 10 }).withMessage('Only 10 digits number is Allowed')
    .trim().escape(),

  check('email')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Email is required')
    .matches(/[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).withMessage('Please Enter a Valid Email')
    .trim().escape(),

  check('password')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Password is required')
    .matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").withMessage("Password must contain at least 1 uppercase, 1 lowercase, 1 numaric, 1 special character and eight characters")
    .trim().escape(),

  //sending errors
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors[0])
    }
    next();
  }
]
exports.validatePublisherData = [
  check('name')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Publisher Name can not be blank')
    .matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('company')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Company Name can not be blank')
    .matches('^[0-9a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),


  check('city')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('state')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z. ]*$').withMessage('Only alphabets and space are allowed')
    .trim().escape(),

  check('pincode')
    .optional({ checkFalsy: true })
    .matches('^[a-zA-Z0-9]*$').withMessage('Only alphabets and number are allowed')
    .trim().escape(),

  check('country')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Country need to be selected')
    .trim().escape(),

  check('phone')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Phone number is required')
    .matches('^[0-9]*$').withMessage('Only number is Allowed')
    .isLength({ min: 10, max: 10 }).withMessage('Only 10 digits number is Allowed')
    .trim().escape(),

  check('status')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Status is required')
    .matches('^(Active|InActive)$').withMessage('Publisher Status Should be Active or Inactive')
    .trim().escape(),

  check('email')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Email is required')
    .matches(/[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).withMessage('Please Enter a Valid Email')
    .trim().escape(),

  check('password')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Password is required')
    .matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").withMessage("Password must contain at least 1 uppercase, 1 lowercase, 1 numaric, 1 special character and eight characters")
    .trim().escape(),

  check('accountManagerUserId')
    .exists().withMessage('Internal Server Error')
    .not().isEmpty().withMessage('Account Manager is required')
    .trim().escape(),

  //sending errors
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors[0])
    }
    next();
  }
]