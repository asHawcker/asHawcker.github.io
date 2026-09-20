/**
 * Activity Streak Grid (GitHub + Codeforces Unified Heatmap)
 * Automatically fetches GitHub contributions and Codeforces submissions,
 * blends them into a unified heatmap, calculates streaks, and handles light/dark themes.
 */

(function () {
  'use strict';

  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
  let globalTooltip = null;

  function getTooltip() {
    if (!globalTooltip) {
      globalTooltip = document.createElement('div');
      globalTooltip.className = 'activity-streak-tooltip';
      document.body.appendChild(globalTooltip);
    }
    return globalTooltip;
  }

  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function fetchGitHubData(user) {
    if (!user) return { map: {}, total: 0 };
    const map = {};
    let total = 0;

    // Source 1: Vercel Contributions API
    try {
      const res = await fetch(`https://github-contributions.vercel.app/api/v1/${user}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.contributions)) {
          json.contributions.forEach((c) => {
            if (c.date && c.count !== undefined) {
              map[c.date] = c.count;
              total += c.count;
            }
          });
          const recentYearTotal = json.years && json.years.length > 0 ? json.years[0].total : total;
          return { map, total: recentYearTotal || total };
        }
      }
    } catch (e) {
      console.warn('[ActivityStreak] Source 1 failed, trying source 2...', e);
    }

    // Source 2: Jogruber API
    try {
      const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.contributions)) {
          json.contributions.forEach((c) => {
            map[c.date] = c.count;
            total += c.count;
          });
          return { map, total: json.total?.lastYear ?? total };
        }
      }
    } catch (e) {
      console.warn('[ActivityStreak] Source 2 failed, trying GitHub Events API...', e);
    }

    // Source 3: GitHub Events API Fallback
    try {
      const res = await fetch(`https://api.github.com/users/${user}/events?per_page=100`);
      if (res.ok) {
        const events = await res.json();
        events.forEach((ev) => {
          if (ev.created_at) {
            const dateStr = ev.created_at.split('T')[0];
            const count = ev.type === 'PushEvent' ? (ev.payload?.size || 1) : 1;
            map[dateStr] = (map[dateStr] || 0) + count;
            total += count;
          }
        });
      }
    } catch (err) {
      console.error('[ActivityStreak] All GitHub sources failed', err);
    }

    return { map, total };
  }

  async function fetchCodeforcesData(handle) {
    if (!handle) return { map: {}, acMap: {}, total: 0, totalAc: 0 };
    const map = {};
    const acMap = {};
    let total = 0;
    let totalAc = 0;

    try {
      const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'OK' && Array.isArray(json.result)) {
          json.result.forEach((sub) => {
            if (sub.creationTimeSeconds) {
              const d = new Date(sub.creationTimeSeconds * 1000);
              const dateStr = formatDate(d);
              map[dateStr] = (map[dateStr] || 0) + 1;
              total++;
              if (sub.verdict === 'OK') {
                acMap[dateStr] = (acMap[dateStr] || 0) + 1;
                totalAc++;
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('[ActivityStreak] Codeforces API failed', err);
    }

    return { map, acMap, total, totalAc };
  }

  async function getCombinedActivity(githubUser, cfHandle, months, forceRefresh = false) {
    const cacheKey = `devlog_streak_${githubUser}_${cfHandle}_${months}`;
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            return parsed.data;
          }
        }
      } catch (e) {
        // LocalStorage disabled or quota exceeded
      }
    }

    const [ghData, cfData] = await Promise.all([
      fetchGitHubData(githubUser),
      fetchCodeforcesData(cfHandle)
    ]);

    const data = {
      ghMap: ghData.map,
      ghTotal: ghData.total,
      cfMap: cfData.map,
      cfAcMap: cfData.acMap,
      cfTotal: cfData.total,
      cfAcTotal: cfData.totalAc
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) {}

    return data;
  }

  function calculateStreakStats(daysList) {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalActiveDays = 0;
    let ghDays = 0;
    let cfDays = 0;
    let bothDays = 0;

    // Longest streak & active days counts
    daysList.forEach((day) => {
      const active = day.gh > 0 || day.cf > 0;
      if (active) {
        totalActiveDays++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }

      if (day.gh > 0 && day.cf > 0) bothDays++;
      else if (day.gh > 0) ghDays++;
      else if (day.cf > 0) cfDays++;
    });

    // Current streak (counting backwards from today)
    const todayStr = formatDate(new Date());
    let startIndex = daysList.findIndex((d) => d.date === todayStr);
    if (startIndex === -1) startIndex = daysList.length - 1;

    // Check if today is active
    let checkIdx = startIndex;
    if (daysList[checkIdx] && (daysList[checkIdx].gh > 0 || daysList[checkIdx].cf > 0)) {
      while (checkIdx >= 0 && (daysList[checkIdx].gh > 0 || daysList[checkIdx].cf > 0)) {
        currentStreak++;
        checkIdx--;
      }
    } else {
      // Check if yesterday was active to keep current streak alive
      checkIdx = startIndex - 1;
      while (checkIdx >= 0 && (daysList[checkIdx].gh > 0 || daysList[checkIdx].cf > 0)) {
        currentStreak++;
        checkIdx--;
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalActiveDays,
      ghDays,
      cfDays,
      bothDays
    };
  }

  function buildCalendarMatrix(monthsCount, activityData) {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Calculate start date: approx `monthsCount` months ago, aligned to Monday
    const daysBack = Math.round(monthsCount * 30.44);
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - daysBack);
    // Align start to Monday (0 in getDay() is Sunday, 1 is Monday)
    const startDay = startDate.getDay();
    const startOffset = (startDay + 6) % 7; // 0 = Mon, 6 = Sun
    startDate.setDate(startDate.getDate() - startOffset);

    // End date: current week's Sunday
    const todayDay = todayDate.getDay();
    const endOffset = (7 - todayDay) % 7; // days to Sunday
    const endDate = new Date(todayDate);
    endDate.setDate(endDate.getDate() + endOffset);

    const weeks = [];
    const allDays = [];
    let current = new Date(startDate);
    let currentWeek = [];

    while (current <= endDate) {
      const dateStr = formatDate(current);
      const isFuture = current > todayDate;
      const gh = activityData.ghMap[dateStr] || 0;
      const cf = activityData.cfMap[dateStr] || 0;
      const ac = activityData.cfAcMap[dateStr] || 0;

      let type = 'empty';
      if (!isFuture) {
        if (gh > 0 && cf > 0) type = 'both';
        else if (gh > 0) type = 'github';
        else if (cf > 0) type = 'codeforces';
      }

      let level = 0;
      const totalAct = gh + cf;
      if (totalAct >= 7) level = 4;
      else if (totalAct >= 4) level = 3;
      else if (totalAct >= 2) level = 2;
      else if (totalAct >= 1) level = 1;

      const dayObj = {
        date: dateStr,
        isFuture,
        gh,
        cf,
        ac,
        type,
        level
      };

      if (!isFuture) {
        allDays.push(dayObj);
      }

      currentWeek.push(dayObj);

      // Sunday ends the week (Mon=0..Sun=6)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ isFuture: true, type: 'empty', level: 0 });
      }
      weeks.push(currentWeek);
    }

    // Month labels: detect month start in week columns
    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      // Pick mid-week day or first valid day to detect month
      const sampleDay = week.find((d) => d && d.date && !d.isFuture) || week[0];
      if (sampleDay && sampleDay.date) {
        const m = parseInt(sampleDay.date.split('-')[1], 10) - 1;
        if (m !== lastMonth) {
          // Avoid squishing labels too close (< 3 columns apart)
          if (monthLabels.length === 0 || (colIdx - monthLabels[monthLabels.length - 1].col) >= 3) {
            const dateObj = new Date(sampleDay.date);
            const mName = dateObj.toLocaleDateString(undefined, { month: 'short' });
            monthLabels.push({ col: colIdx, name: mName });
            lastMonth = m;
          }
        }
      }
    });

    return { weeks, allDays, monthLabels };
  }

  function renderStreakComponent(container, activityData, months) {
    const contentEl = container.querySelector('.activity-streak-content');
    const loadingEl = container.querySelector('.activity-streak-loading');
    const errorEl = container.querySelector('.activity-streak-error');

    const { weeks, allDays, monthLabels } = buildCalendarMatrix(months, activityData);
    const stats = calculateStreakStats(allDays);

    let html = '';

    // 1. Stats Bar (Clean "Longest Streak" without emoji, keeps "🔥 Current Streak")
    html += `
      <div class="activity-streak-stats">
        <div class="activity-streak-stat-card">
          <span class="activity-streak-stat-label">🔥 Current Streak</span>
          <span class="activity-streak-stat-value">${stats.currentStreak} <span style="font-size:0.75rem;font-weight:normal;">days</span></span>
          <span class="activity-streak-stat-sub">Active today/yesterday</span>
        </div>
        <div class="activity-streak-stat-card">
          <span class="activity-streak-stat-label">Longest Streak</span>
          <span class="activity-streak-stat-value">${stats.longestStreak} <span style="font-size:0.75rem;font-weight:normal;">days</span></span>
          <span class="activity-streak-stat-sub">Best consistency</span>
        </div>
        <div class="activity-streak-stat-card">
          <span class="activity-streak-stat-label"><span class="filter-dot dot-gh"></span> GitHub Days</span>
          <span class="activity-streak-stat-value">${stats.ghDays + stats.bothDays}</span>
          <span class="activity-streak-stat-sub">${activityData.ghTotal} commits</span>
        </div>
        <div class="activity-streak-stat-card">
          <span class="activity-streak-stat-label"><span class="filter-dot dot-cf"></span> Codeforces Days</span>
          <span class="activity-streak-stat-value">${stats.cfDays + stats.bothDays}</span>
          <span class="activity-streak-stat-sub">${activityData.cfTotal} subs (${activityData.cfAcTotal} AC)</span>
        </div>
        <div class="activity-streak-stat-card">
          <span class="activity-streak-stat-label"><span class="filter-dot dot-both"></span> Dual Grind Days</span>
          <span class="activity-streak-stat-value">${stats.bothDays} <span style="font-size:0.75rem;font-weight:normal;">days</span></span>
          <span class="activity-streak-stat-sub">Both platforms active</span>
        </div>
      </div>
    `;

    // 2. Filter Pills
    html += `
      <div class="activity-streak-filters">
        <span style="font-size: 0.7rem; color: var(--color-text-secondary); margin-right: 0.25rem;">Filter:</span>
        <button type="button" class="activity-streak-filter-btn active" data-filter="all">All</button>
        <button type="button" class="activity-streak-filter-btn" data-filter="github">
          <span class="filter-dot dot-gh"></span> GitHub
        </button>
        <button type="button" class="activity-streak-filter-btn" data-filter="codeforces">
          <span class="filter-dot dot-cf"></span> Codeforces
        </button>
        <button type="button" class="activity-streak-filter-btn" data-filter="both">
          <span class="filter-dot dot-both"></span> Dual Grind (Both)
        </button>
      </div>
    `;

    // 3. Calendar Grid & Months (Without Mon Wed Fri side text)
    html += `
      <div class="activity-streak-scroll-container">
        <div class="activity-streak-grid-wrapper">
          <!-- Month Labels -->
          <div class="activity-streak-months">
    `;

    monthLabels.forEach((ml) => {
      const leftPx = ml.col * 15;
      html += `<span class="activity-streak-month-label" style="left: ${leftPx}px;">${ml.name}</span>`;
    });

    html += `
          </div>
          <!-- Calendar Body (Grid Columns Only) -->
          <div class="activity-streak-calendar">
            <div class="activity-streak-weeks">
    `;

    weeks.forEach((week) => {
      html += `<div class="activity-streak-week-col">`;
      week.forEach((day) => {
        if (day.isFuture) {
          html += `<div class="activity-cell cell-future"></div>`;
        } else {
          const typeClass = `cell-${day.type}`;
          const levelClass = day.level > 0 ? `level-${day.level}` : '';
          html += `
            <div class="activity-cell ${typeClass} ${levelClass}"
                 data-date="${day.date}"
                 data-gh="${day.gh}"
                 data-cf="${day.cf}"
                 data-ac="${day.ac}"
                 data-type="${day.type}"
                 ${day.type !== 'empty' ? 'tabindex="0" role="gridcell"' : ''}
                 aria-label="${day.date}">
            </div>
          `;
        }
      });
      html += `</div>`;
    });

    html += `
            </div>
          </div>
        </div>
      </div>
    `;

    // 4. Footer & Legend (removed "Synced with live public APIs" and "No activity" legend)
    html += `
      <div class="activity-streak-footer">
        <div class="activity-streak-legend">
          <span class="legend-item"><span class="legend-box legend-gh"></span> GitHub</span>
          <span class="legend-item"><span class="legend-box legend-cf"></span> Codeforces</span>
          <span class="legend-item"><span class="legend-box legend-both"></span> Both (Dual Grind)</span>
        </div>
      </div>
    `;

    contentEl.innerHTML = html;
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    contentEl.style.display = 'block';

    // Auto-scroll to the end (latest weeks)
    const scrollContainer = contentEl.querySelector('.activity-streak-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    }

    // Attach Event Listeners
    setupFilters(contentEl);
    setupTooltips(contentEl);
  }

  function setupFilters(contentEl) {
    const gridWrapper = contentEl.querySelector('.activity-streak-grid-wrapper');
    const filterBtns = contentEl.querySelectorAll('.activity-streak-filter-btn');

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        gridWrapper.classList.remove('filter-github', 'filter-codeforces', 'filter-both');

        if (filter === 'github') gridWrapper.classList.add('filter-github');
        else if (filter === 'codeforces') gridWrapper.classList.add('filter-codeforces');
        else if (filter === 'both') gridWrapper.classList.add('filter-both');
      });
    });
  }

  function setupTooltips(contentEl) {
    const tooltip = getTooltip();
    // Only attach tooltips to active cells (skip rest/empty cells)
    const activeCells = contentEl.querySelectorAll('.activity-cell:not(.cell-future):not(.cell-empty)');

    const showTooltip = (cell, e) => {
      const type = cell.getAttribute('data-type');
      if (!type || type === 'empty') return;

      const gh = parseInt(cell.getAttribute('data-gh') || '0', 10);
      const cf = parseInt(cell.getAttribute('data-cf') || '0', 10);
      const ac = parseInt(cell.getAttribute('data-ac') || '0', 10);
      if (gh === 0 && cf === 0) return;

      const dateStr = cell.getAttribute('data-date');
      let badgeHtml = '';
      if (type === 'both') {
        badgeHtml = `<span class="tooltip-badge badge-both">🟪 Dual Grind Day</span>`;
      } else if (type === 'github') {
        badgeHtml = `<span class="tooltip-badge badge-gh">🟩 GitHub Only</span>`;
      } else if (type === 'codeforces') {
        badgeHtml = `<span class="tooltip-badge badge-cf">🟦 Codeforces Only</span>`;
      }

      tooltip.innerHTML = `
        <div class="tooltip-date">${formatDisplayDate(dateStr)}</div>
        <div class="tooltip-row">
          <span>GitHub:</span>
          <strong>${gh > 0 ? `${gh} commit${gh > 1 ? 's' : ''}` : 'No commits'}</strong>
        </div>
        <div class="tooltip-row">
          <span>Codeforces:</span>
          <strong>${cf > 0 ? `${cf} submission${cf > 1 ? 's' : ''} ${ac > 0 ? `(${ac} AC)` : ''}` : 'No submissions'}</strong>
        </div>
        <div>${badgeHtml}</div>
      `;

      const rect = cell.getBoundingClientRect();
      let x = rect.left + rect.width / 2;
      let y = rect.top;

      tooltip.classList.add('show');
      const tipRect = tooltip.getBoundingClientRect();

      // Viewport safety adjustments
      if (x - tipRect.width / 2 < 10) {
        x = tipRect.width / 2 + 10;
      } else if (x + tipRect.width / 2 > window.innerWidth - 10) {
        x = window.innerWidth - tipRect.width / 2 - 10;
      }

      if (y - tipRect.height < 10) {
        // Position below cell if near top
        y = rect.bottom + tipRect.height + 16;
        tooltip.style.transform = 'translate(-50%, 0)';
      } else {
        tooltip.style.transform = 'translate(-50%, -100%)';
      }

      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    };

    const hideTooltip = () => {
      tooltip.classList.remove('show');
    };

    activeCells.forEach((cell) => {
      cell.addEventListener('mouseenter', (e) => showTooltip(cell, e));
      cell.addEventListener('focus', (e) => showTooltip(cell, e));
      cell.addEventListener('mouseleave', hideTooltip);
      cell.addEventListener('blur', hideTooltip);
    });
  }

  async function initContainer(container) {
    const github = container.dataset.github;
    const codeforces = container.dataset.codeforces;
    const months = parseInt(container.dataset.months || '12', 10);
    const refreshBtn = container.querySelector('.activity-streak-refresh-btn');
    const loadingEl = container.querySelector('.activity-streak-loading');
    const contentEl = container.querySelector('.activity-streak-content');
    const errorEl = container.querySelector('.activity-streak-error');

    async function loadData(force = false) {
      if (refreshBtn) refreshBtn.classList.add('spinning');
      if (force) {
        loadingEl.style.display = 'flex';
        contentEl.style.display = 'none';
        errorEl.style.display = 'none';
      }

      try {
        const data = await getCombinedActivity(github, codeforces, months, force);
        renderStreakComponent(container, data, months);
      } catch (err) {
        console.error('[ActivityStreak] Failed to render streak grid', err);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Unable to load activity data. Please check connection and try again.';
      } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
      }
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadData(true));
    }

    await loadData(false);
  }

  function init() {
    const containers = document.querySelectorAll('[data-activity-streak]');
    containers.forEach((c) => initContainer(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
