const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
	res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
	res.render('register', { title: 'Register'});
};

exports.validateRegister = (req, res, next) => {
	req.sanitizeBody('name'); // sanitize req.body.name
	req.checkBody('name', 'Please provide a name').notEmpty();
	req.checkBody('email', 'Please provide a valid email').isEmail();
	req.sanitizeBody('email').normalizeEmail({
		remove_dots: false,
		remove_extension: false,
		gmail_remove_subaddress: false
	});
	req.checkBody('password', 'Please provide a password').notEmpty();
	req.checkBody('password-confirm', 'Please confirm your password').notEmpty();
	req.checkBody('password-confirm', 'Passwords do not match').equals(req.body.password);

	const errors = req.validationErrors();
	if(errors){
		req.flash('error', errors.map(err => err.msg));
		res.render('register', { title: 'Register', body: req.body, flashes: req.flash() })
		return;
	}
	next(); // no errors, continue to save to DB
};

exports.register = async (req, res, next) => {
	const user = new User({ email: req.body.email, name: req.body.name });
	const register = promisify(User.register, User); //bind User.register method to the User object
	await register(user, req.body.password);
	next(); // pass to authController.login 
};

exports.account = (req, res) => {
	res.render('account', { title: 'Edit Your Account' });
};

exports.updateAccount = async (req, res) => {
	const updates = { 
		name: req.body.name,
		email: req.body.email
	};

	const user = await User.findOneAndUpdate(
		{ _id: req.user._id },
		{ $set: updates },
		{ new: true, runValidators: true, context: 'query' }
	);
	req.flash('success', 'Profile updated');
	res.redirect('back');
};
