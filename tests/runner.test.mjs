import { describe, it, expect, beforeEach } from "vitest";
import { loadGame } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("runner core", () => {
  it("startRunner → resetRun state clean", () => {
    g.hp.startRunner();
    const r = g.hp.run;
    expect(r.active).toBe(true);
    expect(r.over).toBe(false);
    expect(r.score).toBe(0);
    expect(r.obs.length).toBe(0);
    expect(g.hp.state.screen).toBe("runner");
  });

  it("12+ perks defined, one per character id", () => {
    const perks = g.hp.RUNPERK;
    expect(Object.keys(perks).length).toBeGreaterThanOrEqual(12);
    for (const c of g.hp.CHAR_LIST) expect(perks[c.id]).toBeDefined();
  });

  it("lives-perk chars start with shield", () => {
    g.hp.setChar("cat");
    g.hp.startRunner();
    expect(g.hp.run.shield).toBe(1);
    g.hp.setChar("pig");
    g.hp.startRunner();
    expect(g.hp.run.shield).toBe(0);
  });

  it("runHit: coins = pickups + score/100, hi persisted", () => {
    g.hp.startRunner();
    const r = g.hp.run;
    r.started = true; r.score = 350; r.got = 7;
    const before = g.hp.stats.coins || 0;
    g.hp.runHit();
    expect(r.over).toBe(true);
    expect(r._earned).toBe(7 + 3);
    expect(g.hp.stats.coins).toBe(before + 10);
    expect(g.win.localStorage.getItem("hangpig_run_hi")).toBe("350");
  });

  it("runHit idempotent (no double pay)", () => {
    g.hp.startRunner();
    g.hp.run.started = true; g.hp.run.score = 100; g.hp.run.got = 5;
    g.hp.runHit();
    const c = g.hp.stats.coins;
    g.hp.runHit();
    expect(g.hp.stats.coins).toBe(c);
  });

  it("leaderboard keeps top-5 sorted", () => {
    for (const s of [100, 900, 300, 700, 500, 50]) {
      g.hp.startRunner();
      g.hp.run.started = true; g.hp.run.score = s; g.hp.run.got = 0;
      g.hp.runHit();
    }
    const lb = JSON.parse(g.win.localStorage.getItem("hangpig_run_lb"));
    expect(lb).toEqual([900, 700, 500, 300, 100]);
  });

  it("spawnObs produces valid obstacle types", () => {
    g.hp.startRunner();
    for (let i = 0; i < 50; i++) g.hp.spawnObs();
    const types = new Set(g.hp.run.obs.map(o => o.type));
    for (const t of types) expect(["post", "gallows", "ball", "bird"]).toContain(t);
    // bird requires score>150
    expect(types.has("bird")).toBe(false);
  });
});
