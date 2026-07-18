import { describe, it, expect, beforeEach } from "vitest";
import { loadGame } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("iOS-safe skin recolor (v5.18)", () => {
  it("skinFilter path removed: hslRecolor is manual pixel op, returns canvas", () => {
    const win = g.win;
    const img = new win.Image();
    img.src = "data:x";
    const out = g.hp.hslRecolor(img, 120, 1);
    // stub getImageData works → returns canvas element, NOT the img
    expect(out.tagName).toBe("CANVAS");
  });

  it("hslRecolor falls back to original img if getImageData throws (CORS/iOS edge)", () => {
    const win = g.win;
    const img = new win.Image();
    img.src = "data:x";
    const proto = win.HTMLCanvasElement.prototype;
    const orig = proto.getContext;
    proto.getContext = function () {
      const c = orig.call(this);
      c.getImageData = () => { throw new Error("blocked"); };
      return c;
    };
    const out = g.hp.hslRecolor(img, 120, 1);
    proto.getContext = orig;
    expect(out).toBe(img);
  });

  it("SKIN_CACHE: skinnedImg computes once per char:pose:skin", () => {
    const def = g.hp.CHAR_SKIN_DEFS.find(d => d.hue);
    expect(def).toBeTruthy();
    const charId = "cat"; // chicken vẽ procedural, không có CHAR_POSE
    const a = g.hp.skinnedImg(charId, "idle", def.id);
    expect(a).toBeTruthy();
    const b = g.hp.skinnedImg(charId, "idle", def.id);
    expect(a).toBe(b); // same object = cache hit, no recompute per frame
    expect(g.hp.SKIN_CACHE[charId + ":idle:" + def.id]).toBe(a);
  });

  it("orig skin bypasses recolor entirely", () => {
    const im = g.hp.poseImg("pig", "idle");
    const out = g.hp.skinnedImg("pig", "idle", "orig");
    expect(out).toBe(im);
  });

  it("4 skin defs per char pricing 400/700/1000", () => {
    const priced = g.hp.CHAR_SKIN_DEFS.filter(d => d.price).map(d => d.price).sort((x, y) => x - y);
    expect(priced).toEqual([400, 700, 1000]);
  });
});

describe("recolor math", () => {
  it("hue rotate 180 flips red→cyan on real pixels", () => {
    const win = g.win;
    // build a real 1x1 red image via stubbed pipeline
    const proto = win.HTMLCanvasElement.prototype;
    const orig = proto.getContext;
    proto.getContext = function () {
      if (!this.__ctxReal) {
        const c = orig.call(this);
        const data = new win.Uint8ClampedArray([255, 0, 0, 255]);
        c.getImageData = () => ({ width: 1, height: 1, data });
        c.putImageData = () => { this.__out = data; };
        this.__ctxReal = c;
      }
      return this.__ctxReal;
    };
    const img = new win.Image();
    img.width = img.naturalWidth = 1; img.height = img.naturalHeight = 1;
    const cv = g.hp.hslRecolor(img, 180, 1);
    proto.getContext = orig;
    const d = cv.__out;
    expect(d[0]).toBe(0);      // R gone
    expect(d[1]).toBe(255);    // G
    expect(d[2]).toBe(255);    // B → cyan
    expect(d[3]).toBe(255);    // alpha preserved
  });
});
