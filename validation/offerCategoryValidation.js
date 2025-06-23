const { check, validationResult } = require('express-validator');

exports.OfferCategory = [
  check('name').not().exists().withMessage('Internal Server Error').isEmpty().withMessage(' Name can not be blank').matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed').trim().escape(),
  check('type').not().exists().withMessage('Internal Server Error').isEmpty().withMessage(' type can not be blank').matches('^[a-zA-Z ]*$').withMessage('Only alphabets and space are allowed').trim().escape(),
  check('description').optional().trim().escape(),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors[0])
    }
    next();
  }
]
    