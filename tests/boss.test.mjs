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
  // streak=5 → newRound đã set boss
}

describe("boss round setup", () => {
  it("streak 5 → boss với từ ≥9 chữ, HP = uniq chưa reveal", () => {
    forceBossRound();
    const st = g.hp.state;
    expect(st.boss).toBe(true);
    expect(st.word.length).toBeGreaterThanOrEqual(9);
    const uniq = new Set(st.word.split("")).size;
    expect(g.hp.bossMaxHP()).toBe(uniq);
    expect(g.hp.bossHP()).toBe(uniq - st.revealed.size); // head-start reveal trừ sẵn
  });

  it("bossFx reset khi vào boss round", () => {
    forceBossRound();
    expect(g.hp.bossFx.anim).toBe(null);
    expect(g.hp.bossFx.hitT).toBe(0);
  });

  it("layout pokemon: pig sang trái (x=42), clearFx không kéo về homeX", () => {
    forceBossRound();
    expect(g.hp.pig.x).toBe(g.hp.BOSS_PIG_X); // regression: clearFx từng reset pig.x=homeX
    expect(g.hp.bossBallRest().x).toBe(305);  // bóng giữa 2 con
    // hết boss → pig về chỗ cũ
    playRound(g, { win: true });
    g.hp.newRound();
    expect(g.hp.state.boss).toBe(false);
    expect(g.hp.pig.x).toBe(g.hp.pig.homeX);
  });
});

describe("battle animation state machine", () => {
  beforeEach(forceBossRound);

  it("đoán đúng → pig ném LÊN, boss HP −1", () => {
    const st = g.hp.state;
    const hp0 = g.hp.bossHP();
    const L = st.word.split("").find(c => !st.revealed.has(c));
    g.hp.guess(L);
    expect(g.hp.bossFx.anim).toBeTruthy();
    expect(g.hp.bossFx.anim.type).toBe("up");
    expect(g.hp.bossHP()).toBe(hp0 - 1);
    expect(st.misses).toBe(0);
  });

  it("đoán sai → boss ném XUỐNG, pig HP −1", () => {
    const st = g.hp.state;
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(c => !st.word.includes(c));
    g.hp.guess(L);
    expect(g.hp.bossFx.anim.type).toBe("down");
    expect(st.misses).toBe(1); // pigHP = maxM - misses
  });

  it("impact UP: anim kết thúc → knockback hitT set, anim clear", () => {
    g.hp.bossThrow("up");
    g.hp.bossFx.anim.t0 -= 9999; // tua nhanh hết dur
    g.hp.updateBossFx();
    expect(g.hp.bossFx.anim).toBe(null);
    expect(g.hp.bossFx.hitT).toBeGreaterThan(0);
  });

  it("impact DOWN: pigHitT set", () => {
    g.hp.bossThrow("down");
    g.hp.bossFx.anim.t0 -= 9999;
    g.hp.updateBossFx();
    expect(g.hp.bossFx.anim).toBe(null);
    expect(g.hp.bossFx.pigHitT).toBeGreaterThan(0);
  });

  it("anim đang bay: updateBossFx không kết thúc sớm", () => {
    g.hp.bossThrow("up");
    g.hp.updateBossFx(); // p < 1
    expect(g.hp.bossFx.anim).toBeTruthy();
    expect(g.hp.bossFx.anim.hit).toBe(false);
  });

  it("dur: ném lên 420ms, ném xuống 460ms", () => {
    g.hp.bossThrow("up");
    expect(g.hp.bossFx.anim.dur).toBe(420);
    g.hp.bossThrow("down");
    expect(g.hp.bossFx.anim.dur).toBe(460);
  });
});

describe("boss rules", () => {
  it("FEVER SAVE bị TẮT trong boss round (thua là thua)", () => {
    g.hp.state.boss = true;
    g.hp.feverStart();
    const st = g.hp.state;
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find(c => !st.word.includes(c));
    g.hp.guess(L);
    expect(st.misses).toBe(1);          // KHÔNG được tha
    expect(g.hp.fever.save).toBe(1);    // save không bị tiêu
  });

  it("thua boss = thua luôn (over, streak reset flow như thường)", () => {
    g.hp.state.boss = true;
    playRound(g, { win: false });
    expect(g.hp.state.over).toBe(true);
    expect(g.hp.state.misses).toBe(g.hp.state.maxM);
  });

  it("điểm boss vẫn ×2 (letterPts)", () => {
    const base = g.hp.letterPts();
    g.hp.state.boss = true;
    expect(g.hp.letterPts()).toBe(base * 2);
  });
});

describe("boss music", () => {
  it("boss round → track riêng (step 0.17, không phải 0.25)", () => {
    g.hp.state.boss = true;
    const tr = g.hp.curTrack();
    expect(tr.step).toBe(0.17);
  });
  it("hết boss/thắng → về track thường", () => {
    g.hp.state.boss = true;
    g.hp.state.over = true;
    expect(g.hp.curTrack().step).toBe(0.25);
  });
  it("menu track không đổi", () => {
    g.hp.state.screen = "menu";
    expect(g.hp.curTrack().step).toBe(0.34);
  });
});
