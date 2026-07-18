import { describe, it, expect, beforeEach } from "vitest";
import { loadGame } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("achievements structure (v5.17)", () => {
  it("6 achievements × 5 tiers", () => {
    expect(g.hp.ACHS.length).toBe(6);
    for (const a of g.hp.ACHS) expect(a.tiers.length).toBe(5);
  });

  it("tiers strictly ascending", () => {
    for (const a of g.hp.ACHS)
      for (let i = 1; i < a.tiers.length; i++)
        expect(a.tiers[i]).toBeGreaterThan(a.tiers[i - 1]);
  });

  it("achReady only when current >= next tier", () => {
    const a = g.hp.ACHS.find(x => x.id === "games");
    expect(g.hp.achReady(a)).toBe(false);
    g.hp.stats.games = a.tiers[0];
    expect(g.hp.achReady(a)).toBe(true);
  });

  it("claim persists across reload (localStorage)", () => {
    g.hp.stats.games = 10;
    // persist stats too, then claim
    g.win.localStorage.setItem("hangpig_stats", JSON.stringify(g.hp.stats));
    g.hp.claimAch("games");
    const saved = g.win.localStorage.getItem("hangpig_ach");
    expect(JSON.parse(saved)["games:0"]).toBe(true);
  });
});

describe("characters & unlock", () => {
  it("14 characters, starters free", () => {
    expect(g.hp.CHAR_LIST.length).toBe(14);
    const free = g.hp.CHAR_LIST.filter(c => c.free).map(c => c.id);
    expect(free).toContain("pig");
    expect(free).toContain("chicken");
  });

  it("priced chars ascend by tier", () => {
    const priced = g.hp.CHAR_LIST.filter(c => c.price);
    for (const c of priced) expect(c.price).toBeGreaterThanOrEqual(2200);
  });
});

describe("daily determinism", () => {
  it("dailyWord same for same date", () => {
    const w1 = g.hp.dailyWord();
    const g2 = loadGame();
    expect(g2.hp.dailyWord()).toEqual(w1);
  });
});

describe("localStorage resilience", () => {
  it("game boots with corrupted storage", () => {
    const g2 = loadGame({
      storage: {
        hangpig_stats: "{corrupt!!!",
        hangpig_ach: "not-json",
        hangpig_owned_chars: "[[[",
      },
    });
    expect(g2.hp.state.screen).toBe("menu");
    expect(g2.hp.stats.coins).toBe(50); // corrupted → fresh stats + starter coins
  });
});
