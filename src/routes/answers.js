const router = require("express").Router();
const pool = require("../db/db");
const path = require("path");
const getAllQuery = require("../db/queries");
const auth = require("../middlewares/auth");
const checkPermissions = require("../middlewares/permissions");
const { answer } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const upload = require("../services/multer");

router.get("/by-user", auth, async (req, res) => {
  try {
    const response = await pool.query(`
    SELECT a.*, (
      SELECT json_agg(json_build_object('name', u.name, 'email', u.email))
      FROM users u
      WHERE u.id = a.user_id
    ) AS for_user, (
      SELECT json_agg(json_build_object('filename', d.filename))
      FROM documents d
      WHERE d.answer_id = a.id
    ) AS documents, (
      SELECT json_build_object('title', t.title, 'id', t.id)
      FROM tasks t
      WHERE t.id = a.task_id
    ) AS tasks
    FROM answers a
    where user_id = $1
  `, [req.user._id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }

});

router.delete("/:id", auth, async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }
  const answer = (await pool.query("SELECT * from answers where id = $1", [req.params.id])).rows;
  if (answer.length <= 0) {
    return res.status(500).send({message: "This answer does not exists"});
  }

  if (answer[0].user_id !== req.user._id) {
    return res.status(500).send({message: "No authorized"})
  }
  await pool.query("DELETE from answers where id = $1", [req.params.id]);
  res.status(200).send({message: "Success"});
});

router.get("/:id" , async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query("SELECT * from answers WHERE id = $1", [req.params.id]).then((response) => {
    const answer = response.rows;
    if (answer.length > 0) {
      res.status(200).send(answer);
    }else {
      res.status(500).send({message: "This answer does not exists"});
    }
  }).catch((err) => {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  });
});


router.get("/by-task/:id", auth, async (req, res) => {
  try {
    const response = await pool.query(`
    SELECT a.*, (
      SELECT json_agg(json_build_object('name', u.name, 'email', u.email))
      FROM users u
      WHERE u.id = a.user_id
    ) AS for_user, (
      SELECT json_agg(json_build_object('filename', d.filename))
      FROM documents d
      WHERE d.answer_id = a.id
    ) AS documents, (
      SELECT json_build_object('title', t.title, 'id', t.id)
      FROM tasks t
      WHERE t.id = a.task_id
    ) AS tasks
    FROM answers a
    where task_id = $1
  `, [req.params.id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }

});

router.post("/", auth, upload.array("files[]"), async (req, res) => {
  try {
    validate(answer, req.body);
    const response = await pool.query(
      "INSERT INTO public.answers (task_id, user_id, description) VALUES ($1, $2, $3) RETURNING id, created_date, task_id, user_id, description",
      [req.body.task_id, req.body.user_id, req.body.description]
    );

    req.files.forEach(file => {
      pool.query(
        "INSERT INTO public.documents (filename, answer_id) VALUES ($1, $2)",
        [file.filename, response.rows[0].id]
      );
    });
    
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
