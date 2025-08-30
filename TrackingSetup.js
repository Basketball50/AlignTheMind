import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './TrackingSetup.css';

function TrackingSetup() {
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const navigate = useNavigate();

  const handleOptionClick = (option) => setSelectedOption(option);
  const handleTimeClick = (time) => setSelectedTime(time);

  const handleContinue = () => {
    const timeToSend = selectedTime || "None";
    navigate("/tracking", {
      state: { selectedOption, selectedTime: timeToSend },
    });
  };

  return (
    <div
      className="tracking-setup"
      style={{
        backgroundImage: "url('https://images.pexels.com/photos/7546979/pexels-photo-7546979.jpeg')"
      }}
    >
      <h1 className="setup-title">Select Type of Tracking</h1>

      <div className="option-container">
        {["Focus", "Posture", "Focus & Posture"].map(option => (
          <div
            key={option}
            className={`option-card ${selectedOption === option ? "selected" : ""}`}
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </div>
        ))}
      </div>

      {selectedOption && (
        <>
          <h2 className="setup-subtitle">Select Time Period of Session</h2>
          <p className="setup-note">*User Can End Session Whenever Needed</p>

          <div className="time-container">
            {["30m", "1h", "1h 30m", "2h", "None"].map(time => (
              <div
                key={time}
                className={`time-card ${selectedTime === time ? "selected" : ""}`}
                onClick={() => handleTimeClick(time)}
              >
                {time}
              </div>
            ))}
          </div>

          <button
            className="continue-button"
            onClick={handleContinue}
            disabled={!selectedOption}
            title={!selectedOption ? "Pick a tracking type" : ""}
          >
            Start Tracking
          </button>
        </>
      )}
    </div>
  );
}

export default TrackingSetup;