import React, { useState } from 'react';
import SurveyForm from './SurveyForm.jsx';
import Dashboard from './Dashboard.jsx';
import { ROLE, SURVEY_PERIOD, PRIMARY, PRIMARY_LIGHT, API_URL } from './config.js';

export default function App() {
  const [tab, setTab] = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabBtn = (key, label) => (
    <button
      onClick={() => {
        setTab(key);
        if (key === 'dashboard') setRefreshKey((k) => k + 1);
      }}
      style={{
        padding: '10px 20px',
        background: tab === key ? 'white' : 'transparent',
        color: tab === key ? PRIMARY : 'white',
        border: 'none',
        borderRadius: '8px 8px 0 0',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        marginRight: 4
      }}
    >{label}</button>
  );

  const notConfigured = !API_URL || API_URL.startsWith('PASTE_');

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5fa' }}>
      <header style={{ background: PRIMARY, padding: '20px 20px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}>Khảo sát hiệu quả áp dụng AI Tools</div>
            <h1 style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 700 }}>{ROLE} Team</h1>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Tuần khảo sát: {SURVEY_PERIOD}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            {tabBtn('form', 'Điền khảo sát')}
            {tabBtn('dashboard', 'Dashboard')}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
        {notConfigured && (
          <div style={{
            background: '#fff8e5',
            border: '1px solid #f0d071',
            color: '#6e5820',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13
          }}>
            ⚠️ Chưa cấu hình <code>API_URL</code> trong <code>src/config.js</code>. Deploy Apps Script Web App trước rồi dán URL vào.
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid #ecebf3', borderRadius: 10, padding: 20 }}>
          {tab === 'form'
            ? <SurveyForm onSubmitted={() => { setRefreshKey((k) => k + 1); setTab('dashboard'); }} />
            : <Dashboard refreshKey={refreshKey} />}
        </div>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 }}>
          Powered by Google Apps Script + React · Color {PRIMARY}
          <span style={{ display: 'inline-block', width: 12, height: 12, background: PRIMARY_LIGHT, borderRadius: 2, marginLeft: 6, verticalAlign: 'middle' }}></span>
        </div>
      </main>
    </div>
  );
}
