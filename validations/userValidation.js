const { check, validationResult } = require('express-validator');

// Validation for Adding new user
exports.user = [
	// first_name------------compulsory field
	check('first_name').exists().withMessage('First Name is mandatory').not().isEmpty().trim().escape().withMessage('first name can not be blank').matches('^[a-zA-Z]*$').withMessage('only alphabets are allowed'),
	// last_name-------------optional field
	check('last_name').optional().matches('^[a-zA-Z]*$').withMessage('only alphabets are allowed'),
	// gender----------------optional field
	check('gender').optional().matches('^[a-zA-Z]*$').withMessage('only alphabets allowed'),
	// email-----------------compulsory field
	check('email').exists().withMessage('Email is mandatory').not().isEmpty().withMessage('email should not be empty').isEmail().withMessage('enter valid email'),
	// phone------------------compulsory field
	check('phone').exists().withMessage('Phone number is mandatory').not().isEmpty().trim().withMessage('phone number should not be blank').isLength({ min: 10, max: 10 }).withMessage('length needs to be 10 digit').matches('^(0|[1-9][0-9]{9})$').withMessage('only numbers are allowed'),
	// password--------------compulsory field
	check('password').exists().withMessage('Password is mandatory').not().isEmpty().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").trim().escape().withMessage("Password should be of eight characters and must contain at least 1 uppercase, 1 lowercase, 1 numeric, 1 special character"),
	// skype_id--------------optional field
	check('skype_id').exists().withMessage('SkypeId is mandatory').optional({ checkFalsy: true }).trim().matches('^[0-9a-zA-Z,-.:_@]*$').withMessage('SkypeId can contain only alphabets, digits and -.:@_,d'),
	// user type label----------required field
	// check('user_category_label').exists().not().withMessage('internal error').isEmpty().withMessage('user label is required'),
	// // status label------------required field
	check('status_label').exists().withMessage('Status is mandatory').not().isEmpty().withMessage('status label can not be blank'),

	(req, res,next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
		  return res.status(422).json({ errors: errors.array() })
		}
		next();
	  }

]

exports.password = [
	// password--------------compulsory field
	check('password').exists().not().withMessage('internal error').isEmpty().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").trim().escape().withMessage("Password should be of eight characters and must contain at least 1 uppercase, 1 lowercase, 1 numeric, 1 special character"),
	(req, res,next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
		  return res.status(422).json({ errors: errors.array() })
		}
		next();
	  }

]
