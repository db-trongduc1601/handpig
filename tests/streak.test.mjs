import { describe, it, expect, beforeEach } from "vitest";
import { loadGame } from "./harness.mjs";

let g;
beforeEach(() => { g = loadGame(); });

const D = (s) => new Date(s + "T12:00:00");

describe("bumpStreak date-math", () => {
  it("lần đầu: n=1", () => {
    const ds = g.hp.bumpStreak({ last: "", n: 0 }, D("2026-07-16"));
    expect(ds.n).toBe(1);
    expect(ds.last).toBe("2026-07-16");
  });

  it("cùng ngày gọi 2 lần: không đổi", () => {
    const ds = g.hp.bumpStreak({ last: "2026-07-16", n: 5 }, D("2026-07-16"));
    expect(ds.n).toBe(5);
  });

  it("hôm qua chơi: n+1", () => {
    const ds = g.hp.bumpStreak({ last: "2026-07-15", n: 5 }, D("2026-07-16"));
    expect(ds.n).toBe(6);
    expect(ds.frozen).toBe(false);
  });

  it("bỏ 1 ngày + freeze còn: cứu streak, đánh dấu tuần", () => {
    const ds = g.hp.bumpStreak({ last: "2026-07-14", n: 5 }, D("2026-07-16"));
    expect(ds.n).toBe(6);
    expect(ds.frozen).toBe(true);
    expect(ds.frW).toBe(g.hp.weekKey(D("2026-07-16")));
  });

  it("bỏ 1 ngày nhưng freeze đã dùng tuần này: reset", () => {
    const wk = g.hp.weekKey(D("2026-07-16"));
    const ds = g.hp.bumpStreak({ last: "2026-07-14", n: 5, frW: wk }, D("2026-07-16"));
    expect(ds.n).toBe(1);
  });

  it("freeze tuần trước không chặn tuần này", () => {
    const ds = g.hp.bumpStreak({ last: "2026-07-14", n: 5, frW: "2026-W20" }, D("2026-07-16"));
    expect(ds.n).toBe(6);
    expect(ds.frozen).toBe(true);
  });

  it("bỏ ≥2 ngày: reset n=1", () => {
    const ds = g.hp.bumpStreak({ last: "2026-07-12", n: 30 }, D("2026-07-16"));
    expect(ds.n).toBe(1);
  });

  it("qua tháng/năm: 2026-07-31 → 08-01, 2026-12-31 → 2027-01-01", () => {
    expect(g.hp.bumpStreak({ last: "2026-07-31", n: 2 }, D("2026-08-01")).n).toBe(3);
    expect(g.hp.bumpStreak({ last: "2026-12-31", n: 9 }, D("2027-01-01")).n).toBe(10);
  });
});

describe("streakRewards mốc quà", () => {
  it("mốc 3/7/14/30 = 100/300/600/1500, trả 1 lần", () => {
    const ds = { n: 3 };
    expect(g.hp.streakRewards(ds)).toBe(100);
    expect(g.hp.streakRewards(ds)).toBe(0); // không trả lại
    ds.n = 7;
    expect(g.hp.streakRewards(ds)).toBe(300);
    ds.n = 30;
    expect(g.hp.streakRewards(ds)).toBe(600 + 1500); // nhảy cóc gộp mốc 14+30
  });

  it("n=2 chưa có quà", () => {
    expect(g.hp.streakRewards({ n: 2 })).toBe(0);
  });
});

describe("tích hợp saveDailyResult", () => {
  it("win daily: streak lưu localStorage + coins mốc 3 + badge daily3", () => {
    const y1 = new Date(); y1.setDate(y1.getDate() - 1);
    g.win.localStorage.setItem("hangpig_daily_streak", JSON.stringify({ last: g.hp.dstr(y1), n: 2 }));
    g.hp.state.mode = "daily";
    const before = g.hp.stats.coins;
    g.hp.saveDailyResult(true);
    const ds = JSON.parse(g.win.localStorage.getItem("hangpig_daily_streak"));
    expect(ds.n).toBe(3);
    expect(g.hp.stats.coins).toBe(before + 100);
    expect(g.hp.badges.daily3).toBe(true);
  });

  it("thua daily: không tăng streak", () => {
    g.hp.saveDailyResult(false);
    const ds = JSON.parse(g.win.localStorage.getItem("hangpig_daily_streak") || "{}");
    expect(ds.n || 0).toBe(0);
  });

  it("nút DAILY hiện 🔥n khi streak ≥2 còn sống", () => {
    const y1 = new Date(); y1.setDate(y1.getDate() - 1);
    g.win.localStorage.setItem("hangpig_daily_streak", JSON.stringify({ last: g.hp.dstr(y1), n: 4 }));
    g.hp.renderDailyBtn();
    expect(g.$("dailyBtn").innerHTML).toContain("🔥4");
  });

  it("streak chết (last 3 ngày trước): không hiện lửa", () => {
    const y3 = new Date(); y3.setDate(y3.getDate() - 3);
    g.win.localStorage.setItem("hangpig_daily_streak", JSON.stringify({ last: g.hp.dstr(y3), n: 9 }));
    g.hp.renderDailyBtn();
    expect(g.$("dailyBtn").innerHTML).not.toContain("🔥");
  });
});
