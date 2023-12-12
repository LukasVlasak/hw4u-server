const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { user } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const auth = require("../middlewares/auth");
const bcrypt = require("bcrypt");

router.get("/", auth, (req, res) => {
  pool
    .query(getAllQuery("users"))
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});

router.get("/me", auth, (req, res) => {
  pool
    .query("SELECT * from users WHERE id = $1", [req.user._id])
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
});

router.post("/", async (req, res) => {
  try {
    validate(user, req.body);
    const userParams = req.body;

    const email = await pool.query("SELECT * from users WHERE email = $1", [userParams.email]);
    if (email.rowCount > 0) return res.send({message: 'sorry user with that email already exist'});
    const hashedPassword = await bcrypt.hash(userParams.password, 10);
    const response = await pool.query(
      "INSERT INTO public.users (name, email, password, country) VALUES ($1, $2, $3, $4) RETURNING id, name, email, country, created_date",
      [userParams.name, userParams.email, hashedPassword, userParams.country]
    );
    const token = signJWT({_id: response.rows.id});
    res.status(200).setHeader("x-auth-token", token).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});
module.exports = router;
