/* globals require, module, console */

// Grab libraries
var _ = require('underscore');
var async = require('async');

// Grab Mongoose models
var Tag = require('./models/Tag');
var Cocktail = require('./models/Cocktail');

module.exports.add = function (req, res) {
	"use strict";

	var addCocktail = {
		name       : req.body.cocktailName,
		description: req.body.cocktailDesc,
		date       : new Date(),
		steps      : req.body['cocktailStep[]'],
		ingredients: prepareIngredients(req.body),
		tags       : []
	};

	var asyncLoader = [];

	_.each(req.body.cocktailTags.split(','), function (el, index, list) {

		var tagName = el.toString().trim();
		var tagSlug = createSlug(tagName);

		asyncLoader.push( function (callback) {
					Tag.findOne({slug: tagSlug}, function (err, tag) {
						if (err) {
							callback(err);
						}

						if (tag) {
							addCocktail.tags.push(tagSlug);
							callback(null);
						} else {
							Tag.create({
								name: tagName,
								slug: tagSlug
							}, function (err, tag) {
								if (err) {
									callback(err);
								}
								addCocktail.tags.push(tagSlug);
								callback(null);
							});
						}
					});
				}
		);
	});

	asyncLoader.push( function (callback) {

				// Editing
				if (req.param('id')) {
					Cocktail.update({_id: req.param('id')}, addCocktail, function (err, result) {
						if (err) {
							callback(err);
						}
						addCocktail.id = req.param('id');
						callback(null);
					});

					// Adding
				} else {
					Cocktail.create(addCocktail, function (err, result) {
						if (err) {
							callback(err);
						}
						addCocktail.id = result._id;
						callback(null);
					});
				}
			}
	);

	// Run all functions and redirect to the View page
	async.series(asyncLoader, function () {
		return res.redirect('/view/' + addCocktail.id);
	});
};

// Formats incoming ingredients for storage.
// Deals with body-parser using both string and arrays for multiple values.
function prepareIngredients(body) {
	"use strict";

	var ingredients = [];

	if (typeof body['cocktailPartsAmount[]'] === "string") {
		ingredients.push({
			amount: body['cocktailPartsAmount[]'],
			unit  : body['cocktailPartsUnit[]'],
			name  : body['cocktailPartsName[]']
		});
	} else {
		_.each(body['cocktailPartsAmount[]'], function (el, index, list) {
			if (!el.length) {
				return;
			}
			ingredients.push({
				amount: el.trim(),
				unit  : body['cocktailPartsUnit[]'][index],
				name  : body['cocktailPartsName[]'][index]
			});
		});
	}

	return ingredients;
}

// Create a slug from a name
function createSlug(text) {
	"use strict";

	return text
			.toLowerCase()
			.replace(/[^\w ]+/g, '')
			.replace(/ +/g, '-');
}