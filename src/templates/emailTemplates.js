const dayjs = require("dayjs");

const errorTemplate = (message) => {
    return `
    Error log z aplikace hw4u dne: ${dayjs(Date.now()).format('DD.MM.YYYY HH:mm')},
    zprava: ${message}
    `
}

exports.errorTemplate = errorTemplate;