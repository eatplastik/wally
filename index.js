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
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
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
  res.render('register');
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
  res.render('dashboard');
});

app.get('/user', (req, res) => {
  res.render('ranking');
});

app.get('/jeopardy', (req, res) => {
  pool.query('SELECT * FROM ctf_list', (err, result) => {
    const list = { ctf_list: result.rows };
    res.render('jeopardy', list);
  });
});

app.get('/jeopardy/:index', (req, res) => {
  const { index } = req.params;

  pool.query('SELECT * FROM ctf_challenge', (err, result) => {
    const data = result.rows;
    res.render('ctf', { data, index });
  });
});

app.post('/jeopardy/:index', (req, res) => {
  const { index } = req.params;
  const ctfID = Number(index) + 1;
  // console.log(req.params);
  const userAnswer = req.body.answer;
  console.log('current ctf index', index);
  console.log('THE ANSWER 2 LIFE: ', userAnswer);

  // Retrieve answer key for current challenge
  pool.query(`SELECT ctf_ans FROM ctf_challenge WHERE id=${ctfID}`, (err, result) => {
    const answerKey = result.rows[0];
    console.log('the correct answer is: ', answerKey.ctf_ans);

    // validate answer
    // if validated, update user
  });

  res.send('answer recorded');
});

// remove this after you're done
app.post('/note/:id', (req, res) => {
  // initialise shaObj
  const { loggedInHash, userId } = req.cookies;
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  const unhashedCookieString = `${userId}-${SALT}`;
  shaObj.update(unhashedCookieString);
  const hashedCookieStr = shaObj.getHash('HEX');

  const formData = [req.body.comments, userId];

  const addNoteQuery = 'INSERT INTO comments (comments, user_id) VALUES ($1, $2) RETURNING *';

  const whenDoneWithQuery = (err, result) => {
    if (err) {
      console.log('Error executing query', err.stack);
      res.status(503).send(result.rows);
      return;
    }

    if (hashedCookieStr !== loggedInHash) {
      res.status(403).send('please login!');
      return;
    }

    // res.send('Saved entry!');
    res.redirect('back');
  };

  pool.query(addNoteQuery, formData, whenDoneWithQuery);
});

app.get('/note/:id', (request, response) => {
  pool.query('SELECT * FROM notes; SELECT * FROM comments;', (err, result) => {
    // console.log('return multiple queries');
    // console.log(result[0], result[1]);
    const data = {
      notes: result[0].rows,
      comments: result[1].rows,
    };
    const { id } = request.params;
    // console.log('request params', request.params);
    // console.log('what is id ', id);
    data.index = id;

    response.render('single-note', data);
  });
});

app.get('/ranking', (req, res) => {
  res.render('ranking');
});

app.listen(3004);
