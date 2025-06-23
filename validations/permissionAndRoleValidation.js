const { check, validationResult } = require('express-validator');

//checking validation for permissions
exports.Permissions=[
    //===========permission name======================================================
    //compulsory
    check('name').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('name can not be blank').matches("^[a-zA-Z\.]*$").withMessage('only alphabets, numbers are allowed'),
    //===========description===========================================================
    //compulsory
    check('description').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('description can not be blank').matches("^[a-zA-Z0-9 ]*$").withMessage('only alphabets, numbers are allowed'),
    //===========category===============================================================
    //compulsory
    check('category').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('category can not be blank'),
    //============status================================================================
    check('status').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('status can not be blank'),
    //sending errors
    (req, res,next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
      }
      next();
    }
  ]
  
// checking validation for roles
exports.Roles=[
  // =================role ===========================================================
  // compulsory
  check('role').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('name can not be blank').matches("^[a-zA-Z0-9\-\_]*$").withMessage('only alphabets, numbers are allowed'),
  // ====================description=================================================
  // compulsory
  check('description').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('description can not be blank').matches("^[a-zA-Z0-9 ]*$").withMessage('only alphabets, numbers are allowed'),
  // // =================permissions=====================================================
  // // compulsory
  // check('permissions').exists().not().withMessage('internal error').isEmpty().trim().escape().withMessage('permissions can not be blank'),
  
]
  