const { check, validationResult, sanitizeBody } = require('express-validator');

exports.postback=[
    check('postbackurl').exists().not().withMessage('internal error').isEmpty().trim().withMessage('postback Url can not be blank').isURL().withMessage('enter valid url').matches(('^((?!\\?).)*$')).withMessage('url can not contain ?'),
    // check('publisher').exists().not().withMessage('internal error').isEmpty().trim().withMessage('publisher can not be blank'),
    check('parameter').exists().not().isArray().withMessage('name field can not be blank'),
    sanitizeBody('postbackurl'),
    (req, res,next) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
          return res.status(422).json({ errors: errors.array() })
        }
        next();
      }
    ]