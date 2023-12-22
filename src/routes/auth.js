const router = require("express").Router();
const pool = require("../db/db");
const { auth } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const bcrypt = require("bcrypt");
const authF = require("../middlewares/auth");

router.post("/", async (req, res) => {
  try {
    validate(auth, req.body);

    const user = await pool.query("SELECT * from users WHERE email = $1", [
      req.body.email,
    ]);
    if (user.rowCount === 0)
      return res.status(400).send({ message: "This email doesnt exist sign up first", type: 'email', errorCode: 'emailDoesNotExists' });
    const result = await bcrypt.compare(
      req.body.password,
      user.rows[0].password
    );
    if (!result) return res.status(400).send({ message: "Bad password", type: "password", errorCode: "badPassword" });
    const token = signJWT({ _id: user.rows[0].id });
    res.set("Access-Control-Expose-Headers", "x-auth-token");
    res
      .status(200)
      .setHeader("x-auth-token", token)
      .send({ message: "success" });
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/", authF, (req, res) => {
  pool
    .query("SELECT * from users WHERE id = $1", [req.user._id])
    .then((response) => {
      if (response.rowCount === 0) return res.status(400).send({message: "This user no longer exists"});
      res.status(200).send(response.rows);
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
});

module.exports = router;
