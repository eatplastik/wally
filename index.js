import express from 'express';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import base64 from 'base-64';
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

// const base64 = require('base-64');
// const utf8 = require('utf8');

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
  res.render('invite', { cookie: req.isUserLoggedIn });
});

app.post('/invite', (req, res) => {
  const userEnteredCode = req.body.invite;

  pool
    .query(`SELECT * from invites WHERE invite_code='${userEnteredCode}'`)
    .then((result) => {
      // check that invite code exists or expired
      if (result.rows.length === 0 || result.rows[0].expired === true) {
        res.send('soz the code you entered does not exist or has expired');
        res.redirect('back');
        return 'skip';
      }
      // update invite code expired value to true
      return pool.query(`UPDATE invites SET expired = true WHERE invite_code='${userEnteredCode}'`);
    })
    .then((result) => {
      if (result === 'skip') {
        return;
      }
      res.redirect('/register');
    })
    .catch((err) => console.log(err.stack));
});

// user to call http request to generate invite code
app.get('/generate', (req, res) => {
  res.render('generate', { cookie: req.isUserLoggedIn });
});

app.post('/generate', (req, res) => {
  console.log(req.headers['user-agent']);
  // sql query to add invite code into db
  const inviteCode = generateInvite(16);
  console.log('og invite code', inviteCode);
  const text = inviteCode;
  const encoded = base64.encode(text);
  console.log('base64 encoded invite code', encoded);

  pool.query(`INSERT INTO invites (invite_code, expired) VALUES ('${inviteCode}', false)`, (err, result) => {
    console.log('invite code saved');

    res.send({ encoded });
  });
});

app.get('/register', (req, res) => {
  res.render('register', { cookie: req.isUserLoggedIn });
});

app.post('/register', (req, res) => {
  // initialise the SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  const { email, username } = req.body;
  const pwd = `${req.body.password}-${SALT}`;
  shaObj.update(pwd);
  const hashedPwd = shaObj.getHash('HEX');
  const inputData = [email, hashedPwd, username, 0];

  const signupQuery = 'INSERT INTO users (email, password, username, user_score) VALUES ($1, $2, $3, $4) RETURNING *';

  pool
    .query(signupQuery, inputData)
    .then((result) => {
      res.redirect('/login');
      // query db for user just added
      console.log('what is user email ', email);
      return pool.query(`SELECT id FROM users WHERE email='${email}'`);
    })
    .then((result) => {
      const currentID = result.rows[0].id;

      // add new entries to to completed_ctf
      return pool.query(`INSERT INTO user_completed (user_id, ctf_id, complete) VALUES (${currentID}, 1, false),(${currentID}, 2, false),(${currentID}, 3, false),(${currentID}, 4, false),(${currentID}, 5, false),(${currentID}, 6, false),(${currentID}, 7, false),(${currentID}, 8, false),(${currentID}, 9, false),(${currentID}, 10, false),(${currentID}, 11, false),(${currentID}, 12, false),(${currentID}, 13, false),(${currentID}, 14, false),(${currentID}, 15, false),(${currentID}, 16, false),(${currentID}, 17, false),(${currentID}, 18, false),(${currentID}, 19, false),(${currentID}, 20, false),(${currentID}, 21, false),(${currentID}, 22, false),(${currentID}, 23, false),(${currentID}, 24, false),(${currentID}, 25, false),(${currentID}, 26, false),(${currentID}, 27, false),(${currentID}, 28, false),(${currentID}, 29, false),(${currentID}, 30, false)`);
    })
    .then((result) => {
      console.log('new entries added to user_completed');
    })
    .catch((err) => console.log(err.stack));
});

app.get('/dashboard', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  const loggedInUser = req.cookies.userId;
  // Retrieve data of logged in user
  // pool.query(`SELECT * FROM users WHERE id=${loggedInUser}`, (err, result) => {
  pool.query(`SELECT username, user_score, ctf_id, complete FROM users, user_completed WHERE users.id = user_id AND users.id=${loggedInUser} AND user_id=${loggedInUser}`, (err, result) => {
    const userData = result.rows;
    const { username, user_score } = result.rows[0];

    let completed = 0;
    userData.forEach((el) => { if (el.complete === true) {
      completed++;
    } });

    console.log(completed);

    res.render('dashboard', {
      username, user_score, complete: completed, cookie: req.isUserLoggedIn,
    });
  });
});

app.get('/jeopardy', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  const loggedInUser = req.cookies.userId;

  // pool.query('SELECT * FROM ctf_list', (err, result) => {
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
      console.log('DFIU');
    })
    .catch((err) => console.log(err.stack));
});

app.get('/ranking', (req, res) => {
  if (req.isUserLoggedIn === false) {
    res.redirect('/login');
    return;
  }

  pool.query('SELECT username, user_score FROM users ORDER BY user_score DESC', (err, result) => {
    const leaderboard = result.rows;
    console.log(leaderboard);

    res.render('ranking', { leaderboard, cookie: req.isUserLoggedIn });
  });
});

app.get('/erase-me', (req, res) => {
  let delCounter = 1;
  const loggedInUser = req.cookies.userId;

  if (req.cookies.leave) {
    console.log(req.cookies);
    delCounter = Number(req.cookies.leave) + 1;
  }

  // shows up in response header, stored in browser
  res.cookie('leave', delCounter);

  if (delCounter >= 5) {
    // delete user account and associated data
    pool.query(`DELETE FROM users WHERE id=${loggedInUser}; DELETE FROM user_completed WHERE user_id=${loggedInUser}`, (err, result) => {
      res.clearCookie('leave', { path: '/' });
      res.clearCookie('userId', { path: '/' });
      res.clearCookie('loggedInHash', { path: '/' });
      res.redirect('/');
    });
  } else {
    res.render('erase-me', { cookie: req.isUserLoggedIn, exit: req.cookies.leave });
  }
});

app.listen(3004);
