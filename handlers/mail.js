const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

// this is using MailTrap
const transport = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	port: process.env.MAIL_PORT,
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS
	}
});

const generateHTML = (filename, options = {}) => {
	const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
	const inline = juice(html);
	return inline;
}

exports.send = async (options) => {
	const html = generateHTML(options.filename, options);
	const text = htmlToText.fromString(html);
	const mailOptions = {
		from: `Lester Lim <noreply@lesterlim.com`,
		to: options.user.email,
		subject: options.subject,
		html,
		text
	}
	const sendMail = promisify(transport.sendMail, transport);
	return sendMail(mailOptions);
};

/*transport.sendMail({
	from: 'Shiba Tatsuya <shibatatsuya@yotsuba.com>',
	to: 'shibamiyuki@yotsuba.com',
	subject: 'Important information',
	html: 'I am actually <strong>not</strong> blood related to you. I am just kidding.',
	text: 'I am actually not blood related to you. I am just kidding.'
});
*/