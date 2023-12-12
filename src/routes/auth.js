const router = require("express").Router();
const pool = require("../db/db");
const { auth } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const bcrypt = require("bcrypt");

router.post("/", async (req, res) => {
  try {
    validate(auth, req.body);

    const user = await pool.query("SELECT * from users WHERE email = $1", [
      req.body.email,
    ]);
    if (user.rowCount === 0)
      return res.send({ message: "This email doesnt exist sign up first" });
    const result = await bcrypt.compare(
      req.body.password,
      user.rows[0].password
    );
    if (!result) return res.send({ message: "Bad password" });
    const token = signJWT({ _id: user.rows.id });
    res
      .status(200)
      .setHeader("x-auth-token", token)
      .send({ message: "success" });
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});
module.exports = router;
