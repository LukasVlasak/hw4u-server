const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const auth = require("../middlewares/auth");
const { task } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");

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

// router.post("/", auth, async (req, res) => {
//   try {
//     if (req.body.due_date === "") {
//       req.body.due_date = null;
//     }
//     validate(task, req.body);
//     const response = await pool.query(
//       "INSERT INTO public.task (title, willing_to_pay, category, due_date, user_id, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, willing_to_pay, category, due_date, user_id, description, created_date",
//       [
//         req.body.title,
//         req.body.willing_to_pay,
//         req.body.category,
//         req.body.due_date,
//         req.user.app_user_id,
//         req.body.description,
//       ]
//     );
//     res.status(200).send(response.rows);
//   } catch (err) {
//     sendAndLog(err);
//     res.status(500).send({ message: err.message });
//   }
// });

// router.put("/:id", auth, async (req, res) => {
//   try {
//     const task = (await pool.query("SELECT * from task where id = $1", [req.params.id])).rows;
//     if (task.length <= 0) {
//       return res.status(500).send({message: "This task does not exists"});
//     }
  
//     if (task[0].user_id !== req.user.app_user_id) {
//       return res.status(500).send({message: "No authorized"})
//     }
//     if (req.body.due_date === "") {
//       req.body.due_date = null;
//     }

//     await pool.query("UPDATE task SET title = $1, willing_to_pay = $2, description = $3, category = $4, due_date = $5 WHERE id = $6", [req.body.title, req.body.willing_to_pay, req.body.description, req.body.category, req.body.due_date, req.params.id])
//     res.status(200).send(req.body);
//   } catch (err) {
//     sendAndLog(err);
//     res.status(500).send({ message: err.message });
//   }
// })

// musi byt pred get :id protoze to jinak chyta to get :id
router.get("/by-user/:id", async (req, res) => {
  try {
    const response = await pool.query(`
        SELECT 
        t.*,
        json_agg(
            json_build_object(
            'category_id', c.category_id,
            'name', c.name,
            'parent_category_id', c.parent_category_id,
            'parent_category_name', pc.name
            )
        ) FILTER (WHERE c.category_id IS NOT NULL) AS categories
        FROM task t
        LEFT JOIN task_category tc ON t.task_id = tc.task_id
        LEFT JOIN category c ON tc.category_id = c.category_id
        LEFT JOIN category pc ON c.parent_category_id = pc.category_id
        WHERE t.app_user_id = $1
        GROUP BY t.task_id
        ORDER BY t.created_date DESC
  `, [req.params.id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }

});

// router.delete("/:id", auth, async (req, res) => {
//   if (isNaN(parseInt(req.params.id))) {
//     return res.status(500).send({message: "Not a number"});
//   }
//   const task = (await pool.query("SELECT * from task where id = $1", [req.params.id])).rows;
//   if (task.length <= 0) {
//     return res.status(500).send({message: "This task does not exists"});
//   }

//   if (task[0].user_id !== req.user.app_user_id) {
//     return res.status(500).send({message: "No authorized"})
//   }
//   await pool.query("DELETE from task where id = $1", [req.params.id]);
//   await pool.query("DELETE from answers where task_id = $1", [req.params.id]);
//   res.status(200).send({message: "Success"});
// });

// router.get("/:id" , async (req, res) => {
//   if (isNaN(parseInt(req.params.id))) {
//     return res.status(500).send({message: "Not a number"});
//   }

//   pool.query("SELECT * from task WHERE id = $1", [req.params.id]).then((response) => {
//     const task = response.rows;
//     if (task.length > 0) {
//       res.status(200).send(task);
//     }else {
//       res.status(500).send({message: "This task does not exists"});
//     }
//   }).catch((err) => {
//     sendAndLog(err);
//     res.status(500).send({ message: err.message });
//   });
// });

module.exports = router;
