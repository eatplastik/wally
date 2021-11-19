import express from 'express';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import dotenv from 'dotenv';

const app = express();
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
dotenv.config();

const { SALT } = process.env;

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
  console.log('hello world');
});

app.get('/login', (req, res) => {
  console.log('hello world');
});
app.get('/logout', (req, res) => {
  console.log('hello world');
});

app.get('/invite', (req, res) => {
  console.log('hello world');
});

// helper function to generate invite code
const generateInvite = (len) => {
  let result = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = chars.length;
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  return result;
};

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
  console.log('hello world');
});

app.get('/user', (req, res) => {
  console.log('hello world');
});
app.get('/jeopardy', (req, res) => {
  console.log('hello world');
});
app.get('/jeopardy/:index', (req, res) => {
  console.log('hello world');
});

app.listen(3004);
