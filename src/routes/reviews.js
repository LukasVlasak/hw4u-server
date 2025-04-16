const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { review } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const auth = require("../middlewares/auth");

router.get("/", (req, res) => {
  pool
    .query(getAllQuery("reviews"))
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});

router.post("/", auth, async (req, res) => {
  try {
    validate(review, req.body);
    const response = await pool.query(
        "INSERT INTO public.reviews (text, user_id, user_name, stars) VALUES ($1, $2, $3, $4) RETURNING id, text, user_name, created_date",
        [
          req.body.text,
          req.body.user_id,
          req.body.user_name,
          req.body.stars
        ]
      );
      res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
