const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter: function(req, file, next){
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto){
			next(null, true);
		} else{
			next({ message: 'That filetype isn\'t allowed.'}, false);
		}
	}
}

exports.loginForm = (req, res) => {
	res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
	res.render('register', { title: 'Register'});
};

exports.upload = multer(multerOptions).single('profile');

exports.resize = async (req, res, next) => {
	// check if there is no new file to resize
	if (!req.file){
		next(); // skip to the next middleware (register)
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	// set the file name to be the same otherwise use a new one
	if (req.user && req.user.profile){
		req.body.profile = req.user.profile;
	} else{
		req.body.profile = `${uuid.v4()}.${extension}`;	
	}
	// now we resize
	const profile = await jimp.read(req.file.buffer); // jimp uses ES6 Promises
	await profile.resize(300, jimp.AUTO);
	await profile.write(`./public/profiles/${req.body.profile}`);
	// once we have written the profile to our filesystem, call next to move on
	next();
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
	next(); // no errors, continue to save into DB
};

exports.register = async (req, res, next) => {
	const user = new User({ email: req.body.email, name: req.body.name, profile: req.body.profile });
	// bind User.register method provided by passport to the User object
	const register = promisify(User.register, User);
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
