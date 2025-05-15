const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const auth = require("../middlewares/auth");
const { task } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const { deleteAnswer } = require("./answers");

const deleteTask = async (taskId) => {

  const answers = await pool.query(
    "SELECT answer_id from answer WHERE task_id = $1",
    [taskId]
  );

  if (answers.rowCount > 0) {
    for (let i = 0; i < answers.rowCount; i++) {
      await deleteAnswer(answers.rows[i].answer_id);
    }
  }
  

  const response = await pool.query(
    "DELETE FROM task WHERE task_id = $1 RETURNING task_id",
    [taskId]
  );
  if (response.rowCount === 0) {
    return false;
  }

  return true;
}
// router.get("/with-users", async (req, res) => {
//   try {
//     const response = await pool.query(`
//     SELECT t.*, (
//       SELECT json_agg(json_build_object('name', u.name, 'email', u.email))
//       FROM users u
//       WHERE u.id = t.user_id
//     ) AS for_user
//     FROM task t
//   `);
  
//     res.status(200).send(response.rows);
//   } catch (err) {
//     sendAndLog(err);
//     res.status(500).send({ message: err.message });
//   }
// });

// router.get("/", (req, res) => {
//   const { _start, _limit, orderBy, where } = req.query;

//   let query = getAllQuery("task");
//   if (where) {
//     query += " " + where;
//   }
//   if (orderBy) {
//     query += " " + orderBy;
//   }
//   if (_limit) {
//     query += " LIMIT " + _limit;
//   }
//   if (_start) {
//     query += " OFFSET " + _start;
//   }
//   //console.log(query);
//   pool
//     .query(
//       _start && _limit
//         ? getAllQuery("task") + ` OFFSET ${_start} LIMIT ${_limit}`
//         : getAllQuery("task")
//     )
//     .then((response) => {
//       res.status(200).send(response.rows);
//     })
//     .catch((error) => {
//       sendAndLog(error);
//       res.status(500).send({ message: error.message });
//     });
// });

router.post("/", auth.authUser, async (req, res) => {
  try {
    if (req.body.due_date === "") {
      req.body.due_date = null;
    }
    validate(task, req.body);
    const response = await pool.query(
      "INSERT INTO public.task (title, price, description, status, due_date, app_user_id, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        req.body.title,
        req.body.price,
        req.body.description,
        "created",
        req.body.due_date ? new Date(req.body.due_date) : null,
        req.user.app_user_id,
        req.body.category_id,
      ]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.put("/:id", auth.authUser, async (req, res) => {
  try {
    if (req.body.due_date === "") {
      req.body.due_date = null;
    }
    validate(task, req.body);

    const taskRes = (await pool.query("SELECT * from task where task_id = $1", [req.params.id])).rows;
    if (taskRes.length <= 0) {
      return res.status(500).send({message: "This task does not exists"});
    }
  
    if (taskRes[0].app_user_id !== req.user.app_user_id && req.user.is_admin !== true) {
      return res.status(500).send({message: "No authorized"})
    }

    if (req.body.due_date === "") {
      req.body.due_date = null;
    }

    await pool.query("UPDATE task SET title = $1, price = $2, description = $3, category_id = $4, due_date = $5 WHERE task_id = $6", [
      req.body.title, req.body.price, req.body.description, req.body.category_id, req.body.due_date ? new Date(req.body.due_date) : null, req.params.id
    ])
    res.status(200).send(req.body);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
})

// musi byt pred get :id protoze to jinak chyta to get :id
router.get("/by-user/:id", async (req, res) => {
  try {
    const response = await pool.query(`
       SELECT *
        FROM task_by_user_view
        WHERE app_user_id = $1;

  `, [req.params.id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }

});

router.delete("/:id", auth.authUser, async (req, res) => {
  try {
    if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }
  const task = (await pool.query("SELECT * from task where task_id = $1", [req.params.id])).rows;
  if (task.length <= 0) {
    return res.status(500).send({message: "This task does not exists"});
  }

  if (task[0].app_user_id !== req.user.app_user_id && req.user.is_admin !== true) {
    return res.status(500).send({message: "No authorized"})
  }
  
  await deleteTask(req.params.id);
  res.status(200).send({message: "Success"});
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
  
});

router.get("/:id" , async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query(`
        SELECT 
          t.*,
          u.email AS app_user_email,
          (
            SELECT json_agg(json_build_object(
              'category_id', c.category_id,
              'name', c.name,
              'parent_category_id', c.parent_category_id
            ))
            FROM (
              WITH RECURSIVE categories AS (
                SELECT category_id, name, parent_category_id
                FROM category
                WHERE category_id = t.category_id
                UNION ALL
                SELECT c.category_id, c.name, c.parent_category_id
                FROM category c
                INNER JOIN categories pc ON c.category_id = pc.parent_category_id
              )
              SELECT * FROM categories
            ) c
          ) AS category_hierarchy,

          (
            SELECT json_agg(json_build_object(
              'answer_id', a.answer_id,
              'preview', a.preview,
              'title', a.title,
              'app_user_email_answer', ua.email,
              'app_user_id', a.app_user_id,
              'documents', (
                SELECT json_agg(json_build_object(
                  'document_id', d.document_id,
                  'filename', d.filename,
                  'is_preview', d.is_preview
                ))
                FROM document d
                WHERE d.answer_id = a.answer_id
              )
            ))
            FROM answer a
            LEFT JOIN app_user ua ON a.app_user_id = ua.app_user_id
            WHERE a.task_id = t.task_id
          ) AS answers


        FROM task t
        LEFT JOIN app_user u ON t.app_user_id = u.app_user_id
        WHERE t.task_id = $1
        GROUP BY t.task_id, u.email
        ORDER BY t.created_date DESC;

    `, [req.params.id]).then((response) => {
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

router.get("/", async (req, res) => {
  try {
    const response = await pool.query(`
      SELECT 
        t.*,
        u.email as app_user_email,
        c.name as category_name
      FROM task t
      left join category c on t.category_id = c.category_id
      LEFT JOIN app_user u ON t.app_user_id = u.app_user_id
      where t.status != 'completed'
      ORDER BY t.created_date DESC;
    `);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
})

module.exports = {
  deleteTask,
  router
};
