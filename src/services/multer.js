const multer = require("multer");
// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "files/");
    },
    filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({ storage: storage });

const multiUpload = upload.fields([
  { name: "files", maxCount: 10 },
  { name: "previews", maxCount: 10 },
]);

module.exports = multiUpload;
