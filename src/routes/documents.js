// const auth = require("../middlewares/auth");
// const path = require("path");
// const { sendAndLog } = require("../utils/sendMailAndLog");
const router = require("express").Router();

const deleteDocument = async (documentId) => {
    const response = await pool.query(
        "DELETE FROM document WHERE id = $1 RETURNING id",
        [documentId]
    );
    if (response.rowCount === 0) {
        return false;
    }
    return true;
}

module.exports.deleteDocument = deleteDocument;

// router.get("/:filename", auth, async (req, res) => {
//     console.log('catc');
//     const filename = req.params.filename;
//     const filePath = path.join(__dirname, '../../files', filename);
  
//     res.download(filePath, (err) => {
//       if (err) {
//         sendAndLog(err);
//         res.status(500).send({message: err.message});
//       }
//     });
// });

module.exports = router;
