const auth = require("../middlewares/auth");
const path = require("path");
const { sendAndLog } = require("../utils/sendMailAndLog");
const router = require("express").Router();

router.get("/:filename", auth, async (req, res) => {
    console.log('catc');
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../files', filename);
  
    res.download(filePath, (err) => {
      if (err) {
        sendAndLog(err);
        res.status(500).send({message: err.message});
      }
    });
});

module.exports = router;
