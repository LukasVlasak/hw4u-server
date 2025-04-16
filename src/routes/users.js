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

router.put("/", auth, async (req, res) => {
  try {
    const userParams = req.body;
    const email = await pool.query("SELECT * from users WHERE email = $1 AND id != $2", [userParams.email, req.user._id]);
    if (email.rowCount > 0) return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
    const username = await pool.query("SELECT * from users WHERE username = $1 AND id != $2", [userParams.username, req.user._id]);
    if (username.rowCount > 0) return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
  
    let response;
    if (userParams.password && userParams.password !== "") {
      const hashedPassword = await bcrypt.hash(userParams.password, 10);
      response = await pool.query(
        "UPDATE public.users SET name = $1, email = $2, password = $3, country = $4, username = $5 WHERE id = $6 RETURNING id, name, email, country, created_date, username",
        [userParams.name, userParams.email, hashedPassword, userParams.country, userParams.username, req.user._id]
      );
    } else {
      response = await pool.query(
        "UPDATE public.users SET name = $1, email = $2, country = $3, username = $4 WHERE id = $5 RETURNING id, name, email, country, created_date, username",
        [userParams.name, userParams.email, userParams.country, userParams.username, req.user._id]
      );
    }
    
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({message: err.message})
  }
})

router.post("/", async (req, res) => {
  try {
    validate(user, req.body);
    const userParams = req.body;

    const email = await pool.query("SELECT * from users WHERE email = $1", [userParams.email]);
    if (email.rowCount > 0) return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
    const username = await pool.query("SELECT * from users WHERE username = $1", [userParams.username]);
    if (username.rowCount > 0) return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
    const hashedPassword = await bcrypt.hash(userParams.password, 10);
    const response = await pool.query(
      "INSERT INTO public.users (name, email, password, country, username) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, country, created_date, username",
      [userParams.name, userParams.email, hashedPassword, userParams.country, userParams.username]
    );
    const token = signJWT({_id: response.rows[0].id});
    res.set("Access-Control-Expose-Headers", "x-auth-token");
    res.status(200).setHeader("x-auth-token", token).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id", auth, (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query("SELECT * from users WHERE id = $1", [req.params.id]).then((response) => {
    const user = response.rows;
    if (user.length > 0) {
      res.status(200).send(user);
    }else {
      res.status(500).send({message: "This user does not exists"});
    }
  }).catch((err) => {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  });
});
module.exports = router;
