const winston = require("winston");
const path = require("path");

const initLogger = () => {
    const logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm' }),
            winston.format.printf(
                (info) => `${info.timestamp} - ${info.level} - ${info.label}: ${info.message}`
            )
        ),
        transports: [
            new winston.transports.File({filename: path.join(__dirname, "../../logs/app_errors.log")}),
        ],
    });
    return logger;
}

const logger = initLogger(); // logger init just once its good

process.on('exit', () => {
   //transport.close();
});

module.exports = logger;