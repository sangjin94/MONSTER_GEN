import { useState, useRef } from "react";

async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 800;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

const TYPES = {
  불: { bg: "linear-gradient(135deg,#ff6b35,#d32f2f)", icon: "🔥", color: "#ff8a65" },
  물: { bg: "linear-gradient(135deg,#1e88e5,#0d47a1)", icon: "💧", color: "#64b5f6" },
  풀: { bg: "linear-gradient(135deg,#43a047,#1b5e20)", icon: "🌿", color: "#81c784" },
  전기: { bg: "linear-gradient(135deg,#fdd835,#f9a825)", icon: "⚡", color: "#fff176" },
  얼음: { bg: "linear-gradient(135deg,#4fc3f7,#0288d1)", icon: "❄️", color: "#b3e5fc" },
  독: { bg: "linear-gradient(135deg,#ab47bc,#6a1b9a)", icon: "☠️", color: "#ce93d8" },
  땅: { bg: "linear-gradient(135deg,#8d6e63,#4e342e)", icon: "⛰️", color: "#bcaaa4" },
  바람: { bg: "linear-gradient(135deg,#78909c,#37474f)", icon: "🌪️", color: "#b0bec5" },
  빛: { bg: "linear-gradient(135deg,#fff9c4,#f9a825)", icon: "✨", color: "#fff59d" },
  어둠: { bg: "linear-gradient(135deg,#37474f,#1a1a2e)", icon: "🌑", color: "#90a4ae" },
};

const STARS = { N: "★", R: "★★", SR: "★★★", SSR: "★★★★", UR: "★★★★★" };

export default function App() {
  const [img, setImg] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setCard(null); setFlipped(false); setLoading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(dataUrl);
      setImg(compressed);
      await generateCard(compressed);
    } catch {
      setError("이미지를 처리할 수 없어요. 다시 시도해보세요.");
      setLoading(false);
    }
  }

  async function generateCard(dataUrl) {
    const prompt = `이 사진을 보고 트레이딩 카드 몬스터를 만들어줘. 사진 속 대상을 몬스터로 의인화/변환해서 창의적으로.
반드시 아래 JSON만 응답 (코드펜스 없이):
{"name":"몬스터이름(한글)","name_en":"영문이름","type":"${Object.keys(TYPES).join("/")} 중 하나","hp":숫자(40~300),"stage":"기본/1진화/2진화","height":"0.8m","weight":"12.5kg","attack1_name":"기술1","attack1_cost":숫자(1~3),"attack1_damage":"30","attack1_desc":"짧은설명","attack2_name":"필살기","attack2_cost":숫자(2~4),"attack2_damage":"120","attack2_desc":"짧은설명","weakness":"${Object.keys(TYPES).join("/")} 중 하나","flavor":"도감설명 2문장","rarity":"N/R/SR/SSR/UR"}`;
    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: dataUrl.split(",")[1], mediaType: "image/jpeg", prompt }),
      });
      const data = await res.json();
      if (data.error) { setError(`오류: ${data.error}`); return; }
      setCard(JSON.parse(data.text.replace(/```json/gi, "").replace(/```/g, "").trim()));
    } catch { setError("카드 생성 실패. 다시 시도해보세요."); }
    finally { setLoading(false); }
  }

  function handleTilt(e) {
    if (!flipped || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - r.top;
    setTilt({ x: ((cy / r.height) - 0.5) * -12, y: ((cx / r.width) - 0.5) * 12 });
  }

  async function shareCard() {
    setSharing(true);
    try {
      const t = TYPES[card.type] || TYPES["불"];
      const wt = TYPES[card.weakness] || TYPES["물"];
      const W = 640, H = 960;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, t.color + "33"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = t.color + "88"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(16, 16, W - 32, H - 32, 16); ctx.stroke();

      ctx.fillStyle = "#fff"; ctx.font = "bold 34px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(card.name, 40, 58);
      ctx.textAlign = "right"; ctx.fillStyle = t.color;
      ctx.fillText(`HP ${card.hp} ${t.icon}`, W - 40, 58);

      if (img) {
        const image = new Image(); image.crossOrigin = "anonymous";
        await new Promise(r => { image.onload = r; image.src = img; });
        const bx = 40, by = 80, bw = W - 80, bh = 360;
        ctx.fillStyle = "#111827";
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
        const ratio = Math.min(bw / image.width, bh / image.height);
        const dw = image.width * ratio, dh = image.height * ratio;
        ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.clip();
        ctx.drawImage(image, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
        ctx.restore();
        ctx.strokeStyle = t.color + "55"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke();
      }

      ctx.textAlign = "left"; ctx.font = "13px sans-serif"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${card.name_en} · ${card.type}타입 · ${card.height} · ${card.weight}`, 44, 462);

      let y = 500;
      ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "#e2e8f0"; ctx.textAlign = "left";
      ctx.fillText(`${t.icon.repeat(card.attack1_cost || 1)}  ${card.attack1_name}`, 44, y);
      ctx.textAlign = "right"; ctx.fillText(String(card.attack1_damage), W - 44, y);
      ctx.textAlign = "left"; ctx.font = "13px sans-serif"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(card.attack1_desc, 44, y + 22);

      y = 560;
      ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`${t.icon.repeat(card.attack2_cost || 2)}  ${card.attack2_name}`, 44, y);
      ctx.textAlign = "right"; ctx.fillText(String(card.attack2_damage), W - 44, y);
      ctx.textAlign = "left"; ctx.font = "13px sans-serif"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(card.attack2_desc, 44, y + 22);

      ctx.strokeStyle = "#ffffff15"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(44, 600); ctx.lineTo(W - 44, 600); ctx.stroke();

      y = 630;
      ctx.font = "13px sans-serif"; ctx.fillStyle = "#64748b";
      ctx.fillText(`약점: ${wt.icon} ×2    저항: —    후퇴: ⚪⚪`, 44, y);

      ctx.font = "italic 13px sans-serif"; ctx.fillStyle = "#94a3b8";
      const words = card.flavor.split(" "); let line = ""; const lines = []; y = 670;
      for (const w of words) {
        if (ctx.measureText(line + w).width > W - 100) { lines.push(line); line = w + " "; }
        else line += w + " ";
      }
      lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l.trim(), 44, y + i * 20));

      ctx.textAlign = "left"; ctx.font = "12px sans-serif"; ctx.fillStyle = "#475569";
      ctx.fillText(`${card.stage} · ${STARS[card.rarity] || "★★★"} ${card.rarity || "SR"}`, 44, H - 60);
      ctx.textAlign = "right"; ctx.fillStyle = t.color; ctx.font = "bold 13px sans-serif";
      ctx.fillText("AI MONSTER CARD", W - 44, H - 60);

      ctx.textAlign = "center"; ctx.font = "bold 14px sans-serif"; ctx.fillStyle = "#7c3aed";
      ctx.fillText("🃏 나도 만들어보기 →", W / 2, H - 30);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${card.name}_card.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ title: `${card.name} - AI 몬스터 카드`, text: `내 AI 몬스터 카드: ${card.name} 🃏`, files: [file] }); } catch {}
        } else {
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
          a.download = `${card.name}_card.png`; a.click(); URL.revokeObjectURL(a.href);
        }
        setSharing(false);
      }, "image/png");
    } catch { setSharing(false); }
  }

  const t = card ? (TYPES[card.type] || TYPES["불"]) : TYPES["불"];
  const w = card ? (TYPES[card.weakness] || TYPES["물"]) : TYPES["물"];

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px #3b5bdb44,inset 0 0 20px #3b5bdb22}50%{box-shadow:0 0 50px #3b5bdb88,inset 0 0 30px #3b5bdb44}}
        @keyframes swirl{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .card-box{perspective:1200px;width:320px;height:520px}
        .card-flip{position:relative;width:100%;height:100%;transition:transform 0.9s cubic-bezier(.4,.2,.15,1);transform-style:preserve-3d}
        .card-flip.open{transform:rotateY(180deg)}
        .face{position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:16px;overflow:hidden}
        .face-front{transform:rotateY(180deg)}
        .reveal{padding:18px 44px;border-radius:50px;border:none;
          background:linear-gradient(135deg,#3b5bdb,#5f3dc4);color:#fff;
          font-size:17px;font-weight:800;cursor:pointer;font-family:inherit;
          box-shadow:0 4px 24px #5f3dc488;transition:all .15s;letter-spacing:.5px}
        .reveal:active{transform:scale(.95)}
        .sbar{display:flex;gap:8px;width:320px}
        .sbar button{flex:1;padding:12px 6px;border-radius:12px;border:1px solid #334155;
          background:#1e293b;color:#e2e8f0;font-size:12px;font-weight:700;
          cursor:pointer;font-family:inherit;transition:all .12s}
        .sbar button:active{transform:scale(.94);background:#334155}
      `}</style>

      {/* 업로드 */}
      {!card && !loading && (
        <div style={S.upload}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: "float 3s ease-in-out infinite" }}>🃏</div>
          <h1 style={S.title}>몬스터 카드 생성기</h1>
          <p style={S.desc}>사진을 올리면 AI가 분석해서<br />트레이딩 카드로 만들어줘요</p>
          <label htmlFor="mc-file" style={S.btn}>📸 사진 업로드</label>
          <input id="mc-file" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          <p style={S.hint}>카메라로 찍거나 갤러리에서 선택</p>
          {error && <p style={{ color: "#ef4444", marginTop: 14, fontSize: 13 }}>{error}</p>}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={S.loadWrap}>
          <div style={S.spinner} />
          <p style={{ marginTop: 16, fontSize: 16, fontWeight: 700 }}>카드 생성 중...</p>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>AI가 몬스터를 소환하고 있어요</p>
          {img && <img src={img} style={{ width: 100, borderRadius: 12, marginTop: 16, opacity: 0.6 }} alt="" />}
        </div>
      )}

      {error && !card && !loading && !showKeyInput && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p>
          <button style={S.btn} onClick={() => { setError(""); setImg(null); }}>다시 시도</button>
        </div>
      )}

      {/* 카드 */}
      {card && !loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="card-box">
            <div className={`card-flip ${flipped ? "open" : ""}`}>

              {/* 뒷면 */}
              <div className="face" style={{ background: "#192040", padding: 4 }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: 13,
                  background: "radial-gradient(ellipse at 50% 50%, #1a2456 0%, #0d1230 50%, #080b1a 100%)",
                  position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {[160, 200, 240].map((size, i) => (
                    <div key={i} style={{
                      position: "absolute", width: size, height: size, borderRadius: "50%",
                      border: `${2 - i * 0.3}px solid`,
                      borderColor: `#4c6ef555 transparent #3b5bdb33 transparent`,
                      animation: `swirl ${4 + i * 2}s linear infinite ${i % 2 === 0 ? "" : "reverse"}`,
                    }} />
                  ))}
                  <div style={{
                    position: "absolute", width: 300, height: 300,
                    background: "conic-gradient(from 0deg, transparent, #3b5bdb11, transparent, #5f3dc411, transparent, #3b5bdb11, transparent)",
                    animation: "swirl 8s linear infinite",
                  }} />
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%", position: "relative", zIndex: 2,
                    background: "radial-gradient(circle at 35% 35%, #e8eaff 0%, #8b9cf7 25%, #4c6ef5 50%, #3b5bdb 70%, #2b44a8 100%)",
                    boxShadow: "0 0 40px #3b5bdb66, inset 0 -4px 10px #1a2456",
                    animation: "glow 3s ease-in-out infinite",
                  }}>
                    <div style={{
                      position: "absolute", top: 16, left: 22, width: 24, height: 14,
                      background: "radial-gradient(ellipse, rgba(255,255,255,.7), transparent)",
                      borderRadius: "50%", transform: "rotate(-20deg)",
                    }} />
                    <div style={{
                      position: "absolute", top: "47%", left: "10%", width: "80%", height: 3,
                      background: "linear-gradient(90deg, transparent, #1a245688, transparent)",
                      borderRadius: 2,
                    }} />
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#fff", border: "3px solid #2b44a8",
                      boxShadow: "0 0 8px #fff8",
                    }} />
                  </div>
                  <div style={{
                    position: "absolute", top: 30, fontSize: 13, fontWeight: 800,
                    color: "#6c7fd8", letterSpacing: 6, textTransform: "uppercase",
                  }}>MONSTER</div>
                  <div style={{
                    position: "absolute", bottom: 30, fontSize: 13, fontWeight: 800,
                    color: "#6c7fd8", letterSpacing: 6, textTransform: "uppercase",
                    transform: "rotate(180deg)",
                  }}>MONSTER</div>
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "linear-gradient(110deg, transparent 30%, rgba(100,130,255,.06) 42%, transparent 50%)",
                    backgroundSize: "200% 100%", animation: "shimmer 4s ease-in-out infinite",
                  }} />
                  <div style={{ position: "absolute", inset: 14, border: "1.5px solid #3b5bdb25", borderRadius: 10 }} />
                  <div style={{ position: "absolute", inset: 22, border: "1px solid #3b5bdb15", borderRadius: 7 }} />
                </div>
              </div>

              {/* 앞면 */}
              <div className="face face-front" ref={cardRef}
                onMouseMove={flipped ? handleTilt : undefined}
                onMouseLeave={() => setTilt({ x: 0, y: 0 })}
                onTouchMove={flipped ? handleTilt : undefined}
                onTouchEnd={() => setTilt({ x: 0, y: 0 })}
                style={{
                  background: t.bg, padding: 3,
                  transform: `rotateY(180deg) perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: "transform 0.1s ease-out",
                  boxShadow: flipped ? `0 8px 32px rgba(0,0,0,.5), 0 0 50px ${t.color}33` : "none",
                }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 14, zIndex: 2, pointerEvents: "none",
                  background: `linear-gradient(${120 + tilt.y * 5}deg, transparent 30%, rgba(255,255,255,.12) 45%, transparent 55%, rgba(255,255,255,.08) 70%, transparent 80%)`,
                }} />
                <div style={{
                  background: "#1a1a2e", borderRadius: 14, padding: "10px 14px 10px",
                  position: "relative", zIndex: 1, height: "calc(100% - 6px)",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexShrink: 0 }}>
                    <div>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>{card.stage || "기본"}</span>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>{card.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>HP</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: t.color, marginLeft: 3 }}>{card.hp}</span>
                      <span style={{ fontSize: 14, marginLeft: 3 }}>{t.icon}</span>
                    </div>
                  </div>
                  <div style={{
                    width: "100%", height: 180, borderRadius: 8, overflow: "hidden",
                    border: `2px solid ${t.color}44`, marginBottom: 3, background: "#111827",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {img && <img src={img} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#64748b", margin: "1px 2px 4px", flexShrink: 0 }}>
                    <span>{card.name_en} · {card.type}타입</span>
                    <span>{card.height} · {card.weight}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
                    <div>
                      <div style={S.atkRow}>
                        <div style={S.costCol}>
                          {Array.from({ length: card.attack1_cost || 1 }).map((_, i) => (
                            <span key={i} style={{ ...S.costDot, background: t.color }}>{t.icon}</span>
                          ))}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 700, fontSize: 12.5, color: "#e2e8f0" }}>{card.attack1_name}</span>
                            <span style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9" }}>{card.attack1_damage}</span>
                          </div>
                          <div style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 1 }}>{card.attack1_desc}</div>
                        </div>
                      </div>
                      <div style={{ borderTop: "1px solid #ffffff10", margin: "4px 0" }} />
                      <div style={S.atkRow}>
                        <div style={S.costCol}>
                          {Array.from({ length: card.attack2_cost || 2 }).map((_, i) => (
                            <span key={i} style={{ ...S.costDot, background: t.color }}>{t.icon}</span>
                          ))}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 700, fontSize: 12.5, color: "#e2e8f0" }}>{card.attack2_name}</span>
                            <span style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9" }}>{card.attack2_damage}</span>
                          </div>
                          <div style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 1 }}>{card.attack2_desc}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 16, padding: "5px 0", borderTop: "1px solid #ffffff10" }}>
                        <div><span style={{ fontSize: 8, color: "#64748b" }}>약점</span><div style={{ fontSize: 11 }}>{w.icon} <span style={{ fontSize: 9, color: "#ef4444" }}>×2</span></div></div>
                        <div><span style={{ fontSize: 8, color: "#64748b" }}>저항</span><div style={{ fontSize: 11 }}>—</div></div>
                        <div><span style={{ fontSize: 8, color: "#64748b" }}>후퇴</span><div style={{ fontSize: 11 }}>⚪⚪</div></div>
                      </div>
                      <div style={{
                        fontSize: 8.5, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.4,
                        padding: "4px 5px", background: "#0f172a", borderRadius: 5,
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                      }}>{card.flavor}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 7, color: "#475569" }}>
                        <span>©2026 AI Card Gen</span>
                        <span style={{ color: t.color, fontWeight: 700 }}>{STARS[card.rarity] || "★★★"} {card.rarity || "SR"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!flipped ? (
            <button className="reveal" onClick={() => setFlipped(true)}>✨ 카드 확인하기</button>
          ) : (
            <div className="sbar">
              <button onClick={shareCard} disabled={sharing}>{sharing ? "⏳ 생성중" : "📤 공유하기"}</button>
              <button onClick={() => {
                const text = `🃏 내 AI 몬스터 카드\n\n${card.name} (${card.name_en})\n${t.icon} ${card.type}타입 · HP ${card.hp}\n\n⚔️ ${card.attack1_name}: ${card.attack1_damage}\n💥 ${card.attack2_name}: ${card.attack2_damage}\n\n📖 ${card.flavor}\n\n${STARS[card.rarity]||"★★★"} ${card.rarity||"SR"}\n\n나도 만들어보기 →`;
                navigator.clipboard?.writeText(text);
              }}>📋 복사</button>
              <button onClick={() => { setCard(null); setImg(null); setFlipped(false); }}>🔄 새로</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { maxWidth: 400, margin: "0 auto", padding: "20px 16px 40px", minHeight: "100vh",
    fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif", color: "#e2e8f0" },
  upload: { textAlign: "center", padding: "50px 20px",
    background: "linear-gradient(135deg,#0f172a,#1a1040,#0f172a)", borderRadius: 20,
    border: "2px dashed #334155" },
  title: { fontSize: 24, fontWeight: 800, margin: 0,
    background: "linear-gradient(135deg,#c4b5fd,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  desc: { fontSize: 13, color: "#94a3b8", margin: "10px 0 24px", lineHeight: 1.6 },
  btn: { padding: "16px 36px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff",
    fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 20px #7c3aed55" },
  hint: { fontSize: 11, color: "#64748b", marginTop: 14 },
  loadWrap: { textAlign: "center", padding: "80px 20px", color: "#e2e8f0" },
  spinner: { width: 40, height: 40, border: "4px solid #334155", borderTop: "4px solid #8b5cf6",
    borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" },
  atkRow: { display: "flex", gap: 6, alignItems: "flex-start", padding: "3px 0" },
  costCol: { display: "flex", flexDirection: "column", gap: 2, paddingTop: 1 },
  costDot: { width: 15, height: 15, borderRadius: "50%", fontSize: 8, lineHeight: "15px", textAlign: "center", display: "block" },
};
