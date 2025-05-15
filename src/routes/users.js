const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { user } = require("../services/validation");
const { sendAndLog, validate, signJWT } = require("../utils/sendMailAndLog");
const {authUser, authAdmin} = require("../middlewares/auth");
const bcrypt = require("bcrypt");
const { deleteAnswer } = require("./answers");
const { deleteTask } = require("./tasks");
const { deleteReview } = require("./reviews");

const deleteUser = async (userId) => {

  const feedback = await pool.query(
    "SELECT feedback_id from feedback WHERE app_user_id = $1",
    [userId]
  );

  const { deleteFeedback } = require("./feedback");

  if (feedback.rowCount > 0) {
    for (let i = 0; i < feedback.rowCount; i++) {
      await deleteFeedback(feedback.rows[i].feedback_id);
    }
  }
  
    const answers = await pool.query(
      "SELECT answer_id from answer WHERE app_user_id = $1",
      [userId]
    );
  
    if (answers.rowCount > 0) {
      for (let i = 0; i < answers.rowCount; i++) {
        await deleteAnswer(answers.rows[i].answer_id);
      }
    }
  
    const tasks = await pool.query(
      "SELECT task_id from task WHERE app_user_id = $1",
      [userId]
    );
    if (tasks.rowCount > 0) {
      for (let i = 0; i < tasks.rowCount; i++) {
        await deleteTask(tasks.rows[i].task_id);
      }
    }
  
    const reviews = await pool.query(
      "SELECT review_id from review WHERE for_app_user_id = $1 or app_user_id = $1",
      [userId]
    );
    if (reviews.rowCount > 0) {
      for (let i = 0; i < reviews.rowCount; i++) {
        await deleteReview(reviews.rows[i].review_id);
      }
    }

        const payments = await pool.query(
      "SELECT payment_id from payment WHERE app_user_id = $1",
      [userId]
    );
    if (payments.rowCount > 0) {
      for (let i = 0; i < payments.rowCount; i++) {
        await pool.query("DELETE FROM payment WHERE payment_id = $1", [payments.rows[i].payment_id]);
      }
    }
    

  const response = await pool.query(
    "DELETE FROM app_user WHERE app_user_id = $1 RETURNING app_user_id",
    [userId]
  );
  if (response.rowCount === 0) {
    return false;
  }
  return true;
};

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

    // const email = await pool.query("SELECT * from app_user WHERE email = $1", [userParams.email]);
    // if (email.rowCount > 0) return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
    // if (userParams.username) {
    //   const username = await pool.query("SELECT * from app_user WHERE username = $1", [userParams.username]);
    //   if (username.rowCount > 0) return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
    // }
    const hashedPassword = await bcrypt.hash(userParams.password, 10);
    
    pool.query("CALL register($1, $2, $3, $4)", [userParams.full_name, userParams.email, hashedPassword, userParams.username !== "" ? userParams.username : null]).then(async () => {
      const response = await pool.query("SELECT * from app_user WHERE email = $1", [userParams.email]);
      
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
    }).catch((err) => {
      if (err.code === "P0001") {
        return res.status(400).send({message: 'sorry user with that email already exist', errorCode: 'emailAlreadyExists', type: 'email'});
      } else if (err.code === "P0002") {
        return res.status(400).send({message: 'sorry user with that username already exist', errorCode: 'usernameAlreadyExists', type: 'username'});
      }
      
      return res.status(500).send({message: err.message });
    });
    // const response = await pool.query(
    //   "INSERT INTO app_user (full_name, email, password, username) VALUES ($1, $2, $3, $4) RETURNING app_user_id, full_name, email, created_date, username",
    //   [userParams.full_name, userParams.email, hashedPassword, userParams.username]
    // );
    
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.put("/:id", authAdmin, async (req, res) => {  
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }
  try {
    await pool.query("UPDATE app_user SET is_admin = $1, full_name = $2 WHERE app_user_id = $3", [req.body.is_admin, req.body.full_name, req.params.id]);
    res.status(200).send({message: "User updated"});
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.delete("/:id", authAdmin, async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }
  try {
    const status = await deleteUser(req.params.id);
    if (status) {
      res.status(200).send({message: "User deleted"});
    } else {
      res.status(500).send({message: "User not found"});
    }
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
})

router.get("/top-users", async (req, res) => {
  
  try {
    const response = await pool.query("select * from get_top_earning_users($1)", [5]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id", (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }  

  pool.query("SELECT * FROM app_user_with_average_rating WHERE app_user_id = $1", [req.params.id]).then((response) => {
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
module.exports = {
  router
};
