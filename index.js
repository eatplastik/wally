import express from 'express';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import dotenv from 'dotenv';
import { checkLogin, generateInvite } from './helper.js';

const app = express();
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkLogin);
dotenv.config();

const { SALT, SALTY } = process.env;

// Initialise DB connection
const { Pool } = pg;
const pgConnectionConfigs = {
  user: 'gordon',
  host: 'localhost',
  database: 'wally',
  port: 5432,
};
const pool = new Pool(pgConnectionConfigs);

app.get('/', (req, res) => {
  res.render('index', { cookie: req.isUserLoggedIn });
});

app.get('/login', (req, res) => {
  res.render('login', { cookie: req.isUserLoggedIn });
});

app.post('/login', (req, res) => {
  // retrieve the user entry using their email
  const values = [req.body.email];

  pool.query('SELECT * from users WHERE email=$1', values, (error, result) => {
    // return if there is a query error
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }

    // we didnt find a user with that email
    if (result.rows.length === 0) {
      // the error for incorrect email and incorrect password are the same for security reasons.
      // This is to prevent detection of whether a user has an account for a given service.
      res.status(403).send('login failed!');
      return;
    }

    // get user record from results
    const user = result.rows[0];
    console.log(user);

    // initialise SHA object
    const shaObjPwd = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    const pwd = `${req.body.password}-${SALT}`;
    shaObjPwd.update(pwd);

    const hashedPwd = shaObjPwd.getHash('HEX');

    if (user.password !== hashedPwd) {
      res.status(403).send('login failed!');
      return;
    }

    // initialise SHA object
    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    const unhashedCookieString = `${user.id}-${SALTY}`;

    shaObj.update(unhashedCookieString);

    const hashedCookieStr = shaObj.getHash('HEX');

    // The user's password hash matches that in the DB and we authenticate the user.
    res.cookie('loggedInHash', hashedCookieStr);
    // Store user id as a cookie
    res.cookie('userId', user.id);
    res.redirect('/dashboard');
  });
});

app.get('/logout', (req, res) => {
  // const { loggedInHash, userId } = req.cookies;
  res.clearCookie('loggedInHash', { path: '/' });
  res.clearCookie('userId', { path: '/' });
  res.redirect('/login');
});

app.get('/invite', (req, res) => {
  console.log('hello world');
});

// user to call http request to generate invite code
app.get('/generate', (req, res) => {
  // sql query to add invite code into db
  const inviteCode = generateInvite(6);
  res.send(inviteCode);
});

app.get('/register', (req, res) => {
  res.render('register', { cookie: req.isUserLoggedIn });
});

app.post('/register', (req, res) => {
  // initialise the SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  const { email } = req.body;
  const pwd = `${req.body.password}-${SALT}`;
  shaObj.update(pwd);
  const hashedPwd = shaObj.getHash('HEX');
  const inputData = [email, hashedPwd, 0];

  const signupQuery = 'INSERT INTO users (email, password, user_score) VALUES ($1, $2, $3) RETURNING *';

  pool.query(signupQuery, inputData, (err, result) => {
    if (err) {
      console.log(err, err.stack);
      res.status(503).send(result.rows);
      return;
    }

    res.send('signup success');
    console.table(result.rows);
  });
});

app.get('/dashboard', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }
  const loggedInUser = req.cookies.userId;
  console.log(loggedInUser);
  pool.query(`SELECT * FROM users WHERE id=${loggedInUser}`, (err, result) => {
    const {
      id, email, username, user_score,
    } = result.rows[0];
    console.log(email);
    res.render('dashboard', {
      user: id, email, username, user_score, cookie: req.isUserLoggedIn,
    });
  });
});

app.get('/user', (req, res) => {
  res.render('ranking', { cookie: req.isUserLoggedIn });
});

app.get('/jeopardy', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  pool.query('SELECT * FROM ctf_list', (err, result) => {
    const list = { ctf_list: result.rows, cookie: req.isUserLoggedIn };
    res.render('jeopardy', list);
  });
});

app.get('/jeopardy/:index', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  const { index } = req.params;

  pool.query('SELECT * FROM ctf_challenge', (err, result) => {
    const data = result.rows;
    res.render('ctf', { data, index, cookie: req.isUserLoggedIn });
  });
});

app.post('/jeopardy/:index', (req, res) => {
  const { index } = req.params;
  const ctfID = Number(index) + 1;
  console.log(req.params);
  const userAnswer = req.body.answer;
  const loggedInUser = req.cookies.userId;
  // console.log('whois currently logged in: ', req.cookies.userId);
  let ctfPoints = 0;
  let currentUserScore = 0;

  // Retrieve answer key for current challenge
  pool
    .query(`SELECT ctf_ans FROM ctf_challenge WHERE id=${ctfID}`)
    .then((result) => {
      const answerKey = result.rows[0];
      console.log('QUERY RUNNING AWAY');
      // validate answer; only exact answers
      if (userAnswer !== answerKey.ctf_ans) {
        res.redirect('back');
        return;
      }
      if (userAnswer === answerKey.ctf_ans) {
        res.redirect('/jeopardy');
      }
      // when answer is validated, update current user's completed challenges
      return pool.query(`UPDATE user_completed SET complete = true WHERE user_id=${loggedInUser} AND ctf_id=${ctfID}`);
    })
    .then((result) => pool.query(`SELECT * FROM ctf_list WHERE id=${ctfID}`))
    .then((result) => {
      // retrieve points of current ctf challenge
      ctfPoints = result.rows[0].ctf_points;
      // retrieve user current score
      return pool.query(`SELECT * FROM users WHERE id=${loggedInUser}`);
    })
    .then((result) => {
      currentUserScore = result.rows[0].user_score;
      currentUserScore += ctfPoints;
      // update user score in users table
      return pool.query(`UPDATE users SET user_score = ${currentUserScore} WHERE id=${loggedInUser}`);
    })
    .then((result) => {
      console.log('this is complete');
    })
    .catch((err) => console.log(err.stack));
});

app.get('/ranking', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  res.render('ranking');
});

app.listen(3004);
