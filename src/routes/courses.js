// const router = require("express").Router();
// const pool = require("../db/db");
// const getAllQuery = require("../db/queries");
// //const { course } = require("../services/validation");
// const { sendAndLog } = require("../utils/sendMailAndLog");

// router.get("/", (req, res) => {
//   pool
//     .query(getAllQuery("courses"))
//     .then((response) => {
//       res.status(200).send(response.rows);
//     })
//     .catch((error) => {
//       sendAndLog(error);
//       res.status(500).send({ message: error.message });
//     });
// });

// // router.post("/", async (req, res) => {
// //     try {
// //         validate(course, req.body);
// //         const response = await pool.query("INSERT INTO public.courses (title) VALUES ($1) RETURNING id, title", [req.body.title])
// //         res.status(200).send(response.rows);
// //     }catch (err) {
// //         sendAndLog(err);
// //         res.status(500).send({message: err.message});
// //     }
// // })
// // module.exports = router;
