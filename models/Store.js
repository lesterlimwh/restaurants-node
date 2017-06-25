// Store Model where any store data is stored

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Please enter a valid store name'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: 'You must supply coordinates.'
		}],
		address: {
			type: String,
			required: 'You must supply an address.'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author.'
	}
});

// Define our indexes for efficiency in MongoDB
storeSchema.index({
	name: 'text',
	description: 'text'
}, {
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next){
	if(!this.isModified('name')){
		next(); // skip it
		return; // stop this function from running
	}
	this.slug = slug(this.name);
	// find other stores that have a slug of ramen, ramen-1, ramen-2
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
	if(storesWithSlug.length){
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}
	next();
});

storeSchema.statics.getTagsList = function(){
	// static methods are bound to the Store model
	return this.aggregate([
		{ $unwind: '$tags' },
		{ $group: { _id: '$tags', count: { $sum: 1 } } },
		{ $sort: { count: -1 } }
	]);
};

storeSchema.statics.getTopStores = function(){
	return this.aggregate([
		// Lookup stores and populate their reviews
		{ $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
		// Filter for only items that have 2 or more reviews
		{ $match: { 'reviews.1': { $exists: true } }}, // reviews.1 is like reviews[1]
		// Add the average reviews field
		{ $project: {
			photo: '$$ROOT.photo',
			name: '$$ROOT.name',
			reviews: '$$ROOT.reviews',
			slug: '$$ROOT.slug',
			averageRating: { $avg: '$reviews.rating' }
		}},
		// Sort it by our new field, highest review first
		{ $sort: { averageRating: -1 }},
		// Limit to at most 10
		{ $limit: 10 }
	]);
};

storeSchema.virtual('reviews', {
	// go to the Review model to grab the reviews where Store._id === Review.store
	ref: 'Review',
	localField: '_id', // match Store._id to Review.store
	foreignField: 'store'
});

function autopopulate(next){
	this.populate('reviews');
	next();
};

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
