const { errorTemplate } = require("../templates/emailTemplates");
const logger = require("../services/logger");
const sendMail = require("../services/mailer");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const sendAndLog = (error) => {
  sendMail(
    errorTemplate(error.message),
    "lukin.vlasak@seznam.cz",
    "ERROR Z HW4U"
  );
  logger.error(`Occured error: ${error.message}`);
};

module.exports = {
  sendAndLog,
  validate: (schema, objectToValidate) => {
    const { error, value } = schema.validate(objectToValidate, {abortEarly: false});
    if (error) {
        throw error;
    }
  },
  signJWT: (payload) => {
    return jwt.sign(payload, process.env.JWT_KEY);
  }
};
