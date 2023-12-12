const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { generalQuestion } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");

router.get("/", (req, res) => {
  pool
    .query(getAllQuery("general"))
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
    validate(generalQuestion, req.body);
    const response = await pool.query(
      "INSERT INTO public.general (user_id, title, description, category) VALUES ($1, $2, $3, $4) RETURNING id, user_id, title, description, category, created_date",
      [
        req.body.user_id,
        req.body.title,
        req.body.description,
        req.body.category,
      ]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});
module.exports = router;
