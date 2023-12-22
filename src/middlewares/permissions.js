const pool = require("../db/db");
const { sendAndLog } = require("../utils/sendMailAndLog");

const checkPermissions = (type) => {
    if (type === "answer permission") {
        return async (req, res, next) => {
            try {
                const answer = await pool.query("SELECT * from answers WHERE id = $1", [req.params.id]);
                if (answer.rows.length === 0) throw new Error("This answer does not exists");
                const user = await pool.query("SELECT bought_answer from users WHERE id = $1", [req.user._id]);
                if (user.rows.length === 0) throw new Error("This user does not exists") // nemelo by se stat
                if (answer.rows[0].user_id !== req.user._id && user.rows[0].bought_answers.indexOf(parseInt(req.params.id)) === -1) {
                    return res.status(401).send({message: 'Unauthorized'}); // bcs chci dat jinej status
                }
                req.answer = answer;
                next();
            }catch(error) {             // jinak mi vsechny errory chyta tento catch blok
                sendAndLog(error);
                res.status(500).send({message: error.message});
            }
        }
    }else if (type === "subscription") {
        return async (req, res, next) => {
            try {
                const user = await pool.query("SELECT subscription from users WHERE id = $1", [req.user._id]);
                if (user.rows[0].subscription === 'none') throw new Error("Subscription needed");
                next();
            }catch(error) {
                sendAndLog(error);
                res.status(500).send({message: error.message});
            }
        }
    }else {
        return (req, res) => {
            res.status(500).send({message: 'Bad type when specifying permissions'});
        }
    }
}

module.exports = checkPermissions;