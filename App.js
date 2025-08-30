import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import Tracking from './Tracking';
import SessionSummary from './SessionSummary'; 

function LandingPage() {
  return (
    <div className="App">
      <div className="top-right-links">
        <Link to="/auth">Login | Signup</Link>
      </div>

      <section
        className="main-header"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/10352379/pexels-photo-10352379.jpeg')",
        }}
      >
        <div className="main-content">
          <h1 className="title">AlignTheMind</h1>
          <Link to="/auth">
            <button className="main-button">Get Started</button>
          </Link>
        </div>
      </section>

      <section
        className="section"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/4069291/pexels-photo-4069291.jpeg')",
        }}
      >
        <div className="section-content text-background">
          <h2 className="section-title">Track Your Posture</h2>
          <p className="section-description">
            Keep your posture in check while working. AlignTheMind monitors your
            sitting position and alerts you when adjustments are needed to
            prevent strain and improve your comfort.
          </p>
        </div>
      </section>

      <section
        className="section"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/7864379/pexels-photo-7864379.jpeg')",
        }}
      >
        <div className="section-content text-background">
          <h2 className="section-title">Track Your Focus</h2>
          <p className="section-description">
            Stay focused during work sessions. AlignTheMind tracks your eye
            position and gently reminds you if your attention drifts away from
            your screen, helping you stay productive.
          </p>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/summary" element={<SessionSummary />} /> {/* ✅ added */}
      </Routes>
    </Router>
  );
}

export default App;
