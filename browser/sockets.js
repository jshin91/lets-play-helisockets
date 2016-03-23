$(function(){
  $( "a.button" ).bind( "tap", tapHandler );
 
  function tapHandler( event ){
    socket.emit('click')
  }
});


socket.on('startGameEverywhere', function(hostId) {
    host = hostId
    gameState = "play";
})

socket.on('clicking', function() {
    mouseDown = 1;
    setTimeout(goBack, 100)
})

function goBack() {
    mouseDown = 0;
}

socket.on('endGameEverywhere', function() {
    gameState = "stop"
})

socket.on('connectionEvent', function(numPlayers) {
    var verb = "is ";
    var plural = "";
    if(numPlayers > 1)  {
        verb = "are "
        plural = "s"
    }
    if(numPlayers > 0) $('#num-players span').text('There ' + verb + numPlayers + " player" + plural + ' connected')
    else $('#num-players span').text('Waiting for players to connect')   
})
