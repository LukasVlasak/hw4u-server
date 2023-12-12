const nodeMailer = require("nodemailer");
const logger = require("./logger");
require("dotenv").config();

const transport = nodeMailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendMail = (template, to, subject) => {
    return transport.sendMail({
        from: process.env.MAIL_FROM,
        to: to,
        subject: subject,
        html: template
      }).catch(err => {
        logger.error(err.message);
    });
}

module.exports = sendMail;