import React, { useState, useContext } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AnalysisResults from './AnalysisResults';
import LogAnalyzer from './LogAnalyzer';
import { AuthContext } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Threat Events Over Time' },
    },
  };

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Critical Threats',
        data: [12, 19, 3, 5, 2, 3, 9],
        borderColor: '#f85149',
        backgroundColor: 'rgba(248, 81, 73, 0.5)',
      },
      {
        label: 'Blocked Requests',
        data: [200, 300, 150, 400, 250, 600, 320],
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.5)',
      }
    ],
  };

  const [activeTab, setActiveTab] = useState('scanner');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { user, logoutUser } = useContext(AuthContext);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!target) return;
    
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch('http://localhost:8000/api/analyze/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Failed to reach backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>CyberGuardian AI <span style={{fontSize: '0.8rem', color: 'var(--accent-color)'}}>Dashboard</span></h1>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span>Agent Status: <strong style={{color: 'var(--success-color)'}}>Autonomous Mode Active</strong></span>
          {user && <span style={{ color: 'var(--text-muted)' }}>Welcome, <strong>{user.username}</strong></span>}
          <button onClick={logoutUser} className="glass-panel" style={{ padding: '0.5rem 1rem', color: 'var(--text-main)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)' }}>Logout</button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('scanner')} 
          className="glass-panel"
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'scanner' ? 'var(--accent-color)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            border: activeTab === 'scanner' ? 'none' : '1px solid var(--border-color)',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}
        >
          Domain Threat Scanner
        </button>
        <button 
          onClick={() => setActiveTab('logs')} 
          className="glass-panel"
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'logs' ? 'var(--accent-color)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            border: activeTab === 'logs' ? 'none' : '1px solid var(--border-color)',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}
        >
          Log Analyzer (SOC)
        </button>
      </div>

      {activeTab === 'scanner' ? (
        <>
          <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input 
              type="text" 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter a URL, IP address, or Domain to analyze..."
              style={{ flex: 1, padding: '1rem', fontSize: '1.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
            />
            <button type="submit" disabled={loading} className="glass-panel" style={{ padding: '1rem 2rem', fontSize: '1.2rem', background: 'var(--accent-color)', color: '#fff', cursor: 'pointer', border: 'none' }}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>

          {results ? (
            <AnalysisResults results={results} />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger-color)' }}>
                  <h3 style={{ color: 'var(--text-muted)' }}>High Severity Threats</h3>
                  <p style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>42</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success-color)' }}>
                  <h3 style={{ color: 'var(--text-muted)' }}>Analyzed URLs</h3>
                  <p style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>1,204</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
                  <h3 style={{ color: 'var(--text-muted)' }}>Active Modules</h3>
                  <p style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>14/15</p>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <Line options={options} data={data} />
              </div>

              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2>AI Recommendations</h2>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  <li style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>⚠️ Multiple failed login attempts detected on internal firewall.</span>
                    <button style={{ background: 'var(--danger-color)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Block IP</button>
                  </li>
                  <li style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>ℹ️ SSL Certificate for main-domain expires in 12 days.</span>
                    <button style={{ background: 'var(--accent-color)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Renew Now</button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </>
      ) : (
        <LogAnalyzer />
      )}
    </div>
  );
}
