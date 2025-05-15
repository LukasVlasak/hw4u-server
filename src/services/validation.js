const Joi = require("joi");

module.exports = {
    task: Joi.object({
        title: Joi.string().required().max(50).regex(/^[a-zA-Zěščřžýáíéů úĚŠČŘŽÝÁÍÉŮÚ\-\/\!\?\.\,\s0-9]+$/),
        price: Joi.number().required(),
        description: Joi.string().required().max(300).regex(/^[a-zA-Zěščřžýá íéůúĚŠČŘŽÝÁÍÉŮÚ\-\/\!\?\.\,\s0-9]+$/),
        due_date: Joi.string(),
        category_id: Joi.number().required(),
        task_id: Joi.number(),
    }),
    review: Joi.object({
        text: Joi.string().required().min(2).max(300).regex(/^[a-zA-Zěščřžýáí éůúĚŠČŘŽÝÁÍÉŮÚ\!\?\.\,\s0-9]+$/),
        for_app_user_id: Joi.number().required(),
        stars: Joi.number().required()
    }),
    feedback: Joi.object({
        message: Joi.string().required().min(10).max(300).regex(/^[a-zA-Zěščřžýáíé ůúĚŠČŘŽÝÁÍÉŮÚ\!\?\.\,0-9]+$/),
    }),
    adminPayment: Joi.object({
        email: Joi.string().required().max(40),
        password: Joi.string().required(),
        productId: Joi.number().required(),
    }),
    user: Joi.object({
        full_name: Joi.string().required().min(3).max(50).regex(/[a-zA-Zěščřžýáíé ůúĚŠČŘŽÝÁÍÉŮÚ]/),
        email: Joi.string().required().max(40),
        password: Joi.string().required(),
        username: Joi.string().min(3).max(15).regex(/[a-zA-Z0-9\.]/).allow("")
    }),
    answer: Joi.object({
        full_answer: Joi.string().max(600).regex(/^[a-zA-Zěščřžýáíé\sůúĚŠČŘŽÝÁÍÉŮÚ\/\\\!\?\.\,0-9]+$/),
        preview: Joi.string().max(300).regex(/^[a-zA-Zěščřžýáíé\sůúĚŠČŘŽÝÁÍÉŮÚ\/\\\!\?\.\,0-9]+$/),
        title: Joi.string().max(50).regex(/^[a-zA-Zěščřžýáíé\sůúĚŠČŘŽÝÁÍÉŮÚ\/\\\!\?\.\,0-9]+$/).required(),
        task_id: Joi.number().required(),
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