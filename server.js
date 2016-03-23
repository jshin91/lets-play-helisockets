var path = require('path');
var http = require('http');
var server = http.createServer();
var express = require('express');
var app = express();

var socketio = require('socket.io'); 

server.on('request', app);

var io = socketio(server);
var isGameRunning;
var socketInterval;
var socketIds = [];
var clickCounter = 0;
var host;

// // use socket server as an event emitter in order to listen for new connctions
io.on('connection', function(socket){

  console.log('A new client has connected')
  console.log('number of clients: ', io.engine.clientsCount)
  var count = (io.engine.clientsCount - 1);

  //assumes the first person who connects is the host. show the connections only to the host who is showing the browser 
  if(!host) host = socket.id
  io.to(host).emit('connectionEvent', count)

  //event that runs anytime a socket disconnects
  socket.on('disconnect', function(){
    count = (io.engine.clientsCount - 1)
    io.to(host).emit('connectionEvent', count)
  })


  socket.on('click', function(){
    if(isGameRunning){
      if(socketIds.indexOf(socket.id)<0) {
        clickCounter++;
        socketIds.push(socket.id)
      }
    } 
  }); 

  socket.on("pauseGame", function() {
    isGameRunning = false;
    socketInterval = 0;
    clearInterval(socketInterval);
  })

  socket.on('gameOver', function() {
    clearInterval(socketInterval);
    isGameRunning = false;
    socketInterval = 0;
    io.to(host).emit('endGameEverywhere')
  })

  socket.on('startGame', function(data) {
    host = socket.id
    io.to(host).emit('startGameEverywhere' , host)
    isGameRunning = true;
    socketInterval = setInterval(calculateMajority, 1000/2)
  })

  function calculateMajority() {
    //don't include the browser instance in the clientsCount
    if(clickCounter && clickCounter >= (io.engine.clientsCount-1)/2) {
      //emit the click event only to the host who started the game in the browser
      io.to(host).emit('clicking');
    }
    clickCounter = 0;
    socketIds = [];
  }

})


app.use(express.static(path.join(__dirname, 'browser')));
app.use(express.static(path.join(__dirname, 'node_modules')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(1337, function () {
    console.log('The server is listening on port 1337!');
});

