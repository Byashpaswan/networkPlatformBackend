const { check, validationResult, sanitizeBody } = require('express-validator');


//checking validation for network/register
exports.RegisterNetwork=[
    //=================company name=======================================================
    //compulsory
    check('company_name').exists().not().withMessage('internal error').isEmpty().trim().withMessage('company name can not be blank').matches("^[A-Za-z0-9]{1}(?!.*?[_&'.-]{2})(?!.*?[ ]{2})[A-Za-z0-9 _&'.-]{1,100}$").withMessage('only alphabets, numbers, dot and hyphen are allowed'),
    //============network owner=============================================================
    //network owner---- first name==========================================================
    //compulsory
    check('first_name').exists().not().withMessage('internal error').isEmpty().trim().withMessage('first name can not be blank').matches('^[a-zA-Z]*$').withMessage('only alphabets are allowed'),
    //network owner-----last name==========================================================
    //optional
    check('last_name').exists().not().withMessage('internal error').isInt().withMessage('only alphabets are allowed').matches('^[a-zA-Z]*$').withMessage('enter valid entry'),
    //network owner---- phone==============================================================
    //compulsory
    //length should be 10
    check('phone').exists().not().withMessage('internal error').isEmpty().trim().withMessage('phone number should not be blank').isLength({min:10,max:10}).withMessage('length needs to be 10 digit').matches('^(0|[1-9][0-9]*)$').withMessage('only numbers are allowed'),
    //network owner -----alternate phone====================================================
    //optional
    //length should be 10
    check('alternate_phone').optional({checkFalsy:true}).isLength({min:10,max:10}).withMessage('only numbers are allowed'),
    //network owner ----email===============================================================
    //compulsory
    //needs to be an email
    check('email').exists().not().withMessage('internal error').isEmpty().withMessage('email should not be empty').isEmail().withMessage('enter valid email'),
    //designation===========================================================================
    //compulsory
    check('designation').exists().not().withMessage('internal error').withMessage('internal error').isEmpty().trim().withMessage('designation can not be blank').matches('^[a-zA-Z ]*$').withMessage('only alphabets are allowed'),
    //website==============================================================================
    //regex for url/website
    //compulsory
    check('website').exists().not().withMessage('internal error').isEmpty().trim().withMessage('website can not be blank').isURL().withMessage('enter valid website'),
    //address==============================================================================
    //compulsory
    check('address').exists().not().withMessage('internal error').isEmpty().trim().withMessage('address can not be blank').matches("^[A-Za-z0-9]{1}(?!.*?[_&'.-]{2})(?!.*?[ ]{2})[A-Za-z0-9, _&'.-]{1,500}$").withMessage('enter valid address').escape(),
    //locality=============================================================================
    //optional
    check('locality').exists().not().withMessage('internal error').optional({checkFalsy:true}).isInt().withMessage('enter valid locality').matches("^[0-9a-z A-Z.]+$").withMessage('only alphabets and spaces are allowed'),
    //city=================================================================================
    //compulsory
    check('city').exists().not().withMessage('internal error').isEmpty().trim().withMessage('city can not be blank').matches('^[a-zA-Z ]*$').withMessage('enter valid city - only alphabets and spaces are allowed'),
    //state================================================================================
    //compulsory
    check('state').exists().not().withMessage('internal error').isEmpty().trim().withMessage('state can not be blank').matches('^[a-zA-Z ]*$').withMessage('enter valid state - only alphabets and spaces are allowed'),
    //network address ---pincode============================================================
    //compulsory
    check('pincode').exists().not().withMessage('internal error').isEmpty().trim().withMessage('pincode can not be blank').isInt().withMessage('needs to be integer'),
    //network address ----country===========================================================
    //compulsory
    check('country').exists().not().withMessage('internal error').isEmpty().trim().withMessage('country can not be blank'),
    
    //=====================================================================================
    (req, res,next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
      }
      next();
    }
  ]
  
exports.Password=[
  //password==============================================================================
  //compulsory
  check('password').exists().not().withMessage('internal error').isEmpty().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})").trim().escape().withMessage("Password should be of eight characters and must contain at least 1 uppercase, 1 lowercase, 1 numeric, 1 special character"),
  // // network_id=======================================================================
  // // compulsory
  // check('network_id').exists().not().withMessage('internal error').isEmpty().matches('^[a-zA-Z0-9]*$').trim().escape().withMessage("network id needs to be alphanumeric"),
  
  //=====================================================================================
  (req, res,next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    next();
  }
]
  