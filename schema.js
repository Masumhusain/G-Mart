const Joi = require('joi');

module.exports.productSchema = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required().min(100).max(100000),
    image: Joi.string().required(),
});

