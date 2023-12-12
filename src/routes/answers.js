const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { answer } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");

router.get("/", (req, res) => {
  pool
    .query(getAllQuery("answers"))
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});

router.post("/", async (req, res) => {
  try {
    validate(answer, req.body);
    const response = await pool.query(
      "INSERT INTO public.answers (task_id, user_id, title, description) VALUES ($1, $2, $3, $4) RETURNING id, created_date, task_id, user_id, title, description",
      [req.body.task_id, req.body.user_id, req.body.title, req.body.description]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});
module.exports = router;
