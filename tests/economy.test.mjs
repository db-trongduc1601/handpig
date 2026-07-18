import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("coin formula", () => {
  it("perfect classic win (normal): 6 + maxM*3 = 24¢", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    const d = playRound(g, { win: true, noFever: true });
    expect(d).toBe(6 + 6 * 3);
  });

  it("win with 2 misses (normal): 6 + 4*3 = 18¢", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    const d = playRound(g, { win: true, wrongFirst: 2, noFever: true });
    expect(d).toBe(6 + 4 * 3);
  });

  it("lose pays 0¢", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    const d = playRound(g, { win: false });
    expect(d).toBe(0);
  });

  it("boss win: coins ×5 (24 → 120¢) + fever kích hoạt", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.state.boss = true;
    const d = playRound(g, { win: true, noFever: true });
    expect(d).toBe(24 * 5);
    expect(g.hp.feverOn()).toBe(true); // thang boss -> vao FEVER
  });

  it("streak-5 milestone adds +15¢ (boss word comes NEXT round)", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    for (let i = 0; i < 4; i++) { playRound(g, { win: true, noFever: true }); g.hp.newRound(); }
    const d = playRound(g, { win: true, noFever: true }); // streak becomes 5 → +15 milestone
    expect(d).toBe(24 + 15);
    g.hp.newRound(); // streak 5 % 5 === 0 → this round is boss
    expect(g.hp.state.boss).toBe(true);
  });
});

describe("hint economics", () => {
  it("hint cost 15 first, 40 after", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    expect(g.hp.hintCost()).toBe(15);
    g.hp.state.hintsUsed = 1;
    expect(g.hp.hintCost()).toBe(40);
  });
});

describe("addCoins bookkeeping", () => {
  it("earn increases coins + totalCoins; spend only coins (starter = 50¢)", () => {
    expect(g.hp.stats.coins).toBe(50); // new-player starter coins
    const t0 = g.hp.stats.totalCoins || 0;
    g.hp.addCoins(100);
    expect(g.hp.stats.coins).toBe(150);
    expect(g.hp.stats.totalCoins).toBe(t0 + 100);
    g.hp.addCoins(-40);
    expect(g.hp.stats.coins).toBe(110);
    expect(g.hp.stats.totalCoins).toBe(t0 + 100); // spend không giảm totalCoins
  });
});

describe("achievement rewards", () => {
  it("rewards escalate 50→800 (50*2^i)", () => {
    expect([0, 1, 2, 3, 4].map(g.hp.achReward)).toEqual([50, 100, 200, 400, 800]);
  });

  it("claim requires threshold met, pays reward, levels up", () => {
    const a = g.hp.ACHS.find(x => x.id === "wins");
    g.hp.claimAch("wins"); // 0 wins < 10 → no-op
    expect(g.hp.achLevel(a)).toBe(0);
    g.hp.stats.wins = 10;
    const before = g.hp.stats.coins || 0;
    g.hp.claimAch("wins");
    expect(g.hp.achLevel(a)).toBe(1);
    expect(g.hp.stats.coins).toBe(before + 50);
    g.hp.claimAch("wins"); // next tier 30 not met
    expect(g.hp.achLevel(a)).toBe(1);
  });
});

describe("power-up costs", () => {
  it("freeze 20 / vowels 30 / wall 40", () => {
    expect(g.hp.PU_COST).toEqual({ freeze: 20, vowels: 30, wall: 40 });
  });
});
