/* tslint:ignore:max-classes-per-file */
const d = document;
/** Get the canvas and its context */
const c = d.getElementById('screen');
const ctx = c.getContext('2d');
const gl = c.getContext('webgl');
/** Letters for the Matrix font */
// tslint:disable-next-line:max-line-length
const letters = `!"#$%&'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxy             `;
const l = letters.length;
class Singleton {
    constructor() { }
}
/** Global settings */
class GlobalSettings extends Singleton {
    constructor() {
        super(...arguments);
        this.listeners = new Map();
        this.MaxLength = 104;
        this.maxDropRate = 5;
        this.hueshift = 0;
    }
    static get instance() {
        if (!this._instance) {
            this._instance = new GlobalSettings();
        }
        return this._instance;
    }
    get w() { return window.innerWidth; }
    get h() { return window.innerHeight; }
    get cw() { return Math.ceil(this.w / this.fontSize); }
    get ch() { return Math.ceil(this.h / this.fontSize); }
    /**
     * Get JSON representation of settings for storage
     *
     * @returns {Object}
     */
    toJson() {
        return {
            blur: this.blur,
            density: this.density,
            framerate: this.framerate,
            hue: this.hue.toJson(),
            insane: this.insane,
            minColorValue: this.minColorValue,
            randomcharacters: this.randomcharacters,
            randomcharcolors: this.randomcharcolors,
            randomdropcolors: this.randomdropcolors,
            shifthue: this.shifthue,
            showfps: this.showfps,
            threshold: this.threshold,
        };
    }
    /**
     * Get string representation of settings
     *
     * @returns {string}
     */
    toString() {
        return JSON.stringify(this.toJson());
    }
}
const Global = new Proxy(GlobalSettings.instance, {
    set(o, p, v) {
        if (typeof o[p] !== 'function') {
            Reflect.set(o, p, v);
            const l = o.listeners.get(p);
            if (l) {
                l(v);
            }
            return true;
        }
    }
});
/** Text/number/color inputs that have their initial values set by JS */
const framerateInput = d.getElementById('framerate');
const densityInput = d.getElementById('density');
const colorInput = d.getElementById('pick-color');
/**
 * 0-pad to 2 digit hexadecimal
 *
 * @param   {number} n Integer
 * @returns {string}
 */
const toHex = (n) => `00${n.toString(16 /* N */)}`.slice(-2 /* Slice */);
function checkScreenSize(w, h) {
    return (Global.w <= w && Global.h <= h) || (Global.w <= h && Global.h <= w);
}
/**
 * Calculate font size based on screen size(s)
 *
 * @returns {void}
 */
/* tslint:disable:no-magic-numbers */
function calcFontSize() {
    if (checkScreenSize(800, 600)) {
        Global.fontSize = 10;
    }
    else if (checkScreenSize(1024, 768)) {
        Global.fontSize = 12;
    }
    else if (checkScreenSize(1600, 1200)) {
        Global.fontSize = 14;
    }
    else if (checkScreenSize(1920, 1200)) {
        Global.fontSize = 18;
    }
    else {
        Global.fontSize = 24;
    }
}
/* tslint:enable:no-magic-numbers */
/** Buffered random number generator singleton */
const generator = (function* randomGenerator() {
    const size = 65536;
    const r = new Uint8Array(size);
    let i = size;
    while (true) {
        if (i >= size) {
            crypto.getRandomValues(r);
            i = 0;
        }
        yield r[i++];
    }
})();
/**
 * Clamp a value between min and max
 *
 * @param   {number} v   Raw value
 * @param   {number} min Minimum value
 * @param   {number} max Maximum value
 *
 * @returns {number}
 */
// tslint:disable-next-line:max-line-length
const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
/**
 * Get the next random number
 *
 * @returns {number}
 */
const random = () => generator.next().value;
/**
 * Convert radians to degrees
 *
 * @param   {number} rad Radians
 *
 * @returns {number}
 */
const toDeg = (rad) => (rad / Math.PI) * 180 /* ToRadians */;
/**
 * Represents color in r,g,b and h,s,l
 *
 * @class
 */
class Color {
    /**
     * @constructor
     *
     * @param {number} R         Red component (int)
     * @param {number} G         Green component (int)
     * @param {number} B         Blue component (int)
     * @param {number} H         Hue value (deg)
     * @param {number} S         Saturation value (float)
     * @param {number} L         Lightness value (float)
     * @param {number} [a=1]     Alpha value (float)
     * @param {number} [r=R/255] Red component (float)
     * @param {number} [g=R/255] Green component (float)
     * @param {number} [b=R/255] Blue component (float)
     * @param {number} [s=S*100] Saturation value (pct)
     * @param {number} [l=L*100] Lightness value (pct)
     */
    constructor(R, G, B, H, S, L, a = 1, r = R / 255 /* MaxColorValue */, g = G / 255 /* MaxColorValue */, b = B / 255 /* MaxColorValue */, s = S * 100 /* PercentageConversion */, l = L * 100 /* PercentageConversion */) {
        this.R = R;
        this.G = G;
        this.B = B;
        this.H = H;
        this.S = S;
        this.L = L;
        this.a = a;
        this.r = r;
        this.g = g;
        this.b = b;
        this.s = s;
        this.l = l;
    }
    /**
     * Check to see if a color is black
     *
     * @param {Color} color Color to check
     */
    static isBlack(color) {
        return color.R === 0 && color.G === 0 && color.B === 0;
    }
    /**
     * Create a color from pre-computed values
     *
     * @param   {number} options.r Red
     * @param   {number} options.g Green
     * @param   {number} options.b Blue
     * @param   {number} options.h Hue
     * @param   {number} options.s Saturation
     * @param   {number} options.l Lightness
     *
     * @returns {Color}
     */
    static from({ r, g, b, h, s, l }) {
        return new Color(r, g, b, h, s, l);
    }
    /**
     * Create a Color object given only RGB values
     *
     * @param   {number} R Red component
     * @param   {number} G Green component
     * @param   {number} B Blue component
     *
     * @returns {Color}
     */
    static fromRGB(R, G, B) {
        const [H, S, L] = Color.calcHSL(R, G, B);
        return new Color(R, G, B, H, S, L);
    }
    /**
     * Create a Color object given only HSL values
     *
     * @param   {number} H Hue component
     * @param   {number} S Saturation component
     * @param   {number} L Lightness component
     *
     * @returns {Color}
     */
    static fromHSL(H, S, L) {
        const [R, G, B] = Color.calcRGB(H, S, L);
        return new Color(R, G, B, H, S, L);
    }
    /**
     * Generate a new color, calculating HSL from generated RGB.
     *
     * @param {number}  min      Minimum possible color component value
     * @param {number}  max      Maximum possible color component value
     * @param {boolean} override Override default color choice
     *
     * @returns {Color}
     */
    static create(min = 64, max = 255, override = false) {
        if (Global.randomdropcolors || Global.insane || override) {
            const R = clamp(random(), min, max);
            const G = clamp(random(), min, max);
            const B = clamp(random(), min, max);
            const [H, S, L] = Color.calcHSL(R, G, B);
            return new Color(R, G, B, H, S, L);
        }
        return Global.hue.clone();
    }
    /**
     * Generate a new random color
     *
     * @returns {Color}
     */
    static createRandom() {
        return this.create(undefined, undefined, true);
    }
    /**
     * Calculate H, S, L values based on R, G, B
     *
     * @param   {number} R Red component
     * @param   {number} G Green component
     * @param   {number} B Blue component
     *
     * @returns {[number,number,number]}
     */
    static calcHSL(R, G, B) {
        const r = R / 255 /* MaxColorValue */;
        const g = G / 255 /* MaxColorValue */;
        const b = B / 255 /* MaxColorValue */;
        const M = Math.max(r, g, b);
        const m = Math.min(r, g, b);
        const C = M - m;
        const S = 1;
        // tslint:disable-next-line:max-line-length
        const L = ((M * 0.5 /* LuminanceMult */) + (m * 0.5 /* LuminanceMult */));
        if (C === 0) {
            return [0, S, L];
        }
        let segment;
        let shift;
        // tslint:disable-next-line:prefer-switch
        if (M === r) {
            segment = g - b;
            shift = segment < 0 ? 6 /* HueSegments */ : 0;
        }
        else if (M === g) {
            segment = b - r;
            shift = 2 /* HueSegment2 */;
        }
        else if (M === b) {
            segment = r - g;
            shift = 4 /* HueSegment4 */;
        }
        return [toDeg((segment / C) + shift), S, L];
    }
    /**
     * Calculate R, G, B values based on H, S, L
     *
     * @param   {number} H Hue component
     * @param   {number} S Saturation component
     * @param   {number} L Lightness component
     *
     * @returns {[number, number, number]}
     */
    static calcRGB(H, S, L) {
        const C = (1 - Math.abs(L * 2 - 1)) * S;
        const h = H / 60 /* DegPerSegment */;
        const X = C * (1 - Math.abs((h % 2) - 1));
        let R = 0;
        let G = 0;
        let B = 0;
        if (h >= 0 && h <= 1 /* HueSegment1 */) {
            R = C;
            G = X;
        }
        else if (h <= 2 /* HueSegment2 */) {
            R = X;
            G = C;
        }
        else if (h <= 3 /* HueSegment3 */) {
            G = C;
            B = X;
        }
        else if (h <= 4 /* HueSegment4 */) {
            G = X;
            B = C;
        }
        else if (h <= 5 /* HueSegment5 */) {
            R = X;
            B = C;
        }
        else {
            R = C;
            B = X;
        }
        const m = L - (C / 2);
        return [
            (R + m) * 255 /* MaxColorValue */,
            (G + m) * 255 /* MaxColorValue */,
            (B + m) * 255 /* MaxColorValue */,
        ];
    }
    get h() {
        return this.H;
    }
    get rgb() {
        return `rgb(${this.R},${this.G},${this.B})`;
    }
    get rgba() {
        return `rgba(${this.R},${this.G},${this.B},${this.a})`;
    }
    get hsl() {
        return `hsl(${this.h},${this.s}%,${this.l}%)`;
    }
    get hsla() {
        return `hsla(${this.h},${this.s}%,${this.l}%,${this.a})`;
    }
    /**
     * Get a new color with the specified alpha value
     *
     * @param   {number} n Alpha
     *
     * @returns {Color}
     */
    alpha(n) {
        let a = n;
        if (a > 1) {
            a /= 255 /* MaxColorValue */;
        }
        const c = this.clone();
        c.a = a;
        return c;
    }
    /**
     * Shift color hue by given amount
     *
     * @param   {number} n Amount to shift by
     *
     * @returns {Color}
     */
    shift(n) {
        if (n % 360 /* Degrees */ === 0) {
            return this;
        }
        const c = this.clone();
        c.H = (c.H + n) % 360 /* Degrees */;
        [c.R, c.G, c.B] = Color.calcRGB(c.H, c.S, c.L);
        c.r = c.R / 255 /* MaxColorValue */;
        c.g = c.G / 255 /* MaxColorValue */;
        c.b = c.B / 255 /* MaxColorValue */;
        return c;
    }
    /**
     * Clone this color
     *
     * @returns {Color}
     */
    clone() {
        return new Color(this.R, this.G, this.B, this.H, this.S, this.L, this.a, this.r, this.g, this.b, this.s, this.l);
    }
    toJson() {
        return {
            b: this.B,
            g: this.G,
            r: this.R,
        };
    }
}
/**
 * Calculate some settings based on other settings
 *
 * @returns {void}
 */
function calcSettings() {
    Global.framerateDelay = 1000 /* MSPerSecond */ / (Global.framerate + 1);
    Global.threshold = Math.floor(255 /* MaxColorValue */ * (1 - Global.density));
    calcFontSize();
    Global.maxLength = Math.min(Global.MaxLength, Global.ch * 2);
    framerateInput.value = Global.framerate.toString();
    densityInput.value = Global.density.toString();
    const { R, G, B } = Global.hue;
    colorInput.value = `#${toHex(R)}${toHex(G)}${toHex(B)}`;
    window.requestAnimationFrame(firstDraw);
}
/**
 * Reset to default settings
 *
 * @returns {void}
 */
function resetDefaults() {
    Global.minColorValue = 32 /* DefaultMinColorValue */;
    Global.framerate = 30 /* DefaultFramerate */;
    Global.blur = true;
    Global.randomdropcolors = false;
    Global.randomcharacters = false;
    Global.randomcharcolors = false;
    Global.shifthue = false;
    Global.insane = false;
    Global.showfps = true;
    Global.hue = Color.fromRGB(0, 255 /* MaxColorValue */, 0);
    Global.density = 0.125; // tslint:disable-line:no-magic-numbers
    localStorage.setItem('settings', Global.toString());
    calcSettings();
}
/**
 * Reset to last saved settings
 *
 * @returns {void}
 */
function reset() {
    // tslint:disable-next-line:max-line-length
    const settings = (JSON.parse(localStorage.getItem('settings')) || {});
    // tslint:disable-next-line:max-line-length
    Global.minColorValue = settings.minColorValue || 32 /* DefaultMinColorValue */;
    Global.framerate = settings.framerate || 30 /* DefaultFramerate */;
    Global.blur = settings.blur || false;
    Global.randomdropcolors = settings.randomdropcolors || false;
    Global.randomcharacters = settings.randomcharacters || false;
    Global.randomcharcolors = settings.randomcharcolors || false;
    Global.shifthue = settings.shifthue || false;
    Global.insane = settings.insane || false;
    Global.showfps = settings.showfps || false;
    if (settings.hue) {
        const { r, g, b } = settings.hue;
        Global.hue = Color.fromRGB(r, g, b);
    }
    else {
        Global.hue = Color.fromRGB(0, 255 /* MaxColorValue */, 0);
    }
    // tslint:disable-next-line:no-magic-numbers
    Global.density = settings.density || 0.125;
    calcSettings();
}
/**
 * Set a click handler on all elements with a given selector
 *
 * @param   {string}   selector Element selector string
 * @param   {Function} callback Click handler
 *
 * @returns {void}
 */
function handleClick(selector, callback) {
    d.querySelectorAll(selector).forEach(el => {
        el.onclick = callback;
    });
}
/**
 * When the max framerate input changes, update minimum frame delay
 *
 * @param   {HTMLInput} options.target Element changed
 *
 * @returns {void}
 */
framerateInput.onchange = ({ target }) => {
    const desired = Number.parseFloat(target.value);
    Global.framerate = desired;
    // tslint:disable-next-line:no-bitwise
    Global.framerateDelay = (1000 /* MSPerSecond */ / desired) | 0;
};
/**
 * When the density input changes, update threshold
 *
 * @param   {HTMLInput} options.target Element changed
 *
 * @returns {void}
 */
densityInput.onchange = ({ target }) => {
    Global.density = Number.parseFloat(target.value);
    Global.threshold = Math.floor(255 /* MaxColorValue */ * (1 - Global.density));
};
/**
 * When the color input changes, parse the hex color string for global R, G, B
 *
 * @param   {HTMLInput} options.target Element changed
 *
 * @returns {void}
 */
colorInput.onchange = ({ target }) => {
    const { value } = target;
    const { minColorValue } = Global;
    const offset = 2;
    let idx = 1;
    const R = Number.parseInt(value.slice(idx, (idx += offset)), 16 /* N */);
    const G = Number.parseInt(value.slice(idx, (idx += offset)), 16 /* N */);
    const B = Number.parseInt(value.slice(idx, (idx += offset)), 16 /* N */);
    Global.hue = Color.fromRGB(R, G, B);
    Global.hue.s = 100 /* PercentageConversion */;
    target.value = `#${toHex(R)}${toHex(G)}${toHex(B)}`;
};
handleClick('#hardreset', () => {
    if (confirm('Are you sure you want to reset everything to defaults?')) {
        resetDefaults();
    }
});
handleClick('#reset', reset);
handleClick('#toggleblur', () => {
    Global.blur = !Global.blur;
    ctx.shadowBlur = Global.blur ? Global.fontSize / 2 : 0;
});
handleClick('#dropcolors', () => {
    if (!Global.randomcharcolors) {
        Global.randomdropcolors = !Global.randomdropcolors;
    }
});
handleClick('#randomchars', () => {
    Global.randomcharacters = !Global.randomcharacters;
});
handleClick('#randomcharcolors', () => {
    Global.randomcharcolors = !Global.randomcharcolors;
});
handleClick('#crazy', () => {
    Global.insane = !Global.insane;
});
handleClick('#togglefps', () => {
    Global.showfps = !Global.showfps;
});
handleClick('#shifthue', () => {
    Global.shifthue = !Global.shifthue;
});
d.querySelectorAll('button[data-prop]').forEach(el => {
    const prop = el.getAttribute('data-prop');
    if (Global[prop]) {
        el.classList.add('active');
    }
    Global.listeners.set(prop, v => {
        if (v) {
            el.classList.add('active');
        }
        else {
            el.classList.remove('active');
        }
    });
});
/**
 * Get the next random letter
 *
 * @returns {string}
 */
const letter = () => letters[random() % l];
/**
 * Beat the threshold the next `n` times
 *
 * @returns {boolean}
 */
const beatsThreshold = (n, threshold = Global.threshold) => {
    for (let i = 0; i < n; i++) {
        if (random() <= threshold) {
            return false;
        }
    }
    return true;
};
const fadeRate = 4;
const characters = new Set();
// tslint:disable-next-line:no-magic-numbers
const charFlipThreshold = 255 /* MaxColorValue */ * 0.98;
/**
 * Represents a single character on screen
 *
 * @class
 */
class Character {
    /**
     * @constructor
     *
     * @param {number} cx   Character X
     * @param {number} cy   Character Y
     * @param {number} fade Fade rate
     * @param {Color}  hue  Character color
     */
    constructor(cx, cy, fade, hue) {
        this.cx = cx;
        this.cy = cy;
        this.fade = fade;
        this.sets = new Set();
        this._canFlip = true;
        this.letter = letter();
        this.opacity = 255 /* Max */;
        this.hue = Global.randomcharcolors ? Color.createRandom() : hue;
    }
    /**
     * This character can be flipped to another character
     *
     * @returns {[type]}
     */
    get canFlip() {
        return (this._canFlip &&
            this.opacity > 127 /* Half */ &&
            this.opacity < 340.3333333333333 /* ThreeQuarter */);
    }
    set canFlip(v) {
        this._canFlip = v;
    }
    /**
     * Calculate next frame's character settings (opacity, etc.)
     *
     * @returns {void}
     */
    update() {
        if (Global.randomcharacters || Global.insane) {
            this.letter = letter();
        }
        if (Global.insane) {
            this.hue = Color.create(undefined, undefined, true);
        }
        if (this.opacity < 127 /* Half */) {
            this.canFlip = false;
        }
        // Only flip character if next three random numbers are all above the
        // threshold
        if (this.canFlip && beatsThreshold(2, charFlipThreshold)) {
            this.canFlip = false;
            this.letter = letter();
            this.opacity = 255 /* Max */;
            this.fade *= 1.5; // tslint:disable-line:no-magic-numbers
        }
        else {
            // Otherwise, reduce opacity
            this.opacity -= this.fade;
            // Remove this character from the render if it's no longer visible
            if (this.opacity <= 0) {
                this.delete();
            }
        }
    }
    /**
     * Render character on screen
     *
     * @param   {CanvasContext} ctx Context to render in
     * @returns {void}
     */
    render(ctx) {
        // If the letter is currently a space, don't waste time rendering anything
        if (this.letter !== ' ' &&
            !Color.isBlack(this.hue) ||
            this.opacity === 255 /* Max */) {
            const color = this.hue.shift(Global.shifthue ? Global.hueshift : 0);
            if (Global.blur /* && Global.randomcharcolors*/) {
                ctx.shadowColor = color.rgb;
            }
            ctx.fillStyle = this.opacity === 255 /* Max */ ?
                'rgb(255,255,255)' : color.alpha(this.opacity / 255 /* Max */).rgba;
            ctx.fillText(this.letter, (this.cx * Global.fontSize) + (Global.fontSize / 2), this.cy * Global.fontSize);
        }
    }
    /**
     * Add this character to a given set
     *
     * @param {Set<Character>} set Set to add to
     */
    addToSet(set) {
        set.add(this);
        this.sets.add(set);
    }
    /**
     * Remove this character from existence
     *
     * @returns {void}
     */
    delete() {
        this.sets.forEach(set => { set.delete(this); });
    }
}
/**
 * This represents a "raindrop" of characters
 *
 * @class
 */
class DroppingCharacters {
    /**
     * @constructor
     *
     * @param {number} x Raindrop X position
     */
    constructor(x) {
        this.x = x;
        this.length = Math.max(fadeRate * 4 /* MinFadeDistance */, random() % Global.maxLength);
        this.fadeRate = Math.ceil(256 /* Full */ / this.length);
        this.hue = Color.create();
        this.characters = new Set();
        this.sets = new Set();
        this._y = 1;
        this.rate = beatsThreshold(2) ?
            Math.max(1, random() % Global.maxDropRate) :
            Math.max(1, random() % Math.ceil(Global.maxDropRate / 2));
    }
    get y() {
        return this._y;
    }
    /**
     * Update this "raindrop" and the characters inside
     *
     * @returns {void}
     */
    update() {
        if (this._y <= Global.ch) {
            // Generate new characters in accordance with the drop rate
            for (let i = 0; i < this.rate; i++) {
                // Update all characters opacity so that character fade is correct
                this.characters.forEach(character => {
                    character.update();
                });
                const char = new Character(this.x, this.y + i, this.fadeRate, this.hue);
                char.addToSet(this.characters);
                char.addToSet(characters);
            }
            this._y += this.rate;
        }
        else {
            this.characters.forEach(character => {
                character.update();
            });
        }
        if (this.characters.size === 0) {
            this.delete();
        }
    }
    /**
     * Add this character to a given set
     *
     * @param {Set<DroppingCharacters>} set Set to add to
     */
    addToSet(set) {
        set.add(this);
        this.sets.add(set);
    }
    /**
     * Remove this drop and all characters in it from existence
     *
     * @returns {void}
     */
    delete() {
        this.characters.forEach(character => {
            character.delete();
        });
        this.sets.forEach(set => { set.delete(this); });
    }
}
const pendingDrops = [];
function createDrop(x) {
    if (pendingDrops.length) {
        const drop = pendingDrops.shift();
        drop.x = x;
        return drop;
    }
    return new DroppingCharacters(x);
}
/**
 * Represents a single column of characters/"raindrops"
 *
 * @class
 */
class Column {
    /**
     * @constructor
     * @param       {number} x X position
     */
    constructor(x) {
        this.x = x;
        this.drops = new Set();
    }
    /**
     * Update all drops in this column, potentially adding new drops as well
     *
     * @returns {void}
     */
    update() {
        if (random() > Global.threshold) {
            this.start();
        }
        if (!this.drops.size) {
            this.lastDrop = undefined;
        }
        this.drops.forEach(drop => {
            drop.update();
        });
    }
    /**
     * Initialize the column so that there aren't a bunch of drops starting at the
     * same time
     *
     * @returns {this}
     */
    init() {
        const n = random() % Global.maxLength;
        for (let i = 0; i < n; i++) {
            this.update();
        }
        return this;
    }
    /**
     * Remove this column and everything in it from existence
     *
     * @returns {void}
     */
    delete() {
        this.drops.forEach(drop => {
            drop.delete();
        });
    }
    /**
     * Start a new "raindrop" (if appropriate)
     *
     * @returns {void}
     */
    start() {
        const last = this.lastDrop;
        // If there is no last drop, create a new one
        if (!last) {
            this.lastDrop = createDrop(this.x);
            this.lastDrop.addToSet(this.drops);
        }
        else if (last.y > last.length) {
            // If the previous drop is completely on screen, generate a new "raindrop"
            const drop = createDrop(this.x);
            const { length, rate, y } = last;
            // If the new "raindrop" won't catch up with the last "raindrop", allow it
            // tslint:disable-next-line:no-magic-numbers
            if (y - length >= ((Global.ch - (length * 0.75)) / rate) * drop.rate) {
                // if (last.y > (last.length * last.rate) * drop.rate) {
                (this.lastDrop = drop).addToSet(this.drops);
            }
            else {
                pendingDrops.push(drop);
            }
        }
    }
}
const columns = [];
/**
 * Resize everything on screen according to new screen size
 *
 * @returns {void}
 */
function resizeEverything() {
    calcSettings();
    c.width = Global.w;
    c.height = Global.h;
    if (columns.length > Global.cw) {
        for (let i = Global.cw; i < columns.length; i++) {
            columns[i].delete();
        }
        columns.length = Global.cw;
    }
    else {
        for (let i = columns.length; i < Global.cw; i++) {
            columns.push(new Column(i).init());
        }
    }
    window.requestAnimationFrame(firstDraw);
}
let stopRendering = false;
let lastFrame;
/** FPS Counter */
class FPS extends Singleton {
    constructor() {
        super(...arguments);
        this.hPadding = 2;
        this.vPadding = 2;
        this.size = 10;
        this.hist = [];
        // tslint:disable-next-line:no-magic-numbers
        this.w = this.size * 6 + this.hPadding;
        this.h = this.size + this.vPadding;
        this.cw = this.w / 2;
        this.ch = this.h - this.vPadding;
    }
    static get instance() {
        if (!this._instance) {
            this._instance = new FPS();
        }
        return this._instance;
    }
    /**
     * Render the FPS Counter
     *
     * @param   {number}        time Duration between frames
     * @param   {CanvasContext} ctx  Canvas context to render on
     * @returns {void}
     */
    render(time, ctx) {
        const { hist, size, w, h, cw, ch } = this;
        hist.push(1000 /* MSPerSecond */ / time);
        // Calculate framerate over last 5 frames
        if (hist.length > 5) { // tslint:disable-line:no-magic-numbers
            hist.shift();
        }
        const framerate = hist.reduce((acc, h) => acc + h, 0) / hist.length;
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = `${size}px monospace`;
        ctx.fillText(`${framerate.toFixed(2)} FPS`, cw, ch);
        ctx.restore();
    }
}
/**
 * Draw a frame (post-init)
 *
 * @param   {number} now Current time (from `performance.now()`)
 * @returns {void}
 */
async function draw(now) {
    if (stopRendering) {
        return;
    }
    // Set up next draw call (continue main render loop)
    window.requestAnimationFrame(draw);
    // Calculate time difference between frames
    const diff = now - lastFrame;
    // If it's been less than `Global.framerateDelay` milliseconds between frames,
    // don't render anything
    if (diff < Global.framerateDelay) {
        return;
    }
    lastFrame = now;
    // Update columns, raindrops, characters, etc.
    columns.forEach(column => {
        column.update();
    });
    // Calculate hue shift for frame, if necessary
    if (Global.shifthue) {
        // tslint:disable-next-line:no-magic-numbers
        Global.hueshift = (Global.hueshift + 0.5) % 360 /* Degrees */;
    }
    // Clear last frame
    if (Global.insane) {
        const hue = Color.create(0, 32 /* DefaultMinColorValue */);
        ctx.fillStyle = hue.rgb;
        ctx.fillRect(0, 0, Global.w, Global.h);
    }
    else {
        ctx.clearRect(0, 0, Global.w, Global.h);
    }
    // If blur is enabled and drops/characters aren't set to use random colors,
    // set the shadow color once
    // if (Global.blur && !(Global.randomcharcolors || Global.randomdropcolors)) {
    //   let hue = Global.hue;
    //   if (Global.shifthue) {
    //     hue = hue.shift(Global.hueshift);
    //   }
    //   ctx.shadowColor = hue.rgb;
    // }
    // Render characters on screen
    characters.forEach(character => {
        character.render(ctx);
    });
    // Render the FPS Counter
    if (Global.showfps) {
        FPS.instance.render(diff, ctx);
    }
}
/**
 * First draw after resize, tab active, refresh, etc.
 *
 * @param   {number} now Current time
 * @returns {void}
 */
async function firstDraw(now) {
    stopRendering = false;
    // Set up basic canvas settings
    ctx.font = `${Global.fontSize}px Matrix`;
    ctx.textAlign = 'center';
    if (Global.blur) {
        ctx.shadowBlur = Global.fontSize / 2;
    }
    // Begin main render loop
    window.requestAnimationFrame(draw);
}
/** On window resize, pause rendering while settings are recalculated */
window.addEventListener('resize', () => {
    stopRendering = true;
    resizeEverything();
}, { passive: true });
/** Set up a tab visibility change listener to (un)pause rendering */
d.addEventListener('visibilitychange', () => {
    if (d.hidden) { // Stop main render loop
        stopRendering = true;
    }
    else { // Restart render loop
        window.requestAnimationFrame(firstDraw);
    }
});
/** Save current settings before refresh */
window.onbeforeunload = () => {
    localStorage.setItem('settings', Global.toString());
};
reset(); // Restore stored values
// Initialize columns
columns.length = Global.cw;
for (let i = 0; i < Global.cw; i++) {
    columns[i] = new Column(i).init();
}
resizeEverything(); // Resize canvas for current screen size
/** Set canvas operation type */
ctx.globalCompositeOperation = 'normal';
window.requestAnimationFrame(firstDraw); // Begin render loop
