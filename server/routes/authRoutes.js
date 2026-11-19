const { signup, login } = require('../controllers/authController');
const { signupValidation, loginValidation } = require('../middleware/authValidation');

const router = require('express').Router();

//only reach to signup controller if signupValidation is validated  
router.post('/signup', signupValidation, signup);

router.post('/login', loginValidation, login);

module.exports = router;