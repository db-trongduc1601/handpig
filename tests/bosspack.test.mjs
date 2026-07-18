import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("boss pack 10 con (anh nguoi dung)", () => {
  it("du 10 anh trong BOSS_IMG, deu la data-uri png", () => {
    const ids = g.hp.BOSS_KINDS.map(k => k.id);
    for (const id of ids) {
      expect(g.hp.BOSS_IMG[id]).toBeTruthy();
      expect(g.hp.BOSS_IMG[id].src.startsWith("data:image/png;base64,")).toBe(true);
    }
  });

  it("moi boss co ten hien thi", () => {
    for (const k of g.hp.BOSS_KINDS) expect((k.name || "").length).toBeGreaterThan(1);
  });

  it("bossSprite cache: base/rage/flash moi variant 1 canvas", () => {
    const a = g.hp.bossSprite("wolf", "base");
    expect(a).toBeTruthy();
    expect(g.hp.bossSprite("wolf", "base")).toBe(a); // cache hit
    const r = g.hp.bossSprite("wolf", "rage");
    expect(r).not.toBe(a);
    expect(Object.keys(g.hp.BOSS_SPRITE_CACHE)).toContain("wolf:rage");
  });

  it("gimmick params: dragon x7, boar x10, shark/boar enrage 50%, robot noKb, bear/boar minLen 10", () => {
    const K = Object.fromEntries(g.hp.BOSS_KINDS.map(k => [k.id, k]));
    expect(K.dragon.winMult).toBe(7);
    expect(K.boar.winMult).toBe(10);
    expect(K.shark.enrTh).toBe(0.5);
    expect(K.boar.enrTh).toBe(0.5);
    expect(K.robot.noKb).toBe(true);
    expect(K.bear.minLen).toBe(10);
    expect(K.eagle.fly).toBe(true);
  });

  it("shark enrage o 50% HP (wolf van 34%)", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.state.boss = true;
    g.hp.state.bossN = 6; // shark
    const st = g.hp.state;
    const uniq = [...new Set(st.word.split(""))];
    st.revealed = new Set(uniq.slice(0, Math.ceil(uniq.length * 0.55)));
    expect(g.hp.bossEnraged()).toBe(true);
    g.hp.state.bossN = 1;
    if (g.hp.bossHP() / g.hp.bossMaxHP() > 0.34) expect(g.hp.bossEnraged()).toBe(false);
  });

  it("dragon thang: coins x7", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.state.boss = true;
    g.hp.state.bossN = 9; // dragon
    const d = playRound(g, { win: true, noFever: true });
    expect(d).toBe(24 * 7);
  });

  it("ha du 10 loai boss -> badge BOSS SLAYER", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.stats.bossKinds = {};
    for (const k of g.hp.BOSS_KINDS) g.hp.stats.bossKinds[k.id] = true;
    delete g.hp.stats.bossKinds.boar;
    g.hp.state.boss = true;
    g.hp.state.bossN = 10; // boar
    playRound(g, { win: true, noFever: true });
    expect(g.hp.badges.slayer).toBe(true);
  });

  it("boss thu 4 trong session = eagle (khong lap wolf nhu %3 cu)", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.state.bossN = 4;
    expect(g.hp.bossKind().id).toBe("eagle");
    expect(g.hp.bossKind().name.length).toBeGreaterThan(2);
  });
});

describe("v5.26 — phien am + voice", () => {
  it("speakWord/ttsSpeak/fetchIPA khong crash trong jsdom (khong co fetch/speech)", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    expect(typeof g.hp.speakWord).toBe("function");
    g.hp.speakWord("ELEPHANT");
    g.hp.ttsSpeak("ELEPHANT");
    let got = "x";
    g.hp.fetchIPA("ZZZNOCACHE", d => { got = d; });
    expect(got).toBe(null); /* khong co fetch -> cb(null) sync */
  });

  it("fetchIPA tra tu cache IPA_DB, khong goi mang", () => {
    g.hp.IPA_DB.ELEPHANT = { t: "/EL-uh-fuhnt/", a: "" };
    let got = null;
    g.hp.fetchIPA("ELEPHANT", d => { got = d; });
    expect(got.t).toBe("/EL-uh-fuhnt/");
  });

  it("reveal card co cho hien IPA + nut loa da gan onclick", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    expect(g.$("revealIPA")).toBeTruthy();
    expect(g.$("revealSpeak")).toBeTruthy();
    expect(typeof g.$("revealSpeak").onclick).toBe("function");
    playRound(g, { win: true, noFever: true }); /* showReveal chay khong crash voi IPA/speak moi */
    expect(g.hp.state.over).toBe(true);
  });
});

describe("v5.27 — boss keyboard gimmicks", () => {
  it("witchShuffle: trao 26 phim, van du key_A..Z, kbFxStop tra QWERTY", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.witchShuffle();
    expect(g.hp.kbFx.order.length).toBe(26);
    for (let i = 65; i <= 90; i++) expect(g.$("key_" + String.fromCharCode(i))).toBeTruthy();
    g.hp.kbFxStop();
    expect(g.hp.kbFx.order).toBe(null);
    /* QWERTY lai: phim dau tien la Q */
    expect(g.win.document.querySelector("#kb .key").textContent).toBe("Q");
  });

  it("snakeVenom: 1-4 phim bi mo, kbFxStop xoa het", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.snakeVenom(4);
    const v = g.win.document.querySelectorAll("#kb .key.venom");
    expect(v.length).toBeGreaterThan(0);
    expect(v.length).toBeLessThanOrEqual(4);
    g.hp.kbFxStop();
    expect(g.win.document.querySelectorAll("#kb .key.venom").length).toBe(0);
  });

  it("kbFxOnMiss: khong boss -> khong lam gi; boss witch -> trao phim", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    g.hp.kbFxOnMiss();
    expect(g.hp.kbFx.order).toBe(null);
    g.hp.state.boss = true;
    g.hp.state.bossN = 8; /* witch */
    expect(g.hp.bossKind().id).toBe("witch");
    g.hp.kbFxOnMiss();
    expect(g.hp.kbFx.order && g.hp.kbFx.order.length).toBe(26);
    g.hp.kbFxStop();
  });
});
