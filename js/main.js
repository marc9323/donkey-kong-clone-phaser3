// create a new scene
let gameScene = new Phaser.Scene('Game');

// some parameters for our scene
gameScene.init = function() {
    // player parameters
    this.playerSpeed = 150;
    this.jumpSpeed = -600;
};

// load asset files for our game
gameScene.preload = function() {
    // load images
    this.load.image('ground', 'assets/images/ground.png');
    this.load.image('platform', 'assets/images/platform.png');
    this.load.image('block', 'assets/images/block.png');
    this.load.image('goal', 'assets/images/gorilla3.png');
    this.load.image('barrel', 'assets/images/barrel.png');

    // load spritesheets
    this.load.spritesheet('player', 'assets/images/player_spritesheet.png', {
        frameWidth: 28,
        frameHeight: 30,
        margin: 1,
        spacing: 1
    });

    this.load.spritesheet('fire', 'assets/images/fire_spritesheet.png', {
        frameWidth: 20,
        frameHeight: 21,
        margin: 1,
        spacing: 1
    });

    // load JSON
    this.load.json('levelData', 'assets/json/levelData.json');
};

// executed once, after assets were loaded
gameScene.create = function() {
    // player walking spritesheet animation

    if (!this.anims.get('walking')) {
        this.anims.create({
            key: 'walking',
            frames: this.anims.generateFrameNames('player', {
                frames: [0, 1, 2]
            }),
            frameRate: 12,
            yoyo: true,
            repeat: -1
        });
    }

    // fires
    if (!this.anims.get('burning')) {
        this.anims.create({
            key: 'burning',
            frames: this.anims.generateFrameNames('fire', {
                frames: [0, 1]
            }),
            frameRate: 4,
            repeat: -1
        });
    }

    // add all level elements
    this.setupLevel();

    // spawner for barrels
    this.setupSpawner();

    // collisions
    this.physics.add.collider(
        [this.player, this.goal, this.barrels],
        this.platforms
    );

    // overlap checks // null - could be a function that check whether we do want to run
    // this.restartGame or not
    // in your callback you have access to the player and the targetSprite (the fire you overlap)
    this.physics.add.overlap(
        this.player,
        [this.fires, this.goal, this.barrels],
        this.restartGame,
        null,
        this
    );

    // enable cursor keys
    this.cursors = this.input.keyboard.createCursorKeys();

    this.input.on('pointerdown', function(pointer) {
        console.log(pointer.x, pointer.y);
    });
};

gameScene.setupSpawner = function() {
    // barrel group
    this.barrels = this.physics.add.group({
        bounceY: 0.1,
        bounceX: 1,
        collideWorldBounds: true
    });

    // spawn barrels using object pools
    let spawningEvent = this.time.addEvent({
        delay: this.levelData.spawner.interval,
        loop: true,
        callbackScope: this,
        callback: function() {
            // create a barrel
            // let barrel = this.barrels.create(
            //     this.goal.x,
            //     this.goal.y,
            //     'barrel'
            // );
            let barrel = this.barrels.get(this.goal.x, this.goal.y, 'barrel');
            // set properties

            // reactivate
            barrel.setActive(true);
            barrel.setVisible(true);
            barrel.body.enable = true;

            barrel.setVelocityX(this.levelData.spawner.speed);

            // console.log(this.barrels.getChildren());
            // duration/lifespan
            this.time.addEvent({
                delay: this.levelData.spawner.lifespan,
                repeat: 0,
                callbackScope: this,
                callback: function() {
                    this.barrels.killAndHide(barrel);
                    // disable the physical body
                    barrel.body.enable = false;
                }
            });
        }
    });
};

// game over + win
gameScene.restartGame = function(sourceSprite, targetSprite) {
    // fade out
    this.cameras.main.fade(500);
    // restart scene on complete
    this.cameras.main.on('camerafadeoutcomplete', (camera, effect) => {
        this.scene.restart();
    });
};

// game loop
gameScene.update = function() {
    // player on the ground? - is the player body blocked on down direction?
    let onGround =
        this.player.body.blocked.down || this.player.body.touching.down;

    if (this.cursors.left.isDown) {
        this.player.body.setVelocityX(-this.playerSpeed);

        this.player.flipX = false;

        if (onGround && !this.player.anims.isPlaying) {
            this.player.anims.play('walking');
        }
    } else if (this.cursors.right.isDown) {
        this.player.body.setVelocityX(this.playerSpeed);

        this.player.flipX = true;
        if (onGround && !this.player.anims.isPlaying) {
            this.player.anims.play('walking');
        }
    } else {
        // make player stop
        this.player.body.setVelocityX(0);

        // cease animation
        this.player.anims.stop('walking');

        // set default frame
        if (onGround) {
            this.player.setFrame(3);
        }
    }

    // jump
    if (onGround && (this.cursors.space.isDown || this.cursors.up.isDown)) {
        // set y velocity
        this.player.body.setVelocityY(this.jumpSpeed);
        // stop walking
        this.player.anims.stop('walking');
        // change to jumping frame
        this.player.setFrame(2);
    }
};

gameScene.setupLevel = function() {
    // load json
    this.levelData = this.cache.json.get('levelData');

    // set the world bounds
    this.physics.world.bounds.width = this.levelData.world.width;
    this.physics.world.bounds.height = this.levelData.world.height;

    // camera bounds
    // size of the world is the same as the camera can look at

    this.platforms = this.physics.add.staticGroup();

    // create all the platforms
    for (let i = 0; i < this.levelData.platforms.length; i++) {
        let curr = this.levelData.platforms[i];

        let newObj;

        // create object
        if (curr.numTiles == 1) {
            // sprite
            // origin: top left
            newObj = this.add.sprite(curr.x, curr.y, curr.key).setOrigin(0, 0);
        } else {
            // tilesprite
            // from textures object get the key get frame 0 get width
            // it's a tilesprite so we need width and height
            let width = this.textures.get(curr.key).get(0).width;
            let height = this.textures.get(curr.key).get(0).height;
            newObj = this.add
                .tileSprite(
                    curr.x,
                    curr.y,
                    curr.numTiles * width,
                    height,
                    curr.key
                )
                .setOrigin(0, 0);
        }

        // enable physics
        this.physics.add.existing(newObj, true); // true: static object

        // add to group
        this.platforms.add(newObj);
    }

    // fire
    this.fires = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });
    for (let i = 0; i < this.levelData.fires.length; i++) {
        let curr = this.levelData.fires[i];

        // let newObj = this.add.sprite(curr.x, curr.y, 'fire').setOrigin(0, 0);
        // adds to physics group and creates a sprite on the screen
        let newObj = this.fires.create(curr.x, curr.y, 'fire').setOrigin(0, 0);

        // enable physics
        this.physics.add.existing(newObj); // true: static object

        // play burning animation
        newObj.anims.play('burning');

        // add to group
        //this.fires.add(newObj); // no need since we used create above

        // for testing purposes
        newObj.setInteractive();
        this.input.setDraggable(newObj);
    }

    // testing
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;

        console.log(dragX, dragY);
    });

    // player
    this.player = this.add.sprite(
        this.levelData.player.x,
        this.levelData.player.y,
        'player',
        3
    ); // frame 3
    // enable physics on player
    this.physics.add.existing(this.player, false); // false (dynamic) is default

    // constrain player to game bounds
    this.player.body.setCollideWorldBounds(true);

    this.cameras.main.setBounds(
        0,
        0,
        this.levelData.world.width,
        this.levelData.world.height
    );
    this.cameras.main.startFollow(this.player);

    // goal
    this.goal = this.add.sprite(
        this.levelData.goal.x,
        this.levelData.goal.y,
        'goal'
    );
    this.physics.add.existing(this.goal);
};

// our game's configuration
let config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    scene: gameScene,
    title: 'Monster Kong',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 1000
            },
            debug: true
        }
    }
};

// create the game, and pass it the configuration
let game = new Phaser.Game(config);

// ******************************
// NOTES
// ******************************

// 2.) Create and adding sprite to physics system in same line
// will be of type ArcadeSprite
// let ground2 = this.physics.add.sprite(180, 200, 'ground');

// collision detection
//this.physics.add.collider(ground, ground2);

// TILESPRITE is a sprite where you repeat the same texture multiple times
// in a normal sprite the width and height are that of the image file
// in a tilesprite you specify so it knows how many times to repeat
// the texture.  A sprite that has a texture that repeats itself.
// use it like any other sprite

// MOMENTUM = mass * velocity

// static groups dont respond to forces, for things that dont move
// dynamic groups respond to forces, for movers
// separation improves performance

// Detect if player is on the ground
// for static ground: this.player.body.blocked.down will be true
// for dynamic ground: this.player.body.touching.down will be true
// since feature request was accepted now this.player.body.blocked.down should work
// for either??? test in current Phaser version from now on.

// jump set neg vel on y

// how would you make the x, y appear on the screen as you move around the pointer?

// anchor point for tilesprite is by default the center

// 1.) Adding existing sprites to the physics system, type Sprite
//  let ground = this.add.sprite(180, 604, 'ground');

//  // add sprite to physics system / gives it a body
//  // second param: bool static/dynamic
//  this.physics.add.existing(ground, true);

//  this.platforms.add(ground);

//  // for a platform of three blocks
//  let platform = this.add.tileSprite(176, 384, 3 * 36, 1 * 30, 'block');
//  this.physics.add.existing(platform, true); // static
//  this.platforms.add(platform);

// JSON Formatter - online service formats json strings

// if you use a physics group phaser will use a more efficient tree structure for calculating
//collisions static or physics group this.physics.add.staticGroup()

// out of date:  this let newObj = this.fires.create(curr.x, curr.y, 'fire').setOrigin(0, 0); works
// just fine now - in 3.18.1 the body and the sprite coincide

// COLLIDER - is when one object really stops the other one from moving, you can't overlap
// the platform.  But you can overlap the fire - player can be IN the flames so use overlap

// Animations are global, create in one scene, available in all

// get will pool an inactive object if there is one if not it will create one, user
// with killAndHide method
