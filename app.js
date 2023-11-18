require('dotenv').config()
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const mongoDb = "mongodb+srv://michelleAppiah:ftfeqfeOct58Znf8@cluster0.ucxto3j.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoDb);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
  })
);

const messageSchema = new Schema({
  user: { type: String, required: true },
  message: { type: String, required: true },
  added: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

const app = express();
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true })); 

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(flash());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username });
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }

      return done(null, user);
    } catch(err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(err) {
    done(err);
  }
});

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

const authenticateAndCheckPasscode = (req, res, next) => {
    if (req.isAuthenticated() && req.session.isPasscodeCorrect) {
        return next(); 
    } else {
        res.redirect('/auth/login'); 
    }
};

const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/auth/login'); 
    }
};

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

app.use(['/new-message', '/add-message', '/become-member', '/new-member-message', '/member'], isLoggedIn);

app.get('/', async (req, res) => {
    try {
        const messages = await Message.find({}).sort({ added: -1 }); 
        const isPasscodeCorrect = req.session.isPasscodeCorrect || false;
        res.render('home', { title: 'Member Posts', messages: messages, isPasscodeCorrect: isPasscodeCorrect });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/new-message', async (req, res) => {
    try {
        const messages = await Message.find({}).sort({ added: -1 }); 
        const usernameData = req.user ? req.user.username : '';
        const isPasscodeCorrect = req.session.isPasscodeCorrect || false;
        res.render('newMessage', { title: 'Member Posts', messages: messages, username: usernameData, isPasscodeCorrect: isPasscodeCorrect });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/add-message', (req, res) => {
    res.render('addMessage');
});

app.get('/become-member', (req, res) => {
    res.render('becomeMember', { error: null });
});

app.post('/become-member', (req, res) => {
    const enteredPasscode = req.body.membership;
    const secretPasscode = process.env.SECRET_PASSCODE; 

    if (enteredPasscode === secretPasscode) {
        req.session.isPasscodeCorrect = true;
        res.redirect('/new-member-message');
    } else {
        res.render('becomeMember', { error: 'Invalid member passcode' });
    }
});

app.get('/member', authenticateAndCheckPasscode, async (req, res) => {
    try {
        const messages = await Message.find({}).sort({ added: -1 }); 
        const usernameData = req.user ? req.user.username : ''; 
        const secretPasscode = process.env.SECRET_PASSCODE;
        const isPasscodeCorrect = req.session.isPasscodeCorrect || false;
        res.render('member', { title: 'Member Posts', messages: messages, username: usernameData, isPasscodeCorrect: isPasscodeCorrect });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/new-member-message', function(req, res, next) {
  res.render('messageForm', { title: 'New Message' });
});

app.post('/new-member-message',authenticateAndCheckPasscode, async function(req, res) {
  try {
    const userName = req.body.messageUser;
    const message = req.body.messageMessage;
    const newMessage = new Message({ message: message, user: userName });
    await newMessage.save();
    res.redirect('/member'); // Redirect to the member page after adding the message
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post("/auth/sign-up", async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10); 
    const user = new User({
      username: req.body.username,
      password: hashedPassword 
    });
    const result = await user.save();
    res.redirect("/auth/login");
  } catch(err) {
    return next(err);
  }
});

app.get("/auth/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post(
  "/auth/login",
  passport.authenticate("local", {
    successRedirect: "/new-message",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
