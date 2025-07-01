const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => res.render("index"));

app.get('/base', (req, res) => {
  res.send('Hello from your simple Node.js app running in Docker!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
