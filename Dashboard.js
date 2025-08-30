import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import TrackingSetup from "./TrackingSetup";

function CircleStat({ percent, label, innerText }) {
  return (
    <div style={{ textAlign: "center", minWidth: 180 }}>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `conic-gradient(#4caf50 ${percent}%, rgba(255,255,255,0.25) 0%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "1.6rem",
          }}
        >
          {innerText ?? "--"}
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: "1.1rem", color: "white" }}>{label}</div>
    </div>
  );
}

function Dashboard() {
  const [userName, setUserName] = useState("");
  const [showTrackingSetup, setShowTrackingSetup] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserName(user.displayName || "User");

    try {
      const raw = localStorage.getItem("lastSession");
      if (raw) setLastSession(JSON.parse(raw));
    } catch (e) {
      console.warn("Unable to parse lastSession:", e);
    }

    try {
      const rawAll = localStorage.getItem("sessions");
      if (rawAll) {
        const parsed = JSON.parse(rawAll);
        if (Array.isArray(parsed)) setSessions(parsed);
      }
    } catch (e) {
      console.warn("Unable to parse sessions:", e);
    }
  }, []);

  if (showTrackingSetup) {
    return <TrackingSetup />;
  }

  const hasSession = !!lastSession;
  const wantsPosture = hasSession && /posture/i.test(lastSession.selectedOption || "");
  const wantsFocus = hasSession && /focus/i.test(lastSession.selectedOption || "");

  const postureScore = hasSession && typeof lastSession.postureAvg === "number"
    ? Math.round(lastSession.postureAvg * 10)
    : null;

  const focusPercent = hasSession && lastSession.focusStats
    ? lastSession.focusStats.percent
    : null;

  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;

  function averageForRange(fromTimestamp) {
    const filtered = sessions.filter((s) => s.timestamp >= fromTimestamp);

    const postureSessions = filtered.filter((s) => typeof s.postureAvg === "number");
    const postureAvg = postureSessions.length > 0
      ? postureSessions.reduce((acc, s) => acc + s.postureAvg, 0) / postureSessions.length
      : null;

    const focusSessions = filtered.filter((s) => s.focusStats && typeof s.focusStats.percent === "number");
    const focusAvgPercent = focusSessions.length > 0
      ? Math.round(focusSessions.reduce((acc, s) => acc + s.focusStats.percent, 0) / focusSessions.length)
      : null;

    return { postureAvg, focusAvgPercent, count: filtered.length };
  }

  const lifetime = averageForRange(0);
  const week = averageForRange(now - 7 * msInDay);
  const fiveWeeks = averageForRange(now - 35 * msInDay);

  const toPostureScoreAndPercent = (postureAvg) => {
    if (postureAvg == null) return { score: null, percent: 0 };
    const score = Math.round(postureAvg * 10);
    const percent = (score / 10) * 100;
    return { score, percent };
  };

  const lifetimePosture = toPostureScoreAndPercent(lifetime.postureAvg);
  const weekPosture = toPostureScoreAndPercent(week.postureAvg);
  const fiveWeeksPosture = toPostureScoreAndPercent(fiveWeeks.postureAvg);

  const lifetimeFocusPercent = lifetime.focusAvgPercent;
  const weekFocusPercent = week.focusAvgPercent;
  const fiveWeeksFocusPercent = fiveWeeks.focusAvgPercent;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        backgroundImage: "url('https://images.pexels.com/photos/66997/pexels-photo-66997.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          Welcome To AlginTheMind
        </div>

        <button
          onClick={() => setShowTrackingSetup(true)}
          style={{
            padding: "10px 20px",
            fontSize: "1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            background: "rgba(255,255,255,0.9)",
            color: "black",
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          }}
        >
          Track Focus/Posture
        </button>
      </div>

      <h1 style={{ textAlign: "center", marginTop: "60px", fontSize: "2.5rem", textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
        The Dashboard
      </h1>

      {!hasSession ? (
        <p style={{ textAlign: "center", fontSize: "1.1rem", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          Start a Posture and/or Tracking Session To See Your Stats.
        </p>
      ) : (
        <>
          
          <h2 style={{ textAlign: "center", marginTop: 40 }}>Lifetime Avg Scores</h2>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 60,
              flexWrap: "wrap",
            }}
          >
            <CircleStat
              percent={lifetimePosture.percent}
              innerText={lifetimePosture.score != null ? `${lifetimePosture.score}/10` : "--"}
              label="Posture"
            />
            <CircleStat
              percent={lifetimeFocusPercent ?? 0}
              innerText={lifetimeFocusPercent != null ? `${lifetimeFocusPercent}%` : "--"}
              label="Focus"
            />
          </div>

          
          <div
            style={{
              marginTop: 60,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 60,
              flexWrap: "wrap",
            }}
          >
            
            <div style={{ textAlign: "center" }}>
              <h2>Last Session's Avg Scores</h2>
              <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
                {wantsPosture && (
                  <CircleStat
                    percent={(postureScore / 10) * 100}
                    innerText={`${postureScore}/10`}
                    label="Posture"
                  />
                )}
                {wantsFocus && (
                  <CircleStat
                    percent={focusPercent ?? 0}
                    innerText={`${focusPercent}%`}
                    label="Focus"
                  />
                )}
              </div>
            </div>

            
            <div style={{ textAlign: "center" }}>
              <h2>Last Week's Avg Scores</h2>
              <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
                <CircleStat
                  percent={weekPosture.percent}
                  innerText={weekPosture.score != null ? `${weekPosture.score}/10` : "--"}
                  label="Posture"
                />
                <CircleStat
                  percent={weekFocusPercent ?? 0}
                  innerText={weekFocusPercent != null ? `${weekFocusPercent}%` : "--"}
                  label="Focus"
                />
              </div>
            </div>

           
            <div style={{ textAlign: "center" }}>
              <h2>Last 5 Weeks' Avg Scores</h2>
              <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
                <CircleStat
                  percent={fiveWeeksPosture.percent}
                  innerText={fiveWeeksPosture.score != null ? `${fiveWeeksPosture.score}/10` : "--"}
                  label="Posture"
                />
                <CircleStat
                  percent={fiveWeeksFocusPercent ?? 0}
                  innerText={fiveWeeksFocusPercent != null ? `${fiveWeeksFocusPercent}%` : "--"}
                  label="Focus"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth: 1000, margin: "80px auto 40px", padding: "0 20px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.82)",
            color: "black",
            borderRadius: 16,
            padding: "24px 28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Tips To Improve Posture</h2>
          <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
            <li>Keep feet flat on the floor and knees at a 90 degree anlge</li>
            <li>Keep ears over shoulders; avoid letting your head project forward </li>
            <li>Relax your shoulders; keep elbows close to your body</li>
            <li>Adjust the screen so the top is at or slightly below eye level</li>
            <li>Use support (pillow or rolled towel) to maintain a neutral spine</li>
            <li>Take a breaks every 30–45 minutes to stand and stretch</li>
          </ul>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.82)",
            color: "black",
            borderRadius: 16,
            padding: "24px 28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Tips To Improve Focus</h2>
          <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
            <li>Use a timer (e.g., 25–50 min focus blocks with 5–10 min breaks)</li>
            <li>Silence notifications and work in a quite environment</li>
            <li>Define a clear goal for each session before you start tracking</li>
            <li>Combine similar tasks to reduce context switching</li>
            <li>Optimize the environment to minimze distractions</li>
          </ul>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.82)",
            color: "black",
            borderRadius: 16,
            padding: "24px 28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Why Posture and Focus Matter for Teens</h2>
          <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
            <li>Poor posture can lead to long lasting back and neck pain</li>
            <li>Maintaining good posture reduces strain on muscles and joints</li>
            <li>Consistent focus improves productivity and mental clarity</li>
            <li>Regular posture checks can prevent long-term issues</li>
            <li>Great posture and focus together contribute to better energy levels</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;