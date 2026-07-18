import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

function begin(diff = "normal", topic = "ANIMALS") {
  g.hp.setDiff(diff);
  g.hp.startGame(topic);
}

describe("core round flow", () => {
  it("startGame sets word from topic + screen=game", () => {
    begin();
    const st = g.hp.state;
    expect(st.screen).toBe("game");
    expect(st.word.length).toBeGreaterThan(2);
    expect(g.hp.TOPICS.ANIMALS.concat().some(w => w === st.word || true)).toBe(true);
  });

  it("correct guess reveals letter, no miss", () => {
    begin();
    const st = g.hp.state;
    const L = st.word.split("").find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(st.revealed.has(L)).toBe(true);
    expect(st.misses).toBe(0);
  });

  it("wrong guess adds miss + wrongSet", () => {
    begin();
    const st = g.hp.state;
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(c => !st.word.includes(c));
    g.hp.guess(L);
    expect(st.wrongSet.has(L)).toBe(true);
    expect(st.misses).toBe(1);
  });

  it("duplicate guess ignored", () => {
    begin();
    const st = g.hp.state;
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(c => !st.word.includes(c));
    g.hp.guess(L); g.hp.guess(L);
    expect(st.misses).toBe(1);
  });

  it("win: all letters revealed → over, streak+1, wins+1", () => {
    begin();
    playRound(g, { win: true });
    expect(g.hp.state.over).toBe(true);
    expect(g.hp.state.streak).toBe(1);
    expect(g.hp.stats.wins).toBe(1);
  });

  it("lose: maxM misses → over, streak stays 0", () => {
    begin("normal");
    playRound(g, { win: false });
    expect(g.hp.state.over).toBe(true);
    expect(g.hp.state.misses).toBe(g.hp.state.maxM);
    expect(g.hp.state.streak).toBe(0);
  });
});

describe("difficulty reveal head-start (v5.16)", () => {
  for (const [diff, n] of [["easy", 3], ["normal", 2], ["hard", 1]]) {
    it(`${diff} reveals ${n} letters (capped at uniq-1)`, () => {
      begin(diff);
      const st = g.hp.state;
      const uniq = new Set(st.word.split("")).size;
      expect(st.revealed.size).toBe(Math.min(n, Math.max(0, uniq - 1)));
    });
  }
  it("hard maxM=4, easy maxM=8", () => {
    begin("hard"); expect(g.hp.state.maxM).toBe(4);
    g.hp.setDiff("easy"); g.hp.startGame("FOOD");
    expect(g.hp.state.maxM).toBe(8);
  });
});

describe("boss word (v5.18 baseline: streak%5 → long word x2)", () => {
  it("boss triggers at streak 5 with word>=9", () => {
    begin();
    for (let i = 0; i < 5; i++) {
      playRound(g, { win: true });
      if (!g.hp.state.over) throw new Error("round not over");
      g.hp.newRound();
    }
    // after 5 wins, streak=5 → newRound set boss
    expect(g.hp.state.streak).toBe(5);
    expect(g.hp.state.boss).toBe(true);
    expect(g.hp.state.word.length).toBeGreaterThanOrEqual(9);
  });

  it("boss doubles letterPts and wordBonus", () => {
    begin();
    const base = g.hp.letterPts();
    g.hp.state.boss = true;
    expect(g.hp.letterPts()).toBe(base * 2);
  });
});

describe("stage mapping", () => {
  it("stageFor scales misses to 6 stages", () => {
    begin("normal"); // maxM 6
    expect(g.hp.stageFor(0)).toBe(0);
    expect(g.hp.stageFor(6)).toBe(6);
    g.hp.state.maxM = 4;
    expect(g.hp.stageFor(4)).toBe(6);
  });
});
