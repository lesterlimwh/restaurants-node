// User model where any user data is stored

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
	email: {
		type: String,
		unique: true,
		lowercase: true,
		trim: true,
		validate: [validator.isEmail, 'Invalid Email Address'],
		required: 'Please provide an email address'
	},
	name: {
		type: String,
		required: 'Please provide a name',
		trim: true
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	hearts: [
		{ type: mongoose.Schema.ObjectId, ref: 'Store' }
	]
});

userSchema.virtual('gravatar').get(function(){
	return `https://scontent.fyto1-1.fna.fbcdn.net/v/t1.0-0/p526x296/19420570_119874781947657_330184262631776290_n.jpg?oh=f1da4ca01317c45d4d7640e18827040b&oe=59C47048`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); // gives us a method .register
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
