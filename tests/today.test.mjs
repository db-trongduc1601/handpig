import { describe, it, expect, beforeEach } from "vitest";
import { loadGame, playRound } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

describe("điểm danh 7 ngày", () => {
  it("lần đầu: ngày 1, +20¢", () => {
    const before = g.hp.stats.coins;
    const r = g.hp.doCheckin();
    expect(r).toBe(20);
    expect(g.hp.stats.coins).toBe(before + 20);
    expect(g.hp.loadCheckin().day).toBe(0);
    expect(g.hp.checkinDoneToday()).toBe(true);
  });

  it("cùng ngày điểm danh 2 lần: lần 2 = 0¢", () => {
    g.hp.doCheckin();
    const before = g.hp.stats.coins;
    expect(g.hp.doCheckin()).toBe(0);
    expect(g.hp.stats.coins).toBe(before);
  });

  it("hôm qua ngày 3 → hôm nay ngày 4 (+50¢)", () => {
    const y1 = new Date(); y1.setDate(y1.getDate() - 1);
    g.win.localStorage.setItem("hangpig_checkin", JSON.stringify({ last: g.hp.dstr(y1), day: 2 }));
    expect(g.hp.doCheckin()).toBe(50);
    expect(g.hp.loadCheckin().day).toBe(3);
  });

  it("bỏ 1 ngày: reset về ngày 1", () => {
    const y3 = new Date(); y3.setDate(y3.getDate() - 3);
    g.win.localStorage.setItem("hangpig_checkin", JSON.stringify({ last: g.hp.dstr(y3), day: 5 }));
    expect(g.hp.doCheckin()).toBe(20);
    expect(g.hp.loadCheckin().day).toBe(0);
  });

  it("hết ngày 7 (150¢) → vòng về ngày 1", () => {
    const y1 = new Date(); y1.setDate(y1.getDate() - 1);
    g.win.localStorage.setItem("hangpig_checkin", JSON.stringify({ last: g.hp.dstr(y1), day: 6 }));
    expect(g.hp.doCheckin()).toBe(20); // (6+1)%7 = 0
  });

  it("quà đúng thang 20/30/40/50/60/80/150", () => {
    expect(g.hp.CHECKIN_GIFTS).toEqual([20,30,40,50,60,80,150]);
  });
});

describe("daily quests", () => {
  it("sinh đúng 3 quest khác nhau, deterministic theo ngày", () => {
    const q1 = g.hp.loadQuests();
    expect(q1.list.length).toBe(3);
    expect(new Set(q1.list.map(x => x.id)).size).toBe(3);
    const g2 = loadGame();
    expect(g2.hp.loadQuests().list.map(x => x.id)).toEqual(q1.list.map(x => x.id));
  });

  it("questEvent tăng tiến độ, cap tại target, toast khi xong", () => {
    const q = g.hp.loadQuests();
    const it0 = q.list[0];
    const d = g.hp.QUEST_DEFS.find(x => x.id === it0.id);
    g.hp.questEvent(it0.id, d.t + 5); // vượt target
    const after = g.hp.loadQuests().list.find(x => x.id === it0.id);
    expect(after.n).toBe(d.t); // cap
    expect(g.hp.questReady()).toBe(true);
  });

  it("claim trả đúng thưởng, không claim lại được", () => {
    const q = g.hp.loadQuests();
    const it0 = q.list[0];
    const d = g.hp.QUEST_DEFS.find(x => x.id === it0.id);
    g.hp.questEvent(it0.id, d.t);
    const before = g.hp.stats.coins;
    g.hp.claimQuest(it0.id);
    expect(g.hp.stats.coins).toBe(before + d.r);
    g.hp.claimQuest(it0.id); // lần 2 no-op
    expect(g.hp.stats.coins).toBe(before + d.r);
  });

  it("claim đủ 3 quest → bonus +100¢ đúng 1 lần", () => {
    const q = g.hp.loadQuests();
    let expected = 100;
    for (const it2 of q.list) {
      const d = g.hp.QUEST_DEFS.find(x => x.id === it2.id);
      g.hp.questEvent(it2.id, d.t);
      expected += d.r;
    }
    const before = g.hp.stats.coins;
    for (const it2 of q.list) g.hp.claimQuest(it2.id);
    expect(g.hp.stats.coins).toBe(before + expected);
  });

  it("quest event id lạ / chưa được giao hôm nay: no-op an toàn", () => {
    const q = g.hp.loadQuests();
    const missing = g.hp.QUEST_DEFS.map(d => d.id).find(id => !q.list.some(x => x.id === id));
    g.hp.questEvent(missing, 1); // không crash
    g.hp.questEvent("khong_ton_tai", 1);
    expect(g.hp.loadQuests().list.length).toBe(3);
  });

  it("hook: thắng 1 ván classic đẩy tiến độ win3 (nếu được giao)", () => {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    playRound(g, { win: true, noFever: true });
    const q = g.hp.loadQuests();
    const w = q.list.find(x => x.id === "win3");
    if (w) expect(w.n).toBe(1); // chỉ assert khi quest hôm nay có win3
  });
});

describe("boss variety + enrage (v5.20)", () => {
  function bossRound() {
    g.hp.setDiff("normal"); g.hp.startGame("ANIMALS");
    for (let i = 0; i < 5; i++) { playRound(g, { win: true, noFever: true }); g.hp.newRound(); }
  }

  it("3 kind wolf/fox/bear, xoay vòng theo bossN", () => {
    expect(g.hp.BOSS_KINDS.map(k => k.id)).toEqual(["wolf","fox","bear","eagle","snake","shark","robot","witch","dragon","boar"]);
    g.hp.state.bossN = 1; expect(g.hp.bossKind().id).toBe("wolf");
    g.hp.state.bossN = 2; expect(g.hp.bossKind().id).toBe("fox");
    g.hp.state.bossN = 3; expect(g.hp.bossKind().id).toBe("bear");
    g.hp.state.bossN = 4; expect(g.hp.bossKind().id).toBe("eagle");
    g.hp.state.bossN = 11; expect(g.hp.bossKind().id).toBe("wolf");
  });

  it("boss đầu tiên trong session là wolf, dur 420/460", () => {
    bossRound();
    expect(g.hp.state.bossN).toBe(1);
    expect(g.hp.bossKind().id).toBe("wolf");
    g.hp.bossThrow("up");
    expect(g.hp.bossFx.anim.dur).toBe(420);
  });

  it("fox ném nhanh hơn (340/380), bear chậm (480/520)", () => {
    g.hp.state.boss = true;
    g.hp.state.bossN = 2;
    g.hp.bossThrow("up"); expect(g.hp.bossFx.anim.dur).toBe(340);
    g.hp.bossThrow("down"); expect(g.hp.bossFx.anim.dur).toBe(380);
    g.hp.state.bossN = 3;
    g.hp.bossThrow("up"); expect(g.hp.bossFx.anim.dur).toBe(480);
  });

  it("enrage khi HP ≤ 34%: nhạc boss 0.17 → 0.14", () => {
    bossRound();
    expect(g.hp.bossEnraged()).toBe(false);
    expect(g.hp.curTrack().step).toBe(0.17);
    // reveal gần hết từ → HP thấp
    const st = g.hp.state;
    const uniq = [...new Set(st.word.split(""))];
    for (const L of uniq.slice(0, uniq.length - 1)) st.revealed.add(L);
    expect(g.hp.bossEnraged()).toBe(true);
    expect(g.hp.curTrack().step).toBe(0.14);
  });

  it("startGame reset bossN", () => {
    g.hp.state.bossN = 5;
    g.hp.startGame("FOOD");
    expect(g.hp.state.bossN).toBe(0);
  });
});
