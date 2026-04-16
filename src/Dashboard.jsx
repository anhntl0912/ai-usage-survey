import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell,
} from 'recharts';
import { fetchSubmissions } from './api.js';
import { TASKS, PRIMARY, PRIMARY_LIGHT } from './config.js';

function Card({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #ecebf3',
        borderRadius: 10,
        padding: '16px 18px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#8a8aa0',
          fontWeight: 600,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: color || PRIMARY,
          marginTop: 4,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{sub}</div>
      )}
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
      .then((s) => {
        if (!cancelled) {
          setSubmissions(s);
          setErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const analysis = useMemo(() => {
    // Gộp theo task
    const perTask = {};
    TASKS.forEach((t) => {
      perTask[t] = {
        task: t,
        ttSum: 0,
        ttCount: 0,
        aiSum: 0,
        aiCount: 0,
        toolsCount: {},
      };
    });

    const toolsTotal = {};
    const tips = [];
    let participants = 0;
    let grandTT = 0,
      grandTTCount = 0,
      grandAI = 0,
      grandAICount = 0;

    submissions.forEach((s) => {
      const data = s.data || {};
      const rows = data.rows || [];
      participants += 1;
      rows.forEach((r) => {
        if (!perTask[r.task])
          perTask[r.task] = {
            task: r.task,
            ttSum: 0,
            ttCount: 0,
            aiSum: 0,
            aiCount: 0,
            toolsCount: {},
          };
        const bucket = perTask[r.task];
        if (typeof r.traditional === 'number') {
          bucket.ttSum += r.traditional;
          bucket.ttCount += 1;
          grandTT += r.traditional;
          grandTTCount += 1;
        }
        if (!r.skipped && typeof r.ai === 'number') {
          bucket.aiSum += r.ai;
          bucket.aiCount += 1;
          grandAI += r.ai;
          grandAICount += 1;
        }
        (r.tools || []).forEach((t) => {
          bucket.toolsCount[t] = (bucket.toolsCount[t] || 0) + 1;
          toolsTotal[t] = (toolsTotal[t] || 0) + 1;
        });
        if (r.tips && r.tips.trim()) {
          tips.push({
            name: s.name,
            task: r.task,
            tip: r.tips.trim(),
            tools: r.tools || [],
          });
        }
      });
    });

    const perTaskArr = Object.values(perTask).map((b) => {
      const avgTT = b.ttCount ? Math.round((b.ttSum / b.ttCount) * 10) / 10 : 0;
      const avgAI = b.aiCount ? Math.round((b.aiSum / b.aiCount) * 10) / 10 : 0;
      const saved = Math.round((avgTT - avgAI) * 10) / 10;
      const pct =
        avgTT > 0 && b.aiCount ? Math.round((saved / avgTT) * 100) : 0;
      const skippedCount = participants - b.aiCount;
      const toolsRanked = Object.entries(b.toolsCount).sort(
        (a, b) => b[1] - a[1]
      );
      const popularTools = toolsRanked.slice(0, 3).map(([t]) => t);
      return {
        ...b,
        avgTT,
        avgAI,
        saved,
        pct,
        skippedCount,
        toolsRanked,
        popularTools,
      };
    });

    const avgTTAll = grandTTCount ? Math.round(grandTT / grandTTCount) : 0;
    const avgAIAll = grandAICount ? Math.round(grandAI / grandAICount) : 0;
    const savedPctAll =
      avgTTAll > 0 && grandAICount
        ? Math.round(((avgTTAll - avgAIAll) / avgTTAll) * 100)
        : 0;

    const toolsRank = Object.entries(toolsTotal).sort((a, b) => b[1] - a[1]);

    return {
      perTaskArr,
      participants,
      avgTTAll,
      avgAIAll,
      savedPctAll,
      toolsRank,
      tips,
    };
  }, [submissions]);

  if (loading) return <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>;
  if (err)
    return <div style={{ padding: 24, color: '#9a1f1f' }}>Lỗi: {err}</div>;

  if (!submissions.length) {
    return (
      <div style={{ padding: 24, color: '#666' }}>
        Chưa có phản hồi nào. Hãy điền form khảo sát trước.
      </div>
    );
  }

  const chartData = analysis.perTaskArr
    .filter((r) => r.avgTT > 0 || r.avgAI > 0)
    .map((r) => ({
      task: r.task.length > 24 ? r.task.slice(0, 22) + '…' : r.task,
      fullTask: r.task,
      traditional: r.avgTT,
      ai: r.avgAI,
      pct:
        r.avgTT > 0 && r.aiCount
          ? -Math.round(((r.avgTT - r.avgAI) / r.avgTT) * 100)
          : null,
    }));
  const chartHeight = Math.max(300, chartData.length * 56 + 60);

  const TOOL_COLORS = {
    Claude: { bg: '#EDEBFA', text: '#534AB7' },
    ChatGPT: { bg: '#FFF3E0', text: '#E65100' },
    Gemini: { bg: '#E8F5E9', text: '#2E7D32' },
    Visily: { bg: '#FFEBEE', text: '#C62828' },
    'Figma AI': { bg: '#FCE4EC', text: '#AD1457' },
    'GitHub Copilot': { bg: '#E3F2FD', text: '#1565C0' },
    Cursor: { bg: '#E0F7FA', text: '#00695C' },
    'draw.io': { bg: '#F3E5F5', text: '#6A1B9A' },
  };
  const defaultChip = { bg: '#F5F5F5', text: '#555' };
  function toolChipColor(name) {
    return TOOL_COLORS[name] || defaultChip;
  }

  const sectionTitle = {
    fontSize: 15,
    fontWeight: 700,
    margin: '24px 0 10px',
    color: '#1f1f2e',
  };
  const th = {
    padding: '10px 8px',
    background: PRIMARY_LIGHT,
    color: PRIMARY,
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  };
  const td = {
    padding: '10px 8px',
    borderBottom: '1px solid #ecebf3',
    fontSize: 13,
    verticalAlign: 'top',
  };

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
        }}
      >
        <Card label="Số người tham gia" value={analysis.participants} />
        <Card
          label="TB truyền thống"
          value={`${analysis.avgTTAll} phút`}
          sub="per task"
        />
        <Card
          label="TB với AI tools"
          value={`${analysis.avgAIAll} phút`}
          sub="per task"
        />
        <Card
          label="% tiết kiệm"
          value={`${analysis.savedPctAll}%`}
          color="#2d8a4f"
        />
      </div>

      <h3 style={sectionTitle}>So sánh thời gian trung bình theo task</h3>
      <div
        style={{
          background: 'white',
          border: '1px solid #ecebf3',
          borderRadius: 10,
          padding: '16px 0 8px 0',
        }}
      >
        <div style={{ display: 'flex', width: '100%' }}>
          {/* Chart area */}
          <div style={{ flex: 1, minWidth: 0, height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 24 }}
                barCategoryGap="28%"
                barGap={2}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="task"
                  width={180}
                  tick={{ fontSize: 12, fill: '#444' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip
                  labelFormatter={(label, payload) =>
                    (payload && payload[0] && payload[0].payload.fullTask) ||
                    label
                  }
                  formatter={(value) => [`${value} ph`, undefined]}
                  cursor={{ fill: 'rgba(83,74,183,0.04)' }}
                />
                <Bar
                  dataKey="traditional"
                  name="Truyền thống"
                  fill="#c8c5d9"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                >
                  <LabelList
                    dataKey="traditional"
                    position="right"
                    formatter={(v) => `${v} ph`}
                    style={{ fontSize: 11, fill: '#777', fontWeight: 500 }}
                  />
                </Bar>
                <Bar
                  dataKey="ai"
                  name="Với AI tools"
                  fill={PRIMARY}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                >
                  <LabelList
                    dataKey="ai"
                    position="right"
                    formatter={(v) => `${v} ph`}
                    style={{ fontSize: 11, fill: PRIMARY, fontWeight: 600 }}
                  />
                </Bar>
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Percentage column on the right */}
          <div
            style={{
              width: 56,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 4,
              paddingRight: 12,
            }}
          >
            {chartData.map((r, i) => (
              <div
                key={r.fullTask}
                style={{
                  height:
                    chartHeight > 360
                      ? (chartHeight - 60) / chartData.length
                      : 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    r.pct !== null && r.pct < 0
                      ? '#2d8a4f'
                      : r.pct > 0
                      ? '#c44'
                      : '#888',
                }}
              >
                {r.pct !== null ? `${r.pct}%` : '—'}
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 style={sectionTitle}>Bảng tổng hợp theo task</h3>
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid #ecebf3',
          borderRadius: 10,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            minWidth: 900,
          }}
        >
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '28%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>Công việc</th>
              <th style={th}>TB truyền thống (ph)</th>
              <th style={th}>TB AI tools (ph)</th>
              <th style={th}>Tiết kiệm</th>
              <th style={{ ...th, textAlign: 'center' }}>Số BA dùng AI</th>
              <th style={th}>Tools phổ biến</th>
            </tr>
          </thead>
          <tbody>
            {analysis.perTaskArr.map((r, i) => (
              <tr
                key={r.task}
                style={{ background: i % 2 ? '#fafaff' : 'white' }}
              >
                <td style={{ ...td, fontWeight: 500 }}>{r.task}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.avgTT ? r.avgTT.toFixed(1) : '—'}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.aiCount ? r.avgAI.toFixed(1) : '—'}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.aiCount ? (
                    <>
                      <div
                        style={{
                          color: r.saved > 0 ? '#2d8a4f' : '#c44',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        -{Math.abs(r.saved)} ph
                      </div>
                      <div style={{ color: '#888', fontSize: 11 }}>
                        {r.pct}%
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{r.aiCount}</div>
                  {r.skippedCount > 0 && (
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {r.skippedCount} chưa dùng
                    </div>
                  )}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.toolsRanked.length ? (
                      r.toolsRanked.map(([tool, count]) => (
                        <span
                          key={tool}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: toolChipColor(tool).bg,
                            color: toolChipColor(tool).text,
                          }}
                        >
                          {tool}{' '}
                          <span style={{ fontSize: 10, opacity: 0.75 }}>
                            ×{count}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#aaa', fontSize: 12 }}>—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {/* Dòng Tổng cộng */}
            <tr style={{ background: PRIMARY_LIGHT }}>
              <td
                style={{
                  ...td,
                  fontWeight: 700,
                  color: PRIMARY,
                  borderBottom: 'none',
                }}
              >
                Tổng cộng
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'center',
                  fontWeight: 700,
                  borderBottom: 'none',
                }}
              >
                {Math.round(
                  analysis.perTaskArr.reduce((s, r) => s + r.avgTT, 0)
                )}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'center',
                  fontWeight: 700,
                  borderBottom: 'none',
                }}
              >
                {Math.round(
                  analysis.perTaskArr.reduce((s, r) => s + r.avgAI, 0)
                )}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#2d8a4f',
                  borderBottom: 'none',
                }}
              >
                -{analysis.savedPctAll}%
              </td>
              <td style={{ ...td, borderBottom: 'none' }}></td>
              <td style={{ ...td, borderBottom: 'none' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Danh sách BA đã submit ── */}
      <div
        style={{
          background: 'white',
          border: '1px solid #ecebf3',
          borderRadius: 10,
          padding: '16px 20px',
          marginTop: 24,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: PRIMARY,
            marginBottom: 12,
          }}
        >
          Danh sách BA đã submit
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {submissions.map((s, i) => {
            const proj = (s.data && s.data.project) || '';
            const date = s.updated_at
              ? new Date(s.updated_at).toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                })
              : '';
            return (
              <div
                key={s.name + i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                  padding: '6px 14px',
                  background: i % 2 === 0 ? PRIMARY_LIGHT : '#f7f5ff',
                  borderRadius: 20,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: toolChipColor(
                      Object.keys(TOOL_COLORS)[
                        i % Object.keys(TOOL_COLORS).length
                      ]
                    ).text,
                  }}
                >
                  {s.name}
                </span>
                {proj && (
                  <span style={{ color: '#666', fontSize: 12 }}>· {proj}</span>
                )}
                {date && (
                  <span style={{ color: '#aaa', fontSize: 11 }}>{date}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Tools được dùng nhiều nhất ── */}
      <div
        style={{
          background: 'white',
          border: '1px solid #ecebf3',
          borderRadius: 10,
          padding: '16px 20px',
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1f1f2e',
            marginBottom: 12,
          }}
        >
          AI tools được dùng nhiều nhất
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {analysis.toolsRank.length ? (
            analysis.toolsRank.map(([t, c]) => (
              <div
                key={t}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 5,
                  padding: '6px 14px',
                  background: toolChipColor(t).bg,
                  borderRadius: 20,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700, color: toolChipColor(t).text }}>
                  {t}
                </span>
                <span style={{ color: '#888', fontSize: 12 }}>{c} lần</span>
              </div>
            ))
          ) : (
            <div style={{ color: '#888' }}>Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* ── Chia sẻ cách dùng AI ── */}
      <div
        style={{
          background: 'white',
          border: '1px solid #ecebf3',
          borderRadius: 10,
          padding: '16px 20px',
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1f1f2e',
            marginBottom: 16,
          }}
        >
          Chia sẻ cách dùng AI từ các BA
        </div>
        {(() => {
          // Nhóm tips theo task
          const grouped = {};
          analysis.tips.forEach((t) => {
            if (!grouped[t.task]) grouped[t.task] = [];
            grouped[t.task].push(t);
          });
          const taskNames = Object.keys(grouped);
          if (!taskNames.length)
            return (
              <div style={{ color: '#888', fontSize: 13 }}>
                Chưa có chia sẻ nào
              </div>
            );
          return taskNames.map((taskName) => (
            <div key={taskName} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1f1f2e',
                  padding: '8px 0 6px',
                  borderBottom: `2px solid ${PRIMARY}`,
                  marginBottom: 0,
                }}
              >
                {taskName}
              </div>
              {grouped[taskName].map((t, idx) => {
                // Tìm project từ submissions
                const sub = submissions.find((s) => s.name === t.name);
                const proj = (sub && sub.data && sub.data.project) || '';
                const nameLabel = proj ? `${t.name} (${proj})` : t.name;
                const colors = [
                  { bg: '#f3f1fa', text: '#534AB7' },
                  { bg: '#eef7f0', text: '#2d7a4f' },
                  { bg: '#fff7ee', text: '#a06b20' },
                  { bg: '#fdf0f0', text: '#a04040' },
                  { bg: '#eef3fa', text: '#2a5ca8' },
                  { bg: '#f5f0fa', text: '#7b3fa0' },
                ];
                const c = colors[idx % colors.length];
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      background: c.bg,
                      fontSize: 13,
                      lineHeight: 1.55,
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: c.text }}>
                      {nameLabel}:
                    </span>{' '}
                    <span style={{ color: '#333' }}>{t.tip}</span>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
