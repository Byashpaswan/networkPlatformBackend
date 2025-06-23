const express = require('express');
const route = express.Router();
const NetworkController = require("../../controllers/network");
// network register
var registerValidation = require('../../validations/registerValidation');
var authentication = require('../../helpers/Auth');
const UserController = require("../../controllers/user/User");
const Validation = require("../../validations/Validator");
const Login = require("../../controllers/login/Login");
const userValidation = require('../../validations/userValidation');
const User = require("../../controllers/user/User");
const RolesController = require("../../controllers/Roles");

route.get("/", UserController.getUser );
route.post("/login",Validation.loginvalidation,Login.userLogin);
route.get("/main/login" , Login.mainLogin );
route.post("/admin/login", Login.adminlogin);

route.post('/network/register',registerValidation.RegisterNetwork,registerValidation.Password, NetworkController.RegisterNetwork);
route.get('/network_id/exists/:id',NetworkController.isNetworkIdExists)
route.get('/rolesDb', RolesController.getAllRoles);
route.post('/system/add/user', userValidation.user,User.addSystemUser);

route.use(authentication.tokenAuthentication);

route.post("/network/login", Login.networkLogin);

route.get('/network/datalist',NetworkController.getNetworkData)
route.get('/network/data/:_id',NetworkController.getNetworkByID)
route.post('/network/status',NetworkController.setStatus)

module.exports = route;


