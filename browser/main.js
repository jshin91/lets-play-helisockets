var socket = io.connect();

var gameUtils = {
    canvas: {
        height: 350,
        width: 702,
        backgroundSrc: "clouds.jpeg",
        copterSrc: "chopper.png"
    },
    font: "18px Anton",
    textColor: "rgb(255,5,5)",
    smokeColor: "rgb(209,209,209)"
};

var copterGame = {
    speedSettings: {
        initialAscentRate: 2.4,
        initialDescentRate: .02,
        gravity: .02, 
        climbRate: 1, 
        terminalVelocity: 10, // max speed
    },
    obstacles: {
        velocity: 4,
        separation: 80,
        height: 30,
        width: 25,
        color: "rgb(255,5,5)"

    },
    copterSettings: {
        height: 26,
        width: 77,
    },
    gameData: {
        copter: {
            x: null,
            y: null, 
            ascentRate: null,
            descentRate: null,
            smokeList: []
        },
        obstacles: {
            count: null,
            obstacleList: [],
        },
        background: {
            scrollVal: null,
            velocity: 2
        },
        score: 0,
    },
    background: null,
    copter: null,
    gameState: "stop", //3 possible states: stop, play, pause
    canvas: document.getElementById('canvas'),
    drawContext: this.canvas.getContext('2d'),
    mouseDown: false,

    resetMouseDown: function() {
        copterGame.mouseDown = false;
    },
    setup: function() {
        this.gameState = "stop";
        this.background = new Image();
        this.background.src = gameUtils.canvas.backgroundSrc;
        this.copter = new Image();
        this.copter.src = gameUtils.canvas.copterSrc;
        this.gameData.copter.x = 100;
        this.gameData.copter.y = 175;
        this.gameData.copter.ascentRate = this.speedSettings.initialAscentRate;
        this.gameData.copter.descentRate = this.speedSettings.initialDescentRate;
        this.gameData.copter.smokeList = new Array();
        this.gameData.obstacles.count = 0;
        this.gameData.obstacles.obstacleList = new Array();
        this.gameData.background.scrollVal = 0;

        this.drawContext.drawImage(this.background, 0, 0, 700, 350);
        this.drawContext.drawImage(this.copter, this.gameData.copter.x, this.gameData.copter.y, this.copterSettings.width, this.copterSettings.height);   
        this.drawContext.fillStyle = gameUtils.textColor;
        this.drawContext.font = gameUtils.font;
        this.drawContext.fillText('Press spacebar to play/pause', 10, 340)

        this.addObstacle();
    },
    addObstacle: function() {
        var obstacle = {};
        obstacle.x = gameUtils.canvas.width;
        obstacle.y = Math.floor(Math.random() * (gameUtils.canvas.height - this.obstacles.height));
        this.gameData.obstacles.obstacleList.push(obstacle);
    },
    play: function() {
        if(this.gameState === "pause" || this.gameState === "stop") {
            window.requestAnimationFrame(this.draw, this.canvas); 
            this.gameState = "play";
        }
    },
    pause: function() {
        if(this.gameState === "play") {
            this.gameState = "pause";
            socket.emit('gameStopped');
        }
    },
    stop: function() {
        this.gameState = "stop";
        socket.emit('gameStopped');
    },
    draw: function() {
        if(copterGame.gameState === "play") {
            copterGame.moveBackground();
            copterGame.moveCopter();
            copterGame.moveBricks();

            copterGame.drawContext.font = gameUtils.font;
            copterGame.drawContext.fillStyle = gameUtils.textColor;
            copterGame.drawContext.fillText('Press spacebar to play/pause', 10, 340); 
            copterGame.drawContext.fillText('Score:' + copterGame.gameData.score, 600, 340); 

            copterGame.checkForImpact();
            window.requestAnimationFrame(copterGame.draw, copterGame.canvas);
        }
    },
    moveBackground: function(){
        var scrollVal = this.gameData.background.scrollVal;
        if(scrollVal >= gameUtils.canvas.width) {
            scrollVal = 0;
        }
        this.gameData.background.scrollVal += this.gameData.background.velocity;
        this.drawContext.drawImage(copterGame.background, -scrollVal, 0, gameUtils.canvas.width, gameUtils.canvas.height)
        this.drawContext.drawImage(copterGame.background, this.canvas.width-scrollVal, 0, gameUtils.canvas.width, gameUtils.canvas.height)
    },

    moveCopter: function(){
        if(this.mouseDown) {
            this.gameData.copter.descentRate = this.speedSettings.initialDescentRate;
            this.gameData.copter.y -= this.gameData.copter.ascentRate;
            if(this.gameData.copter.ascentRate <= this.speedSettings.terminalVelocity) {
                this.gameData.copter.ascentRate += this.speedSettings.climbRate;
            }
        } else {
            this.gameData.copter.ascentRate = this.speedSettings.initialAscentRate;
            this.gameData.copter.y += this.gameData.copter.descentRate;
            if(this.gameData.copter.descentRate <= this.speedSettings.terminalVelocity) {
                this.gameData.copter.descentRate += this.speedSettings.gravity;
            }
        }
        //check for ceiling and floor collision
        if(this.gameData.copter.y < 0 || this.gameData.copter.y > (gameUtils.canvas.height - this.copterSettings.height)) {
            this.gameOver();
            socket.emit('gameOver');
        }

        this.drawContext.drawImage(this.copter, this.gameData.copter.x, this.gameData.copter.y, this.copterSettings.width, this.copterSettings.height);

        this.addSmokeTrail();
        this.animateSmoke();
    },
    moveBricks: function(){
        var obstaclesList = this.gameData.obstacles.obstacleList;
        this.gameData.obstacles.count++;
        for(var i = 0; i < obstaclesList.length; i++) {
            if(obstaclesList[i].x < 0-this.obstacles.width) obstaclesList.splice(i, 1);
            else {
                obstaclesList[i].x -= this.obstacles.velocity;
                this.drawContext.fillStyle = this.obstacles.color;
                this.drawContext.fillRect(obstaclesList[i].x, obstaclesList[i].y, this.obstacles.width, this.obstacles.height);
                if(this.gameData.obstacles.count >= this.obstacles.separation) {
                    this.addObstacle();
                    this.gameData.obstacles.count = 0;
                    this.gameData.score += 10;
                }
            }
        }
    },
    checkForImpact: function(){
        var obstaclesList = this.gameData.obstacles.obstacleList;
        for(var i = 0; i < obstaclesList.length; i++) {
            if(this.gameData.copter.x < (obstaclesList[i].x + this.obstacles.width) 
                && (this.gameData.copter.x + this.copterSettings.width) > obstaclesList[i].x 
                && this.gameData.copter.y < (obstaclesList[i].y + this.obstacles.height) 
                && (this.gameData.copter.y + this.copterSettings.height) > obstaclesList[i].y) {
                this.gameOver();
                socket.emit('gameOver');
            }
        }
    },
    gameOver: function(){
        this.gameState = "stop";
        socket.emit('gameStopped');
    },
    addSmokeTrail: function(){
        var particle = {};
        particle.x = this.gameData.copter.x;
        particle.y = this.gameData.copter.y + 4;
        this.gameData.copter.smokeList.push(particle);
    },
    animateSmoke: function(){
        var smokeList = this.gameData.copter.smokeList;
        for(var i = 0; i < smokeList.length; i++) {
            if(smokeList[i].x < 0) smokeList.splice(i,1);
            else {
                smokeList[i].x -= this.obstacles.velocity;
                this.drawContext.fillStyle = gameUtils.smokeColor;
                this.drawContext.fillRect(smokeList[i].x, smokeList[i].y, 2, 2)
            }
        }
    }
}

/* HOST INPUT EVENTS that trigger start or pause game */
document.body.onclick = function(event) {
    if (event.target.id == "start" && copterGame.gameState == "stop") {
        socket.emit('startGame');
        copterGame.setup()
        copterGame.play();
    }               
}
document.body.onkeypress = function(e) {
    if(e.keyCode == 32) { // spacebar
        if(copterGame.gameState == "pause") {
            copterGame.play()
            socket.emit('startGame')
        } else {
            copterGame.pause()
            socket.emit("pauseGame")
        }
    }
    if(e.keyCode == 114) {
        if(copterGame.gameState != "play") {
            socket.emit('gameOver')
            copterGame.setup();
        }
    }
}

/* PLAYER INPUT/SOCKET EVENTS */
$(function(){
  $( "a.button" ).bind( "tap", tapHandler );
});

function tapHandler( event ){
    socket.emit('click')
}

socket.on('startGameEverywhere', function() {
    copterGame.gameState = "play";
})

socket.on('clicking', function() {
    copterGame.mouseDown = true;
    setTimeout(copterGame.resetMouseDown, 100)
})

socket.on('endGameEverywhere', function() {
    copterGame.gameState = "stop";
})

socket.on('connectionEvent', function(numPlayers) {
    var player = "player";
    if(numPlayers > 1)  {
        player = "players"
    }
    if(numPlayers > 0) $('#num-players span').text(numPlayers + " " + player + ' connected')
    else $('#num-players span').text('Waiting for players to connect')   
})

/* PRELOAD IMAGE ASSETS */
function loadImages() {
    var images = [gameUtils.canvas.backgroundSrc, gameUtils.canvas.copterSrc];
    var loadedImages = [];
    var numImages = 2;
    // get num of sources
    for(var i = 0; i < images.length; i++) {
        var image = new Image();
        loadedImages.push(image);
        image.onload = function() {
            if(++loadedImages.length >= numImages) {
              copterGame.setup();
            }
        };
        image.src = images[i];
    }
}
window.onload = function() {loadImages();}
