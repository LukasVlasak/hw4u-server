// const auth = require("../middlewares/auth");
const path = require("path");
const fs = require("fs");
const { authUser } = require("../middlewares/auth");
const { sendAndLog } = require("../utils/sendMailAndLog");
const router = require("express").Router();
const pool = require("../db/db");

const deleteDocument = async (documentId) => {
    const response = await pool.query(
        "DELETE FROM document WHERE document_id = $1 RETURNING filename",
        [documentId]
    );
    if (response.rowCount === 0) {
        return false;
    }
    const filename = response.rows[0].filename;
    const filePath = path.join(__dirname, '../../files', filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return true;
}

router.get("/:id", authUser, async (req, res) => {
    
    try {
        const document = await pool.query(
            "SELECT * FROM document WHERE document_id = $1",
            [req.params.id]
        );

        if (document.rowCount === 0) {
            return res.status(404).send({ message: "Document not found" });
        }

        const check = await pool.query("select * from answer_app_user where answer_id = $1 and app_user_id = $2 and confirmed = true and paid = true", [document.rows[0].answer_id, req.user.app_user_id]);
        const check2 = await pool.query("select * from answer where answer_id = $1 and app_user_id = $2", [document.rows[0].answer_id, req.user.app_user_id]);

        if ((check.rowCount !== 0 || check2.rowCount !== 0) || req.user.is_admin === true || document.rows[0].is_preview === true) {
            const filePath = path.join(__dirname, '../../files', document.rows[0].filename);
    
            res.download(filePath, (err) => {
            if (err) {
                sendAndLog(err);
                res.status(500).send({message: err.message});
            }
            });
        }

    } catch (err) {
        sendAndLog(err);
        res.status(500).send({ message: err.message });
    }
    
});

module.exports = {
    deleteDocument,
    router
};
