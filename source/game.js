
var Game = (function() {
	var context = {
		listener: new window.keypress.Listener(),
		loader: new createjs.LoadQueue(false, null, true),
		background1: null,
		background2: null,
		crosshair: null,
		birdSprite: null,
		birdSpriteSheet: null,
		hitSpark: null,
		hitSparkSpriteSheet: null,
		stage: null,
		scoreText: null,
		timeText: null,
		score: 0,
		state: {IDLE: 'idle', DIE: 'die', FALLING: 'falling'},
		entities: [],
		hitSparks: [],
		addBirdInterval: null,
		crosshairHitbox: null,
		ai_state: {
			DEFAULT: 'default',
			WAVE: 'wave',
			CIRCULAR: 'circular'
		},
	};
	
	function checkIntersection(rect1, rect2) {
		if ( rect1.x >= rect2.x + rect2.width || rect1.x + rect1.width <= rect2.x 
				|| rect1.y >= rect2.y + rect2.height || rect1.y + rect1.height <= rect2.y ) return false;
				
		return true;
	}
		
	function inDyingState(sprite) {
		return (sprite.currentAnimation == context.state.FALLING || sprite.currentAnimation == context.state.DIE);
	}
	
	function Entity(posx, posy) {
		var that = {
			state: context.state.IDLE,
			dirx: 0,
			diry: 1,
			xdir: 0,
			ydir: 0,
			velx: 1,
			vely: 1,
			x: posx,
			y: posy,
			xmin: 0,
			xmax: 0,
			ymin: 100,
			ymax: 700,
			theta: 0,
			radius: 40,
			tx: 2,
			ty: 5,
			xf: 3.1,
			yf: 0,
			sprites: [],
			lives: 0,
			hitPoints: 100,
			points: 100,
			energy: 100,
			ai: context.ai_state.WAVE,
			hitBox: new createjs.Shape() 
		};
		
		that.hitBox.graphics.beginFill("rgba(0,255,0,0.5)").drawRect(0, 0, 100, 50);
		that.hitBox.setBounds(0, 0, 100, 50);
		that.hitBox.visible = false;
		
		that.update = function(gameTime) {
			that.x += that.dirx * that.velx * (gameTime.delta / 1000 * 100);
			that.y += that.diry * that.vely * (gameTime.delta / 1000 * 100);
			
			that.hitBox.x = that.x - 55;
			that.hitBox.y = that.y - 85;
			that.hitBox.setBounds(that.hitBox.x, that.hitBox.y, 100, 50);
			
			that.sprites.forEach(function(item) {
				item.x = that.x;
				item.y = that.y;
			});
		};
		
		that.remove = function() {
			context.stage.removeChild(that.hitBox);
			
			that.sprites.forEach(function(item) {
				context.stage.removeChild(item);
			});
		};
		
		that.addToStage = function() {
			that.sprites.forEach(function(item) {
				context.stage.addChildAt(item, 2);
			});
			
			context.stage.addChildAt(that.hitBox, 3);
		};
		
		that.setIsLeft = function(isLeft) {
			that.sprites.forEach(function(item) {
				if (isLeft === true) {
					item.scaleX = -1 * item.scaleX;
				} else {
					item.scaleX = 1 * item.scaleX;
				}
			});
		};
		
		return that;
	}
	
	function init() {
		context.stage = new createjs.Stage("canvas-layout");
		context.stage.canvas.width = window.innerWidth || document.body.clientWidth;
		console.log(context.stage.canvas.width);
		
		context.stage.canvas.height = window.innerHeight || document.body.clientHeight;
		console.log(context.stage.canvas.height);
		
		var manifest = [
			{id: 'background1', src: 'Background.png'},
			{id: 'background2', src: 'Background2.png'},
			{id: 'crosshair', src: 'Cursor.png'},
			{id: 'birdIdle', src: 'Idle.png'},
			{id: 'birdFlying', src: 'Flying.png'},
			{id: 'birdFalling', src: 'Falling.png'},
			{id: 'hitSpark', src: 'hitSpark.png'},
			{id: 'birdDying', src: 'Die.png'},
			{id: 'shot1', src: 'shot.mp3'}
		];
		
		context.loader.installPlugin(createjs.Sound);
		context.loader.addEventListener('complete', handleComplete);
		context.loader.loadManifest(manifest, true, './assets/');
	}
	
	function handleComplete() {
		var background1Image = context.loader.getResult('background1');
		context.background1 = new createjs.Bitmap(background1Image);
		context.background1.scaleX = context.stage.canvas.width / background1Image.width;
		context.background1.scaleY = context.stage.canvas.height / background1Image.height;
		
		var background2Image = context.loader.getResult('background2');
		context.background2 = new createjs.Bitmap(background2Image);
		context.background2.scaleX = context.stage.canvas.width / background2Image.width;
		context.background2.scaleY = context.stage.canvas.height / background2Image.height;
		
		var croshairImage = context.loader.getResult('crosshair');
		context.crosshair = new createjs.Bitmap(croshairImage);
		context.crosshair.scaleX = 75 / croshairImage.width;
		context.crosshair.scaleY = 75 / croshairImage.height;
		context.crosshair.x = -1000000;
		context.crosshair.y = -1000000;
		
		context.crosshairHitbox = new createjs.Shape();
		context.crosshairHitbox.graphics.beginFill("rgba(0,255,0,0.5)").drawRect(0, 0, 50, 50);
		context.crosshairHitbox.setBounds(0, 0, 50, 50);
		context.crosshairHitbox.visible = false;
		
		context.scoreText = new createjs.Text("Score: " + context.score.toString(), "36px Arial", "#ff7700");
		context.scoreText.x = 20;
		context.scoreText.y = 20;
		
		context.timeText = new createjs.Text("Time: " + 0, "36px Arial", "#ff7700");
		context.timeText.x = context.stage.canvas.width - 220;
		context.timeText.y = 20;
		
		context.stage.addChild(context.background1, context.background2);
		
		context.birdSpriteSheet = new createjs.SpriteSheet({
			framerate: 5,
			"images": [context.loader.getResult("birdIdle"), 
						context.loader.getResult("birdFlying"), 
						context.loader.getResult("birdDying"), 
						context.loader.getResult("birdFalling")],
			"frames": {width: 110, height: 110, regX: 55, regY: 110},
			"animations": {
				"idle": {
					frames: [0, 1, 2]
				},
				"flying": {
					frames: [3, 4, 5]
				},
				"dying": {
					frames: 6
				},
				"falling": {
					frames: [7, 8]
				}
			}
		});
		
		var entity = new Entity(200, 200);
		entity.dirx = 1;
		entity.ai = context.ai_state.CIRCULAR;
		entity.sprites.push(new createjs.Sprite(context.birdSpriteSheet, "idle"));
		entity.setIsLeft(true);
		entity.addToStage();
		context.entities.push(entity);
		
		context.hitSparkSpriteSheet = new createjs.SpriteSheet({
			framerate: 20,
			"images": [context.loader.getResult("hitSpark")],
			"frames": {width: 96, height: 96},
			"animations": {
				"idle": {
					frames: [0, 1, 2, 3, 4, 5, 6, 7]
				}
			}
		});
		
		context.stage.on("stagemousemove", function(evt) {
			context.crosshair.x = evt.stageX - 29;
			context.crosshair.y = evt.stageY - 25;
		});
		
		context.stage.on("stagemousedown", function(evt) {
			createjs.Sound.play("shot1");
			
			var p = context.crosshairHitbox;
			addSpark(p.x, p.y, -55, -60);
			
			_.forEach(context.entities, function(item) {
				if (checkIntersection(p.getBounds(), item.hitBox.getBounds()) === true) {
					item.sprites[0].gotoAndPlay("dying");
					item.dirx = 0;
					item.velx = 0;
					item.diry = 0;
					item.vely = 0;
					
					context.score += item.points;
					
					window.setTimeout(function() {
						item.sprites[0].gotoAndPlay("falling");
						//fall down
						item.diry = 1;
						item.vely = 7.6;
					}, 150);
				}
			});
		});
		
		context.stage.canvas.style.cursor = "none";
		context.stage.addChild(context.crosshair, context.crosshairHitbox, context.scoreText, context.timeText);
		
		createjs.Ticker.setFPS(60);
		createjs.Ticker.addEventListener("tick", tick);
		
		//context.addBirdInterval = window.setInterval(addBird, 2000);
	}
	
	function addBird() {
		for(var i = 0; i < 8; i++) {
			var entity = new Entity(-100 + (20 * 1 * 0.5), 100 * i);
			
			entity.dirx = 1;
			entity.velx = Math.floor((Math.random() * 5) * i) + 1;
			entity.velx = Math.max(2, Math.min(entity.velx, 9));
			entity.sprites.push(new createjs.Sprite(context.birdSpriteSheet, "idle"));
			entity.addToStage();
			context.entities.push(entity);
			
			if (i % 2 == 1) {
				entity.ai = context.ai_state.CIRCULAR;
			}
		}
	}
	
	function addSpark(x1, y1, x2, y2) {
		var entity = new Entity(x1 + x2, y1 + y2);
		entity.ai = null;
		entity.vely = 0;
		entity.diry = 0;
		entity.sprites.push(new createjs.Sprite(context.hitSparkSpriteSheet, "idle"));
		//entity.sprites[0].alpha = 1;
		entity.sprites[0].scaleX = 1.6;
		entity.sprites[0].scaleY = 1.6;
		entity.addToStage();
		context.hitSparks.push(entity);
	}
	
	function tick(event) {
		var deltaS = event.delta / 1000;
		
		var minutes = parseInt(event.time / 1000 / 60);
		var seconds = parseInt((event.time / 1000) % 60);

		context.timeText.text = "Time: " + minutes + ":" + seconds;
		context.scoreText.text = "Score: " + context.score;
		
		context.crosshairHitbox.x = context.crosshair.x + 13;
		context.crosshairHitbox.y = context.crosshair.y + 15;
		context.crosshairHitbox.setBounds(context.crosshairHitbox.x, context.crosshairHitbox.y, 50, 50);
		
		_.forEach(context.entities, function(item) {
			item.update(event);
		});
		
		_.forEach(context.hitSparks, function(item) {
			item.update(event);
		});
		
		updateAIstate(event);
		
		if (context.entities.length > 0) {
			_.remove(context.entities, function(item) {
				if (item.x >= context.stage.canvas.width + 100 || item.y >= context.stage.canvas.height + 100) {
					item.remove();
					return item;
				}
			});
		}
		
		if (context.hitSparks.length > 0) {
			_.remove(context.hitSparks, function(item) {
				if (item.sprites[0].currentAnimationFrame >= 7) {
					item.remove();
					return item;
				}
			});
		}
			
		//console.log(context.hitSparks.length);
		context.stage.update(event);
	}
	
	/**
	 * Returns a random number between min (inclusive) and max (exclusive)
	 */
	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	/**
	 * Returns a random integer between min (inclusive) and max (inclusive)
	 * Using Math.round() will give you a non-uniform distribution!
	 */
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function updateAIstate(event) {
		
		_.forEach(context.entities, function(item) {
			if (inDyingState(item.sprites[0]) === false) {
				if (item.ai == context.ai_state.WAVE) {
					if (item.y >= item.ymax) {
						item.diry = -5;
					} else if (item.y <= item.ymin) {
						item.diry = 5;
					}	
				} else if (item.ai == context.ai_state.CIRCULAR) {
					item.theta += 0.1 * event.delta / item.radius;
					
					item.velx = item.tx * Math.cos(item.theta) + item.xf;
					item.vely = item.ty * Math.sin(item.theta) + item.yf;
					
					item.x += item.velx;
					item.y += item.vely;
				}
			}
		});
	}
	
	return {
		start: init
	};
});