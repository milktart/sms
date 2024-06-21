require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const Telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(bodyParser.json());

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

// Define the User model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Define the Message model
const Message = sequelize.define('Message', {
  sender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).send('User registered');
  } catch (error) {
    res.status(400).send('Username already exists');
  }
});

// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(400).send('Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).send('Invalid username or password');
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Outbound SMS route
app.post('/send-sms', authenticateToken, async (req, res) => {
  const { recipient, content } = req.body;

  try {
    const message = await Telnyx.messages.create({
      from: process.env.TELNYX_PHONE_NUMBER,
      to: recipient,
      text: content
    });

    await Message.create({
      sender: process.env.TELNYX_PHONE_NUMBER,
      recipient,
      content
    });

    res.status(200).send({ success: true, message: 'SMS sent successfully', data: message });
  } catch (error) {
    res.status(500).send({ success: false, message: 'Failed to send SMS', error: error.message });
  }
});

// Inbound SMS webhook
app.post('/webhook/sms', async (req, res) => {
  const { from, to, text } = req.body.data.payload;

  try {
    await Message.create({
      sender: from,
      recipient: to,
      content: text
    });

    res.status(200).send({ success: true, message: 'SMS received successfully' });
  } catch (error) {
    res.status(500).send({ success: false, message: 'Failed to process incoming SMS', error: error.message });
  }
});

// Fetch messages
app.get('/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.findAll();
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).send({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
});

// Start the server
app.listen(PORT, async () => {
  await sequelize.sync();
  console.log(`Server is running on port ${PORT}`);
});



[
  {
    id: "44b51819-9571-4566-adfd-79edaaabe33c",
    threadId: "7dd9df5e-62c7-4e40-9560-881df2d50efe",
    profileId: "400189bb-0ea1-4245-84ef-a8a6c7baed89",
    sender: "+12128449988",
    recipients: '["+12128449988","+15123330333"]',
    content: "Testing now",
    read: false,
    createdAt: "2024-06-20T11:52:56.569Z",
    updatedAt: "2024-06-20T11:52:56.569Z",
    thread: {
      id: "7dd9df5e-62c7-4e40-9560-881df2d50efe",
      profileId: "400189bb-0ea1-4245-84ef-a8a6c7baed89",
      recipients: '["+12128449988","+15123330333"]',
      count: 1,
      createdAt: "2024-06-20T11:52:56.553Z",
      updatedAt: "2024-06-20T11:52:56.553Z",
    },
    profile: {
      id: "400189bb-0ea1-4245-84ef-a8a6c7baed89",
      e164: "+15123330333",
      display: "+1-512-3330333",
      active: true,
      createdAt: "2024-06-20T11:52:29.166Z",
      updatedAt: "2024-06-20T11:52:29.166Z",
    },
  },
]