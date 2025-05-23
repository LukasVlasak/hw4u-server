const express = require("express");
const fs = require("node:fs");
const helmet = require("helmet");
const app = express();
const { router: tasks} = require("./src/routes/tasks");
const { router: users} = require("./src/routes/users");
const { router: documents} = require("./src/routes/documents");
const { router: auth} = require("./src/routes/auth");
const { router: reviews} = require("./src/routes/reviews");
const { router: answers} = require("./src/routes/answers");
const { router: feedback } = require("./src/routes/feedback");
const { router: payment} = require("./src/routes/payment");
const { router: category} = require("./src/routes/category");
const { router: product } = require("./src/routes/product");
const { sendAndLog } = require("./src/utils/sendMailAndLog");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

/*
build-in middleware - express.json() - parse req.body to json object
                    - exporess.urlencoded({extended: true}) - parse params send by form to json object
                    - express.static('public') - serve static content (able to reach http://localhost:300/img.png) - vse co dam do public je pristupne - nemusim vytr
                    varet enpoint
helmet - libary for securing requests
*/
app.use(express.json());
app.use(
  cors({
    optionsSuccessStatus: 200,
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    withCredentials: true,
  })
);
app.use(cookieParser(process.env.COOKIE_KEY));
app.use((error, req, res, next) => {
  // const apiKey = req.headers['api-key'];
  // if (!apiKey || apiKey !== 'lukasjeprosteborec') {
  //     res.send("pico");
  // }else {
  //     next();
  // }
  if (error) {
    sendAndLog(error);
    res.status(500).send({ message: error.message });
  } else {
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
  }
});
app.use("/api/answers", answers);
app.use("/api/auth", auth);
app.use("/api/users", users);
app.use("/api/tasks", tasks);
app.use("/api/reviews", reviews);
app.use("/api/category", category);
app.use("/api/product", product);
app.use("/api/payment", payment);
app.use("/api/documents", documents);
app.use("/api/feedback", feedback);

app.get("/api/data", (req, res) => {
  if (req.query.parameter) {
    fs.readFile("AnimatedTexts/" + req.query.parameter, (err, data) => {
      if (err) {
        sendAndLog(err);
        return res.status(500).send({ message: err.message });
      }
      res.status(200).send(data);
    });
  } else {
    res.status(500).send({ message: "Parameter not provided" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log("listening on port ", PORT));