var canvas
,   engine
,   viewport
,   ctx
,   layers
,   sprites
,   player
,   tileset
,   now

,   TILEWIDTH
,   JUMPHEIGHT = 24
,   WALK_SPEED = 500

,   health = 100
,   jumping = JUMPHEIGHT
,   falling = false
,   landed = false

,   K_LEFT = 37
,   K_UP = 38
,   K_RIGHT = 39
,   K_DOWN = 40
,   K_SPACE = 32

,   T_TRANSPARENT = 0
,   T_WHITE = 63
,   T_BLACK = 7
,   T_GRAY = 31
,   T_GRAY = 31
,   T_LTBLUE = 12
,   T_BOX = 49
,   T_SPIKE1 = 50
,   T_SPIKE2 = 51
,   T_PLHEAD = 10
,   T_PLFEET1 = 17
,   T_PLFEET2 = 18
,   T_PLFEET3 = 19
;


function Rect(x, y, w, h) {
    this.push(x);
    this.push(y);
    this.push(w);
    this.push(h);
};
Rect.prototype = new Array();
Rect.prototype.is_in = function(b) {
    return (!(
        this[0] > (b[0]+b[2]) ||
        this[0]+this[2] < b[0] ||
        this[1] > (b[1]+b[3]) ||
        this[1]+a[3] < b[1]
    ));
};
Rect.prototype.is_in_list = function(rects) {
    var i=0, l=rects.length, c=[];
    for (; i<l; i++) {
        if (this.is_in(rects[i])) {
            c.push(rects[i]);
        }
    }
    return c;
};

function Viewport() {
    this.x = 0;
    this.y = 0;
    this.width = TILEWIDTH;
    this.height = TILEWIDTH;
};
Viewport.prototype.draw = function() {
    
};

function Layer(h, w, inworld) {
    this.height = h;
    this.width = w;
    this.inworld = !!inworld;
    for (var h_i=0; h_i<h; h_i++) {
        for (var w_i=0; w_i<w; w_i++) {
            this.push(T_TRANSPARENT);
        }
    }
};
Layer.prototype = (new Array());
Layer.prototype.draw = function() {
    var x, y
    ,   bx, by, bw, bh
    ,   offx = this.inworld ? viewport.x : 0
    ,   offy = this.inworld ? viewport.y : 0
    ;
    for (x=0; x<this.width; x++) {
        bx = x * 8 + offx;
        for (y=0; y<this.height; y++) {
            by = y * 8 + offy;
            engine.blit(this.get(x, y), bx, by);
        }
    }
};
Layer.prototype.setAll = function(t) {
    var x, y, i, l = this.width * this.height;
    for (i=0; i<l; i++) {
        this[i] = t;
    }
};
Layer.prototype.get = function(x, y) {
    var i = (y * this.width) + x
    ,   t = this[i]
    ;
    return t;
};
Layer.prototype.set = function(x, y, t) {
    var i = (y * this.width) + x
    ;
    this[i] = t;
};
Layer.prototype._debug_map = function() {
    var x, y, l, t;
    for (y=0; y<this.height; y++) {
        l = []
        for (x=0; x<this.width; x++) {
            try {
                t = this.get(x, y).toString(16);
            } catch (e) {
                t = "--";
            }
            if (t.length == 1) {
                t = ["0" + t].join("");
            }
            l.push(t);
        }
        console.debug(l);
    }
};

function Sprite(x, y, t) {
    this.x = x;
    this.y = y;
    this.t = t;
}
Sprite.prototype.draw = function() {
    engine.blit(this.t, this.x, this.y);
};
Sprite.prototype.tick = function() {

};

function SpriteGroup(x, y, sprites, inworld) {
    this.x = x;
    this.y = y;
    this.xflip = false;
    this.yflip = false;
    this.dy = 0;
    this.sprites = sprites;
    this.inworld = !!inworld;
}
SpriteGroup.prototype.draw = function() {
    var sl = this.sprites.length
    ,   i
    ,   s
    ,   x = this.x
    ,   y = this.y
    ,   offx = this.inworld ? viewport.x : 0
    ,   offy = this.inworld ? viewport.y : 0
    ;
    for (i=0; i<sl; i++) {
        s = this.sprites[i];
        engine.blit(s.t, x+s.x+offx, y+s.y+offy, this.xflip, this.yflip);
    }
};
SpriteGroup.prototype.move = function(x, y) {
    var ty = this.y / 8
    ,   tx = (this.x % 8)===0 ? (this.x/8)+(x<0?-1:1) : (this.x/8)
    ,   l = layers[2]
    ,   left = l.get(Math.floor(tx), Math.ceil(ty))===0
    ,   right = l.get(Math.ceil(tx), Math.ceil(ty))===0
    ;

    if ((x > 0 && right) || (x < 0 && left)) {
        this.x += parseInt(x);
    }
    this.y += parseInt(y);
}

var action_tiles = {};
(function(){
    function action_spike(player) {
        player.sprite.dy = -1.5;
        player.hurt(10);

        return true;
    }
    action_tiles[T_SPIKE1] = action_spike;
    action_tiles[T_SPIKE2] = action_spike;
})();

function Player(sprite) {
    this.sprite = sprite;
}
Player.prototype.hurt = function(h) {
    health -= h;
    engine.update_health();
};
Player.prototype.tick = function() {
    var sprite = this.sprite
    ,   ty = parseInt((sprite.y + 8) / 8)
    ,   tx = parseInt(sprite.x / 8)
    ,   under_1 = layers[2].get(tx, ty)
    ,   under_2 = layers[2].get(tx+1, ty)
    ,   handled_1 = false
    ,   handled_2 = false
    ;

    if (sprite.dy < 0){
        sprite.move(0, sprite.dy);
        sprite.dy += 0.033; 
    }

    // falling?
    if (under_1 === 0 && (sprite.x%8===0 ? true:under_2 === 0)) {
        if (sprite.dy === 0) {
            sprite.dy = 0.75;
            sprite.move(0, 1);
        } else {
            sprite.dy += 0.033; 
            sprite.move(0, sprite.dy);
        }
        falling = true;
        handled_1 = handled_2 = true;
    }

    // hit some action tile?
    if (!(handled_1 && handled_2)) {
        if (typeof action_tiles[under_1] === 'function') {
            handled_1 = true;
            handled_2 = action_tiles[under_1](this);
        }
        if (!handled_2 && action_tiles[under_2]) {
            handled_2 = action_tiles[under_2](this);
        }
    }
    
    // otherwise, land on the ground
    if (!handled_1 || !handled_2) {
        sprite.dy = 0;
        sprite.y = sprite.y - sprite.y%8;
        if (falling)
            landed = true;
        falling = false;
        jumping = JUMPHEIGHT
    }

    if (engine.keystate[K_RIGHT]) {
        sprite.move(1, 0);
        sprite.xflip = true;
    } else if (engine.keystate[K_LEFT]) {
        sprite.move(-1, 0);
        sprite.xflip = false;
    }
    if (engine.keystate[K_RIGHT] || engine.keystate[K_LEFT]) {
        sprite.sprites[1].t = [T_PLFEET1, T_PLFEET2, T_PLFEET3][parseInt((now % WALK_SPEED) / (WALK_SPEED/3))];
    } else {
        sprite.sprites[1].t = T_PLFEET2;
    }

    if (engine.keystate[K_SPACE] && jumping > 0 && !(falling && jumping==JUMPHEIGHT)) {
        if (!landed) {
            sprite.move(0, parseInt(-3 * Math.sin(jumping/JUMPHEIGHT)));
            jumping -= 1;
        }
    }
    if (falling)
        sprite.sprites[1].t = T_PLFEET1;
    if (!engine.keystate[K_SPACE]) {
        landed = false;
    }
};

function init() {
    engine = new Engine();

}

function Engine() {
    this.keystate = keystate = [];
    window.onkeydown = function(e) {
        keystate[e.keyCode] = true;
        return false;
    }
    window.onkeyup = function(e) {
        keystate[e.keyCode] = false;
        return false;
    }

    this.last_frame;
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tilesets = [];

    TILEWIDTH = this.canvas.getAttribute('width') / 8;

    viewport = new Viewport();

    layers = [];
    layers.push(new Layer(TILEWIDTH, TILEWIDTH));
    layers.push(new Layer(TILEWIDTH, TILEWIDTH, true));
    layers.push(new Layer(TILEWIDTH, TILEWIDTH * 10, true));
    layers.push(new Layer(TILEWIDTH, TILEWIDTH));

    sprites = [];
    sprites.push(new SpriteGroup(50, 50, [
        new Sprite(0, -8, T_PLHEAD)
    ,   new Sprite(0,  0, T_PLFEET2)
    ], true));
    player = new Player(sprites[0]);

    layers[3][0] = 65;
    layers[3][1] = 64;
    layers[3][2] = 64;

    for (var y=5; y<12; y++) {
        layers[2].set(0, y, T_BOX);
        layers[2].set(layers[2].width, y, T_BOX);
    }
    
    for (var i=0; i<layers[2].width; i++) {
        if (Math.random() > 0.8) {
            layers[2].set(i, 11, T_BOX);
        }
        layers[2].set(i, 12, 28);
        layers[2].set(i, 13, 27);
        layers[2].set(i, 14, 27);
        layers[2].set(i, 15, 27);
    }

    layers[2].set(15, 11, 0);
    layers[2].set(16, 11, 0);
    layers[2].set(17, 11, 0);
    layers[2].set(15, 12, 0);
    layers[2].set(16, 12, 0);
    layers[2].set(17, 12, 0);
    layers[2].set(15, 13, T_SPIKE1);
    layers[2].set(16, 13, T_SPIKE2);
    layers[2].set(17, 13, T_SPIKE1);

    layers[0].setAll(T_LTBLUE);

    this.loadTilesets("tileset.png", "alphanum.png");
}
Engine.prototype.loadTilesets = function() {
    var tileset
    ,   to_load = arguments.length
    ,   engine = this
    ;

    for (var i=0; i<arguments.length; i++) {
        tileset = new Image();
        this.tilesets.push(tileset)
        tileset.onload = function() {
            to_load -= 1; 
            if (to_load === 0) {
                engine.start()
            }
        };
        tileset.src = arguments[i] + "?ts=" + (new Date().toISOString());
    }

}
Engine.prototype.blit = function blit(i, x, y, xflip, yflip) {
    var sx = (i % 64) % 8
    ,   sy = parseInt((i % 64) / 8)
    ,   tileset = this.tilesets[parseInt(i / 64)]
    ;
    if (x > -8 && x < 128 && y >= 0 && y < 128) {
        this.ctx.setTransform(1,0,0,1,0,0);
        this.ctx.translate(!!xflip?128:0, 0)
        this.ctx.scale(!!xflip?-1:1, 1);
        this.ctx.drawImage(tileset, sx*8, sy*8, 8, 8, !!xflip?120-x:x, y, 8, 8);
    }
}
Engine.prototype.start = function start() {
    this.update_health();

    layers[0].draw();
    layers[1].draw();

    var sl = sprites.length, si;
    for (si=0; si<sl; si++) {
        sprites[si].draw();
    }

    layers[2].draw();
    layers[3].draw();

    requestAnimFrame(function(){
        engine.tick()
    });
}
Engine.prototype.tick = function() {
    now  = new Date();
    if (typeof this.last_frame != "undefined") {
        // console.debug(parseInt(1000 / (now.getTime() - this.last_frame.getTime())) + " fps");
    }
    this.last_frame = now;

    player.tick();

    if (sprites[0].x + viewport.x < TILEWIDTH*8 / 3) {
        viewport.x += 1;
    } else if (sprites[0].x + viewport.x > TILEWIDTH*8 / 1.5) {
        viewport.x -= 1;
    }

    layers[0].draw();
    layers[1].draw();
    sprites[0].draw();
    layers[2].draw();
    layers[3].draw();

    requestAnimFrame(function() {
        engine.tick();
    });
}
Engine.prototype.update_health = function() {
    var t = health % 33
    ,   i = parseInt(t/(33/8))
    ,   p = health===100 ? 120 : 127 - i
    ;

    console.debug(t, i, p);

    layers[3][13] = health <= 33 ? p : 120;
    layers[3][14] = health <= 66 && health > 33 ? p : (health < 33 ? 0 : 120);
    layers[3][15] = health > 66 ? p : 0;
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           window.setTimeout(callback, 1000/60);
         };
})();
