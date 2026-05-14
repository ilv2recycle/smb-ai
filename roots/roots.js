// Roots Relocation Toolkit — auth, auto-save to Supabase, Vesta chat.

const SUPABASE_URL = 'https://rokbxycamserwmxxazve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2J4eWNhbXNlcndteHhhenZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODk2NTEsImV4cCI6MjA5MTE2NTY1MX0.ctTGiMp_CG1QgwCIS6drHzIQmwwuUigr0hG-WsqlwwU';

const ALLOWED_EMAILS = ['msmascio@gmail.com', 'adrianavarchetta@gmail.com'];
const EMAIL_TO_NAME = {
  'msmascio@gmail.com': 'Moni',
  'adrianavarchetta@gmail.com': 'Adriana',
};
const OTHER_EMAIL = {
  'msmascio@gmail.com': 'adrianavarchetta@gmail.com',
  'adrianavarchetta@gmail.com': 'msmascio@gmail.com',
};

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
});

// -------- QUESTION SCHEMA --------
// Keys are stable; changing them breaks saved answers.
const SECTIONS = [
  {
    title: "The <em>Body's</em> Yes",
    intro: "Before logic, before spreadsheets — what does your body already know?",
    questions: [
      { key: 's1_saturday', type: 'text', q: "<strong>Close your eyes and picture a Saturday morning in your ideal home.</strong> What do you see, smell, hear outside your window? Describe it in as much detail as you can.", note: "Don't filter. Let the fantasy be specific.", placeholder: "Morning light coming through... I can smell... Outside I hear..." },
      { key: 's1_land', type: 'text', q: "<strong>What kind of land do you need to feel sane?</strong> Mountains, water, flat plains, dense forest, open sky? Where does your nervous system settle?", placeholder: "I feel most like myself when I'm near..." },
      { key: 'forage', type: 'scale', q: "<strong>How important is it that you can forage, garden, or grow food within walking distance of your home?</strong>", left: "Nice to have", right: "Non-negotiable" },
      { key: 'weather', type: 'scale', q: "<strong>How much does weather and light affect your mood and energy?</strong>", left: "Barely at all", right: "Deeply shapes me" },
      { key: 's1_front_door', type: 'text', q: "<strong>What does \"outside\" need to look like from your front door?</strong> What's the first thing you want to see when you step out?", placeholder: "Trees, neighbors' gardens, a mountain view, a street market..." },
    ],
  },
  {
    title: "Home as <em>Foundation</em>",
    intro: "Not just a house — a base you can build a life from.",
    questions: [
      { key: 's2_home_meaning', type: 'text', q: "<strong>What does owning a home mean to you emotionally?</strong> Security? Roots? Creative freedom? Legacy? Something you can't fully explain?", placeholder: "For me, owning means..." },
      { key: 's2_home_feel', type: 'text', q: "<strong>Describe the home you want to create.</strong> What does it feel like to walk in? Who comes over? What happens in the kitchen, the garden, the living room?", note: "Think of the gathering place you imagined for yourself.", placeholder: "When people come over, I want them to feel... My garden will have... The kitchen is where..." },
      { key: 'home_income', type: 'scale', q: "<strong>How important is it to you that your home can eventually be a source of income?</strong> (short-term rental, ADU, workshop, farming)", left: "Not important", right: "Very important" },
      { key: 's2_finances', type: 'text', q: "<strong>What's your honest financial picture right now?</strong> Down payment target, monthly budget for housing, timeline for buying. What number would feel like freedom vs. stretch?", note: "This is just for you. Be real with yourself.", placeholder: "I could realistically put down... I want my monthly housing to be under... I'm hoping to buy within..." },
    ],
  },
  {
    title: "Water, Earth & <em>Future Weather</em>",
    intro: "You named the Earth as non-negotiable. Let's get specific about what that means.",
    callout: "<strong>Why this matters:</strong> Climate resilience isn't just about avoiding disaster — it's about water access, growing seasons, air quality, and whether the land will still be livable in 20 years when you've put down real roots.",
    questions: [
      { key: 'env', type: 'multi', q: "<strong>Which environmental factors feel most essential to you?</strong> Select all that resonate.", options: [
        ['clean-water', 'Clean drinking water'],
        ['low-flood', 'Low flood risk'],
        ['low-fire', 'Low wildfire risk'],
        ['low-drought', 'Low drought risk'],
        ['air-quality', 'Good air quality'],
        ['grow-season', 'Long growing season'],
        ['four-seasons', 'Four actual seasons'],
        ['no-humidity', 'Low humidity'],
        ['no-tornado', 'Low tornado/hurricane risk'],
        ['foraging', 'Wild foraging access'],
        ['mountains', 'Mountain proximity'],
        ['ocean', 'Ocean/water proximity'],
      ]},
      { key: 'climate_trade', type: 'scale', q: "<strong>How much are you willing to trade near-term climate comfort for long-term climate resilience?</strong> (e.g., accepting hotter summers if the water table is strong)", left: "Not willing to trade", right: "Willing to trade" },
      { key: 's3_garden', type: 'text', q: "<strong>If you imagine your garden in 15 years</strong> — what's growing in it? What season does it thrive in? What does it provide for you and others?", placeholder: "I want to grow... I want to preserve and can... I want to share..." },
    ],
  },
  {
    title: "Community & <em>Belonging</em>",
    intro: "You want to gather people. That means you need a place that makes gathering possible.",
    questions: [
      { key: 's4_neighbors', type: 'text', q: "<strong>Describe the neighbors you want.</strong> What do you want to be able to borrow, trade, share with the people around you? What kind of porch culture do you want?", placeholder: "I want neighbors who... I want to be able to..." },
      { key: 'community', type: 'multi', q: "<strong>What does your ideal community infrastructure look like?</strong>", options: [
        ['farmers-market', 'Farmers market'],
        ['food-coop', 'Food co-op'],
        ['composting', 'City composting'],
        ['community-garden', 'Community garden'],
        ['independent-restaurants', 'Independent restaurants'],
        ['live-music', 'Live music scene'],
        ['arts-culture', 'Arts & culture'],
        ['spirituality', 'Spiritual/wellness community'],
        ['hiking-clubs', 'Hiking / outdoor clubs'],
        ['italian-community', 'Italian or European community'],
        ['diversity', 'Racial & cultural diversity'],
        ['young-families', 'Young families nearby'],
      ]},
      { key: 'social_open', type: 'scale', q: "<strong>How important is it to you that strangers are friendly and socially open?</strong> (The \"can I borrow an egg from my neighbor\" test)", left: "I make my own community", right: "The culture has to be warm" },
      { key: 's4_austin', type: 'text', q: "<strong>Austin energized you socially. What specifically was it?</strong> The spontaneity? The friendliness? The outdoors? The vibe of the people? What are you chasing from that feeling?", placeholder: "In Austin I felt... What surprised me was... I want more of..." },
      { key: 'city_proximity', type: 'scale', q: "<strong>How important is proximity to a major city?</strong> (Airport access, career options, big city energy within reach)", left: "Don't need it", right: "Really matters" },
    ],
  },
  {
    title: "Work, Money & <em>Becoming</em>",
    intro: "You're turning 40 and building something new. Let's be honest about what that requires.",
    questions: [
      { key: 's5_work', type: 'text', q: "<strong>What kind of work do you see yourself doing in this new place?</strong> What industry, what role, what rhythm? Are you open to reinventing yourself professionally, or do you need continuity?", placeholder: "Ideally I'd find work in... I'm open to... I'm not willing to..." },
      { key: 'job_market', type: 'scale', q: "<strong>How important is it that your new city has a strong job market in your field?</strong>", left: "I'll create my own", right: "Critical to my move" },
      { key: 's5_politics', type: 'text', q: "<strong>What's the honest trade-off you're willing to make around politics?</strong> You said you're more open to Republican states than Adriana. Where is your actual line? What policies would you feel in your daily life?", note: "Think: healthcare access, reproductive rights, LGBTQ+ protections, gun culture, environmental regulation.", placeholder: "I could live with... I couldn't live with... What I'm most scared of losing is..." },
      { key: 'safety_net', type: 'scale', q: "<strong>How important is it to live somewhere with strong social safety net policies?</strong> (Medicaid expansion, tenant protections, public transit, etc.)", left: "Not a factor", right: "Very important to me" },
      { key: 's5_family', type: 'text', q: "<strong>You want a family.</strong> What does that mean for where you live? Access to fertility care? A place where you can raise kids close to nature? Being near family or building chosen family?", placeholder: "When I think about having a family in this new place, I need..." },
    ],
  },
  {
    title: "The Sister <em>Question</em>",
    intro: "You're doing this together — but you're also doing this as individuals. Both things matter.",
    questions: [
      { key: 's6_together', type: 'text', q: "<strong>What does it mean to you to do this move *with* your sister?</strong> Do you want to live in the same neighborhood? Same city? Close but separate? What kind of proximity feels supportive vs. enmeshed?", placeholder: "My ideal is us being... I'd feel supported if... The thing I want to protect is our..." },
      { key: 's6_diverge', type: 'text', q: "<strong>Where do you and your sister most diverge in what you need?</strong> Politics, climate, social scene, career? Where might you need to compromise, and what are you unwilling to give up for the other?", placeholder: "I think she needs... I need... Where we might clash is..." },
      { key: 'sister_politics', type: 'scale', q: "<strong>How much does your sister's comfort with the politics of a state matter to your final decision?</strong>", left: "She'll adapt", right: "It's a shared decision" },
      { key: 's6_alone', type: 'text', q: "<strong>If you couldn't end up in the same city as your sister, where would that leave you?</strong> Are you willing to move somewhere she won't go? How do you feel about that possibility?", placeholder: "If we couldn't find the same place, I would..." },
    ],
  },
  {
    title: "The Europe <em>Question</em>",
    intro: "You have Italian passports. That door is open. Let's not ignore it.",
    callout: "<strong>Worth sitting with:</strong> Italy — or elsewhere in Europe — offers a different version of almost everything you're looking for: community, food culture, affordable property in smaller towns, access to nature, strong safety nets, and family nearby (your mom in Spain). It's not a fantasy. It's a real option with real trade-offs.",
    questions: [
      { key: 'europe', type: 'scale', q: "<strong>How seriously are you actually considering Europe as a destination?</strong>", left: "Not really", right: "Genuinely open" },
      { key: 's7_europe_consider', type: 'text', q: "<strong>What would have to be true for you to seriously consider moving to Italy or elsewhere in Europe?</strong> What's the thing that holds you back from that path right now?", placeholder: "What excites me about Italy is... What scares me is... What would have to change is..." },
      { key: 's7_parents', type: 'text', q: "<strong>Your mom is in Spain. What role does proximity to your parents factor into where you land?</strong>", placeholder: "Being near my mom feels... Being near my dad feels... What I want for the next decade of family is..." },
    ],
  },
  {
    title: "The <em>Gut Check</em>",
    intro: "After all of that — the truest questions.",
    questions: [
      { key: 's8_bolder', type: 'text', q: "<strong>What is the version of this move you'd regret not taking?</strong> The bolder, scarier, more alive choice — even if you're not sure you're ready for it.", placeholder: "The version I'd regret not trying is..." },
      { key: 's8_afraid', type: 'text', q: "<strong>What are you most afraid of in making this change?</strong> Be specific. Not \"the unknown\" — what exactly are you scared of losing, or failing at, or not finding?", placeholder: "What I'm most scared of is..." },
      { key: 's8_starting', type: 'text', q: "<strong>You said you don't want to wait to start your life.</strong> What does \"starting your life\" actually look like? What's the first sign you'd know you'd landed somewhere right?", placeholder: "I'll know I'm home when..." },
      { key: 'future_words', type: 'multi', q: "<strong>When you imagine yourself five years from now, thriving — what words describe that life?</strong>", options: [
        ['rooted', 'Rooted'], ['free', 'Free'], ['surrounded', 'Surrounded by people'],
        ['quiet', 'Quiet'], ['vibrant', 'Vibrant'], ['creative', 'Creative'],
        ['abundant', 'Abundant'], ['wild', 'Wild'], ['tended', 'Tended'],
        ['known', 'Known by my neighbors'], ['maternal', 'Maternal'], ['ancestral', 'Connected to ancestors'],
        ['prosperous', 'Prosperous'], ['soft', 'Soft'],
      ]},
    ],
  },
];

// -------- STATE --------
let currentUser = null;
let currentEmail = null;
let currentView = 'me'; // 'me' or 'partner'
let myAnswers = {};
let partnerAnswers = {};
let saveTimer = null;

// -------- DOM --------
const el = {
  authGate: document.getElementById('authGate'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmit: document.getElementById('authSubmit'),
  authToggle: document.getElementById('authToggle'),
  authError: document.getElementById('authError'),
  app: document.getElementById('app'),
  whoami: document.getElementById('whoami'),
  viewSwitch: document.getElementById('viewSwitch'),
  questionContainer: document.getElementById('questionContainer'),
  progressFill: document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),
  saveDot: document.getElementById('saveDot'),
  toast: document.getElementById('toast'),
  vestaFab: document.getElementById('vestaFab'),
  vestaPanel: document.getElementById('vestaPanel'),
  vestaClose: document.getElementById('vestaClose'),
  vestaMessages: document.getElementById('vestaMessages'),
  vestaForm: document.getElementById('vestaForm'),
  vestaInput: document.getElementById('vestaInput'),
  vestaSend: document.getElementById('vestaSend'),
};

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 2500);
}

// -------- AUTH --------
let authMode = 'signin';

el.authToggle.addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  el.authSubmit.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
  el.authToggle.textContent = authMode === 'signin' ? 'New here? Create account' : 'Already have an account? Sign in';
  el.authError.textContent = '';
});

el.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = el.authEmail.value.trim().toLowerCase();
  const password = el.authPassword.value;
  if (!ALLOWED_EMAILS.includes(email)) {
    el.authError.textContent = "This toolkit is just for Moni and Adriana.";
    return;
  }
  el.authSubmit.disabled = true;
  el.authError.textContent = '';
  try {
    let result;
    if (authMode === 'signup') {
      result = await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      if (result.data.user && !result.data.session) {
        el.authError.textContent = 'Check your email to verify, then sign in.';
        el.authSubmit.disabled = false;
        return;
      }
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    }
    await onAuthed();
  } catch (err) {
    el.authError.textContent = err.message || 'Something went wrong.';
    el.authSubmit.disabled = false;
  }
});

async function onAuthed() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED_EMAILS.includes(user.email)) {
    await supabase.auth.signOut();
    el.authError.textContent = "This toolkit is just for Moni and Adriana.";
    return;
  }
  currentUser = user;
  currentEmail = user.email;
  el.authGate.style.display = 'none';
  el.app.style.display = 'block';
  el.vestaFab.classList.remove('hidden');
  el.whoami.innerHTML = `Signed in as <strong>${EMAIL_TO_NAME[currentEmail]}</strong> <a href="#" id="signOut">Sign out</a>`;
  document.getElementById('signOut').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    location.reload();
  });
  renderQuestions();
  await loadAnswers();
  await loadChat();
}

// Check for existing session on page load
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && ALLOWED_EMAILS.includes(session.user.email)) {
    await onAuthed();
  }
})();

// -------- RENDER QUESTIONS --------
function renderQuestions() {
  el.questionContainer.innerHTML = SECTIONS.map((sec, si) => {
    const num = String(si + 1).padStart(2, '0');
    const qs = sec.questions.map((q) => renderQuestion(q)).join('');
    const callout = sec.callout ? `<div class="callout">${sec.callout}</div>` : '';
    return `
      <div class="section" id="s${si+1}">
        <div class="section-header">
          <div class="section-number">${num}</div>
          <div class="section-title">${sec.title}</div>
        </div>
        <p class="section-intro">${sec.intro}</p>
        <div class="questions">${callout}${qs}</div>
      </div>
      ${si < SECTIONS.length - 1 ? '<div class="divider" style="max-width:860px;margin:0 auto 50px;padding:0 40px;"><span class="divider-sym">✦</span></div>' : ''}
    `;
  }).join('');

  // Observer for fade-in
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.section').forEach(s => observer.observe(s));

  // Bind input listeners
  document.querySelectorAll('.q-card').forEach(card => {
    const key = card.dataset.key;
    const type = card.dataset.type;
    if (type === 'text') {
      card.querySelector('textarea').addEventListener('input', (e) => {
        if (currentView !== 'me') return;
        myAnswers[key] = e.target.value;
        scheduleSave();
        updateProgress();
      });
    } else if (type === 'scale') {
      card.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentView !== 'me') return;
          card.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          myAnswers[key] = Number(btn.dataset.val);
          scheduleSave();
          updateProgress();
        });
      });
    } else if (type === 'multi') {
      card.querySelectorAll('.multi-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentView !== 'me') return;
          btn.classList.toggle('selected');
          const selected = Array.from(card.querySelectorAll('.multi-btn.selected')).map(b => b.dataset.val);
          myAnswers[key] = selected;
          scheduleSave();
          updateProgress();
        });
      });
    }
  });

  // View switch
  el.viewSwitch.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      el.viewSwitch.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentView = b.dataset.view;
      applyView();
    });
  });
}

function renderQuestion(q) {
  const note = q.note ? `<div class="q-note">${q.note}</div>` : '';
  let body = '';
  if (q.type === 'text') {
    body = `<textarea placeholder="${q.placeholder || ''}"></textarea>`;
  } else if (q.type === 'scale') {
    body = `
      <div class="scale-row">
        <span class="scale-label">${q.left}</span>
        <div class="scale-btns">
          ${[1,2,3,4,5].map(v => `<button class="scale-btn" data-val="${v}">${v}</button>`).join('')}
        </div>
        <span class="scale-label">${q.right}</span>
      </div>
    `;
  } else if (q.type === 'multi') {
    body = `<div class="multi-options">${q.options.map(([v,l]) => `<button class="multi-btn" data-val="${v}">${l}</button>`).join('')}</div>`;
  }
  return `
    <div class="q-card" data-key="${q.key}" data-type="${q.type}">
      <div class="q-text">${q.q}</div>
      ${note}
      ${body}
    </div>
  `;
}

function paintAnswers(source) {
  document.querySelectorAll('.q-card').forEach(card => {
    const key = card.dataset.key;
    const type = card.dataset.type;
    const val = source[key];
    if (type === 'text') {
      const ta = card.querySelector('textarea');
      ta.value = val ?? '';
      // Partner empty-state hint
      const existing = card.querySelector('.partner-empty');
      if (existing) existing.remove();
      if (currentView === 'partner' && (!val || !String(val).trim())) {
        ta.style.display = 'none';
        const hint = document.createElement('div');
        hint.className = 'partner-empty';
        hint.textContent = '(not yet answered)';
        card.appendChild(hint);
      } else {
        ta.style.display = '';
      }
    } else if (type === 'scale') {
      card.querySelectorAll('.scale-btn').forEach(b => {
        b.classList.toggle('selected', Number(b.dataset.val) === Number(val));
      });
    } else if (type === 'multi') {
      const arr = Array.isArray(val) ? val : [];
      card.querySelectorAll('.multi-btn').forEach(b => {
        b.classList.toggle('selected', arr.includes(b.dataset.val));
      });
    }
  });
  updateProgress();
}

function applyView() {
  if (currentView === 'me') {
    document.querySelectorAll('.q-card').forEach(c => c.classList.remove('partner'));
    paintAnswers(myAnswers);
  } else {
    document.querySelectorAll('.q-card').forEach(c => c.classList.add('partner'));
    paintAnswers(partnerAnswers);
  }
}

function updateProgress() {
  const allCards = document.querySelectorAll('.q-card');
  const source = currentView === 'me' ? myAnswers : partnerAnswers;
  let answered = 0;
  allCards.forEach(card => {
    const key = card.dataset.key;
    const v = source[key];
    const hit = (typeof v === 'string' && v.trim().length > 3)
      || (typeof v === 'number' && v >= 1)
      || (Array.isArray(v) && v.length > 0);
    card.classList.toggle('answered', hit);
    if (hit) answered++;
  });
  const pct = Math.round((answered / allCards.length) * 100);
  el.progressFill.style.width = pct + '%';
  const label = currentView === 'me' ? 'you' : EMAIL_TO_NAME[OTHER_EMAIL[currentEmail]];
  el.progressLabel.textContent = `${answered} / ${allCards.length} answered · ${label}`;
}

// -------- SAVE / LOAD --------
async function loadAnswers() {
  const { data, error } = await supabase.from('roots_answers').select('user_id, answers');
  if (error) { console.error(error); return; }
  const userRows = await fetchUserEmails(data.map(r => r.user_id));
  myAnswers = {};
  partnerAnswers = {};
  for (const row of data) {
    const email = userRows.get(row.user_id);
    if (email === currentEmail) myAnswers = row.answers || {};
    else if (ALLOWED_EMAILS.includes(email)) partnerAnswers = row.answers || {};
  }
  applyView();
}

// Since we can't query auth.users directly, we rely on our own upserts to use auth.uid()
// and figure out who's who by reading our own row + any other row (which must be the partner).
async function fetchUserEmails(ids) {
  // We only have 2 users in this system. My row is mine; the other row is the partner's.
  const map = new Map();
  for (const id of ids) {
    if (id === currentUser.id) map.set(id, currentEmail);
    else map.set(id, OTHER_EMAIL[currentEmail]);
  }
  return map;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  el.saveDot.classList.remove('saved');
  el.saveDot.classList.add('saving');
  saveTimer = setTimeout(saveAnswers, 700);
}

async function saveAnswers() {
  const { error } = await supabase.from('roots_answers').upsert({
    user_id: currentUser.id,
    display_name: EMAIL_TO_NAME[currentEmail],
    answers: myAnswers,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) {
    console.error('save error', error);
    showToast('Save failed — check connection');
    el.saveDot.classList.remove('saving');
    return;
  }
  el.saveDot.classList.remove('saving');
  el.saveDot.classList.add('saved');
}

// -------- EXPORT --------
window.exportAnswers = function() {
  let out = `WHERE WILL YOUR ROOTS GROW? — ${EMAIL_TO_NAME[currentEmail]}'s Answers\n`;
  out += '='.repeat(60) + '\n\n';
  SECTIONS.forEach((sec, si) => {
    out += `\n[${String(si+1).padStart(2,'0')}] ${sec.title.replace(/<[^>]+>/g,'')}\n` + '-'.repeat(40) + '\n';
    sec.questions.forEach(q => {
      const v = myAnswers[q.key];
      const plain = q.q.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
      out += `\nQ: ${plain}\n`;
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
        out += 'A: (not answered)\n';
      } else if (Array.isArray(v)) {
        out += `A: ${v.join(', ')}\n`;
      } else {
        out += `A: ${v}\n`;
      }
    });
    out += '\n';
  });
  const blob = new Blob([out], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `roots-${EMAIL_TO_NAME[currentEmail].toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ Exported');
};

// -------- VESTA CHAT --------
el.vestaFab.addEventListener('click', () => {
  el.vestaPanel.classList.add('open');
  el.vestaInput.focus();
});
el.vestaClose.addEventListener('click', () => el.vestaPanel.classList.remove('open'));

el.vestaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    el.vestaForm.dispatchEvent(new Event('submit', { cancelable: true }));
  }
});

el.vestaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = el.vestaInput.value.trim();
  if (!msg) return;
  el.vestaInput.value = '';
  el.vestaSend.disabled = true;

  appendMsg('user', EMAIL_TO_NAME[currentEmail], msg);
  const thinking = document.createElement('div');
  thinking.className = 'vesta-thinking';
  thinking.textContent = 'Vesta is listening';
  el.vestaMessages.appendChild(thinking);
  el.vestaMessages.scrollTop = el.vestaMessages.scrollHeight;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/vesta-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ message: msg }),
    });
    thinking.remove();
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Vesta is quiet.' }));
      appendMsg('vesta', 'Vesta', err.error || 'Something went wrong.');
    } else {
      const { reply } = await resp.json();
      appendMsg('vesta', 'Vesta', reply);
    }
  } catch (err) {
    thinking.remove();
    appendMsg('vesta', 'Vesta', 'I lost the thread — try again.');
  }
  el.vestaSend.disabled = false;
  el.vestaInput.focus();
});

function appendMsg(role, from, content) {
  const div = document.createElement('div');
  div.className = `vesta-msg ${role}`;
  div.innerHTML = `<div class="vesta-msg-from">${from}</div><div>${escapeHtml(content)}</div>`;
  el.vestaMessages.appendChild(div);
  el.vestaMessages.scrollTop = el.vestaMessages.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadChat() {
  const { data, error } = await supabase.from('roots_chat')
    .select('author, content, created_at').order('created_at', { ascending: true }).limit(100);
  if (error) { console.error(error); return; }
  el.vestaMessages.innerHTML = '';
  if (!data.length) {
    appendMsg('vesta', 'Vesta',
      `Hello, ${EMAIL_TO_NAME[currentEmail]}. I'm Vesta — I'll keep the hearth while you two find your ground.\n\nFill out what you can, then come find me. Ask me about a town, a tension between you two, or what your answers are telling me. I can see both of your notes.`);
    return;
  }
  for (const m of data) {
    const from = m.author === 'vesta' ? 'Vesta' : (m.author === 'moni' ? 'Moni' : 'Adriana');
    const role = m.author === 'vesta' ? 'vesta' : 'user';
    appendMsg(role, from, m.content);
  }
}
