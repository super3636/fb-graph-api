require('dotenv').config();
var config = require('./config');
var express = require('express');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
const request = require('request-promise');

passport.use(new Strategy({
    clientID: process.env['FACEBOOK_CLIENT_ID'],
    clientSecret: process.env['FACEBOOK_CLIENT_SECRET'],
    callbackURL: '/return'
  },
  function(accessToken, refreshToken, profile, cb) {
    config.user_access_token=accessToken;
    return cb(null, profile);
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
// app.use(require('cookie-parser')());
//Phân tích cấu trúc req
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(express.static('public'))
// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


// Define routes.
app.get('/',
  function(req, res) {
    if(req.user)
    {
    const options = {  
  method: 'GET',
  uri: `https://graph.facebook.com/v10.0/${req.user.id}`,
  qs: {
      access_token: config.user_access_token,
      fields: 'picture'
  }
};
request(options)  
.then(result=>{
    let user = req.user;
    user.image_url=JSON.parse(result).picture.data.url;
    //console.log(JSON.parse(result).picture.data.url);
    res.render('home',{user:user});
  })
}
else{
  res.render('home',{user:null});
}
    // res.render('home', { user: req.user });
  });


app.get('/login',function(req,res){
     res.render('login');
});

app.get('/login/facebook',
  passport.authenticate('facebook',{scope: ['user_gender','user_link','email','user_photos','user_posts','user_likes','user_status','user_videos']}));

app.get('/return', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    const options = {  
  method: 'GET',
  uri: `https://graph.facebook.com/v10.0/${req.user.id}`,
  qs: {
      access_token: config.user_access_token,
      fields: 'name,birthday,email,education,gender,hometown'
  }
};
request(options)  
.then(result=>{
  console.log(result);
    res.render('profile',{user:JSON.parse(result)});
  })
  });
app.get('/pages',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    const options = {  
  method: 'GET',
  uri: `https://graph.facebook.com/v10.0/${req.user.id}`,
  qs: {
      access_token: config.user_access_token,
      fields: 'likes'
  }
};

request(options)  
.then(result=>{
    res.render('pages',{user:req.user,pages:JSON.parse(result).likes.data});
  })
// res.render('pages',{user:req.user,pages:});
  });

// app.post('/logoutFromFacebook', function(req, res) {
//     res.redirect('https://www.facebook.com/logout.php?next=http://localhost:3030/logout&access_token='+config.user_access_token);
// });
  app.get('/logout',function(req,res){
    req.logOut();
    res.redirect("/");
});
app.listen(process.env['PORT'] || 8080);
