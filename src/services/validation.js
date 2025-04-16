const Joi = require("joi");

module.exports = {
    task: Joi.object({
        title: Joi.string().required().max(50),
        willing_to_pay: Joi.number().required(),
        category: Joi.string().required().max(30),
        due_date: Joi.date().allow(null),
        user_id: Joi.number(),
        description: Joi.string().required().max(100),
    }),
    review: Joi.object({
        text: Joi.string().required().min(10).max(50),
        user_name: Joi.string().required().min(3).max(50),
        user_id: Joi.number().required(),
        stars: Joi.number().required()
    }),
    user: Joi.object({
        name: Joi.string().required().min(3).max(30).regex(/[a-zA-ZěščřžýáíéůúĚŠČŘŽÝÁÍÉŮÚ]/),
        email: Joi.string().required().max(40),
        password: Joi.string().required(),
        country: Joi.string().required().max(30),
        subscription: Joi.string().max(30),
        username: Joi.string().min(3).max(15).regex(/[a-zA-Z0-9\.]/)
    }),
    answer: Joi.object({
        description: Joi.string().required().max(300),
        task_id: Joi.number().required(),
        user_id: Joi.number().required()
    }),
    general: Joi.object({
        user_id: Joi.number().required(),
        title: Joi.string().required().max(50),
        description: Joi.string().required().max(100),
        category: Joi.string().required().max(30),
    }),
    complaint: Joi.object({
        user_id: Joi.number().required(),
        to_user_id: Joi.number().required(),
        title: Joi.string().required().max(50),
        description: Joi.string().required().max(50),
        category: Joi.string().required().max(30),
    }),
    course: Joi.object({
        title: Joi.string().required().max(50),
        description: Joi.string().required().max(100),
        category: Joi.string().required().max(30),
        taken: Joi.number().required(),
    }),
    auth: Joi.object({
        email: Joi.string().required().max(50),
        password: Joi.string().required(),
        rememberMe: Joi.bool(),
    }),
}