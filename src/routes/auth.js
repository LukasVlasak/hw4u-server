const router = require("express").Router();
const pool = require("../db/db");
const { auth } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const bcrypt = require("bcrypt");
const {authUser} = require("../middlewares/auth");
const { signedCookie } = require("cookie-parser");

router.post("/", async (req, res) => {
  try {
    validate(auth, req.body);

    const user = await pool.query("SELECT * from app_user WHERE email = $1", [
      req.body.email,
    ]);
    if (user.rowCount === 0)
      return res.status(400).send({ message: "This email doesnt exist sign up first", type: 'email', errorCode: 'emailDoesNotExists' });
    const result = await bcrypt.compare(
      req.body.password,
      user.rows[0].password
    );
    if (!result) return res.status(400).send({ message: "Bad password", type: "password", errorCode: "badPassword" });


    const token = signJWT({
      id: user.rows[0].app_user_id,
    });

    res.cookie("x-auth-token", token, {
      signed: true,
      expires: req.body.rememberMe
        ? new Date(Date.now() + 2592000000)
        : undefined,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    }); // max-age: 30 dni
    delete user.rows[0].password;
    res
      .status(200)
      .send(user.rows[0]);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/", authUser, (req, res) => {  
  pool
    .query("SELECT * from app_user WHERE app_user_id = $1", [req.user.app_user_id])
    .then((response) => {
      if (response.rowCount === 0) return res.status(400).send({message: "This user no longer exists"});

      res.status(200).send(response.rows);
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
});

router.post("/logout", authUser, (req, res) => {
  if (req.signedCookies["x-auth-token"] != null) {
    res.clearCookie("x-auth-token");
    res.status(200).send({message: "Success logout"});
  }
})

module.exports = router;
