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

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/new-message', (req,res) => {
    res.render('newMessage');
});

app.get('/add-message', (req, res) => {
    res.render('addMessage');
});

app.get('/become-member', (req, res) => {
    res.render('becomeMember');
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
