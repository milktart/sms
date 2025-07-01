const express = require("express");
const path = require("path");
const { Sequelize, DataTypes, Op } = require("sequelize");
const bodyParser = require("body-parser");
const Telnyx = require("telnyx")(process.env.TELNYX_API_KEY);
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const schema = require("./schema");

const JWT_SECRET = process.env.JWT_TOKEN;
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.static("public"));

let Admin, Messages, Profiles, Threads, Permissions;

const sequelize = new Sequelize("database", process.env.DB_USER, process.env.DB_PASS, {
  host: "0.0.0.0",
  dialect: "sqlite",
  pool: { max: 5, min: 0, idle: 10000 },
  storage: ".data/database.sqlite",
});

sequelize.authenticate()
  .then(() => {
    console.log("Database connected.");
    //build(); //{ force: true }
    init();
  })
  .catch((err) => console.error("DB connection failed:", err));

async function init() {
  Admin = sequelize.define("admins", schema.Admin);
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
}

async function build(reset) {
  const hashedPassword = await bcrypt.hash(process.env.def_admin, 10);
  await Admin.sync(reset);
  await Admin.create({ name: "Julian", username: "julian", password: hashedPassword, active: 1 });

  await Profiles.sync(reset);
  const { data: numbers } = await Telnyx.phoneNumbers.list();

  for (const num of numbers) {
    if (num.messaging_profile_id) {
      await Profiles.create({
        e164: num.phone_number,
        display: `+1-${num.phone_number.slice(2, 5)}-${num.phone_number.slice(5)}`,
        id: num.messaging_profile_id,
      });
    }
  }

  await Promise.all([
    Messages.sync(reset),
    Threads.sync(reset),
    Permissions.sync(reset),
  ]);
}

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get("/", (req, res) => res.render("login"));

app.post("/auth", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("Username and password are required");

  const user = await Admin.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).send("Invalid username or password");
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

app.post("/register", authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("Username and password are required");

  try {
    await Admin.create({ username, password: await bcrypt.hash(password, 10) });
    res.status(201).send("User registered");
  } catch {
    res.status(400).send("Username already exists");
  }
});

//app.get("/dashboard", (req, res) => res.render("index", { threadId: "NULL" }));
app.get("/dashboard", async (req, res) => {
  res.render("index", { threadId: "NULL" });
});

app.get("/get-nums", authenticateToken, async (req, res) => {
  const numbers = await Profiles.findAll({ where: { active: true } });
  res.json({ numbers });
});

app.post("/send-sms", authenticateToken, async (req, res) => {
  const { sender, recipient, content } = req.body;

  try {
    const message = await Telnyx.messages.create({ from: sender, to: recipient, text: content });
    await Messages.create({ sender, recipient, content });
    res.status(200).send({ success: true, message: "SMS sent", data: message });
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to send SMS", error: error.message });
  }
});

const forwardSMS = (from, to, text) => {
  Telnyx.messages.create({ 
    from: to, 
    to: from, 
    text, 
    use_profile_webhooks: false 
  });
};

app.post("/webhook/sms", async (req, res) => {
  const { from, to, text, messaging_profile_id, direction } = req.body.data.payload;
  const recipients = [...to.map(n => n.phone_number), from.phone_number].sort();

  if (direction === "inbound") {
    if (
      (from.phone_number === "+12128449988" || from.phone_number === "+16179100010") &&
      text.startsWith("[+") && text[14] === ':'
    ) {
      forwardSMS(text.slice(1, 13), to[0].phone_number, text.slice(16));
    } else {
      forwardSMS("+16179100010", to[0].phone_number, `[${from.phone_number}]: ${text}`);
    }
  }

  try {
    const profile = await Profiles.findOne({ where: { id: messaging_profile_id } });
    const profileNumber = profile?.e164;
    if (profileNumber) {
      const index = recipients.indexOf(profileNumber);
      if (index > -1) recipients.splice(index, 1);
    }

    if (["delivered", "webhook_delivered"].includes(to[0].status)) {
      const [thread] = await Threads.findOrCreate({
        where: {
          profileId: messaging_profile_id,
          recipients: JSON.stringify(recipients),
        },
      });

      await Messages.create({
        threadId: thread.id,
        sender: from.phone_number,
        profileId: messaging_profile_id,
        recipients: JSON.stringify(recipients),
        content: text,
      });

      res.status(200).send({ success: true, message: "SMS received" });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: "Error processing SMS", error: error.message });
  }
});

app.post("/threads", authenticateToken, async (req, res) => {
  const filter = req.body.filter || "";
  try {
    const messages = await Messages.findAll({
      order: sequelize.literal("max(messages.createdAt) DESC"),
      group: "threadId",
      where: { recipients: { [Op.substring]: filter } },
      include: [Threads, Profiles],
    });
    res.json(messages);
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch threads", error: error.message });
  }
});

app.get("/messages/:threadId", (req, res) => {
  res.render("index", { threadId: req.params.threadId });
});

app.post("/messages/:threadId", authenticateToken, async (req, res) => {
  try {
    const messages = await Messages.findAll({
      where: { threadId: req.params.threadId },
      order: [["createdAt", "ASC"]],
      include: [Threads, Profiles],
    });
    res.json(messages);
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch messages", error: error.message });
  }
});

app.get("/raw/messages", authenticateToken, async (req, res) => {
  try {
    const messages = await Messages.findAll({ order: [["createdAt", "DESC"]] });
    res.json(messages);
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch messages", error: error.message });
  }
});

app.get("/raw/threads", authenticateToken, async (req, res) => {
  try {
    const threads = await Threads.findAll({ include: [Profiles] });
    res.json(threads);
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch threads", error: error.message });
  }
});

app.get("/raw/threads/:threadId", authenticateToken, async (req, res) => {
  try {
    const thread = await Threads.findAll({ where: { id: req.params.threadId }, include: [Profiles] });
    res.json(thread);
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to fetch thread", error: error.message });
  }
});

app.get("/sanitize/:number", (req, res) => {
  try {
    const sanitized = req.params.number.split(";").pop();
    res.json(sanitized);
  } catch (error) {
    res.status(500).send({ success: false, message: "Sanitization failed", error: error.message });
  }
});

app.get("/grid", (req, res) => res.render("grid"));

app.all("/logs", (req, res) => {
  console.log(req);
  res.status(200).send({ success: true, message: "Log received", data: req.params });
});

app.get("/dev", async (req, res) => {
  try {
    const numbers = await Telnyx.phoneNumbers.list();
    res.json({ numbers });
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to list numbers", error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});