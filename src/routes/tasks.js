const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const auth = require("../middlewares/auth");
const { task } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");

router.get("/", (req, res) => {
  const { _start, _limit, orderBy, where } = req.query;

  let query = getAllQuery("tasks");
  if (where) {
    query += " " + where;
  }
  if (orderBy) {
    query += " " + orderBy;
  }
  if (_limit) {
    query += " LIMIT " + _limit;
  }
  if (_start) {
    query += " OFFSET " + _start;
  }
  //console.log(query);
  pool
    .query(
      _start && _limit
        ? getAllQuery("tasks") + ` OFFSET ${_start} LIMIT ${_limit}`
        : getAllQuery("tasks")
    )
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
    validate(task, req.body);
    const response = await pool.query(
      "INSERT INTO public.tasks (title, willing_to_pay, category, due_date, user_id, description, for_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title, willing_to_pay, category, due_date, user_id, description, for_user_id, created_date",
      [
        req.body.title,
        req.body.willing_to_pay,
        req.body.category,
        req.body.due_date,
        req.body.user_id,
        req.body.description,
        req.body.for_user_id,
      ]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id" , async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query("SELECT * from tasks WHERE id = $1", [req.params.id]).then((response) => {
    const task = response.rows;
    if (task.length > 0) {
      res.status(200).send(task);
    }else {
      res.status(500).send({message: "This task does not exists"});
    }
  }).catch((err) => {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  });
});

module.exports = router;
