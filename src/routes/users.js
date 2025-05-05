const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { user } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const {authUser} = require("../middlewares/auth");
const bcrypt = require("bcrypt");

router.get("/", (req, res) => {
  pool
    .query(getAllQuery("app_user"))
    .then((response) => {
      for (let i = 0; i < response.rows.length; i++) {
        delete response.rows[i].password;
      }
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});

router.put("/", authUser, async (req, res) => {
  try {
    const userParams = req.body;
    console.log(userParams);
    
    const email = await pool.query("SELECT * from app_user WHERE email = $1 AND app_user_id != $2", [userParams.email, req.user.app_user_id]);
    if (email.rowCount > 0) return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
    const username = await pool.query("SELECT * from app_user WHERE username = $1 AND app_user_id != $2 and username != ''", [userParams.username, req.user.app_user_id]);
    if (username.rowCount > 0) return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
  
    let response;
    if (userParams.password && userParams.password !== "") {
      const hashedPassword = await bcrypt.hash(userParams.password, 10);
      response = await pool.query(
        "UPDATE app_user SET full_name = $1, email = $2, password = $3, username = $4 WHERE app_user_id = $5 RETURNING app_user_id, full_name, email, created_date, username",
        [userParams.full_name, userParams.email, hashedPassword, userParams.username, req.user.app_user_id]
      );
    } else {
      console.log(req.user.app_user_id);
      
      response = await pool.query(
        "UPDATE app_user SET full_name = $1, email = $2, username = $3 WHERE app_user_id = $4 RETURNING app_user_id, full_name, email, created_date, username",
        [userParams.full_name, userParams.email, userParams.username, req.user.app_user_id]
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

    const email = await pool.query("SELECT * from app_user WHERE email = $1", [userParams.email]);
    if (email.rowCount > 0) return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
    if (userParams.username) {
      const username = await pool.query("SELECT * from app_user WHERE username = $1", [userParams.username]);
      if (username.rowCount > 0) return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
    }
    const hashedPassword = await bcrypt.hash(userParams.password, 10);
    const response = await pool.query(
      "INSERT INTO app_user (full_name, email, password, username) VALUES ($1, $2, $3, $4) RETURNING app_user_id, full_name, email, created_date, username",
      [userParams.full_name, userParams.email, hashedPassword, userParams.username]
    );
    const token = signJWT({ id: response.rows[0].app_user_id });
    res.cookie("x-auth-token", token, {
      signed: true,
      maxAge: 2592000000,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    }); // max-age: 30 dni
    delete response.rows[0].password;
    res.status(200).send(response.rows[0]);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id", (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query("SELECT u.*, AVG(r.stars) as average_rating from app_user u left join review r on r.for_app_user_id = u.app_user_id WHERE u.app_user_id = $1 group by u.app_user_id", [req.params.id]).then((response) => {
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
