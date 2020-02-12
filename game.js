let canvas = document.getElementById("game-canvas");
let ctx = canvas.getContext("2d");

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const GAMESTATE = {
  PAUSED: 0,
  RUNNING: 1,
  MENU: 2,
  GAMEOVER: 3,
  NEWLEVEL: 4
}

function detectCollision(ball, gameObject) {
  // check collision with game object
  let bottomOfBall = ball.pos.y + ball.size;
  let topOfBall = ball.pos.y;

  let topOfObject = gameObject.pos.y;
  let leftSideOfObject = gameObject.pos.x;
  let rightSideOfObject = gameObject.pos.x + gameObject.width;
  let bottomOfObject = gameObject.pos.y + gameObject.height
  if (
    bottomOfBall >= topOfObject &&
    topOfBall <= bottomOfObject &&
    ball.pos.x >= leftSideOfObject &&
    ball.pos.x + ball.size <= rightSideOfObject
  ) {
    return true;
  } else {
    return false;
  }
}

class Paddle {
  constructor(game) {
    this.gameWidth = game.gameWidth;

    this.width = 150;
    this.height = 20;

    this.maxSpeed = 7;
    this.speed = 0;

    this.pos = {
      x: this.gameWidth / 2 - this.width / 2,
      y: game.gameHeight - this.height - 10
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#0ff';
    ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
  }

  moveLeft() {
    this.speed = -this.maxSpeed;
  }

  moveRight() {
    this.speed = this.maxSpeed;
  }

  stop() {
    this.speed = 0;
  }

  update(deltaTime) {
    this.pos.x += this.speed;

    if(this.pos.x < 0) this.pos.x = 0;

    if(this.pos.x + this.width > this.gameWidth)
      this.pos.x = this.gameWidth - this.width;
  }
}

class InputHandler {
  constructor(paddle) {
    document.addEventListener('keydown', (event) => {
      switch(event.keyCode) {
        case 37:
          paddle.moveLeft();
          break;
        case 39:
          paddle.moveRight();
          break;
        case 27:
          game.togglePause();
          break;
        case 83:
          game.start();
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch(event.keyCode) {
        case 37:
          if(paddle.speed < 0) paddle.stop();
          break;
        case 39:
          if(paddle.speed > 0) paddle.stop();
          paddle.stop();
          break;
      }
    });
  }
}

class Ball {
  constructor(game) {
    this.image = document.getElementById('star');
    this.gameWidth = game.gameWidth;
    this.gameHeight = game.gameHeight;

    this.game = game;
    this.size = 50;
    this.reset();
  }

  reset() {
    this.pos = { x: 10, y: 400 };
    this.speed = { x: 4, y: -2 };
  }

  draw(ctx) {
    ctx.drawImage(
      this.image,
      this.pos.x,
      this.pos.y,
      this.size,
      this.size
    );
  }

  update(deltaTime) {
    this.pos.x += this.speed.x;
    this.pos.y += this.speed.y;

    // wall on left or right
    if (this.pos.x + this.size > this.gameWidth || this.pos.x < 0) {
      this.speed.x = -this.speed.x;
    }

    // wall on top
    if (this.pos.y < 0) {
      this.speed.y = -this.speed.y;
    }

    if (this.pos.y + this.size > this.gameHeight) {
      this.game.lives --;
      this.reset();
    }

    if (detectCollision(this, this.game.paddle)) {
      this.speed.y = -this.speed.y;
      this.pos.y = this.game.paddle.pos.y - this.size;
    }
  }
}

class Brick {
  constructor(game, position) {
    this.image = document.getElementById('brick');
    this.game = game;

    this.pos = position;
    this.width = 52;
    this.height = 24;

    this.markedForDeletion = false;
  }

  update() {
    if (detectCollision(this.game.ball, this)) {
      this.game.ball.speed.y = -this.game.ball.speed.y;

      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.drawImage(
      this.image,
      this.pos.x,
      this.pos.y,
      this.width,
      this.height
    )
  }
}

function buildLevel(game, level) {
  let bricks = [];

  level.forEach((row, rowIndex) => {
    row.forEach((brick, brickIndex) => {
      if (brick === 1) {
        let position = {
          x: 80 * brickIndex,
          y: 75 + 24 * rowIndex
        }
        bricks.push(new Brick(game, position));
      }
    });
  });

  return bricks;
}

const level1 = [
  [0,1,0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0],
  [1,1,1,1,1,1,1,1,1,1],
];

const level2 = [
  [0,1,0,1,0,1,0,1,0,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,1,0,1]
];

class Game {
  constructor(gameWidth, gameHeight) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.gameState = GAMESTATE.MENU;
    this.ball = new Ball(this);
    this.paddle = new Paddle(this);
    this.gameObjects = [];
    this.bricks = [];
    this.lives = 3;

    this.levels = [level1, level2];
    this.currentLevel = 0;

    new InputHandler(this.paddle);
  }

  start() {
    if (
      this.gameState !== GAMESTATE.MENU &&
      this.gameState !== GAMESTATE.NEWLEVEL
    ) return;
    this.bricks = buildLevel(game, this.levels[this.currentLevel]);
    // spread operator (...) to place an array within another array
    // this.gameObjects = [this.ball, this.paddle, ...bricks];  MOVED TO draw()
    this.ball.reset();
    this.gameObjects = [this.ball, this.paddle];

    this.gameState = GAMESTATE.RUNNING;
  }

  update(deltaTime) {
    if (this.lives === 0) this.gameState = GAMESTATE.GAMEOVER;

    if (
      this.gameState === GAMESTATE.PAUSED ||
      this.gameState === GAMESTATE.MENU
    ) return;

    if (this.bricks.length === 0) {
      this.currentLevel++;
      this.gameState = GAMESTATE.NEWLEVEL;
      this.start();
    }

    [...this.gameObjects, ...this.bricks].forEach(object =>
      object.update(deltaTime)
    );

    this.bricks = this.bricks.filter(
      object => !object.markedForDeletion
    );
  }

  draw(ctx) {
    [...this.gameObjects, ...this.bricks].forEach(object => object.draw(ctx));

    if (this.gameState == GAMESTATE.PAUSED) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

      ctx.font = "30px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("Paused", this.gameWidth / 2, this.gameHeight / 2);
    }

    if (this.gameState == GAMESTATE.MENU) {
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

      ctx.font = "30px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("Press S To Start", this.gameWidth / 2, this.gameHeight / 2);
    }

    if (this.gameState == GAMESTATE.GAMEOVER) {
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

      ctx.font = "30px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", this.gameWidth / 2, this.gameHeight / 2);
    }
  }

  togglePause() {
    if (this.gameState == GAMESTATE.PAUSED) {
      this.gameState = GAMESTATE.RUNNING;
    } else {
      this.gameState = GAMESTATE.PAUSED;
    }
    // game state
  }
}

let game = new Game(GAME_WIDTH, GAME_HEIGHT);

let lastTime = 0;

function gameLoop(timeStamp) {
  let deltaTime = timeStamp - lastTime;
  lastTime = timeStamp;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  game.update(deltaTime);
  game.draw(ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
