// server.js
// where your node app starts

// init project
const express = require("express");
const path = require("path");
const { Sequelize, DataTypes, Op } = require("sequelize");
const bodyParser = require("body-parser");
const Telnyx = require("telnyx")(process.env.TELNYX_API_KEY);
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const schema = require("./schema");

const JWT_SECRET = process.env.JWT_TOKEN;

// Set up application parameters
const app = express();
//app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.static("public"));

let Admin, Messages, Profiles, Threads, Permissions;

// setup a new database using database credentials set in .env
const sequelize = new Sequelize(
  "database",
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: "0.0.0.0",
    dialect: "sqlite",
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    storage: ".data/database.sqlite",
  }
);

// authenticate with the database
sequelize
  .authenticate()
  .then(function (err) {
    console.log("Connection has been established successfully.");

    const reset = { force: true };
    init(reset);
  
  })
  .catch(function (err) {
    console.log("Unable to connect to the database: ", err);
  });

// populate table with default users
async function init(reset) {
  Admin = sequelize.define("admins", schema.Admin);
  const hashedPassword = await bcrypt.hash(process.env.def_admin, 10);
  Admin.sync(reset).then(function () {
    Admin.create({
      name: "Julian",
      username: "julian",
      password: hashedPassword,
      active: 1,
    });
  });

  Profiles = sequelize.define("profiles", schema.Profiles);
  Messages = sequelize.define("messages", schema.Messages);
  Threads = sequelize.define("threads", schema.Threads);
  Permissions = sequelize.define("permissions", schema.Permissions);

  Threads.hasMany(Messages, { foreignKey: "threadId" });
  Messages.belongsTo(Threads);

  Profiles.hasMany(Threads, { foreignKey: "profileId" });
  Threads.belongsTo(Profiles);

  Profiles.hasMany(Messages, { foreignKey: "profileId" });
  Messages.belongsTo(Profiles);

  Profiles.sync({ force: true }).then(function () {
    Profiles.create({
      e164: "+15123330333",
      display: "+1-512-3330333",
      id: "400189bb-0ea1-4245-84ef-a8a6c7baed89",
    });
    Profiles.create({
      e164: "+15122225151",
      display: "+1-512-2225151",
      id: "40018a24-2fd8-42d1-8456-b29b0d8aea1c",
    });
    Profiles.create({
      e164: "+15126775000",
      display: "+1-512-6775000",
      id: "40018fe8-0baa-4cbc-aee7-59a5cf249335",
    });
    Profiles.create({
      e164: "+13109101500",
      display: "+1-310-9101500",
      id: "40018fe8-0c26-4c17-9076-94956c27f21d",
    });
  });
  
  Messages.sync(reset);
  Threads.sync(reset);
  Permissions.sync(reset);
}

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/auth", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  const user = await Admin.findOne({ username });
  if (!user) {
    return res.status(400).send("Invalid username or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).send("Invalid username or password");
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// Outbound SMS route
function listNumbers() {
  console.log("listing phone numbers...");
  
  // listing phone numbers
  const phoneNumbers = Telnyx.phoneNumbers.list({});
  
  console.log(phoneNumbers);
}

listNumbers();
