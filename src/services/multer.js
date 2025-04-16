const multer = require("multer");
// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "files/"); // Specify the directory where files will be stored
    },
    filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + "-" + file.originalname); // Use the original filename
    },
});

const upload = multer({ storage: storage });

module.exports = upload;