/* HangPig test harness — jsdom loads index.html, stubs canvas/audio/image, returns window.__hp */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = process.env.HP_HTML || path.join(__dirname, "..", "index.html");

function ctx2dStub(win, cv) {
  const g = { addColorStop() {} };
  return {
    canvas: cv, imageSmoothingEnabled: false,
    fillStyle: "", strokeStyle: "", lineWidth: 1, globalAlpha: 1,
    font: "", textAlign: "", textBaseline: "", lineCap: "", lineJoin: "",
    shadowBlur: 0, shadowColor: "", filter: "none",
    clearRect() {}, fillRect() {}, strokeRect() {}, drawImage() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    ellipse() {}, rect() {}, roundRect() {}, quadraticCurveTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, clip() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    setTransform() {}, setLineDash() {},
    fillText() {}, strokeText() {}, measureText: () => ({ width: 10 }),
    createLinearGradient: () => g, createRadialGradient: () => g, createPattern: () => null,
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new win.Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
  };
}

function audioStub() {
  const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
  return class FakeAC {
    constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; this.sampleRate = 44100; }
    createOscillator() { return { type: "", frequency: { ...param }, detune: { ...param }, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }; }
    createGain() { return { gain: { ...param }, connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { type: "", frequency: { ...param }, Q: { ...param }, gain: { ...param }, connect() {}, disconnect() {} }; }
    createBufferSource() { return { buffer: null, loop: false, playbackRate: { ...param }, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }; }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len || 1), duration: 0 }; }
    createDynamicsCompressor() { return { threshold: { ...param }, knee: { ...param }, ratio: { ...param }, attack: { ...param }, release: { ...param }, connect() {}, disconnect() {} }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
}

export function loadGame(opts = {}) {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const dom = new JSDOM(html, {
    url: "https://hangpig.test/" + (opts.bust || Math.random()),
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () {
        this.__ctx = this.__ctx || ctx2dStub(w, this);
        return this.__ctx;
      };
      const AC = audioStub();
      w.AudioContext = AC;
      w.webkitAudioContext = AC;
      w.Image = class {
        constructor() { this.width = 48; this.height = 48; this.naturalWidth = 48; this.naturalHeight = 48; this.complete = false; }
        set src(v) { this._src = v; this.complete = true; if (this.onload) setTimeout(() => this.onload(), 0); }
        get src() { return this._src; }
      };
      if (!w.matchMedia) w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.requestAnimationFrame = cb => w.setTimeout(() => cb(w.performance.now()), 16);
      w.cancelAnimationFrame = id => w.clearTimeout(id);
      try { w.navigator.vibrate = () => {}; } catch (e) {}
      if (opts.storage) {
        for (const [k, v] of Object.entries(opts.storage)) w.localStorage.setItem(k, v);
      }
    },
  });
  const w = dom.window;
  if (!w.__hp) throw new Error("window.__hp missing — game script crashed during load");
  return { dom, win: w, hp: w.__hp, $: id => w.document.getElementById(id) };
}

/* Play one classic round to completion. win=true: guess word letters. Returns coin delta.
   noFever=true: reset combo after each correct guess so FEVER never triggers (isolate base formula). */
export function playRound(g, { win = true, wrongFirst = 0, noFever = false } = {}) {
  const { hp } = g;
  const before = hp.stats.coins || 0;
  const st = hp.state;
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let wrongs = 0;
  for (const L of ABC) {
    if (wrongs >= wrongFirst) break;
    if (!st.word.includes(L) && !st.wrongSet.has(L)) { hp.guess(L); wrongs++; }
  }
  if (win) {
    for (const L of new Set(st.word.split(""))) {
      if (!st.revealed.has(L)) {
        hp.guess(L);
        if (noFever) st.combo = 0;
      }
    }
  } else {
    for (const L of ABC) {
      if (st.over) break;
      if (!st.word.includes(L) && !st.wrongSet.has(L)) hp.guess(L);
    }
  }
  return (hp.stats.coins || 0) - before;
}
