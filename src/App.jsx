import { useCallback, useEffect, useRef, useState } from "react";

const pad = (v) => String(v).padStart(2, "0");
const C = 2 * Math.PI * 116; // ring circumference
const PRESETS = [
  ["1 min", 60],
  ["5 min", 300],
  ["10 min", 600],
  ["15 min", 900],
  ["25 min · Focus", 1500],
  ["45 min", 2700],
];
const ZONES = [
  ["London", "Europe/London"],
  ["New York", "America/New_York"],
  ["Tokyo", "Asia/Tokyo"],
];
const COLORS = ["#70e0c1", "#4aa8ff", "#ffd166", "#ff7a90", "#b69cff"];
const MOTIVATION = [
  "Stay focused. You've got this!",
  "One thing at a time.",
  "Deep breath. Keep going.",
  "Small steps, big results.",
  "Every second counts.",
];

const SCENES = [
  { icon: "⏳", name: "Starting Soon", title: "Stream starting soon", secs: 300 },
  { icon: "☕", name: "BRB", title: "Be right back", secs: 600 },
  { icon: "🎁", name: "Giveaway", title: "Giveaway draw in", secs: 300 },
  { icon: "❓", name: "Q&A", title: "Q&A starts in", secs: 900 },
  { icon: "👋", name: "Ending", title: "Stream ending in", secs: 180 },
];
const CTAS = [
  "👍 Like the stream if you're enjoying it!",
  "🔔 Subscribe & hit the bell",
  "💬 Say hi in the chat!",
  "📤 Share this stream with a friend",
  "❤️ Thanks for being here",
];
const THEMES = [
  { n: "Aqua", a: "#70e0c1", b: "#4aa8ff" },
  { n: "Live Red", a: "#ff8a8a", b: "#ff3b3b" },
  { n: "Violet", a: "#c3a6ff", b: "#7a6bff" },
  { n: "Gold", a: "#ffd166", b: "#ff9f43" },
];

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};
const fmtDur = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${sec ? sec + "s" : ""}`.trim() : `${sec}s`;
};

/* ---------- sound (Web Audio, no files needed) ---------- */
let audioCtx = null;
const getCtx = () => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
};
const beep = (freq, dur = 0.15, delay = 0, vol = 0.14) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
};
const chime = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.5, i * 0.18, 0.16));

/* ---------- small components ---------- */
function Digits({ text, animate }) {
  return (
    <span className="digits">
      {text.split("").map((ch, i) => (
        <span key={`${i}-${ch}`} className={`dg ${ch === ":" ? "colon" : ""} ${animate && ch !== ":" ? "flip" : ""}`}>
          {ch}
        </span>
      ))}
    </span>
  );
}

function AnalogClock({ now }) {
  const local = now - new Date(now).getTimezoneOffset() * 60000;
  const sec = (local / 1000) * 6, min = (local / 60000) * 6, hr = (local / 3600000) * 30;
  return (
    <svg viewBox="0 0 200 200" className="analog" role="img" aria-label="Analog clock">
      <circle cx="100" cy="100" r="94" className="a-face" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="100" y1={i % 5 ? 12 : 8} x2="100" y2={i % 5 ? 16 : 20} className={i % 5 ? "a-tick" : "a-tick big"} transform={`rotate(${i * 6} 100 100)`} />
      ))}
      {[[12, 100, 38], [3, 164, 105], [6, 100, 172], [9, 36, 105]].map(([n, x, y]) => (
        <text key={n} x={x} y={y} className="a-num" textAnchor="middle">{n}</text>
      ))}
      <line x1="100" y1="106" x2="100" y2="58" className="a-hand hr" style={{ transform: `rotate(${hr}deg)` }} />
      <line x1="100" y1="108" x2="100" y2="36" className="a-hand mn" style={{ transform: `rotate(${min}deg)` }} />
      <g className="a-sec" style={{ transform: `rotate(${sec}deg)` }}>
        <line x1="100" y1="118" x2="100" y2="26" />
        <circle cx="100" cy="26" r="3" />
      </g>
      <circle cx="100" cy="100" r="5" className="a-pin" />
    </svg>
  );
}

function ClockPanel() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const d = new Date(now);
  return (
    <section className="side-card clock-card">
      <div className="side-title">Live clock</div>
      <AnalogClock now={now} />
      <div className="digital-now">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
      <div className="date-now">{d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <div className="world">
        {ZONES.map(([name, tz]) => (
          <div key={tz}>
            <span>{name}</span>
            <b>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz })}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- main app ---------- */
function App() {
  const [time, setTime] = useState({ hours: "00", minutes: "00", seconds: "10" });
  const [remainingMs, setRemainingMs] = useState(10000);
  const [totalMs, setTotalMs] = useState(10000);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [endAt, setEndAt] = useState(null);
  const [label, setLabel] = useState(() => load("tb-label", ""));
  const [sound, setSound] = useState(() => load("tb-sound", true));
  const [history, setHistory] = useState(() => load("tb-history", []));
  const [pulse, setPulse] = useState(0);
  const [confetti, setConfetti] = useState([]);
  const [focus, setFocus] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [scene, setScene] = useState(null);
  const [channel, setChannel] = useState(() => load("tb-channel", ""));
  const [theme, setTheme] = useState(() => load("tb-theme", 0));
  const [stream, setStream] = useState(false);
  const [chroma, setChroma] = useState(false);
  const [banner, setBanner] = useState(null);
  const lastSec = useRef(-1);
  const endRef = useRef(0);
  const showBanner = useCallback((text, kind = "info") => setBanner({ id: Date.now(), text, kind }), []);
  const latest = useRef({});

  useEffect(() => { latest.current = { label, sound, totalMs, scene }; });
  useEffect(() => save("tb-label", label), [label]);
  useEffect(() => save("tb-sound", sound), [sound]);
  useEffect(() => save("tb-history", history), [history]);
  useEffect(() => save("tb-channel", channel), [channel]);
  useEffect(() => save("tb-theme", theme), [theme]);

  const totalInput = (v) => Number(v.hours || 0) * 3600 + Number(v.minutes || 0) * 60 + Number(v.seconds || 0);
  const secsLeft = Math.ceil(remainingMs / 1000);
  const hh = Math.floor(secsLeft / 3600), mm = Math.floor((secsLeft % 3600) / 60), ss = secsLeft % 60;
  const clockText = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const threshold = totalMs >= 30000 ? 10 : 3;
  const danger = running && secsLeft > 0 && secsLeft <= threshold;

  /* tick: timestamp based, so it stays accurate even if the tab is throttled */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const rem = endRef.current - Date.now();
      const sec = Math.ceil(rem / 1000);
      if (sec !== lastSec.current) {
        lastSec.current = sec;
        const tot = latest.current.totalMs / 1000;
        if (tot >= 120 && sec === Math.round(tot / 2)) showBanner("⏳ Halfway there!", "milestone");
        else if (tot > 90 && sec === 60) showBanner("⏱ Only 1 minute left!", "milestone");
        else if (tot >= 30 && sec === 10) showBanner("🔥 10 seconds to go!", "milestone");
      }
      if (rem > 0) return setRemainingMs(rem);
      clearInterval(id);
      const { label: lb, sound: snd, totalMs: tm, scene: sc } = latest.current;
      showBanner(sc === 0 ? "🔴 WE'RE LIVE! Welcome everyone!" : "⏰ Time's up!", "live");
      setRemainingMs(0);
      setRunning(false);
      setFinished(true);
      if (snd) chime();
      setConfetti(
        Array.from({ length: 70 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.6,
          dur: 2.6 + Math.random() * 2,
          color: COLORS[i % COLORS.length],
          rot: Math.random() * 720 - 360,
          size: 6 + Math.random() * 7,
        }))
      );
      setHistory((h) => [{ label: lb.trim() || "Timer", secs: Math.round(tm / 1000), at: Date.now() }, ...h].slice(0, 20));
    }, 100);
    return () => clearInterval(id);
  }, [running, showBanner]);

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 4800);
    return () => clearTimeout(id);
  }, [banner]);

  /* rotating stream call-to-action banners while the timer runs */
  useEffect(() => {
    if (!running) return;
    let n = 0;
    const id = setInterval(() => showBanner(CTAS[n++ % CTAS.length], "cta"), 20000);
    return () => clearInterval(id);
  }, [running, showBanner]);

  useEffect(() => {
    if (!confetti.length) return;
    const id = setTimeout(() => setConfetti([]), 5500);
    return () => clearTimeout(id);
  }, [confetti]);

  /* tick sound for the last 3 seconds */
  useEffect(() => {
    if (running && sound && secsLeft > 0 && secsLeft <= 3) beep(secsLeft === 1 ? 880 : 660, 0.12, 0, 0.12);
  }, [secsLeft, running, sound]);

  /* rotate motivation line */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTipIdx((i) => (i + 1) % MOTIVATION.length), 6000);
    return () => clearInterval(id);
  }, [running]);

  /* tab title */
  useEffect(() => {
    document.title = running ? `${clockText} · TimeBox` : "TimeBox – Down Counter";
  }, [running, clockText]);

  const syncInputs = (updated) => {
    const ms = totalInput(updated) * 1000;
    setRemainingMs(ms);
    setTotalMs(ms);
    setHasStarted(false);
    setFinished(false);
  };

  const handleChange = (field, value) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    const updated = { ...time, [field]: value };
    setTime(updated);
    if (!running) syncInputs(updated);
  };

  const handleStart = () => {
    getCtx(); // unlock audio on user gesture
    let rem = remainingMs;
    if (!hasStarted || rem <= 0) {
      const total = totalInput(time);
      if (Number(time.minutes) > 59 || Number(time.seconds) > 59 || total <= 0) {
        alert("Enter a valid time greater than zero.");
        return;
      }
      rem = total * 1000;
      setRemainingMs(rem);
      setTotalMs(rem);
    }
    lastSec.current = -1;
    endRef.current = Date.now() + rem;
    setEndAt(endRef.current);
    setHasStarted(true);
    setFinished(false);
    setRunning(true);
    setPulse((p) => p + 1);
    if (sound) beep(660, 0.1, 0, 0.1), beep(990, 0.14, 0.1, 0.1);
  };

  const handlePause = () => {
    setRemainingMs(Math.max(0, endRef.current - Date.now()));
    setRunning(false);
  };

  const handleReset = () => {
    setRunning(false);
    setConfetti([]);
    syncInputs(time);
  };

  const addTime = (sec) => {
    const ms = sec * 1000;
    if (running) {
      endRef.current += ms;
      setEndAt(endRef.current);
    }
    setRemainingMs((r) => r + ms);
    setTotalMs((t) => t + ms);
  };

  const setPreset = (seconds) => {
    setRunning(false);
    const updated = {
      hours: pad(Math.floor(seconds / 3600)),
      minutes: pad(Math.floor((seconds % 3600) / 60)),
      seconds: pad(seconds % 60),
    };
    setTime(updated);
    syncInputs(updated);
  };

  const pickScene = (i) => {
    setScene(i);
    setLabel(SCENES[i].title);
    setPreset(SCENES[i].secs);
  };

  const toggleStream = () => {
    const next = !stream;
    setStream(next);
    try {
      if (next) document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  const toggleFocus = () => {
    const next = !focus;
    setFocus(next);
    try {
      if (next) document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  /* keyboard shortcuts: Space = start/pause, R = reset */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button") return;
      if (e.code === "Space") { e.preventDefault(); running ? handlePause() : handleStart(); }
      if (e.key.toLowerCase() === "r") handleReset();
      if (e.key.toLowerCase() === "s") toggleStream();
      if (e.key.toLowerCase() === "g") setChroma((c) => !c);
      if (e.key === "Escape" && stream) setStream(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const status = running ? "TIMER IN PROGRESS" : finished ? "TIME COMPLETED" : hasStarted ? "TIMER PAUSED" : "READY WHEN YOU ARE";
  const note = finished
    ? "Great! Your countdown is complete. 🎉"
    : running
    ? MOTIVATION[tipIdx]
    : "Set your time and press Start (or hit Space).";
  const totalToday = history.reduce((a, h) => a + h.secs, 0);

  return (
    <main style={{ "--teal": THEMES[theme].a, "--blue": THEMES[theme].b, "--c1": THEMES[theme].b, "--c2": THEMES[theme].a }} className={`app ${stream ? "is-stream" : ""} ${chroma ? "is-chroma" : ""} ${running ? "is-running" : ""} ${danger ? "is-danger" : ""} ${finished ? "is-done" : ""} ${focus ? "is-focus" : ""}`}>
      <div className="aurora" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <b key={i} style={{ left: `${(i * 47) % 100}%`, animationDelay: `${-(i * 1.7) % 18}s`, animationDuration: `${14 + (i % 6) * 3}s`, width: 3 + (i % 4) * 2, height: 3 + (i % 4) * 2 }} />
        ))}
      </div>
      <div className="vignette" aria-hidden="true" />
      <div className="confetti" aria-hidden="true">
        {confetti.map((c) => (
          <i key={c.id} style={{ left: `${c.left}%`, background: c.color, width: c.size, height: c.size * 0.45, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, "--rot": `${c.rot}deg` }} />
        ))}
      </div>

      <div className="topbar">
        <div className="brand">
          <span className="brand-icon">◷</span>
          <span>Time<span className="brand-highlight">Box</span></span>
        </div>
        <div className="top-actions">
          <button className={`chip ${sound ? "on" : ""}`} onClick={() => setSound(!sound)} title="Toggle sound">{sound ? "🔊 Sound on" : "🔇 Muted"}</button>
          <button className={`chip ${focus ? "on" : ""}`} onClick={toggleFocus} title="Distraction-free fullscreen">⛶ Focus mode</button>
          <button className={`chip ${stream ? "on" : ""}`} onClick={toggleStream} title="Clean full-screen view for YouTube / OBS (S)">📺 Stream mode</button>
          <button className={`chip ${chroma ? "on" : ""}`} onClick={() => setChroma(!chroma)} title="Green background for chroma key (G)">🟩 Green screen</button>
          <span className="themes">
            {THEMES.map((t, i) => (
              <button key={t.n} className={`swatch ${i === theme ? "on" : ""}`} style={{ background: `linear-gradient(135deg, ${t.b}, ${t.a})` }} onClick={() => setTheme(i)} title={t.n} aria-label={t.n + " theme"} />
            ))}
          </span>
        </div>
      </div>

      {banner && <div key={banner.id} className={`banner ${banner.kind}`}>{banner.text}</div>}
      <div className="stream-bar">
        <button className="chip" onClick={() => setChroma(!chroma)}>🟩 Green screen</button>
        <button className="chip" onClick={toggleStream}>✕ Exit stream mode</button>
      </div>

      <div className="layout">
        <section className="counter-card">
          <div className="eyebrow">
            <span className={`status-dot ${running ? "live" : ""}`} />
            {status}
          </div>

          <div className="scenes">
            {SCENES.map((sc, i) => (
              <button key={sc.name} className={i === scene ? "on" : ""} onClick={() => pickScene(i)} disabled={running}>{sc.icon} {sc.name}</button>
            ))}
          </div>

          <input className="label-input" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="What are you working on? (optional)" disabled={running} aria-label="Timer label" />

          <input className="label-input channel-input" value={channel} maxLength={30} onChange={(e) => setChannel(e.target.value)} placeholder="Channel name, e.g. @mychannel (optional)" aria-label="Channel name" />

          <div className="stage-head">
            <div className="stage-title">{label.trim() || "Countdown"}</div>
            {channel.trim() && <div className="stage-channel">{channel.trim()}</div>}
          </div>

          <div className="ring-wrap">
            <div className="sweep" aria-hidden="true" />
            {pulse > 0 && <span key={pulse} className="shock" aria-hidden="true" />}
            {pulse > 0 && <span key={"b" + pulse} className="shock s2" aria-hidden="true" />}
            <svg viewBox="0 0 260 260" className="ring" aria-hidden="true">
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--c1)" }} />
                  <stop offset="100%" style={{ stopColor: "var(--c2)" }} />
                </linearGradient>
                <linearGradient id="rd" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff9a5c" />
                  <stop offset="100%" stopColor="#ff4d6d" />
                </linearGradient>
              </defs>
              {Array.from({ length: 60 }, (_, i) => (
                <line key={i} x1="130" y1="2" x2="130" y2={i % 5 ? 6 : 10} className="r-tick" transform={`rotate(${i * 6} 130 130)`} />
              ))}
              <circle cx="130" cy="130" r="116" className="r-track" />
              <circle cx="130" cy="130" r="116" className="r-fill" stroke={danger ? "url(#rd)" : "url(#rg)"} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 130 130)" />
              {hasStarted && !finished && (
                <g style={{ transform: `rotate(${progress * 360}deg)`, transformOrigin: "130px 130px" }}>
                  <circle cx="130" cy="14" r="11" className="spark-halo" />
                  <circle cx="130" cy="14" r="5" className="spark" />
                </g>
              )}
            </svg>
            <div className="ring-center">
              {danger ? (
                <div className="big-count" key={secsLeft}>{secsLeft}</div>
              ) : (
                <>
                  <Digits text={clockText} animate={running} />
                  <div className="center-sub">{finished ? (scene === 0 ? "🔴 We are live" : "Done!") : `${Math.round(progress * 100)}% left`}</div>
                </>
              )}
            </div>
          </div>

          <div className="ends-at">
            {running && endAt ? (
              <>Ends at <b>{new Date(endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b></>
            ) : (
              <>Duration <b>{fmtDur(Math.round(totalMs / 1000)) || "0s"}</b></>
            )}
          </div>

          <div className="progress-track"><div className={`progress-fill ${running ? "shimmer" : ""}`} style={{ width: `${progress * 100}%` }} /></div>

          <div className={`adders ${hasStarted && !finished ? "show" : ""}`}>
            <button onClick={() => addTime(60)} disabled={!hasStarted || finished}>+1 min</button>
            <button onClick={() => addTime(300)} disabled={!hasStarted || finished}>+5 min</button>
            <button onClick={() => addTime(-60)} disabled={!hasStarted || finished || remainingMs <= 61000}>−1 min</button>
          </div>

          <div className="section-heading">
            <span>Set your duration</span>
            <span className="format-hint">HH : MM : SS</span>
          </div>

          <div className="time-inputs">
            {[["hours", "Hours", 999], ["minutes", "Minutes", 59], ["seconds", "Seconds", 59]].map(([field, lbl, max]) => (
              <label className="input-group" key={field}>
                <span>{lbl}</span>
                <input
                  type="number" min="0" max={max} value={time[field]} disabled={running}
                  onChange={(e) => handleChange(field, e.target.value)}
                  onBlur={() => {
                    const value = Math.min(Number(time[field] || 0), max);
                    const updated = { ...time, [field]: pad(value) };
                    setTime(updated);
                    if (!running) syncInputs(updated);
                  }}
                />
              </label>
            ))}
          </div>

          <div className="presets">
            <span>Quick select</span>
            <div className="preset-buttons">
              {PRESETS.map(([name, s]) => (
                <button key={s} onClick={() => setPreset(s)} disabled={running}>{name}</button>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn-start" onClick={handleStart} disabled={running}>
              <span>▶</span> {hasStarted && remainingMs > 0 && !finished ? "Resume" : "Start"}
            </button>
            <button className="btn-pause" onClick={handlePause} disabled={!running}><span>Ⅱ</span> Pause</button>
            <button className="btn-reset" onClick={handleReset}>↻ Reset</button>
          </div>

          <div className="bottom-note"><span>◈</span>{note}</div>
          <div className="shortcuts"><kbd>Space</kbd> start / pause · <kbd>R</kbd> reset · <kbd>S</kbd> stream mode · <kbd>G</kbd> green screen</div>
        </section>

        <aside className="side">
          <ClockPanel />
          <section className="side-card">
            <div className="side-title">
              Session stats
              {history.length > 0 && <button className="link" onClick={() => setHistory([])}>Clear</button>}
            </div>
            <div className="stats">
              <div><b>{history.length}</b><span>completed</span></div>
              <div><b>{fmtDur(totalToday) || "0s"}</b><span>total time</span></div>
            </div>
            {history.length === 0 ? (
              <p className="empty">Finished timers will appear here.</p>
            ) : (
              <ul className="hist">
                {history.slice(0, 5).map((h) => (
                  <li key={h.at}>
                    <span className="h-dot" />
                    <span className="h-name">{h.label}</span>
                    <span className="h-dur">{fmtDur(h.secs)}</span>
                    <span className="h-at">{new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <footer>Simple tools. Better focus.</footer>
    </main>
  );
}

export default App;
