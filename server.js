const express = require('express');
const app = express();

// install session module first using 'npm install express-session'
var mysql = require('mysql');

const conInfo =
{
  host: process.env.IP,
  user: process.env.C9_USER,
  password: "",
  database: "GAMESTATSDB"
};

var session = require('express-session'); 
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}));

app.get('/', instructions);                  
app.get('/game', game);
app.get('/stats', stats);
app.listen(process.env.PORT,  process.env.IP, startHandler());

function startHandler()
{
  console.log('Server listening on port ' + process.env.PORT);
}

function game(req, res)
{
  var con = mysql.createConnection(conInfo);
  let result = {};
  try
  {
    // if we have not picked a secret number, restart the game...
    if (req.session.answer == undefined)
    {
      req.session.guesses = 0;
      req.session.answer = Math.floor(Math.random() * 100) + 1;
    }
      
    // if a guess was not made, restart the game...
    if (req.query.guess == undefined)
    {
      result = {'gameStatus' : 'Pick a number from 1 to 100.'}; 
      req.session.guesses = 0;
      req.session.answer = Math.floor(Math.random() * 100) + 1;
    }
    // a guess was made, check to see if it is correct...
    else if (req.query.guess == req.session.answer)
    {
      req.session.guesses = req.session.guesses + 1;
      result = {'gameStatus' : `Correct! It took you ${req.session.guesses} guesses. Play Again!`}; 
      req.session.answer = undefined;
      con.query('INSERT INTO STATS (GUESSES) VALUES (?)', [req.session.guesses], function(err, result, fields)
      {
        if(err)
        {
          console.log(err);
          return;
        }
      });
    }
    // a guess was made, check to see if too high...
    else if (req.query.guess > req.session.answer)
    {
      req.session.guesses = req.session.guesses + 1;
      result = {'gameStatus' : 'Too High. Guess Again!', 'guesses' : req.session.guesses}; 
    }
    // a guess was made, it must be too low...
    else
    {
      req.session.guesses = req.session.guesses + 1;
      result = {'gameStatus' : 'Too Low. Guess Again!', 'guesses' : req.session.guesses}; 
    }
  }
  catch (e)
  {
    result = {'error' : e.message};
  }
  writeResult(req, res, result);
}

function instructions(req, res)
{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write("<h1>Number Guessing Game</h1>");
  res.write("<p>Use /game to start a new game.</p>");
  res.write("<p>Use /game?guess=num to make a guess.</p>");
  res.end('');
}

function stats(req, res)
{
  var con = mysql.createConnection(conInfo);
  con.connect(function(err){
    if(err)
      writeResult(req, res, {'error': err });
    else
    {
      con.query("SELECT MAX(GAME_ID), MAX(GUESSES), MIN(GUESSES FROM STATS", function (err, result, fields)
      {
        if(err)
          writeResult(req, res, {'error': err});
        
        else
         writeResult(req, res, {'result': result});
        
      });
       
    }
  });
}


function writeResult(req, res, obj)
{
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}