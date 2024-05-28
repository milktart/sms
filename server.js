// server.js
// where your node app starts

// init project
const express = require('express');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// default user list
var users = [
      ["John","Hancock"],
      ["Liz","Smith"],
      ["Ahmed","Khan"]
    ];
var User;

const JWT_SECRET = 'ABC123DEF456';  // Replace with your own secret key

// Middleware
app.use(bodyParser.json());

/* Mongoose User schema
mongoose.connect('mongodb://0.0.0.0:27017/userlogin', { useNewUrlParser: true, useUnifiedTopology: true });

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.model('Admin', adminSchema);
*/

// setup a new database
// using database credentials set in .env
var sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, {
  host: '0.0.0.0',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
    // Security note: the database is saved to the file `database.sqlite` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
  storage: '.data/database.sqlite'
});

// authenticate with the database
sequelize.authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
    // define a new table 'users'
    User = sequelize.define('users', {
      firstName: { type: Sequelize.STRING },
      lastName: { type: Sequelize.STRING }
    });
    
    Admins = sequelize.define('admins', {
        id: { 
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true, 
          allowNull: false
        },
        name: { 
          type: Sequelize.STRING, 
          allowNull: false
        },
        username: { 
          type: Sequelize.STRING, 
          allowNull: false
        },
        password: { 
          type: Sequelize.STRING, 
          allowNull: false
        },
        active: { 
          type: Sequelize.BOOLEAN 
        }
    });
    
    setup();
  })
  .catch(function (err) {
    console.log('Unable to connect to the database: ', err);
  });

// populate table with default users
function setup(){
  Admins.sync({force: true});
  User.sync({force: true}) // We use 'force: true' in this example to drop the table users if it already exists, and create a new one. You'll most likely want to remove this setting in your own apps
    .then(function(){
      // Add the default users to the database
      for(var i=0; i<users.length; i++){ // loop through all users
        //User.create({ firstName: users[i][0], lastName: users[i][1]}); // create a new entry in the users table
      }
    });  
}

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/register", function (request, response) {
  response.sendFile(__dirname + '/views/register.html');
});

app.post('/register', async (request, response) => {
  const { username, password } = request.query;

  if (!username || !password) {
    return response.status(400).send('Username and password are required');
  }

  const hashedPassword = await bcrypt.hash(request.query.password, 10);

  try {
    Admins.create({ 
      name: request.query.name, 
      username: request.query.username, 
      password: request.query.hashedPassword,
      active: 1
    });
    //const admin = new Admin({ username, password: hashedPassword });
    //await admin.save();
    response.status(201).send('Admin registered');
    var adminUsers=[];
    Admins.findAll().then(function(admins) {
			admins.forEach(function(admin) {
        adminUsers.push([admin.name,admin.username]); 
        console.log(admin.name);
    	});
      response.send(adminUsers); // sends dbUsers back to the page
		});
    response.redirect("/");
  } catch (error) {
    response.status(400).send('Username already exists');
  }
});

app.post('/login', async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  const user = await User.findOne({ username });
  if (!user) {
    return response.status(400).send('Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return response.status(400).send('Invalid username or password');
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
  response.json({ token });
});

app.get("/users", function (request, response) {
  //response.sendFile(__dirname + '/views/user.html');
  var dbUsers=[];
  User.findAll().then(function(users) { // find all entries in the users tables
    users.forEach(function(user) {
      dbUsers.push([user.firstName,user.lastName]); // adds their info to the dbUsers value
    });
    response.send(dbUsers); // sends dbUsers back to the page
  });
});

// creates a new entry in the users table with the submitted values
app.post("/users", function (request, response) {
  User.create({ firstName: request.query.fName, lastName: request.query.lName});
  response.sendStatus(200);
});

// drops the table users if it already exists, populates new users table it with just the default users.
app.get("/reset", function (request, response) {
  setup();
  response.redirect("/");
});

// removes all entries from the users table
app.get("/clear", function (request, response) {
  User.destroy({where: {}});
  response.redirect("/");
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


