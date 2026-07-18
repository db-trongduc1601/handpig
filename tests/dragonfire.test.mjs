import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => {
  g = loadGame();
  g.hp.setDiff("normal");
});

function forceBossN(n) {
  /* ep boss ke tiep la BOSS_KINDS[n-1] */
  g.hp.startGame("ANIMALS");
  g.hp.state.bossN = n - 1;
  for (let i = 0; i < 5; i++) { playRound(g, { win: true, noFever: true }); g.hp.newRound(); }
}

describe("v5.23 — dragon fire", () => {
  it("fireBreath co export va khong crash", () => {
    g.hp.startGame("ANIMALS");
    expect(typeof g.hp.fireBreath).toBe("function");
    g.hp.fireBreath(100, 100, 1, 10);
    g.hp.fireBreath(100, 100, -1, 10);
  });

  it("boss thu 9 la rong, bossThrow down khong crash (phun lua)", () => {
    forceBossN(9);
    expect(g.hp.bossKind().id).toBe("dragon");
    g.hp.bossThrow("down");
    expect(g.hp.bossFx.anim.type).toBe("down");
  });

  it("char rong doan dung khong crash (phun lua)", () => {
    g.hp.setChar("dragon");
    g.hp.startGame("ANIMALS");
    const st = g.hp.state;
    const L = [...new Set(st.word.split(""))].find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(st.revealed.has(L)).toBe(true);
  });
});

describe("v5.23 — dragon bay trong runner", () => {
  it("v5.25: RUNPERK dragon = fly + dbljump (lay lai double jump)", () => {
    expect(g.hp.RUNPERK.dragon.fly).toBe(true);
    expect(g.hp.RUNPERK.dragon.dbljump).toBe(true);
  });

  it("v5.25: double jump 1 lan, KHONG flap vo han (het nhay lien tuc)", () => {
    g.hp.setChar("dragon");
    g.hp.startRunner();
    const run = g.hp.run;
    g.hp.runJump();            /* nhay tu dat */
    expect(run.vy).toBeLessThan(0);
    run.y = -50; run.vy = 5;   /* dang roi */
    g.hp.runJump();            /* double jump - duoc */
    expect(run.vy).toBeLessThan(0);
    run.vy = 5;
    g.hp.runJump();            /* lan 3 giua khong trung - KHONG duoc */
    expect(run.vy).toBe(5);
    g.hp.exitRunner();
  });

  it("tran bay: updateRun kep y >= -172, danh dau _ceil, xoa khi dap dat", () => {
    g.hp.setChar("dragon");
    g.hp.startRunner();
    const run = g.hp.run;
    run.started = true; run.over = false;
    run.y = -400; run.vy = -12;
    g.hp.updateRun(performance.now());
    expect(run.y).toBeGreaterThanOrEqual(-172.0001);
    expect(run._ceil).toBe(true);      /* v5.25: khoa frame bay tai tran */
    run.y = 0.5; run.vy = 2;           /* sap cham dat */
    g.hp.updateRun(performance.now());
    expect(run._ceil).toBe(false);     /* dap dat -> ve frame binh thuong */
    g.hp.exitRunner();
  });

  it("char thuong (pig) khong duoc flap lien tuc", () => {
    g.hp.setChar("pig");
    g.hp.startRunner();
    const run = g.hp.run;
    g.hp.runJump();
    run.y = -50; run.vy = 5;
    g.hp.runJump();            /* khong dbljump, khong fly -> vy giu nguyen */
    expect(run.vy).toBe(5);
    g.hp.exitRunner();
  });
});

describe("v5.24 — dragon anim 10 frame (anh nguoi dung)", () => {
  it("du 5 frame FIRE + 5 frame FLY, deu la data-uri png", () => {
    expect(g.hp.DRAGON_FIRE.length).toBe(5);
    expect(g.hp.DRAGON_FLY.length).toBe(5);
    for (const im of [...g.hp.DRAGON_FIRE, ...g.hp.DRAGON_FLY]) {
      expect(im.src.startsWith("data:image/png;base64,")).toBe(true);
    }
  });

  it("dragonFireAnim chi chay khi char = dragon", () => {
    g.hp.setChar("pig");
    g.hp.dragonFireAnim(500);
    expect(g.hp.dragonFx.t0).toBe(0);
    g.hp.setChar("dragon");
    g.hp.dragonFireAnim(500);
    expect(g.hp.dragonFx.t0).toBeGreaterThan(0);
  });

  it("dragonFireFrame tra frame khi active, tu reset khi het han", () => {
    g.hp.setChar("dragon");
    g.hp.dragonFireAnim(500);
    const im = g.hp.dragonFireFrame();
    expect(im === null || !!im.src).toBe(true); /* jsdom stub Image van co src */
    g.hp.dragonFx.t0 = g.win.performance.now() - 9999; /* het han */
    expect(g.hp.dragonFireFrame()).toBe(null);
    expect(g.hp.dragonFx.t0).toBe(0);
  });

  it("char rong doan dung -> kich hoat anim phun lua", () => {
    g.hp.setChar("dragon");
    g.hp.startGame("ANIMALS");
    const st = g.hp.state;
    const L = [...new Set(st.word.split(""))].find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(g.hp.dragonFx.t0).toBeGreaterThan(0);
  });
});
