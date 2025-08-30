import React, { useRef, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pose } from "@mediapipe/pose";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

function timeLabelToSeconds(label) {
  switch (label) {
    case "30m":
      return 30 * 60;
    case "1h":
      return 60 * 60;
    case "1h 30m":
      return 90 * 60;
    case "2h":
      return 120 * 60;
    default:
      return null; 
  }
}


function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const POSTURE_BAD_THRESHOLD = 4;
const POSTURE_ALERT_AFTER = 5; 
const FOCUS_ALERT_AFTER = 10; 

function speakOnce(text) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    
  }
}

function Tracking() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedOption, selectedTime } = location.state || {};


  const wantsPosture = /posture/i.test(selectedOption || "");
  const wantsFocus = /focus/i.test(selectedOption || "");

 
  const [postureScore, setPostureScore] = useState(10);
  const [avgPostureScore, setAvgPostureScore] = useState(10);
  const postureRolling = useRef([]);
  const postureAll = useRef([]);
  const postureFrameCount = useRef(0);

 
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [unfocusedSeconds, setUnfocusedSeconds] = useState(0);
  const focusLastTs = useRef(null);
  const focusState = useRef(false);
  const focusSmooth = useRef([]);

 
  const totalDurationSec = timeLabelToSeconds(selectedTime);
  const [timeLeft, setTimeLeft] = useState(totalDurationSec);

 
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const faceMeshRef = useRef(null);


  const postureLastTs = useRef(null);
  const postureBadStreakSec = useRef(0);
  const postureAlerted = useRef(false);

  const focusUnfocusedStreakSec = useRef(0);
  const focusAlerted = useRef(false);
  
  function calculatePostureScore(landmarks, canvasW, canvasH) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose || !leftEar || !rightEar) {
      return 0;
    }

    let score = 10;

    const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };

    const shoulderTilt = Math.abs((leftShoulder.y - rightShoulder.y) * canvasH);
    score -= Math.min(shoulderTilt / 8, 3);

    const backLean = Math.abs(midShoulder.x - midHip.x) * canvasW;
    score -= Math.min(backLean / 15, 4);

    const headForward = Math.abs(nose.x - midShoulder.x) * canvasW;
    score -= Math.min(headForward / 12, 3);

    const earTilt = Math.abs(leftEar.y - rightEar.y) * canvasH;
    score -= Math.min(earTilt / 12, 2);

    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const torsoUpright = (hipHeight - shoulderHeight) * canvasH;
    if (torsoUpright < 140) {
      score -= 3;
    }

    return Math.max(0, Math.min(10, score));
  }

  function isFocusedFromFace(landmarks) {
    if (!landmarks || landmarks.length < 468) return false;

    const leftEyeOuter = landmarks[263];
    const rightEyeOuter = landmarks[33];
    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const dL = dist(nose, leftEyeOuter);
    const dR = dist(nose, rightEyeOuter);
    const yawAsym = Math.abs((dL - dR) / (dL + dR + 1e-6));

    const faceH = Math.max(1e-6, Math.abs(chin.y - forehead.y));
    const midY = (forehead.y + chin.y) / 2;
    const pitchOffset = Math.abs((nose.y - midY) / faceH);

    const yawOk = yawAsym < 0.12;
    const pitchOk = pitchOffset < 0.18;

    return yawOk && pitchOk;
  }

  const handleEndSession = useCallback(() => {
    const sessionPayload = {
      timestamp: Date.now(),
      selectedOption,
      postureAvg: avgPostureScore / 10, 
      focusStats: {
        focused: focusedSeconds,
        unfocused: unfocusedSeconds,
        percent:
          focusedSeconds + unfocusedSeconds > 0
            ? Math.round((focusedSeconds / (focusedSeconds + unfocusedSeconds)) * 100)
            : 100,
      },
      selectedTime,
    };

    try {
      localStorage.setItem("lastSession", JSON.stringify(sessionPayload));

      const raw = localStorage.getItem("sessions");
      let arr = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) arr = parsed;
        } catch (e) {
          console.warn("Couldn't parse sessions array; starting fresh.", e);
          arr = [];
        }
      }
      arr.push(sessionPayload);
      try {
        localStorage.setItem("sessions", JSON.stringify(arr));
      } catch (e) {
        console.warn("Could not save sessions history:", e);
      }
    } catch (e) {
      console.warn("Could not save last session:", e);
    }

    navigate("/summary", {
      state: sessionPayload,
    });
  }, [navigate, selectedOption, avgPostureScore, focusedSeconds, unfocusedSeconds, selectedTime]);
 
  const handleEndSessionRef = useRef(handleEndSession);
  useEffect(() => {
    handleEndSessionRef.current = handleEndSession;
  }, [handleEndSession]);
  
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const ctx = canvasElement.getContext("2d");

    let latestPose = null;
    let latestFace = null;

    const renderFrame = (image) => {
      ctx.save();
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);

      if (latestPose?.poseLandmarks) {
        latestPose.poseLandmarks.forEach((lm) => {
          ctx.beginPath();
          ctx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, 4, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        });
      }

      if (latestFace?.multiFaceLandmarks?.length > 0) {
        const lm = latestFace.multiFaceLandmarks[0];
        const drawPt = (p, r = 3) => {
          ctx.beginPath();
          ctx.arc(p.x * canvasElement.width, p.y * canvasElement.height, r, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(0,200,255,0.9)";
          ctx.fill();
        };
        drawPt(lm[1]);
        drawPt(lm[33]);
        drawPt(lm[263]);
      }

      ctx.restore();
    };

    if (wantsPosture) {
      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults((results) => {
        latestPose = results;

        if (results.poseLandmarks) {
          const raw = calculatePostureScore(results.poseLandmarks, canvasElement.width, canvasElement.height);
          postureRolling.current.push(raw);
          if (postureRolling.current.length > 10) postureRolling.current.shift();
          const rollingAvg = postureRolling.current.reduce((a, b) => a + b, 0) / postureRolling.current.length;
          setPostureScore(Number(rollingAvg.toFixed(1)));

          postureAll.current.push(raw);
          postureFrameCount.current += 1;
          const sessionAvg = postureAll.current.reduce((a, b) => a + b, 0) / postureFrameCount.current;
          setAvgPostureScore(Number(sessionAvg.toFixed(1)));

          const nowP = performance.now();
          let dtP = 0;
          if (postureLastTs.current == null) {
            postureLastTs.current = nowP;
          } else {
            dtP = (nowP - postureLastTs.current) / 1000;
            postureLastTs.current = nowP;
          }

          if (rollingAvg < POSTURE_BAD_THRESHOLD) {
            postureBadStreakSec.current += dtP;
            if (postureBadStreakSec.current >= POSTURE_ALERT_AFTER && !postureAlerted.current) {
              speakOnce("Please Adjust Your Posture");
              postureAlerted.current = true;
            }
          } else {
            postureBadStreakSec.current = 0;
            postureAlerted.current = false;
          }
        }

        if (results.image) renderFrame(results.image);
      });
      poseRef.current = pose;
    }

    if (wantsFocus) {
      const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMesh.onResults((results) => {
        latestFace = results;
        let focusedNow = false;
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const lm = results.multiFaceLandmarks[0];
          focusedNow = isFocusedFromFace(lm);
        }

        focusSmooth.current.push(focusedNow ? 1 : 0);
        if (focusSmooth.current.length > 8) focusSmooth.current.shift();
        const smoothed = focusSmooth.current.reduce((a, b) => a + b, 0) / focusSmooth.current.length >= 0.5;

        const now = performance.now();
        let dt = 0;
        if (focusLastTs.current == null) {
          focusLastTs.current = now;
          focusState.current = smoothed;
        } else {
          dt = (now - focusLastTs.current) / 1000;
          if (focusState.current) {
            setFocusedSeconds((prev) => prev + dt);
          } else {
            setUnfocusedSeconds((prev) => prev + dt);
          }


          if (!smoothed) {
            focusUnfocusedStreakSec.current += dt;
            if (focusUnfocusedStreakSec.current >= FOCUS_ALERT_AFTER && !focusAlerted.current) {
              speakOnce("Please Focus");
              focusAlerted.current = true;
            }
          } else {
            focusUnfocusedStreakSec.current = 0;
            focusAlerted.current = false;
          }
         

          focusLastTs.current = now;
          focusState.current = smoothed;
        }

        if (results.image) renderFrame(results.image);
      });
      faceMeshRef.current = faceMesh;
    }

    if (videoElement) {
      const camera = new Camera(videoElement, {
        onFrame: async () => {
          if (poseRef.current && wantsPosture) await poseRef.current.send({ image: videoElement });
          if (faceMeshRef.current && wantsFocus) await faceMeshRef.current.send({ image: videoElement });
        },
        width: 800,
        height: 500,
      });
      camera.start();
      cameraRef.current = camera;
    }

    return () => {
      if (poseRef.current?.close) poseRef.current.close();
      if (faceMeshRef.current?.close) faceMeshRef.current.close();
      if (cameraRef.current) cameraRef.current.stop();

      const v = videoElement;
      if (v?.srcObject) v.srcObject.getTracks().forEach((t) => t.stop());

      poseRef.current = null;
      faceMeshRef.current = null;
      cameraRef.current = null;
    };
  }, [wantsPosture, wantsFocus]);


  useEffect(() => {
    if (!totalDurationSec) return;
    
    setTimeLeft(totalDurationSec);

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(id);
         
          if (handleEndSessionRef.current) handleEndSessionRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [totalDurationSec]);

  const totalFocusWindow = focusedSeconds + unfocusedSeconds;
  const focusPercent = totalFocusWindow > 0 ? Math.round((focusedSeconds / totalFocusWindow) * 100) : 100;

  return (
    <div
      style={{
        textAlign: "center",
        backgroundImage: "url('https://images.pexels.com/photos/316902/pexels-photo-316902.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "20px",
        position: "relative",
      }}
    >
      {timeLeft != null && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            background: "rgba(0,0,0,0.55)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: "bold",
            fontSize: 18,
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          }}
        >
          Time Left: {formatHMS(timeLeft)}
        </div>
      )}

      <h1 style={{ color: "white", textShadow: "0px 0px 8px black", marginBottom: 8 }}>
        Tracking: {selectedOption || "Session"}
      </h1>

      {selectedTime && (
        <div style={{ color: "white", opacity: 0.9, marginBottom: 8 }}>
          Duration: <strong>{selectedTime}</strong>
        </div>
      )}

      <div style={{ marginTop: "10px", position: "relative" }}>
        <video ref={videoRef} style={{ display: "none" }} playsInline />
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{
            border: "6px solid rgba(255,255,255,0.6)",
            borderRadius: "20px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 20px rgba(0,0,0,0.6)",
            maxWidth: "100%",
          }}
        />
      </div>


      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "90%",
          maxWidth: "1100px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          borderRadius: "15px",
          padding: "16px 24px",
          color: "white",
          fontSize: "18px",
        }}
      >
        <div style={{ display: "flex", gap: "20px" }}>
          {wantsPosture && (
            <>
              <div>
                Avg Posture: <strong>{avgPostureScore}/10</strong>
              </div>
              <div>
                Current: <strong>{postureScore}/10</strong>
              </div>
            </>
          )}
          {wantsFocus && (
            <>
              <div>
                Focused: <strong>{formatHMS(focusedSeconds)}</strong>
              </div>
              <div>
                Away: <strong>{formatHMS(unfocusedSeconds)}</strong>
              </div>
              <div>
                Focus: <strong>{focusPercent}%</strong>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleEndSession}
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "none",
            padding: "10px 20px",
            borderRadius: "10px",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}

export default Tracking;