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
  console.log('register');
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
