const checkLogin = (req, res, next) => {
  console.log('req.cookies:', req.cookies);
  req.isUserLoggedIn = false;

  if (req.cookies.loggedInHash) {
    req.isUserLoggedIn = true;
  }

  next();
};

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

export { checkLogin, generateInvite };
