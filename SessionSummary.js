import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SessionSummary.css";

function SessionSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedOption, postureAvg, focusStats } = location.state || {};

  const handleReturn = () => navigate("/dashboard");

  const postureScore = Math.round(postureAvg * 10);

  return (
    <div className="summary-page">
      <h1 className="summary-title">Session's Summary</h1>
      <div className="summary-content">

        {selectedOption?.toLowerCase().includes("posture") &&
          !selectedOption?.toLowerCase().includes("focus") && (
            <div className="circle-container">
              <div
                className="circle"
                style={{ "--percent": `${(postureScore / 10) * 100}%` }}
              >
                <div className="circle-inner">
                  <span>{postureScore}/10</span>
                </div>
              </div>
              <p className="label">Average Posture</p>
            </div>
          )}

        {selectedOption?.toLowerCase().includes("focus") &&
          !selectedOption?.toLowerCase().includes("posture") && (
            <div className="focus-stats">
              <div>
                <h2>{Math.round(focusStats.focused)}s</h2>
                <p>Focused</p>
              </div>
              <div
                className="circle"
                style={{ "--percent": `${focusStats.percent}%` }}
              >
                <div className="circle-inner">
                  <span>{focusStats.percent}%</span>
                </div>
              </div>
              <div>
                <h2>{Math.round(focusStats.unfocused)}s</h2>
                <p>Away</p>
              </div>
            </div>
          )}

        {selectedOption?.toLowerCase().includes("focus") &&
          selectedOption?.toLowerCase().includes("posture") && (
            <div className="both-stats">
              <div className="circle-container">
                <div
                  className="circle"
                  style={{ "--percent": `${(postureScore / 10) * 100}%` }}
                >
                  <div className="circle-inner">
                    <span>{postureScore}/10</span>
                  </div>
                </div>
                <p className="label">Posture</p>
              </div>
              <div className="circle-container">
                <div
                  className="circle"
                  style={{ "--percent": `${focusStats.percent}%` }}
                >
                  <div className="circle-inner">
                    <span>{focusStats.percent}%</span>
                  </div>
                </div>
                <p className="label">Focus</p>
              </div>
            </div>
          )}
      </div>

      <button onClick={handleReturn} className="return-button">
        Return to Dashboard
      </button>
    </div>
  );
}

export default SessionSummary;