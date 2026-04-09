/**
 * DevControl — AI development tools and activity dashboard for Monique (smb-ai)
 * Standalone dashboard with Google auth gate.
 */
import { supabase } from '../shared/supabase.js';
import { initAuth, getAuthState, signOut, signInWithGoogle } from '../shared/auth.js';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const GH_OWNER = 'ilv2recycle';
const GH_REPO = 'smb-ai';
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}`;
const CONTEXT_WINDOW = 200_000;
const PROJECT_NAME = 'Monique';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const esc = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
const fmt = (n) => n ? n.toLocaleString() : '0';
const fmtDate = (iso) => {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.style.cssText = `padding:0.75rem 1rem;border-radius:8px;font-size:0.8125rem;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:360px;animation:slideIn 0.2s ease-out;`;
  const colors = { success: 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7', error: 'background:#fff0f0;color:#c62828;border:1px solid #ef9a9a', info: 'background:#e3f2fd;color:#1565c0;border:1px solid #90caf9', warning: 'background:#fff3e0;color:#e65100;border:1px solid #ffcc80' };
  toast.style.cssText += colors[type] || colors.info;
  toast.textContent = message;
  container.appendChild(toast);
  if (duration > 0) setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, duration);
}

// ═══════════════════════════════════════════════════════════
// AUTH GATE — require Google sign-in
// ═══════════════════════════════════════════════════════════
async function boot() {
  const overlay = document.getElementById('loadingOverlay');
  const appContent = document.getElementById('appContent');

  await initAuth();
  const state = getAuthState();

  if (!state.isAuthenticated) {
    // Not signed in — redirect to Google sign-in
    overlay.innerHTML = `
      <div style="text-align:center;font-family:'DM Sans',sans-serif;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem;"><path d="M17 8C17 5.24 14.76 3 12 3S7 5.24 7 8c0 1.65.8 3.12 2.04 4.04L7 20h10l-2.04-7.96A5.002 5.002 0 0 0 17 8z"/></svg>
        <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:#1f1720;">DevControl</h2>
        <p style="color:#7d6f74;font-size:0.875rem;margin-bottom:1.5rem;">Sign in to access development tools</p>
        <button id="googleSignInBtn" style="display:inline-flex;align-items:center;gap:0.75rem;padding:0.75rem 1.5rem;background:#fff;border:1px solid #e6e2d9;border-radius:10px;font-size:1rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <p style="margin-top:1.5rem;"><a href="/" style="color:#7d6f74;font-size:0.8125rem;text-decoration:none;">&larr; Back to home</a></p>
      </div>`;
    overlay.style.background = '#f6f5f0';
    document.getElementById('googleSignInBtn')?.addEventListener('click', () => {
      signInWithGoogle(window.location.origin + '/DevControl/');
    });
    return;
  }

  // Check role — require admin/oracle/staff
  const role = state.appUser?.role || '';
  const allowed = ['admin', 'oracle', 'staff'];
  if (!allowed.includes(role)) {
    overlay.innerHTML = `
      <div style="text-align:center;font-family:'DM Sans',sans-serif;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:#1f1720;">Access Denied</h2>
        <p style="color:#7d6f74;font-size:0.875rem;margin-bottom:0.5rem;">You need admin or staff access to use DevControl.</p>
        <p style="color:#7d6f74;font-size:0.8125rem;">Signed in as: ${esc(state.appUser?.email || state.user?.email || 'unknown')}</p>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:center;">
          <a href="/" style="padding:0.5rem 1rem;border:1px solid #e6e2d9;border-radius:8px;color:#1f1720;text-decoration:none;font-size:0.875rem;">Home</a>
          <button id="denySignOutBtn" style="padding:0.5rem 1rem;border:1px solid #e6e2d9;border-radius:8px;background:none;color:#7d6f74;cursor:pointer;font-size:0.875rem;font-family:inherit;">Sign out</button>
        </div>
      </div>`;
    document.getElementById('denySignOutBtn')?.addEventListener('click', async () => {
      await signOut();
      window.location.href = '/';
    });
    return;
  }

  // Authenticated & authorized — show the app
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 200);
  appContent.classList.remove('hidden');

  // Header auth
  const headerAuth = document.getElementById('headerAuth');
  const email = state.appUser?.email || state.user?.email || '';
  headerAuth.innerHTML = `
    <span class="dc-header__email">${esc(email)}</span>
    <button class="dc-header__sign-out" id="headerSignOut">Sign out</button>
  `;
  document.getElementById('headerSignOut')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = '/';
  });

  // Initialize tabs
  initSubtabs();
}

// ═══════════════════════════════════════════════════════════
// SUB-TAB ROUTING
// ═══════════════════════════════════════════════════════════
let activeSubtab = 'overview';
const loadedTabs = new Set();

function initSubtabs() {
  const hash = location.hash.replace('#', '');
  if (hash && document.getElementById(`dc-panel-${hash}`)) activeSubtab = hash;

  document.querySelectorAll('.dc-tab').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.preventDefault(); switchTab(btn.dataset.tab); });
  });
  switchTab(activeSubtab);
}

function switchTab(tab) {
  activeSubtab = tab;
  location.hash = tab === 'overview' ? '' : tab;

  document.querySelectorAll('.dc-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.dc-panel').forEach((p) => { p.style.display = p.id === `dc-panel-${tab}` ? '' : 'none'; });

  if (!loadedTabs.has(tab)) {
    loadedTabs.add(tab);
    const loaders = { overview: loadOverview, releases: loadReleases, sessions: loadSessions, tokens: loadTokens, context: loadContext, backups: loadBackups, planlist: loadPlanList };
    loaders[tab]?.();
  }
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
function loadOverview() {
  const cards = [
    { tab: 'releases', label: 'Releases', desc: 'Every PR shipped, with version numbers and line counts', icon: '<path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>' },
    { tab: 'sessions', label: 'Sessions', desc: 'AI development session history for this project', icon: '<path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>' },
    { tab: 'tokens', label: 'Tokens & Cost', desc: 'Token usage, costs, and session analytics', icon: '<path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>' },
    { tab: 'context', label: 'Context Window', desc: 'What files load into Claude\'s context and how much space they use', icon: '<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>' },
    { tab: 'backups', label: 'Backups', desc: 'Database and file storage backup status', icon: '<path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/>' },
    { tab: 'planlist', label: 'PlanList', desc: 'Development todo items, checklists, and project tasks', icon: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' },
  ];

  const panel = document.getElementById('dc-panel-overview');
  panel.innerHTML = `
    <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">DevControl</h2>
    <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">AI-powered development tools and activity for ${esc(PROJECT_NAME)}</p>
    <div class="dc-overview-grid">
      ${cards.map((c) => `
        <div class="dc-overview-card" data-goto="${c.tab}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
          <div><h3>${esc(c.label)}</h3><p>${esc(c.desc)}</p></div>
        </div>
      `).join('')}
    </div>`;

  panel.querySelectorAll('[data-goto]').forEach((card) => {
    card.addEventListener('click', () => switchTab(card.dataset.goto));
  });
}

// ═══════════════════════════════════════════════════════════
// RELEASES TAB (GitHub PR changelog)
// ═══════════════════════════════════════════════════════════
async function loadReleases() {
  const panel = document.getElementById('dc-panel-releases');
  panel.innerHTML = '<div class="dc-empty">Loading changelog...</div>';

  try {
    const [prListRes, commitsRes] = await Promise.all([
      fetch(`${GH_API}/pulls?state=closed&sort=updated&direction=desc&per_page=50`),
      fetch(`${GH_API}/commits?per_page=100`),
    ]);
    if (!prListRes.ok) throw new Error(`GitHub API ${prListRes.status}`);

    const prList = (await prListRes.json()).filter((pr) => pr.merged_at);
    const commits = commitsRes.ok ? await commitsRes.json() : [];

    const prToVersionSha = {};
    for (let i = 0; i < commits.length; i++) {
      if (commits[i].commit.message.startsWith('chore: bump version')) {
        const next = commits[i + 1];
        if (next) {
          const m = next.commit.message.match(/Merge pull request #(\d+)/);
          if (m) prToVersionSha[parseInt(m[1])] = commits[i].sha;
        }
      }
    }

    const detailPromises = prList.map((pr) =>
      fetch(`${GH_API}/pulls/${pr.number}`).then((r) => r.ok ? r.json() : null).catch(() => null)
    );
    const versionShas = [...new Set(Object.values(prToVersionSha))];
    const versionPromises = versionShas.map((sha) =>
      fetch(`${RAW_BASE}/${sha}/version.json`).then((r) => r.ok ? r.json() : null).catch(() => null)
    );

    const [prDetails, ...versionResults] = await Promise.all([Promise.all(detailPromises), ...versionPromises]);
    const shaToVersion = {};
    versionShas.forEach((sha, i) => { if (versionResults[i]?.version) shaToVersion[sha] = versionResults[i].version; });

    const enriched = prList.map((pr, idx) => {
      const d = prDetails[idx];
      const vSha = prToVersionSha[pr.number];
      return { ...pr, additions: d?.additions ?? 0, deletions: d?.deletions ?? 0, changed_files: d?.changed_files ?? 0, version: vSha ? shaToVersion[vSha] : undefined };
    });

    const totalLines = enriched.reduce((s, pr) => s + pr.additions + pr.deletions, 0);

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups = new Map();
    for (const pr of enriched) {
      const d = new Date(pr.merged_at).toDateString();
      const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : new Date(pr.merged_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(pr);
    }

    function categorize(title) {
      const t = title.toLowerCase();
      if (t.startsWith('fix') || t.includes('bug')) return { label: 'Fix', cls: 'dc-release-tag-fix' };
      if (t.includes('add') || t.includes('new')) return { label: 'New', cls: 'dc-release-tag-new' };
      if (t.includes('rewrite') || t.includes('refactor') || t.includes('redesign')) return { label: 'Rewrite', cls: 'dc-release-tag-rewrite' };
      return { label: 'Update', cls: 'dc-release-tag-update' };
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <div>
          <h2 style="font-size:1.375rem;font-weight:700;margin:0;">Changelog</h2>
          <p style="color:var(--dc-text-muted);font-size:0.8125rem;margin:0.25rem 0 0;">${enriched.length} changes shipped &middot; ${totalLines.toLocaleString()} lines changed</p>
        </div>
        <a href="https://github.com/${GH_OWNER}/${GH_REPO}/pulls?q=is%3Apr+is%3Amerged" target="_blank" rel="noopener" style="font-size:0.8125rem;color:var(--dc-text-muted);">View on GitHub &rarr;</a>
      </div>`;

    for (const [label, prs] of groups) {
      html += `<div class="dc-release-group-label">${esc(label)}</div>`;
      for (const pr of prs) {
        const cat = categorize(pr.title);
        const lines = pr.additions + pr.deletions;
        html += `
          <a href="${esc(pr.html_url)}" target="_blank" rel="noopener" class="dc-release-item">
            <span class="dc-release-tag ${cat.cls}">${cat.label}</span>
            <span class="dc-release-title">${esc(pr.title)}</span>
            <div class="dc-release-meta">
              ${pr.version ? `<span class="dc-release-version">${esc(pr.version)}</span>` : ''}
              ${lines > 0 ? `<span class="dc-release-lines"><span class="plus">+${pr.additions}</span> <span class="minus">-${pr.deletions}</span></span>` : ''}
              <span>#${pr.number}</span>
              <span>${fmtDate(pr.merged_at)}</span>
            </div>
          </a>`;
      }
    }
    panel.innerHTML = html || '<div class="dc-empty">No changes recorded yet.</div>';
  } catch (err) {
    panel.innerHTML = `<div class="dc-empty">Failed to load changelog: ${esc(err.message)}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// SESSIONS TAB (placeholder — needs sessions API)
// ═══════════════════════════════════════════════════════════
function loadSessions() {
  const panel = document.getElementById('dc-panel-sessions');
  panel.innerHTML = `
    <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">Sessions</h2>
    <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">AI development session history for this project</p>
    <div class="dc-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;">
        <path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>
      </svg>
      <p>Sessions API not yet configured for this project.</p>
      <p style="font-size:0.8125rem;color:#aaa;margin-top:0.25rem;">Connect a Claude Sessions Worker to see AI development history here.</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// TOKENS TAB (placeholder)
// ═══════════════════════════════════════════════════════════
function loadTokens() {
  const panel = document.getElementById('dc-panel-tokens');
  panel.innerHTML = `
    <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">Tokens & Cost</h2>
    <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Token usage, costs, and session analytics</p>
    <div class="dc-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
      </svg>
      <p>Token tracking not yet configured.</p>
      <p style="font-size:0.8125rem;color:#aaa;margin-top:0.25rem;">Connect a Sessions API to see token usage and cost analytics.</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// CONTEXT TAB — reads CLAUDE.md and docs/ for context window analysis
// ═══════════════════════════════════════════════════════════
async function loadContext() {
  const panel = document.getElementById('dc-panel-context');
  panel.innerHTML = '<div class="dc-empty">Analyzing context window...</div>';

  try {
    // Fetch the repo tree to find context-relevant files
    const treeRes = await fetch(`${GH_API}/git/trees/main?recursive=1`);
    if (!treeRes.ok) throw new Error(`GitHub API ${treeRes.status}`);
    const treeData = await treeRes.json();

    // Find files that load into Claude's context
    const contextFiles = treeData.tree.filter(f =>
      f.type === 'blob' && (
        f.path === 'CLAUDE.md' ||
        f.path === '.claude/settings.json' ||
        f.path.startsWith('docs/') && f.path.endsWith('.md') ||
        f.path === '.cursorrules' ||
        f.path === '.clinerules'
      )
    );

    let totalTokens = 0;
    const fileRows = contextFiles.map(f => {
      const tokens = Math.round((f.size || 0) / 4);
      totalTokens += tokens;
      return { path: f.path, size: f.size || 0, tokens };
    }).sort((a, b) => b.tokens - a.tokens);

    const usedPct = ((totalTokens / CONTEXT_WINDOW) * 100).toFixed(1);
    const freePct = (100 - parseFloat(usedPct)).toFixed(1);

    let html = `
      <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">Context Window</h2>
      <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Files that load into Claude's context and their estimated token usage</p>

      <div class="dc-context-bar-wrap">
        <div class="dc-context-bar-header">
          <span>${fmt(totalTokens)} / ${fmt(CONTEXT_WINDOW)} tokens used</span>
          <span>${usedPct}% used</span>
        </div>
        <div class="dc-context-bar">
          <div style="width:${usedPct}%;background:linear-gradient(90deg,var(--dc-accent),#6a9f7a);border-radius:8px;"></div>
        </div>
        <div class="dc-context-legend">
          <div class="dc-context-legend-item"><div class="dc-context-legend-dot" style="background:var(--dc-accent);"></div> Used (${usedPct}%)</div>
          <div class="dc-context-legend-item"><div class="dc-context-legend-dot" style="background:#f0ede8;"></div> Free (${freePct}%)</div>
        </div>
      </div>

      <div class="dc-table-wrap">
        <table class="dc-table">
          <thead><tr><th>File</th><th style="text-align:right;">Size</th><th style="text-align:right;">~Tokens</th><th style="text-align:right;">% of Window</th></tr></thead>
          <tbody>
            ${fileRows.map(f => `
              <tr>
                <td style="font-family:'SF Mono','Fira Code',monospace;font-size:0.75rem;">${esc(f.path)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums;">${(f.size / 1024).toFixed(1)} KB</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums;">${fmt(f.tokens)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums;">${((f.tokens / CONTEXT_WINDOW) * 100).toFixed(2)}%</td>
              </tr>
            `).join('')}
            <tr style="font-weight:600;background:var(--dc-bg-subtle);border-top:1px solid var(--dc-border);">
              <td>Total (${fileRows.length} files)</td>
              <td style="text-align:right;">${(fileRows.reduce((s, f) => s + f.size, 0) / 1024).toFixed(1)} KB</td>
              <td style="text-align:right;">${fmt(totalTokens)}</td>
              <td style="text-align:right;">${usedPct}%</td>
            </tr>
          </tbody>
        </table>
      </div>`;

    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = `<div class="dc-empty">Failed to analyze context: ${esc(err.message)}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// BACKUPS TAB
// ═══════════════════════════════════════════════════════════
async function loadBackups() {
  const panel = document.getElementById('dc-panel-backups');

  // Try to load backup status from Supabase
  let backups = [];
  try {
    const { data, error } = await supabase.from('backup_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error && data) backups = data;
  } catch {}

  if (backups.length === 0) {
    panel.innerHTML = `
      <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">Backups</h2>
      <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Database and file storage backup status</p>
      <div class="dc-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;">
          <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"/>
        </svg>
        <p>No backup records found.</p>
        <p style="font-size:0.8125rem;color:#aaa;margin-top:0.25rem;">Configure automated backups to see status here.</p>
      </div>`;
    return;
  }

  panel.innerHTML = `
    <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">Backups</h2>
    <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Database and file storage backup status</p>
    <div class="dc-table-wrap">
      <table class="dc-table">
        <thead><tr><th>Service</th><th>Type</th><th>Status</th><th>Created</th><th style="text-align:right;">Size</th></tr></thead>
        <tbody>
          ${backups.map(b => `
            <tr>
              <td>${esc(b.service || 'unknown')}</td>
              <td>${esc(b.backup_type || 'full')}</td>
              <td><span style="color:${b.status === 'success' ? '#2e7d32' : '#c62828'}">${esc(b.status || 'unknown')}</span></td>
              <td>${fmtDate(b.created_at)}</td>
              <td style="text-align:right;">${b.size_bytes ? (b.size_bytes / 1024 / 1024).toFixed(1) + ' MB' : '\u2014'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// PLANLIST TAB — reads from planlist table or CLAUDE.md TODO
// ═══════════════════════════════════════════════════════════
async function loadPlanList() {
  const panel = document.getElementById('dc-panel-planlist');
  panel.innerHTML = '<div class="dc-empty">Loading plan items...</div>';

  // Try loading from Supabase planlist table
  let items = [];
  try {
    const { data, error } = await supabase.from('planlist').select('*').order('priority', { ascending: true }).order('created_at', { ascending: false });
    if (!error && data) items = data;
  } catch {}

  if (items.length === 0) {
    panel.innerHTML = `
      <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">PlanList</h2>
      <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Development todo items, checklists, and project tasks</p>
      <div class="dc-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <p>No plan items yet.</p>
        <p style="font-size:0.8125rem;color:#aaa;margin-top:0.25rem;">Create a <code>planlist</code> table in Supabase or add TODO items to your project.</p>
      </div>`;
    return;
  }

  const done = items.filter(i => i.is_done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  panel.innerHTML = `
    <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem;">PlanList</h2>
    <p style="color:var(--dc-text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Development todo items and project tasks</p>
    <div class="dc-stats">
      <div class="dc-stat"><div class="dc-stat-value">${total}</div><div class="dc-stat-label">Total Items</div></div>
      <div class="dc-stat"><div class="dc-stat-value" style="color:#2e7d32">${done}</div><div class="dc-stat-label">Completed</div></div>
      <div class="dc-stat"><div class="dc-stat-value" style="color:#d97706">${total - done}</div><div class="dc-stat-label">Remaining</div></div>
      <div class="dc-stat"><div class="dc-stat-value">${pct}%</div><div class="dc-stat-label">Progress</div></div>
    </div>
    <div style="height:6px;background:#f0ede8;border-radius:3px;margin-bottom:1.5rem;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:var(--dc-accent);border-radius:3px;transition:width 0.3s;"></div>
    </div>
    <div class="dc-table-wrap">
      <table class="dc-table">
        <thead><tr><th style="width:30px;"></th><th>Task</th><th>Priority</th><th>Category</th></tr></thead>
        <tbody>
          ${items.map(i => `
            <tr style="${i.is_done ? 'opacity:0.55;' : ''}">
              <td>${i.is_done ? '&#9745;' : '&#9744;'}</td>
              <td style="${i.is_done ? 'text-decoration:line-through;' : ''}">${esc(i.title || i.description || '')}</td>
              <td>${esc(i.priority || '\u2014')}</td>
              <td>${esc(i.category || '\u2014')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
boot();
