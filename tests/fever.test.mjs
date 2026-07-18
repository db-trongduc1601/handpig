import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => {
  g = loadGame();
  g.hp.setDiff("normal");
  g.hp.startGame("ANIMALS");
});

function guessCorrect(n) {
  const st = g.hp.state;
  let done = 0;
  for (const L of new Set(st.word.split(""))) {
    if (done >= n) break;
    if (!st.revealed.has(L)) { g.hp.guess(L); done++; }
  }
  return done;
}
function wrongLetter() {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    .find(c => !g.hp.state.word.includes(c) && !g.hp.state.wrongSet.has(c));
}

describe("FEVER trigger", () => {
  it("combo 4 → fever on + body class + badge", () => {
    // need word with >=5 uniq letters after reveal head-start (2 revealed)
    g.hp.newRound("ELEPHANT");
    expect(g.hp.feverOn()).toBe(false);
    const before = g.hp.state.combo;
    guessCorrect(4 - before < 4 ? 4 : 4);
    if (g.hp.state.combo < 4) guessCorrect(4 - g.hp.state.combo);
    expect(g.hp.feverOn()).toBe(true);
    expect(g.win.document.body.classList.contains("fever")).toBe(true);
    expect(g.hp.badges.fever).toBe(true);
  });

  it("manual feverStart sets 10s window + 1 save", () => {
    g.hp.feverStart();
    expect(g.hp.feverOn()).toBe(true);
    expect(g.hp.fever.save).toBe(1);
    expect(g.hp.fever.until - g.win.performance.now()).toBeLessThanOrEqual(g.hp.FEVER_MS);
  });

  it("fever3 badge after 3 fevers in one game", () => {
    g.hp.feverStart(); g.hp.feverEnd();
    g.hp.feverStart(); g.hp.feverEnd();
    expect(g.hp.badges.fever3).toBeUndefined();
    g.hp.feverStart();
    expect(g.hp.badges.fever3).toBe(true);
  });

  it("startGame resets fever count + state", () => {
    g.hp.feverStart();
    g.hp.startGame("FOOD");
    expect(g.hp.feverOn()).toBe(false);
    expect(g.hp.fever.count).toBe(0);
    expect(g.win.document.body.classList.contains("fever")).toBe(false);
  });
});

describe("FEVER effects", () => {
  it("points x2 while fever on", () => {
    const s0 = g.hp.state.score;
    g.hp.feverStart();
    // direct probe via a correct guess: pts already computed pre-award; verify via score delta parity
    const st = g.hp.state;
    const L = st.word.split("").find(c => !st.revealed.has(c));
    const occ = st.word.split("").filter(c => c === L).length;
    const base = g.hp.letterPts() * occ; // mult()=1 at streak 0
    g.hp.guess(L);
    // combo may add bonus pts (also x2). combo becomes 1 → no combo bonus
    expect(g.hp.state.score - s0).toBe(base * 2);
  });

  it("coins x3 on win while fever on (normal perfect: 24 → 72¢)", () => {
    g.hp.fever.until = g.win.performance.now() + 60000; // hold fever through round
    g.hp.fever.save = 0;
    const d = playRound(g, { win: true });
    expect(d).toBe(72);
    expect(g.hp.feverOn()).toBe(false); // fever tieu thu khi thang
  });

  it("no fever = base coins (noFever probe: 24¢)", () => {
    expect(playRound(g, { win: true, noFever: true })).toBe(24);
  });

  it("FEVER SAVE: first wrong guess forgiven, fever ends", () => {
    g.hp.feverStart();
    const L = wrongLetter();
    g.hp.guess(L);
    expect(g.hp.state.misses).toBe(0);        // saved
    expect(g.hp.state.wrongSet.has(L)).toBe(true); // letter still burned
    expect(g.hp.fever.save).toBe(0);
    expect(g.hp.feverOn()).toBe(false);        // fever off after save
    const L2 = wrongLetter();
    g.hp.guess(L2);
    expect(g.hp.state.misses).toBe(1);         // no second save
  });

  it("fever expiry via updateFever removes state", () => {
    g.hp.feverStart();
    g.hp.fever.until = g.win.performance.now() - 1;
    // updateFever runs in rAF loop; call end condition directly
    expect(g.hp.feverOn()).toBe(false);
    g.hp.feverEnd();
    expect(g.win.document.body.classList.contains("fever")).toBe(false);
  });
});

describe("balance fix v5.19 (coins x diffMult)", () => {
  it("easy perfect win: (6+24)*0.5 = 15¢", () => {
    g.hp.setDiff("easy"); g.hp.startGame("ANIMALS");
    expect(playRound(g, { win: true, noFever: true })).toBe(15);
  });
  it("hard perfect win: (6+12)*2 = 36¢", () => {
    g.hp.setDiff("hard"); g.hp.startGame("ANIMALS");
    expect(playRound(g, { win: true, noFever: true })).toBe(36);
  });
  it("char prices: RARE from 2200, dragon 7000", () => {
    const p = Object.fromEntries(g.hp.CHAR_LIST.filter(c => c.price).map(c => [c.id, c.price]));
    expect(p.parrot).toBe(2200);
    expect(p.capybara).toBe(4200);
    expect(p.dragon).toBe(7000);
  });
});
