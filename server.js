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

    const reset = false;
    init(reset);
  })
  .catch(function (err) {
    console.log("Unable to connect to the database: ", err);
  });

// populate table with default users
async function init(reset) {
  Admin = sequelize.define("admins", schema.Admin);
  const hashedPassword = await bcrypt.hash(process.env.def_admin, 10);
  Admin.sync({ force: reset }).then(function () {
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
  Messages.sync({ force: reset });
  Threads.sync({ force: reset });
  Permissions.sync({ force: reset });
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

app.post("/register", authenticateToken, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = new Admin({ username, password: hashedPassword });
    await user.save();
    res.status(201).send("User registered");
  } catch (error) {
    res.status(400).send("Username already exists");
  }
});

app.get("/dashboard", async (req, res) => {
  res.render("index", { threadId: "NULL" });
});

// Get all available numbers to send from
app.get("/get-nums", authenticateToken, async (req, res) => {
  const numbers = await Profiles.findAll({
    where: {
      active: true,
    },
  });

  //console.log("All numbers:", JSON.stringify(numbers, null, 2));
  res.json({ numbers });
});

// Outbound SMS route
app.post("/send-sms", authenticateToken, async (req, res) => {
  const { sender, recipient, content } = req.body;

  try {
    const message = await Telnyx.messages.create({
      from: sender,
      to: recipient,
      text: content,
    });

    /*await Messages.create({
      sender: sender,
      recipient: recipient,
      content: content,
    });*/

    res
      .status(200)
      .send({ success: true, message: "SMS sent successfully", data: message });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to send SMS",
      error: error.message,
    });
  }
});

// Inbound SMS webhook
app.post("/webhook/sms", async (req, res) => {
  const { from, to, text, messaging_profile_id } = req.body.data.payload;
  console.log(req.body.data.payload);
  const recipients = to.map((item) => item.phone_number);
  recipients.push(from.phone_number);
  recipients.sort();
  
  try {
    let profile = await Profiles.findAll({
      attributes: [ "e164" ],
      where: { id: messaging_profile_id },
    });
    
    if (recipients.indexOf(profile[0].e164) > -1) {
      recipients.splice(recipients.indexOf(profile[0].e164), 1);
    }

  } catch (error) { console.log(error); }


  if (to[0].status == "delivered" || to[0].status == "webhook_delivered") {
    const [thread, created] = await Threads.findOrCreate({
      where: {
        profileId: messaging_profile_id,
        recipients: JSON.stringify(recipients),
      },
    });

    try {
      await Messages.create({
        threadId: thread.id,
        sender: from.phone_number,
        profileId: messaging_profile_id,
        recipients: JSON.stringify(recipients),
        content: text,
      });

      res.status(200).send({ success: true, message: "SMS received successfully" });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to process incoming SMS",
        error: error.message,
      });
    }
  }
});

// Fetch threads
app.post("/threads", async (req, res) => {
  const filter = req.body.filter || "";

  try {
    const messages = await Messages.findAll({
      order: sequelize.literal("max(messages.createdAt) DESC"),
      group: "threadId",
      where: {
        recipients: { [Op.substring]: filter },
      },
      include: [ Threads, Profiles ],
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Fetch messages
app.get("/messages/:threadId", async (req, res) => {
  res.render("index", { threadId: req.params.threadId });
});

// Fetch messages
app.post("/messages/:threadId", async (req, res) => {
  try {
    const messages = await Messages.findAll({
      where: { threadId: req.params.threadId },
      order: [["createdAt", "ASC"]],
      include: [ Threads, Profiles ]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Fetch messages
app.get("/raw/messages", async (req, res) => {
  try {
    const messages = await Messages.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Fetch raw threads
app.get("/raw/threads", async (req, res) => {
  try {
    const messages = await Threads.findAll({
      include: [ Profiles ],
    });

    //console.log(messages);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Fetch raw threads
app.get("/raw/threads/:threadId", async (req, res) => {
  try {
    const messages = await Threads.findAll({
      where: { id: req.params.threadId },
      include: [ Profiles ],
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Sanitize number
app.get("/sanitize/:number", async (req, res) => {
  const number = req.params.number;

  try {
    //res.json(req.params);
    const sanitized = number.substring(number.indexOf(";") + 1, number.length);

    res.status(200).json(sanitized);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to sanitize number",
      error: error.message,
    });
  }
});

app.get("/grid", async (req, res) => {
  res.render("grid");
});

app.all("/logs", async (req, res) => {
  console.log(req);
  
  try {
    res.status(200).send({ success: true, message: "SMS received successfully", data: req.params });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to capture logs",
      error: error.message,
    });
  }
  
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
