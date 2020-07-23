const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
require('dotenv').config();
// require('dotenv').config({ path: './app.yaml' })

// console.log('process.env', process.env)
// console.log('NODE_ENV from env: ', process.env.NODE_ENV)
// console.log('LOOKERSDK_CLIENT_SECRET from env: ', process.env.LOOKERSDK_CLIENT_SECRET)
// console.log('process.env.BUCKET_NAME ', process.env.BUCKET_NAME) //test for yaml file

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

//update for new GCP cluster
let mongoDB = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster1.97hzq.gcp.mongodb.net/pbl-demo
`
// console.log('mongoDB', mongoDB)

mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
// console.log('db', db)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var sess = {
  secret: 'keyboard cat',
  cookie: {
    // expires: new Date(Date.now() + 3600000), //hour
    maxAge: 14 * 24 * 3600000 //two weeks
  },
  saveUninitialized: false,
  resave: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
  // userProfile: {} //not working
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb', extended: true }));

const port = process.env.PORT || 5000;

let routes = require('./routes/index')
app.use('/', routes)
//https://stackoverflow.com/questions/7450940/automatic-https-connection-redirect-with-node-js-express
//115 upvoted answer
if (process.env.NODE_ENV === 'production') {
  // console.log('inside ifff')
  // Serve any static files
  // app.use((req, res, next) => {
  //   console.log('topp')
  //   express.static(path.join(__dirname, 'client/build'))
  //   if (req.secure) {
  //     console.log('if')
  //     // request was via https, so do no special handling
  //     next();
  //   } else {
  //     console.log('else')
  //     console.log('https://' + req.headers.host + req.url)
  //     // request was via http, so redirect to https
  //     res.redirect('https://' + req.headers.host + req.url);
  //   }
  // });

  app.use(express.static(path.join(__dirname, 'client/build')))

  // Handle React routing, return all requests to React app
  app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}
// else console.log('elllse')


app.listen(port, () => console.log(`Example app listening on port ${port}!`))