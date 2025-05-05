const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { feedback } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const {authUser, authAdmin} = require("../middlewares/auth");

router.get("/", (req, res) => {
  pool
    .query("SELECT f.*, u.full_name, u.email FROM feedback f left join app_user u on f.app_user_id = u.app_user_id")
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});

router.post("/", authUser, async (req, res) => {
  try {
    validate(feedback, req.body);
    const response = await pool.query(
        "INSERT INTO feedback (message, is_resolved, app_user_id) VALUES ($1, $2, $3) RETURNING *",
        [
          req.body.message,
          false,
          req.user.app_user_id,
        ]
      );
      res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
