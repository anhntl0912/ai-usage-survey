import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchSubmissions } from './api.js';
import { TASKS, PRIMARY, PRIMARY_LIGHT } from './config.js';

function Card({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #ecebf3',
      borderRadius: 10,
      padding: '16px 18px',
      minWidth: 0
    }}>
      <div style={{ fontSize: 12, color: '#8a8aa0', fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || PRIMARY, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ refreshKey }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSubmissions()
      .then((s) => { if (!cancelled) { setSubmissions(s); setErr(null); } })
      .catch((e) => { if (!cancelled) setErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const analysis = useMemo(() => {
    // Gộp theo task
    const perTask = {};
    TASKS.forEach((t) => { perTask[t] = { task: t, ttSum: 0, ttCount: 0, aiSum: 0, aiCount: 0, toolsCount: {} }; });

    const toolsTotal = {};
    const tips = [];
    let participants = 0;
    let grandTT = 0, grandTTCount = 0, grandAI = 0, grandAICount = 0;

    submissions.forEach((s) => {
      const data = s.data || {};
      const rows = data.rows || [];
      participants += 1;
      rows.forEach((r) => {
        if (!perTask[r.task]) perTask[r.task] = { task: r.task, ttSum: 0, ttCount: 0, aiSum: 0, aiCount: 0, toolsCount: {} };
        const bucket = perTask[r.task];
        if (typeof r.traditional === 'number') { bucket.ttSum += r.traditional; bucket.ttCount += 1; grandTT += r.traditional; grandTTCount += 1; }
        if (!r.skipped && typeof r.ai === 'number') { bucket.aiSum += r.ai; bucket.aiCount += 1; grandAI += r.ai; grandAICount += 1; }
        (r.tools || []).forEach((t) => {
          bucket.toolsCount[t] = (bucket.toolsCount[t] || 0) + 1;
          toolsTotal[t] = (toolsTotal[t] || 0) + 1;
        });
        if (r.tips && r.tips.trim()) {
          tips.push({ name: s.name, task: r.task, tip: r.tips.trim(), tools: r.tools || [] });
        }
      });
    });

    const perTaskArr = Object.values(perTask).map((b) => {
      const avgTT = b.ttCount ? Math.round(b.ttSum / b.ttCount) : 0;
      const avgAI = b.aiCount ? Math.round(b.aiSum / b.aiCount) : 0;
      const saved = avgTT - avgAI;
      const pct = avgTT > 0 && b.aiCount ? Math.round((saved / avgTT) * 100) : 0;
      const popularTools = Object.entries(b.toolsCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
      return { ...b, avgTT, avgAI, saved, pct, popularTools };
    });

    const avgTTAll = grandTTCount ? Math.round(grandTT / grandTTCount) : 0;
    const avgAIAll = grandAICount ? Math.round(grandAI / grandAICount) : 0;
    const savedPctAll = avgTTAll > 0 && grandAICount ? Math.round(((avgTTAll - avgAIAll) / avgTTAll) * 100) : 0;

    const toolsRank = Object.entries(toolsTotal).sort((a, b) => b[1] - a[1]);

    return { perTaskArr, participants, avgTTAll, avgAIAll, savedPctAll, toolsRank, tips };
  }, [submissions]);

  if (loading) return <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>;
  if (err) return <div style={{ padding: 24, color: '#9a1f1f' }}>Lỗi: {err}</div>;

  if (!submissions.length) {
    return <div style={{ padding: 24, color: '#666' }}>Chưa có phản hồi nào. Hãy điền form khảo sát trước.</div>;
  }

  const chartData = analysis.perTaskArr.map((r) => ({
    task: r.task.length > 22 ? r.task.slice(0, 20) + '…' : r.task,
    fullTask: r.task,
    'TT truyền thống': r.avgTT,
    'TT với AI': r.avgAI
  }));

  const sectionTitle = { fontSize: 15, fontWeight: 700, margin: '24px 0 10px', color: '#1f1f2e' };
  const th = { padding: '10px 8px', background: PRIMARY_LIGHT, color: PRIMARY, fontSize: 12, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.3 };
  const td = { padding: '10px 8px', borderBottom: '1px solid #ecebf3', fontSize: 13, verticalAlign: 'top' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <Card label="Số người tham gia" value={analysis.participants} />
        <Card label="TB truyền thống" value={`${analysis.avgTTAll} phút`} sub="per task" />
        <Card label="TB với AI tools" value={`${analysis.avgAIAll} phút`} sub="per task" />
        <Card label="% tiết kiệm" value={`${analysis.savedPctAll}%`} color="#2d8a4f" />
      </div>

      <h3 style={sectionTitle}>So sánh thời gian theo từng task</h3>
      <div style={{ background: 'white', border: '1px solid #ecebf3', borderRadius: 10, padding: 12, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="task" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'phút', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip
              labelFormatter={(label, payload) => (payload && payload[0] && payload[0].payload.fullTask) || label}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="TT truyền thống" fill="#b8b3e0" />
            <Bar dataKey="TT với AI" fill={PRIMARY} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={sectionTitle}>Bảng tổng hợp theo task</h3>
      <div style={{ overflowX: 'auto', border: '1px solid #ecebf3', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead><tr>
            <th style={th}>Task</th>
            <th style={th}>TB TT</th>
            <th style={th}>TB AI</th>
            <th style={th}>Tiết kiệm</th>
            <th style={th}>Số người dùng AI</th>
            <th style={th}>Tools phổ biến</th>
          </tr></thead>
          <tbody>
            {analysis.perTaskArr.map((r, i) => (
              <tr key={r.task} style={{ background: i % 2 ? '#fafaff' : 'white' }}>
                <td style={{ ...td, fontWeight: 500 }}>{r.task}</td>
                <td style={td}>{r.avgTT ? r.avgTT + 'p' : '—'}</td>
                <td style={td}>{r.aiCount ? r.avgAI + 'p' : '—'}</td>
                <td style={{ ...td, color: r.saved > 0 ? '#2d8a4f' : '#666', fontWeight: 600 }}>
                  {r.aiCount ? `${r.saved}p (${r.pct}%)` : '—'}
                </td>
                <td style={td}>{r.aiCount}</td>
                <td style={td}>{r.popularTools.length ? r.popularTools.join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={sectionTitle}>AI Tools được dùng nhiều nhất</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {analysis.toolsRank.length ? analysis.toolsRank.map(([t, c], idx) => (
          <div key={t} style={{
            padding: '8px 14px',
            background: idx === 0 ? PRIMARY : (idx < 3 ? PRIMARY_LIGHT : 'white'),
            color: idx === 0 ? 'white' : (idx < 3 ? PRIMARY : '#555'),
            border: idx === 0 ? 'none' : `1px solid ${idx < 3 ? PRIMARY_LIGHT : '#ecebf3'}`,
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600
          }}>
            {idx === 0 && '🏆 '}{t} <span style={{ opacity: 0.8 }}>({c})</span>
          </div>
        )) : <div style={{ color: '#888' }}>Chưa có dữ liệu</div>}
      </div>

      <h3 style={sectionTitle}>Tips & Prompts chia sẻ từ team ({analysis.tips.length})</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {analysis.tips.length ? analysis.tips.map((t, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #ecebf3', borderLeft: `3px solid ${PRIMARY}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              <strong style={{ color: PRIMARY }}>{t.name}</strong> · {t.task}
              {t.tools.length > 0 && <span> · {t.tools.join(', ')}</span>}
            </div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{t.tip}</div>
          </div>
        )) : <div style={{ color: '#888' }}>Chưa có chia sẻ nào</div>}
      </div>

      <h3 style={sectionTitle}>Người đã submit ({submissions.length})</h3>
      <div style={{ overflowX: 'auto', border: '1px solid #ecebf3', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '40%' }} /><col style={{ width: '30%' }} /><col style={{ width: '30%' }} />
          </colgroup>
          <thead><tr>
            <th style={th}>Tên</th><th style={th}>Dự án</th><th style={th}>Cập nhật</th>
          </tr></thead>
          <tbody>
            {submissions.map((s, i) => (
              <tr key={s.name + i} style={{ background: i % 2 ? '#fafaff' : 'white' }}>
                <td style={td}>{s.name}</td>
                <td style={td}>{(s.data && s.data.project) || '—'}</td>
                <td style={td}>{s.updated_at ? new Date(s.updated_at).toLocaleString('vi-VN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
