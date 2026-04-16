import React, { useMemo, useState } from 'react';
import { TASKS, AI_TOOLS, PROJECTS, PRIMARY, PRIMARY_LIGHT } from './config.js';
import { submitSurvey } from './api.js';

function MultiToolPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  function toggle(tool) {
    if (value.includes(tool)) onChange(value.filter((t) => t !== tool));
    else onChange([...value, tool]);
  }
  function addCustom() {
    const t = customInput.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setCustomInput('');
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: disabled ? '#f1f1f5' : 'white',
          border: '1px solid #d7d4e8',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          fontSize: 13,
          color: value.length ? '#1f1f2e' : '#8a8aa0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={value.join(', ')}
      >
        {value.length ? value.join(', ') : 'Chọn AI tools...'}
        <span style={{ float: 'right', color: '#8a8aa0' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && !disabled && (
        <div
          style={{
            marginTop: 4,
            padding: 8,
            background: 'white',
            border: '1px solid #d7d4e8',
            borderRadius: 4
          }}
        >
          {AI_TOOLS.map((tool) => (
            <label
              key={tool}
              style={{ display: 'flex', alignItems: 'center', padding: '3px 0', fontSize: 13, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={value.includes(tool)}
                onChange={() => toggle(tool)}
                style={{ marginRight: 6 }}
              />
              {tool}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              type="text"
              placeholder="Other..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #d7d4e8', borderRadius: 4, fontSize: 13 }}
            />
            <button
              type="button"
              onClick={addCustom}
              style={{ padding: '4px 10px', background: PRIMARY, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >+</button>
          </div>
          {value.filter((v) => !AI_TOOLS.includes(v)).length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              Custom:{' '}
              {value.filter((v) => !AI_TOOLS.includes(v)).map((v) => (
                <span key={v} style={{ display: 'inline-block', margin: '2px 4px 0 0', padding: '1px 6px', background: PRIMARY_LIGHT, color: PRIMARY, borderRadius: 10 }}>
                  {v} <span style={{ cursor: 'pointer' }} onClick={() => onChange(value.filter((x) => x !== v))}>×</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ padding: '3px 10px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SurveyForm({ onSubmitted }) {
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [rows, setRows] = useState(() =>
    TASKS.map((t) => ({
      task: t,
      traditional: '',
      ai: '',
      skipped: false,
      tools: [],
      tips: ''
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  function updateRow(idx, patch) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const totals = useMemo(() => {
    let tt = 0, ai = 0;
    rows.forEach((r) => {
      const t = Number(r.traditional) || 0;
      tt += t;
      if (!r.skipped) ai += (Number(r.ai) || 0);
      else ai += t; // chưa dùng AI => coi như bằng TT
    });
    const saved = tt - ai;
    const pct = tt > 0 ? Math.round((saved / tt) * 100) : 0;
    return { tt, ai, saved, pct };
  }, [rows]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) { setMsg({ type: 'err', text: 'Vui lòng nhập tên' }); return; }
    if (!project) { setMsg({ type: 'err', text: 'Vui lòng chọn dự án' }); return; }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.traditional && !r.skipped && !r.ai) continue; // bỏ qua row trống hoàn toàn
      if (r.traditional && Number(r.traditional) < 0) {
        setMsg({ type: 'err', text: `Task "${r.task}": thời gian không hợp lệ` }); return;
      }
      if (!r.skipped && r.ai && Number(r.ai) < 0) {
        setMsg({ type: 'err', text: `Task "${r.task}": thời gian AI không hợp lệ` }); return;
      }
    }

    const payload = {
      name: name.trim(),
      data: {
        project,
        rows: rows.map((r) => ({
          task: r.task,
          traditional: r.traditional === '' ? null : Number(r.traditional),
          ai: r.skipped ? null : (r.ai === '' ? null : Number(r.ai)),
          skipped: r.skipped,
          tools: r.tools,
          tips: r.tips
        })),
        totals
      }
    };

    setSubmitting(true);
    try {
      await submitSurvey(payload);
      setMsg({ type: 'ok', text: 'Đã lưu khảo sát. Cảm ơn bạn!' });
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setMsg({ type: 'err', text: 'Lỗi: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const th = {
    padding: '10px 8px',
    background: PRIMARY,
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'left',
    borderRight: '1px solid rgba(255,255,255,0.15)',
    verticalAlign: 'top'
  };
  const td = {
    padding: '8px',
    borderBottom: '1px solid #ecebf3',
    fontSize: 13,
    verticalAlign: 'top'
  };
  const input = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #d7d4e8',
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'inherit'
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tên của bạn *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            style={input}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Dự án *</label>
          <select value={project} onChange={(e) => setProject(e.target.value)} style={input} required>
            <option value="">-- chọn dự án --</option>
            {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #ecebf3', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 900 }}>
          <colgroup>
            <col style={{ width: '19%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '26%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>Công việc</th>
              <th style={th}>TT truyền thống (phút)</th>
              <th style={th}>TT với AI (phút)</th>
              <th style={th}>Tiết kiệm</th>
              <th style={th}>Chưa dùng AI</th>
              <th style={th}>AI Tools đã dùng</th>
              <th style={th}>Cách dùng / Prompt / Tips</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const t = Number(r.traditional) || 0;
              const a = Number(r.ai) || 0;
              const saved = !r.skipped && r.traditional && r.ai ? t - a : 0;
              return (
                <tr key={r.task} style={{ background: i % 2 ? '#fafaff' : 'white' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.task}</td>
                  <td style={td}>
                    <input type="number" min="0" value={r.traditional} onChange={(e) => updateRow(i, { traditional: e.target.value })} style={input} />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      value={r.skipped ? '' : r.ai}
                      disabled={r.skipped}
                      onChange={(e) => updateRow(i, { ai: e.target.value })}
                      style={{ ...input, background: r.skipped ? '#f1f1f5' : 'white' }}
                    />
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: saved > 0 ? '#2d8a4f' : (saved < 0 ? '#c44' : '#666') }}>
                    {r.skipped ? '—' : (r.traditional && r.ai ? `${saved}p` : '')}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input type="checkbox" checked={r.skipped} onChange={(e) => updateRow(i, { skipped: e.target.checked, ai: e.target.checked ? '' : r.ai })} />
                  </td>
                  <td style={td}>
                    <MultiToolPicker
                      value={r.tools}
                      onChange={(v) => updateRow(i, { tools: v })}
                      disabled={r.skipped}
                    />
                  </td>
                  <td style={td}>
                    <textarea
                      rows={2}
                      value={r.tips}
                      onChange={(e) => updateRow(i, { tips: e.target.value })}
                      disabled={r.skipped}
                      placeholder="Prompt, tips, mô tả cách dùng..."
                      style={{ ...input, resize: 'vertical', background: r.skipped ? '#f1f1f5' : 'white' }}
                    />
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: PRIMARY_LIGHT, fontWeight: 700 }}>
              <td style={td}>TỔNG CỘNG</td>
              <td style={td}>{totals.tt}p</td>
              <td style={td}>{totals.ai}p</td>
              <td style={{ ...td, color: totals.saved > 0 ? '#2d8a4f' : '#666' }}>
                {totals.saved}p ({totals.pct}%)
              </td>
              <td style={td} colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {msg && (
        <div style={{
          marginTop: 12,
          padding: 10,
          borderRadius: 6,
          background: msg.type === 'ok' ? '#e8f5ec' : '#fde8e8',
          color: msg.type === 'ok' ? '#1d6b3a' : '#9a1f1f',
          fontSize: 14
        }}>{msg.text}</div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '10px 24px',
            background: PRIMARY,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer'
          }}
        >{submitting ? 'Đang gửi...' : 'Gửi khảo sát'}</button>
      </div>
    </form>
  );
}
