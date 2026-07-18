import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => {
  g = loadGame();
  g.hp.setDiff("normal");
  g.hp.startGame("ANIMALS");
});

function forceBossRound() {
  for (let i = 0; i < 5; i++) { playRound(g, { win: true, noFever: true }); g.hp.newRound(); }
}

describe("FX pack v5.22 — bossMotion", () => {
  it("tra ve so huu han cho ca 10 boss o nhieu thoi diem", () => {
    for (const K of g.hp.BOSS_KINDS) {
      for (const t of [0, 137, 555, 1600, 2400, 9999]) {
        for (const rage of [false, true]) {
          const m = g.hp.bossMotion(K, t, rage);
          for (const k of ["dx", "dy", "rot", "sqx", "sqy"]) {
            expect(Number.isFinite(m[k]), `${K.id} t=${t} ${k}`).toBe(true);
          }
          expect(m.sqx).toBeGreaterThan(0.5);
          expect(m.sqy).toBeGreaterThan(0.5);
        }
      }
    }
  });

  it("moi boss co motion khac nhau (khong phai tat ca giong wolf)", () => {
    const t = 555;
    const sig = K => { const m = g.hp.bossMotion(K, t, false); return [m.dx, m.dy, m.rot, m.sqx, m.sqy].join(","); };
    const wolf = sig(g.hp.BOSS_KINDS[0]);
    const diff = g.hp.BOSS_KINDS.slice(1).filter(K => sig(K) !== wolf);
    expect(diff.length).toBeGreaterThanOrEqual(6);
  });
});

describe("FX pack v5.22 — pig punt/flinch", () => {
  it("doan dung trong boss round -> pigFx = punt", () => {
    forceBossRound();
    const st = g.hp.state;
    const L = [...new Set(st.word.split(""))].find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(g.hp.pigFx.type).toBe("punt");
  });

  it("doan dung round thuong -> van la hop", () => {
    const st = g.hp.state;
    const L = [...new Set(st.word.split(""))].find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(g.hp.pigFx.type).toBe("hop");
  });

  it("bong boss cham pig -> pigHitT set + pig flinch", () => {
    forceBossRound();
    g.hp.bossThrow("down");
    g.hp.bossFx.anim.t0 = g.win.performance.now() - 99999; /* ep anim ket thuc (dong ho jsdom) */
    g.hp.updateBossFx();
    expect(g.hp.bossFx.pigHitT).toBeGreaterThan(0);
    expect(g.hp.pigFx.type).toBe("flinch");
  });
});

describe("FX pack v5.22 — intro + death", () => {
  it("vao boss round -> introT set, dieT reset", () => {
    forceBossRound();
    expect(g.hp.bossFx.introT).toBeGreaterThan(0);
    expect(g.hp.bossFx.dieT).toBe(0);
  });

  it("thang boss -> dieT + dieKind dung loai boss", () => {
    forceBossRound();
    const kid = g.hp.bossKind().id;
    playRound(g, { win: true, noFever: true });
    expect(g.hp.bossFx.dieT).toBeGreaterThan(0);
    expect(g.hp.bossFx.dieKind).toBe(kid);
    expect(g.hp.bossFx.dieH).toBeGreaterThan(50);
  });

  it("drawBossDeath khong crash va tu tat sau 950ms", () => {
    forceBossRound();
    playRound(g, { win: true, noFever: true });
    g.hp.drawBossDeath(); /* dang chay */
    expect(g.hp.bossFx.dieT).toBeGreaterThan(0);
    g.hp.bossFx.dieT = g.win.performance.now() - 2000; /* qua han (dong ho cua jsdom) */
    g.hp.drawBossDeath();
    expect(g.hp.bossFx.dieT).toBe(0);
  });
});

describe("FX pack v5.22 — bossAmbient", () => {
  it("khong crash cho ca 10 boss tren dai thoi gian", () => {
    forceBossRound();
    for (const K of g.hp.BOSS_KINDS) {
      for (let t = 0; t < 3000; t += 16) g.hp.bossAmbient(K, t, 460, 96, 110, 105);
    }
  });
});
