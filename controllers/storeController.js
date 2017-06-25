const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // this is the Store model
const User = mongoose.model('User');
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
			next({ message: 'That filetype isn\'t allowed!'}, false);
		}
	}
}

exports.homePage = (req, res) => {
	console.log(req.name);
	res.render('index', {
		title: "I love food"
	});
};

exports.addStore = (req, res) => {
	res.render('editStore', {
		title: "Add Store"
	});
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
	// check if there is no new file to resize
	if (!req.file){
		next(); // skip to the next middleware (createStore)
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`; // now req.body called in createStore has photo
	// now we resize
	const photo = await jimp.read(req.file.buffer); // jimp uses ES6 Promises
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);
	// once we have written the photo to our filesystem, call next to move on
	next();
};

exports.createStore = async (req, res) => {	
	req.body.author = req.user._id;
	// save req.body into the DB
	const store = await (new Store(req.body)).save();
	req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
	const page = req.params.page || 1;
	const limit = 4;
	const skip = (page * limit) - limit;

	// Query the database for a list of all stores
	const storesPromise = Store
		.find()
		.skip(skip)
		.limit(limit)
		.sort({ created: 'desc' });
	const countPromise = Store.count();
	const [stores, count] = await Promise.all([storesPromise, countPromise]);
	const pages = Math.ceil(count / limit);
	if(!stores.length && skip){
		req.flash('info', `You asked for page ${page}. Don't try to be smart.`);
		res.redirect(`${pages}`);
	}
	res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
	if(!store.author.equals(user._id)){
		// we use equals to compare two ObjectId objects
		throw Error('You must own a store in order to edit it.');
	}
}

exports.editStore = async (req, res) => {
	// Find the store given the id
	const store = await Store.findOne({ _id: req.params.id });
	// Confirm they are the owner of the store
	confirmOwner(store, req.user);
	// Render out the edit form so the user can update their store
	res.render('editStore', { title: `Edit ${store.name}`, store }); // note store: store is the same as store
};

exports.updateStore = async (req, res) => {
	// Set the location data to be a point since defaults do not kick in on updates
	req.body.location.type = 'Point';
	// Find and update the store
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // return the new store instead of the old store
		runValidators: true
	}).exec();
	req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">View Store</a>`);
	res.redirect(`/stores/${store._id}/edit`);
	// Redirect the user to the store and tell them it worked
};

exports.getStoreBySlug = async (req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
	if(!store) return next();
	res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag;
	const tagQuery = tag || { $exists: true };
	const tagsPromise = Store.getTagsList();
	const storesPromise = Store.find({ tags: tagQuery });
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
	//res.json(tags);
	res.render('tag', { title: 'Tags', tag, tags, stores });
};

exports.searchStores = async (req, res) => {
	const stores = await Store
	// first find stores that match
	.find({
		$text: {
			$search: req.query.q
		}
	}, {
		score: { $meta: 'textScore' }
	})
	// then sort them by number of occurence of the searched word
	.sort({
		score: { $meta: 'textScore' }
	})
	// limit to only 5 results
	.limit(5);
	res.json(stores);
};

exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates
				},
				$maxDistance: 10000 // 10km
			}
		}
	};

	const stores = await Store.find(q).select('slug name description location').limit(10);
	//const stores = await Store.find(q).select('-photo -name');
	res.json(stores);
};

exports.mapPage = (req, res) => {
	res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User
	.findByIdAndUpdate(req.user._id, 
		{ [operator]: { hearts: req.params.id } },
		{ new: true }
	);
	res.json(user);
};

exports.getHearts = async (req, res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	});
	res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	res.render('topStores', { stores, title: 'Top Stores' });
}
