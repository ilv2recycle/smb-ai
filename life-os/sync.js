// ═══════════════════════════════════════════════════════════
// Throughline Supabase sync
// ═══════════════════════════════════════════════════════════
// Drop-in cross-device sync via Supabase. Edit the config
// block below to point at your Supabase project.
//
// How it works:
// - Local localStorage stays the source of truth for speed.
// - When signed in, every local change is debounced (2s) and
//   pushed to Supabase as a JSON blob keyed to the user.
// - On page load, if the remote is newer than the local last-
//   synced timestamp, the remote replaces local state and the
//   page re-renders.
// - If offline or signed out, everything still works locally —
//   sync just pauses.
//
// Table required: public.throughline_state (see migration
//   supabase/migrations/*_throughline_state.sql)
// ═══════════════════════════════════════════════════════════

(function(){
  // ── CONFIG ──────────────────────────────────────────────
  const SUPABASE_URL = 'https://rokbxycamserwmxxazve.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2J4eWNhbXNlcndteHhhenZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODk2NTEsImV4cCI6MjA5MTE2NTY1MX0.ctTGiMp_CG1QgwCIS6drHzIQmwwuUigr0hG-WsqlwwU';
  const TABLE = 'throughline_state';
  const PUSH_DEBOUNCE_MS = 2000;
  const STORAGE_AUTH_KEY = 'throughline-auth';
  const LAST_SYNC_KEY = 'throughline-last-sync';

  // ── WHAT TO SYNC ───────────────────────────────────────
  // Static Throughline keys
  const STATIC_KEYS = new Set([
    'quick-list','todos','todo-cats','supps','cycle','recipes','migraines',
    'gratitude','reflections','archetype-notes','journal-entries',
    'slow-food-log','forage-log','creativity-log','integrity-log','connection-log',
    'creativity-focus','permaculture-notes',
    'goal-career','goal-home','goal-vehicle',
    'season-active','streak','last-day',
    'vision-start-date','vision-entries',
    'emo-log-entries','workout-notes',
  ]);
  // Date-prefixed dynamic keys
  const KEY_PREFIXES = [
    'done-','supp-done-','night-done-',
    'workout-','yoga-','knees-','rl-teeth-','rl-body-','sauna-','plunge-',
    'prayer-','queencode-','ukulele-','aipractice-',
  ];
  function isSyncedKey(k) {
    if (STATIC_KEYS.has(k)) return true;
    for (const p of KEY_PREFIXES) if (k.startsWith(p)) return true;
    return false;
  }

  // ── STATE ──────────────────────────────────────────────
  let supabase = null;
  let session = null;
  let pushTimer = null;
  let pushing = false;
  let initialPullDone = false;

  // ── STATUS EMITTER ─────────────────────────────────────
  const listeners = [];
  function setStatus(status, extra) {
    listeners.forEach(fn => { try { fn(status, extra); } catch {} });
  }
  window.ThroughlineSync = {
    onStatus: fn => listeners.push(fn),
    signIn, signOut, forcePush, forcePull, isSignedIn: () => !!session,
    getUser: () => session?.user || null,
    getLastSync: () => localStorage.getItem(LAST_SYNC_KEY),
    isConfigured: () => SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_'),
  };

  // ── BOOTSTRAP ──────────────────────────────────────────
  async function init() {
    if (!window.ThroughlineSync.isConfigured()) { setStatus('not-configured'); return; }
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: STORAGE_AUTH_KEY,
          flowType: 'pkce',
        },
      });
    } catch (e) {
      console.warn('[sync] Supabase init failed', e);
      setStatus('error', e.message);
      return;
    }

    // Existing session?
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session || null;
    } catch (e) {
      setStatus('error', 'auth check failed');
      return;
    }

    // React to sign-in/sign-out
    supabase.auth.onAuthStateChange((evt, s) => {
      session = s || null;
      if (evt === 'SIGNED_IN' && session) {
        setStatus('signed-in', session.user.email);
        pullThenRender();
      } else if (evt === 'SIGNED_OUT') {
        setStatus('signed-out');
      }
    });

    if (session) {
      setStatus('signed-in', session.user.email);
      pullThenRender();
    } else {
      setStatus('signed-out');
    }

    // Hook localStorage writes for synced keys so sync auto-pushes
    hookLocalStorage();
  }

  // ── AUTH ───────────────────────────────────────────────
  async function signIn(email) {
    if (!supabase) return { error: new Error('Sync not configured') };
    setStatus('sending-magic-link');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) { setStatus('error', error.message); return { error }; }
      setStatus('magic-link-sent', email);
      return { success: true };
    } catch (e) {
      setStatus('error', e.message);
      return { error: e };
    }
  }
  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    session = null;
    setStatus('signed-out');
  }

  // ── PULL ───────────────────────────────────────────────
  async function pull() {
    if (!supabase || !session) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select('state, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) { console.warn('[sync] pull error', error); return null; }
    return data || null;
  }

  async function pullThenRender() {
    try {
      setStatus('syncing');
      const remote = await pull();
      if (remote && remote.state) {
        const localLastSync = localStorage.getItem(LAST_SYNC_KEY);
        const remoteUpdated = remote.updated_at;
        // First pull OR remote newer than local last-sync → apply remote
        if (!localLastSync || new Date(remoteUpdated) > new Date(localLastSync)) {
          applyRemoteState(remote.state);
          localStorage.setItem(LAST_SYNC_KEY, remoteUpdated);
          // Re-render all tabs if the app exposed a refresh helper
          if (typeof window.rerenderAll === 'function') window.rerenderAll();
        }
      } else {
        // No remote yet — push our local up as the initial seed
        await push(true);
      }
      initialPullDone = true;
      setStatus('synced', remote?.updated_at || 'just now');
    } catch (e) {
      console.warn('[sync] pullThenRender error', e);
      setStatus('error', e.message);
    }
  }

  function applyRemoteState(state) {
    // Remove local synced keys that aren't in remote (they were deleted elsewhere)
    const remoteKeys = new Set(Object.keys(state));
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncedKey(k) && !remoteKeys.has(k)) toRemove.push(k);
    }
    toRemove.forEach(k => rawRemove(k));
    // Apply remote values
    for (const [k, v] of Object.entries(state)) {
      rawSet(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  // ── PUSH ───────────────────────────────────────────────
  function schedulePush() {
    if (!session || !initialPullDone) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push().catch(e => console.warn('[sync] push', e)), PUSH_DEBOUNCE_MS);
  }

  async function push(isInitial) {
    if (!supabase || !session) return;
    if (pushing) { schedulePush(); return; }
    pushing = true;
    try {
      setStatus('syncing');
      const state = collectLocalState();
      const payload = { user_id: session.user.id, state, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'user_id' })
        .select('updated_at')
        .single();
      if (error) throw error;
      localStorage.setItem(LAST_SYNC_KEY, data.updated_at);
      setStatus('synced', data.updated_at);
    } catch (e) {
      console.warn('[sync] push error', e);
      setStatus('error', e.message);
    } finally {
      pushing = false;
    }
  }

  function collectLocalState() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncedKey(k)) {
        const v = localStorage.getItem(k);
        // Try to parse JSON so it stores as structured data, fall back to string
        try { out[k] = JSON.parse(v); } catch { out[k] = v; }
      }
    }
    return out;
  }

  async function forcePush() { await push(); }
  async function forcePull() { await pullThenRender(); }

  // ── LOCALSTORAGE HOOK ─────────────────────────────────
  // Wrap setItem/removeItem so any write to a synced key auto-triggers a push.
  let rawSet, rawRemove;
  function hookLocalStorage() {
    const proto = Object.getPrototypeOf(window.localStorage);
    rawSet = proto.setItem.bind(window.localStorage);
    rawRemove = proto.removeItem.bind(window.localStorage);
    const origSet = window.localStorage.setItem.bind(window.localStorage);
    const origRemove = window.localStorage.removeItem.bind(window.localStorage);
    window.localStorage.setItem = function(k, v) {
      origSet(k, v);
      if (isSyncedKey(k)) schedulePush();
    };
    window.localStorage.removeItem = function(k) {
      origRemove(k);
      if (isSyncedKey(k)) schedulePush();
    };
  }

  // ── ENSURE SUPABASE JS LIB ─────────────────────────────
  function ensureSupabaseJs() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load Supabase JS'));
      document.head.appendChild(s);
    });
  }

  // Kick off after Supabase JS is loaded
  ensureSupabaseJs().then(init).catch(e => {
    console.warn('[sync] unavailable:', e.message);
    setStatus('error', e.message);
  });
})();
