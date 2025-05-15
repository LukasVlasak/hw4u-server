const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { feedback } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const {authUser, authAdmin} = require("../middlewares/auth");
const multiUpload = require("../services/multer");

const deleteFeedback = async (feedbackId) => {
  const response = await pool.query(
    "DELETE FROM feedback WHERE feedback_id = $1 RETURNING feedback_id",
    [feedbackId]
  );
  if (response.rowCount === 0) {
    return false;
  }
  return true;
}

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

router.get("/unresolved", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "SELECT * from get_users_with_unresolved_feedback_in_category()"
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "SELECT f.*, u.full_name, u.email FROM feedback f left join app_user u on f.app_user_id = u.app_user_id WHERE f.feedback_id = $1",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Feedback not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.put("/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "UPDATE feedback SET is_resolved = true WHERE feedback_id = $1 RETURNING *",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Feedback not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
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

module.exports = {
  router,
  deleteFeedback
};
