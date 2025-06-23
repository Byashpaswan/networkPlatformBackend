const { check, validationResult, sanitizeBody } = require('express-validator');

exports.loginvalidation = [
	check('userDetails.email').isEmail().withMessage('not valid email'),
	check('userDetails.password').matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").trim().escape().withMessage("Password must contain at least 1 uppercase, 1 lowercase, 1 numaric, 1 special character and eight characters"),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).json(errors.errors[0])
		}
		next();
	}
]

exports.setPassword = [
	check('password').matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").trim().escape().withMessage("Password must contain at least 1 uppercase, 1 lowercase, 1 numaric, 1 special character and eight characters"),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).json(errors.errors[0])
		}
		next();
	}
]


exports.platformTypes = [
	check('name').exists().not().isEmpty().trim().withMessage('name field can not be balnk'),
	check('endpoint').exists().not().isEmpty().trim().withMessage('endpoint field can not be balnk'),
	check('type').exists().not().isEmpty().trim().escape().withMessage('type field can not be balnk'),
	check('offer_id_type').exists().not().isEmpty().trim().escape().withMessage('offer_id_type field can not be balnk'),
	check('attribute').exists().not().isArray().withMessage('attr_name field can not be balnk'),
	// check('attribute.attributeuse').exists().not().isEmpty().trim().escape().withMessage('attr_used_at field can not be balnk'),
	check('refresh_time').exists().not().isEmpty().trim().escape().withMessage('refresh_time field can not be balnk').isInt().withMessage('contain only int value'),
	check('api_version').optional(),
	sanitizeBody('name'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).json(errors.errors[0])
		}
		next();
	}
]


exports.platform = [
	check('platform_name').exists().not().isEmpty().trim().withMessage('name field can not be balnk'),
	check('loginlink').exists().not().isEmpty().trim().withMessage('login link field can not be balnk'),
	check('email').exists().not().isEmpty().trim().withMessage('not valid email'),
	check('status').exists().not().isEmpty().trim().escape().withMessage('status field can not be balnk'),
	// check('key').exists().not().isEmpty().trim().escape().withMessage('key field can not be balnk'),
	// check('value').exists().not().isEmpty().trim().escape().withMessage('value field can not be balnk'),
	sanitizeBody('loginlink'),
	sanitizeBody('platform_name'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).json(errors.errors[0])
		}
		next();
	}
]

