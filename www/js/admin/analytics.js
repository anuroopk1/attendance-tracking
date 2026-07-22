/* ============================================================
   ADMIN ANALYTICS — Charts + dashboard
   ============================================================ */

function renderAdminAnalytics(container, params) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'admin') { Router.go('login'); return; }

  const batches  = MockDB.batches;
  let selectedBatch = batches[0]?.id || '';

  container.innerHTML = `
    <div class="page-wrap">
      <div class="top-bar">
        <span class="top-bar-title">Analytics</span>
      </div>

      <div class="scroll-area" style="flex:1;padding:0 0 16px">

        <!-- Batch selector -->
        <div style="padding:12px 16px 0">
          <select id="analytics-batch" class="input-field select-field" style="font-weight:600">
            ${batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>

        <!-- Overall stats -->
        <div id="analytics-stats" class="stat-grid">
        </div>

        <!-- Trend chart -->
        <div style="margin:12px 16px 0;background:var(--card-bg);border-radius:20px;padding:16px;box-shadow:var(--elev-1)">
          <div style="font:700 16px 'Outfit',sans-serif;color:var(--md-on-surface);margin-bottom:12px">📊 30-Day Attendance Trend</div>
          <div style="position:relative;height:200px">
            <canvas id="trend-chart" style="width:100%;height:100%"></canvas>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font:11px 'Inter',sans-serif;color:var(--md-on-surface-var)" id="trend-labels"></div>
        </div>

        <!-- Bar chart - batch comparison -->
        <div style="margin:12px 16px 0;background:var(--card-bg);border-radius:20px;padding:16px;box-shadow:var(--elev-1)">
          <div style="font:700 16px 'Outfit',sans-serif;color:var(--md-on-surface);margin-bottom:12px">🏆 Batch Comparison (Today)</div>
          <div style="display:flex;flex-direction:column;gap:10px" id="batch-bars">
          </div>
        </div>

        <!-- Doughnut summary -->
        <div style="margin:12px 16px 0;background:var(--card-bg);border-radius:20px;padding:16px;box-shadow:var(--elev-1)">
          <div style="font:700 16px 'Outfit',sans-serif;color:var(--md-on-surface);margin-bottom:16px">📉 Overall Status Split</div>
          <div style="display:flex;align-items:center;gap:20px">
            <canvas id="donut-chart" style="width:140px;height:140px;flex-shrink:0"></canvas>
            <div id="donut-legend" style="display:flex;flex-direction:column;gap:8px;flex:1"></div>
          </div>
        </div>

        <!-- Top absentees -->
        <div style="margin:12px 16px 0;background:var(--card-bg);border-radius:20px;padding:16px;box-shadow:var(--elev-1)">
          <div style="font:700 16px 'Outfit',sans-serif;color:var(--md-on-surface);margin-bottom:12px">⚠️ At-Risk Students (&lt;60%)</div>
          <div id="at-risk-list" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>

      </div>

      ${buildAdminBottomNav('admin-analytics')}
    </div>
  `;

  setupAdminBottomNav(container);
  container.querySelector('#back-btn')?.addEventListener('click', () => Router.back());

  function updateAnalytics(batchId) {
    selectedBatch = batchId;
    const batch   = MockDB.getBatch(batchId);
    const trend   = MockDB.getDailyTrend(batchId, 30);
    const students = MockDB.getBatchStudents(batchId);

    // Stats
    const allRecs = students.map(s => MockDB.getStudentStats(s.id)).filter(Boolean);
    const avgPct  = allRecs.length ? Math.round(allRecs.reduce((a,r) => a + r.percentage, 0) / allRecs.length) : 0;
    const atRisk  = allRecs.filter(r => r.percentage < 60).length;
    const todaySummary = MockDB.getAttendanceSummary(batchId, Utils.today());

    container.querySelector('#analytics-stats').innerHTML = `
      ${miniStat('📊', avgPct+'%', 'Avg Rate', avgPct >= 75 ? '#1B5E20' : '#880E4F', avgPct >= 75 ? '#d1fae5' : '#fce7f3')}
      ${miniStat('✅', todaySummary?.present||0, 'Present', '#1B5E20', '#d1fae5')}
      ${miniStat('❌', todaySummary?.absent||0, 'Absent', '#880E4F', '#fce7f3')}
      ${miniStat('⚠️', atRisk, 'At Risk', '#B45309', '#fef3c7')}
    `;

    // Trend line chart
    drawLineChart(container.querySelector('#trend-chart'), trend);
    const labels = container.querySelector('#trend-labels');
    if (labels && trend.length) {
      const step = Math.floor(trend.length / 5);
      labels.innerHTML = trend.filter((_,i) => i % step === 0).map(d => `<span>${d.label}</span>`).join('');
    }

    // Batch comparison bars
    const today = Utils.today();
    const batchBarsEl = container.querySelector('#batch-bars');
    if (batchBarsEl) {
      batchBarsEl.innerHTML = MockDB.batches.map(b => {
        const s  = MockDB.getAttendanceSummary(b.id, today);
        const n  = b.studentIds.length;
        const rt = (s && n) ? Math.round(((s.present + s.late) / n) * 100) : 0;
        const clr = rt >= 75 ? 'var(--status-present)' : rt >= 60 ? 'var(--status-late)' : 'var(--status-absent)';
        return `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font:600 13px 'Inter',sans-serif;color:var(--md-on-surface)">${b.name}</span>
              <span style="font:700 13px 'Inter',sans-serif;color:${clr}">${rt}%</span>
            </div>
            <div class="progress-bar" style="height:10px">
              <div style="height:100%;width:${rt}%;background:${clr};border-radius:99px;transition:width 1s cubic-bezier(0,0,0,1)"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Donut chart
    const allStatsGlobal = Object.values(MockDB.students).map(s => MockDB.getStudentStats(s.id)).filter(Boolean);
    const globalCounts = { present:0, absent:0, late:0, leave:0 };
    allStatsGlobal.forEach(s => {
      globalCounts.present += s.present;
      globalCounts.absent  += s.absent;
      globalCounts.late    += s.late;
      globalCounts.leave   += s.leave;
    });
    drawDonutChart(container.querySelector('#donut-chart'), globalCounts);
    const legendEl = container.querySelector('#donut-legend');
    if (legendEl) {
      const total = Object.values(globalCounts).reduce((a,b) => a+b, 0);
      const colors = { present:'var(--status-present)', absent:'var(--status-absent)', late:'var(--status-late)', leave:'var(--status-leave)' };
      const icons  = { present:'✅', absent:'❌', late:'🕐', leave:'📝' };
      legendEl.innerHTML = Object.entries(globalCounts).map(([k,v]) => `
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:12px;height:12px;border-radius:3px;background:${colors[k]};flex-shrink:0"></div>
          <span style="font:13px 'Inter',sans-serif;color:var(--md-on-surface);flex:1">${icons[k]} ${k.charAt(0).toUpperCase()+k.slice(1)}</span>
          <span style="font:700 13px 'Inter',sans-serif;color:${colors[k]}">${total ? Math.round(v/total*100) : 0}%</span>
        </div>
      `).join('');
    }

    // At-risk
    const atRiskEl = container.querySelector('#at-risk-list');
    if (atRiskEl) {
      const riskStudents = students.map(s => ({ s, stats: MockDB.getStudentStats(s.id) }))
        .filter(r => r.stats && r.stats.percentage < 60)
        .sort((a,b) => a.stats.percentage - b.stats.percentage)
        .slice(0, 8);

      atRiskEl.innerHTML = riskStudents.length === 0
        ? '<div style="text-align:center;color:var(--status-present);font:600 14px \'Inter\',sans-serif;padding:12px">🎉 No at-risk students!</div>'
        : riskStudents.map(({s, stats}) => `
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--status-absent-bg);display:flex;align-items:center;justify-content:center;font:700 12px 'Outfit',sans-serif;color:var(--status-absent);flex-shrink:0">
              ${Utils.getInitials(s.name)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font:600 13px 'Inter',sans-serif;color:var(--md-on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
              <div class="progress-bar" style="height:5px;margin-top:4px">
                <div style="height:100%;width:${stats.percentage}%;background:var(--status-absent);border-radius:99px"></div>
              </div>
            </div>
            <span style="font:700 14px 'Outfit',sans-serif;color:var(--status-absent);flex-shrink:0">${stats.percentage}%</span>
          </div>
        `).join('');
    }
  }

  // Batch selector change
  container.querySelector('#analytics-batch')?.addEventListener('change', e => updateAnalytics(e.target.value));

  updateAnalytics(selectedBatch);
}

function miniStat(icon, val, label, color, bg) {
  return `
    <div style="background:${bg};border-radius:14px;padding:12px 10px;text-align:center">
      <div style="font-size:20px">${icon}</div>
      <div style="font:700 18px/1 'Outfit',sans-serif;color:${color};margin-top:4px">${val}</div>
      <div style="font:10px 'Inter',sans-serif;color:${color};opacity:0.8;margin-top:2px">${label}</div>
    </div>
  `;
}

function drawLineChart(canvas, data) {
  if (!canvas || !data.length) return;
  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.offsetWidth  || 300;
  const h   = canvas.offsetHeight || 200;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 10, right: 10, bottom: 10, left: 32 };
  const cw  = w - pad.left - pad.right;
  const ch  = h - pad.top  - pad.bottom;

  const vals = data.map(d => d.percentage);
  const min  = 0, max = 100;

  // Grid lines
  ctx.strokeStyle = 'rgba(150,150,150,0.15)';
  ctx.lineWidth   = 1;
  [0,25,50,75,100].forEach(v => {
    const y = pad.top + ch - ((v - min) / (max - min)) * ch;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    ctx.fillStyle = 'rgba(150,150,150,0.6)';
    ctx.font = '10px Inter'; ctx.textAlign = 'right';
    ctx.fillText(v+'%', pad.left - 4, y + 4);
  });

  // Area gradient
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, 'rgba(103,80,164,0.35)');
  grad.addColorStop(1, 'rgba(103,80,164,0)');

  const points = vals.map((v, i) => ({
    x: pad.left + (i / (vals.length - 1)) * cw,
    y: pad.top  + ch - ((v - min) / (max - min)) * ch,
  }));

  // Fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + ch);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length-1].x, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp1 = { x: (points[i-1].x + points[i].x) / 2, y: points[i-1].y };
    const cp2 = { x: (points[i-1].x + points[i].x) / 2, y: points[i].y };
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#6750A4';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // Dots at peaks/valleys
  const today75 = points.filter((_,i) => i % 5 === 0);
  today75.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#6750A4';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawDonutChart(canvas, counts) {
  if (!canvas) return;
  const size = 140;
  const dpr  = window.devicePixelRatio || 1;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  const ctx  = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
  const colors = ['#22C55E','#EF4444','#F97316','#3B82F6'];
  const slices = Object.values(counts);

  let angle = -Math.PI / 2;
  const cx = size/2, cy = size/2, r = size/2 - 10, inner = r * 0.58;

  ctx.clearRect(0,0,size,size);

  slices.forEach((val, i) => {
    const sweep = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    angle += sweep;
  });

  // Hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#fff';
  ctx.fill();

  // Center text
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--md-on-surface').trim() || '#000';
  ctx.font = `700 ${size * 0.16}px Outfit`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(counts.present / total * 100) + '%', cx, cy - 6);
  ctx.font = `${size * 0.09}px Inter`;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--md-on-surface-var').trim() || '#666';
  ctx.fillText('present', cx, cy + 12);
}

window.renderAdminAnalytics = renderAdminAnalytics;
