const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// 本机模式（默认）：数据存在设备本地 localStorage，无需服务器。
// 联网模式：在设置里填写服务器地址，或改 config.js 的 apiBase。
const CONFIG_BASE = (window.APP_CONFIG && window.APP_CONFIG.apiBase) || '';
let API_BASE = (localStorage.getItem('apiBase') || CONFIG_BASE || '').replace(/\/+$/, '');

const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', any: '不限' };
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'any'];
const MEAL_BADGE = { breakfast: 'meal-b', lunch: 'meal-l', dinner: 'meal-d' };
const TAGS = ['荤', '素', '清淡', '辣', '汤', '主食', '轻食', '重口'];

const PRICE_OPTIONS = [
  { v: '', label: '不限' },
  { v: '20', label: '≤20元' },
  { v: '35', label: '≤35元' },
  { v: '50', label: '≤50元' },
  { v: '80', label: '≤80元' }
];
const COOK_OPTIONS = [
  { v: '', label: '不限' },
  { v: '15', label: '15分内' },
  { v: '30', label: '30分内' },
  { v: '60', label: '1小时内' },
  { v: '90', label: '2小时内' }
];
const AVOID_OPTIONS = [
  { v: '0', label: '不避开' },
  { v: '1', label: '1天' },
  { v: '2', label: '2天' },
  { v: '3', label: '3天' },
  { v: '7', label: '7天' }
];
const MOOD_ICON = {
  any: '🎲',
  light: '🥗',
  spicy: '🌶️',
  heavy: '🔥',
  meat: '🍖',
  veg: '🥬',
  soup: '🍲',
  lite: '💪'
};

const state = {
  tab: 'recommend',
  meta: { moods: [], meals: [], suggestedMeal: 'lunch' },
  filters: {
    meal: 'lunch',
    mood: 'any',
    maxPrice: '',
    maxCook: '',
    ingredients: '',
    avoidDays: '2'
  },
  results: null,
  loadingResults: false,
  loading: { dishes: false, meals: false },
  dishes: [],
  dishQuery: '',
  dishCuisine: '',
  openCuisines: null,
  meals: [],
  openDays: null,
  stats: null,
  statsMonth: localMonth(),
  pickerYear: null,
  acc: { filters: false, mealType: true, topDishes: true, cuisine: false },
  recordedIds: new Set(),
  animateView: false,
  viewDir: ''
};

/* ============================================================
   视觉映射：食物图标 + 菜系配色
   ============================================================ */
const EMOJI_RULES = [
  [/肠粉/, '🍥'],
  [/烧腊|叉烧饭|盖饭|炒饭|拌饭|咖喱|米饭/, '🍚'],
  [/螺蛳|米粉|米线|拉面|小面|拌面|炸酱面|意面|面条|炒面|牛肉粉/, '🍜'],
  [/火锅|香锅|麻辣烫|部队锅/, '🍲'],
  [/寿司|刺身/, '🍣'],
  [/披萨/, '🍕'],
  [/汉堡/, '🍔'],
  [/三明治|吐司/, '🥪'],
  [/沙拉/, '🥗'],
  [/小笼|生煎|蒸饺|饺子|包子|扁肉/, '🥟'],
  [/粥/, '🥣'],
  [/煎饼/, '🥞'],
  [/油条|豆浆/, '🥖'],
  [/燕麦|牛奶/, '🥛'],
  [/虾/, '🦐'],
  [/鱼/, '🐟'],
  [/鸡翅|鸡丁|鸡腿|鸡/, '🍗'],
  [/排骨|牛|猪|肉|叉烧/, '🥩'],
  [/豆腐/, '🍢'],
  [/蛋/, '🍳'],
  [/黄瓜/, '🥒'],
  [/木耳|菇|菌/, '🍄'],
  [/土豆/, '🥔'],
  [/豆/, '🫛'],
  [/茄/, '🍆'],
  [/玉米/, '🌽'],
  [/番茄|西红柿/, '🍅'],
  [/汤|羹/, '🍲'],
  [/菜/, '🥬']
];

const TAG_EMOJI = {
  荤: '🍖',
  素: '🥬',
  清淡: '🥗',
  辣: '🌶️',
  汤: '🍲',
  主食: '🍚',
  轻食: '🥗',
  重口: '🔥'
};

function dishEmoji(dish) {
  const name = dish.name || '';
  for (const [re, ico] of EMOJI_RULES) if (re.test(name)) return ico;
  for (const tag of dish.tags || []) if (TAG_EMOJI[tag]) return TAG_EMOJI[tag];
  return '🍽️';
}

const CUISINE_THEMES = {
  川菜: ['#ff7a5c', '#e0341f'],
  湘菜: ['#ff6b7a', '#c81e3a'],
  粤菜: ['#4fd1a5', '#0f9b7a'],
  家常: ['#ffb057', '#f2711c'],
  面食: ['#f7c948', '#e0a413'],
  日料: ['#8b9bfa', '#4f5dd6'],
  韩料: ['#ff9aae', '#e64c6b'],
  西餐: ['#66b3f7', '#2b7fd4'],
  轻食: ['#7ed89a', '#2fa36b'],
  沪菜: ['#a99bff', '#6c5ce7'],
  浙菜: ['#63c9db', '#1f9cb5'],
  闽菜: ['#f4a98f', '#d9704f'],
  黔菜: ['#eda07f', '#c25a35'],
  桂菜: ['#ddb03a', '#a87c00'],
  津菜: ['#c0b39a', '#8a7d63'],
  本帮菜: ['#cf9bf5', '#9b51e0']
};
const THEME_FALLBACK = ['#b7b1a6', '#8d867a'];

function cuisineTheme(cuisine) {
  return CUISINE_THEMES[cuisine] || THEME_FALLBACK;
}

function dishTile(dish, size = 'md') {
  const [t1, t2] = cuisineTheme(dish.cuisine);
  return `<div class="tile tile-${size}" style="--t1:${t1};--t2:${t2}"><span class="tile-emoji">${dishEmoji(dish)}</span></div>`;
}

/* ============================================================
   基础工具
   ============================================================ */
function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

async function api(path, options = {}) {
  // 未配置服务器地址时走本机数据层，无需联网、可离线使用。
  if (!API_BASE) return window.LocalAPI.handle(path, options);
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

const CHEV =
  '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

const SETTINGS_ICON =
  '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 10) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了';
}
function greetingEmoji() {
  const h = new Date().getHours();
  if (h < 5) return '🌙';
  if (h < 10) return '🌅';
  if (h < 14) return '🍜';
  if (h < 18) return '☀️';
  if (h < 22) return '🌆';
  return '🌙';
}

function fmtTime(ts) {
  const [, time] = ts.split(' ');
  return (time || '').slice(0, 5);
}
function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function localMonth(d = new Date()) {
  return localDay(d).slice(0, 7);
}
function fmtDay(ts) {
  const day = ts.slice(0, 10);
  if (day === localDay()) return '今天';
  if (day === localDay(new Date(Date.now() - 864e5))) return '昨天';
  const d = new Date(day + 'T00:00:00');
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${day.slice(5).replace('-', '/')} ${w}`;
}

function spicyBadge(dish) {
  if (!dish.spice) return '';
  return `<span class="badge spicy">${'🌶'.repeat(dish.spice)}</span>`;
}
function mealBadge(type) {
  return `<span class="badge ${MEAL_BADGE[type] || ''}">${MEAL_LABELS[type] || type}</span>`;
}

function setAppbar({ title, sub = '', actions = '' }) {
  $('#appbar-title').textContent = title;
  $('#appbar-sub').textContent = sub;
  $('#appbar-actions').innerHTML =
    actions +
    `<button class="icon-btn" data-action="open-settings" aria-label="设置" title="设置">${SETTINGS_ICON}</button>`;
}

function viewClass() {
  if (!state.animateView) return '';
  return ` view-enter${state.viewDir ? ' from-' + state.viewDir : ''}`;
}

/* ============================================================
   推荐页
   ============================================================ */
function chipRow(options, current, key) {
  return options
    .map((o) => {
      const v = typeof o === 'string' ? o : o.v;
      const label = typeof o === 'string' ? o : o.label;
      return `<button class="chip ${String(current) === String(v) ? 'on' : ''}" data-action="set-filter" data-key="${key}" data-value="${escapeHtml(v)}">${escapeHtml(label)}</button>`;
    })
    .join('');
}

function filterSummary() {
  const f = state.filters;
  const parts = [];
  parts.push(f.maxPrice ? `≤${f.maxPrice}元` : '预算不限');
  parts.push(f.maxCook ? `${f.maxCook}分内` : '不限耗时');
  parts.push(f.avoidDays === '0' ? '可重复' : `避开${f.avoidDays}天`);
  if (f.ingredients.trim()) parts.push('含手头食材');
  return parts.join(' · ');
}

function renderRecommend() {
  const f = state.filters;
  const suggested = MEAL_LABELS[state.meta.suggestedMeal] || '这一餐';

  const segHtml = MEAL_ORDER.map((m) => {
    const label = (state.meta.meals.find((x) => x.key === m) || {}).label || MEAL_LABELS[m];
    return `<button class="seg ${f.meal === m ? 'on' : ''}" data-action="set-filter" data-key="meal" data-value="${m}">${label}</button>`;
  }).join('');

  const moodHtml = state.meta.moods
    .map(
      (m) =>
        `<button class="chip ${f.mood === m.key ? 'on' : ''}" data-action="set-filter" data-key="mood" data-value="${m.key}"><span class="chip-ico">${MOOD_ICON[m.key] || '🍽️'}</span>${escapeHtml(m.label)}</button>`
    )
    .join('');

  setAppbar({
    title: '今天吃什么',
    sub: `${localDay()} · 建议${suggested}`
  });

  $('#view').innerHTML = `
    <div class="stack loose${viewClass()}">
      <div class="hero">
        <div class="hero-kicker"><span></span> 今日食物电台</div>
        <div class="hero-top">
          <div>
            <div class="hero-title">${greeting()}，吃点啥？</div>
            <div class="hero-sub">挑不出来就交给运气吧</div>
          </div>
          <div class="hero-emoji" aria-hidden="true">${greetingEmoji()}</div>
        </div>
        <div class="hero-foot">
          <div class="hero-chip">🕐 现在是${suggested}时间</div>
          <div class="hero-mark">EAT / REPEAT</div>
        </div>
      </div>

      <div class="segmented">${segHtml}</div>

      <div>
        <div class="section-head" style="margin-bottom:9px">
          <div class="section-title" style="font-size:15px">今天的心情</div>
          <div class="section-sub">左右滑动</div>
        </div>
        <div class="hscroll">${moodHtml}</div>
      </div>

      <div class="acc" data-open="${state.acc.filters ? 'true' : 'false'}">
        <button class="acc-head" data-action="toggle-acc" data-acc="filters">
          <div class="acc-lead">
            <div class="acc-ico">🎛️</div>
            <div class="grow">
              <div class="acc-title">更多筛选</div>
              <div class="acc-sum">${filterSummary()}</div>
            </div>
          </div>
          ${CHEV}
        </button>
        <div class="acc-body"><div class="acc-inner"><div class="acc-pad">
          <div class="field">
            <label>人均预算</label>
            <div class="chips">${chipRow(PRICE_OPTIONS, f.maxPrice, 'maxPrice')}</div>
          </div>
          <div class="field">
            <label>愿意花的时间</label>
            <div class="chips">${chipRow(COOK_OPTIONS, f.maxCook, 'maxCook')}</div>
          </div>
          <div class="field">
            <label>不重复吃过的</label>
            <div class="chips">${chipRow(AVOID_OPTIONS, f.avoidDays, 'avoidDays')}</div>
          </div>
          <div class="field">
            <label>冰箱里有什么</label>
            <div class="search-wrap">
              <span class="search-ico">🧊</span>
              <input class="input" id="ing-input" placeholder="鸡蛋、番茄、豆腐…" value="${escapeHtml(f.ingredients)}" />
            </div>
          </div>
        </div></div></div>
      </div>

      <div class="section-head">
        <div class="section-title">为你推荐</div>
        <div class="section-sub" id="result-count">${state.results ? `${state.results.context.candidateCount} 道可选` : ''}</div>
      </div>

      <div id="results">${state.loadingResults ? skeletonResults() : renderResults()}</div>
      <div class="fab-clearance"></div>
    </div>
    <button class="shuffle-fab${state.animateView ? ' view-enter' : ''}" id="shuffle-btn" data-action="shuffle" aria-label="换一批（摇一摇）" title="换一批（摇一摇）">
      <span class="shuffle-fab-emoji">🎲</span>
      <span class="shuffle-fab-text"><b>换一批</b><small>摇一摇也行</small></span>
    </button>
  `;
}

function skeletonResults() {
  return `<div class="stack">
    ${[0, 1]
      .map(
        () => `
      <div class="skel-card">
        <div class="skel-row">
          <div class="skel skel-tile"></div>
          <div class="grow">
            <div class="skel skel-line w60" style="margin-bottom:9px"></div>
            <div class="skel skel-line w40"></div>
          </div>
        </div>
        <div class="skel skel-line w100"></div>
        <div class="skel skel-line w80"></div>
      </div>
    `
      )
      .join('')}
  </div>`;
}

function skeletonList(n = 5) {
  return `<div class="list">${Array.from({ length: n })
    .map(
      () => `
    <div class="list-item">
      <div class="skel skel-tile" style="width:50px;height:50px;border-radius:14px"></div>
      <div class="grow">
        <div class="skel skel-line w60" style="margin-bottom:9px"></div>
        <div class="skel skel-line w40"></div>
      </div>
    </div>`
    )
    .join('')}</div>`;
}

function resultMeta(dish) {
  return `<div class="meta-pills">
    <span class="meta-pill">🍽 ${escapeHtml(dish.cuisine)}</span>
    <span class="meta-pill">💰 ¥${dish.price}</span>
    <span class="meta-pill">⏱ ${dish.cook}分</span>
    ${dish.spice ? `<span class="meta-pill">🌶 ${dish.spice}/3</span>` : ''}
  </div>`;
}

function resultCard(r, i) {
  const primary = i === 0;
  return `
    <div class="res-hero res-result${primary ? ' res-result--primary' : ''}" style="--d:${(i * 0.1).toFixed(1)}s">
      <div class="between">
        ${primary ? '<span class="badge gold">✨ 今日首选</span>' : '<span class="badge">🌟 推荐</span>'}
        <span class="badge">匹配度 ${r.matchScore}</span>
      </div>
      <div class="res-top">
        ${dishTile(r.dish, primary ? 'lg' : 'md')}
        <div class="grow">
          <div class="res-name ellipsis">${escapeHtml(r.dish.name)}</div>
          <div class="res-cuisine">${escapeHtml(r.dish.cuisine)} · ${r.dish.tags.map(escapeHtml).join(' / ') || '无标签'}</div>
          ${resultMeta(r.dish)}
        </div>
      </div>
      ${r.reasons.length ? `<div class="reasons">${r.reasons.map((reason) => `<div class="reason">${escapeHtml(reason)}</div>`).join('')}</div>` : ''}
      <div class="actions-row">
        <button class="btn btn-primary btn-block" data-action="eat" data-id="${r.dish.id}" ${state.recordedIds.has(r.dish.id) ? 'disabled' : ''}>
          ${state.recordedIds.has(r.dish.id) ? '✓ 已记录' : '🍴 就吃它'}
        </button>
      </div>
    </div>
  `;
}

function renderResults() {
  if (!state.results) return '';
  const { results, context } = state.results;
  if (!results.length) {
    return `<div class="empty"><span class="empty-ico">🍽️</span><div class="empty-title">没有匹配的菜品</div><div class="empty-sub">放宽一些条件再试试</div></div>`;
  }

  const hint = context.relaxed
    ? `<div class="sub" style="padding:0 2px 2px">条件有点严，已为你放宽范围</div>`
    : '';

  return `
    <div class="stack">
      ${hint}
      ${results.map(resultCard).join('')}
    </div>
  `;
}

function updateResults() {
  const box = $('#results');
  if (box) box.innerHTML = renderResults();
  const count = $('#result-count');
  if (count)
    count.textContent = state.results ? `${state.results.context.candidateCount} 道可选` : '';
}

function syncFilterChips() {
  $$('#view [data-action="set-filter"]').forEach((btn) => {
    btn.classList.toggle(
      'on',
      String(state.filters[btn.dataset.key]) === String(btn.dataset.value)
    );
  });
  const sum = $('#view .acc-sum');
  if (sum) sum.textContent = filterSummary();
}

async function loadRecommend() {
  if (!state.filters._init) {
    state.filters.meal = state.meta.suggestedMeal;
    state.filters._init = true;
  }
  const f = state.filters;
  const params = new URLSearchParams({
    meal: f.meal,
    mood: f.mood,
    avoidDays: f.avoidDays,
    count: '3'
  });
  if (f.maxPrice) params.set('maxPrice', f.maxPrice);
  if (f.maxCook) params.set('maxCook', f.maxCook);
  if (f.ingredients.trim()) params.set('ingredients', f.ingredients.trim());
  state.results = await api(`/api/recommend?${params}`);
}

async function reloadResults() {
  if (state.loadingResults) return;
  state.loadingResults = true;
  try {
    await loadRecommend();
    updateResults();
  } catch (e) {
    toast(e.message);
  } finally {
    state.loadingResults = false;
  }
}

async function doShuffle() {
  if (state.loadingResults) return;
  state.loadingResults = true;
  const btn = $('#shuffle-btn');
  const box = $('#results');
  if (btn) {
    btn.classList.remove('view-enter', 'from-left', 'from-right');
    btn.classList.add('shaking');
  }
  if (box) box.classList.add('dealing');
  vibrate(30);
  try {
    await Promise.all([loadRecommend(), new Promise((r) => setTimeout(r, 560))]);
  } catch (e) {
    state.loadingResults = false;
    if (btn) btn.classList.remove('shaking');
    if (box) box.classList.remove('dealing');
    toast(e.message);
    return;
  }
  state.loadingResults = false;
  if (btn) btn.classList.remove('shaking');
  if (box) box.classList.remove('dealing');
  updateResults();
}

/* ============================================================
   菜品库
   ============================================================ */
function renderDishes() {
  const q = state.dishQuery.trim().toLowerCase();
  const all = state.dishes;

  const searched = all.filter((d) => {
    if (state.dishCuisine && d.cuisine !== state.dishCuisine) return false;
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.cuisine.toLowerCase().includes(q) ||
      d.ingredients.some((i) => i.toLowerCase().includes(q)) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const cuisines = [...new Set(all.map((d) => d.cuisine))];

  setAppbar({
    title: '菜品库',
    sub: `共 ${all.length} 道菜 · ${cuisines.length} 个菜系`,
    actions: `<button class="btn btn-primary btn-sm" data-action="new-dish">＋ 新增</button>`
  });

  const searchHtml = `
    <div class="search-wrap">
      <span class="search-ico">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      </span>
      <input class="input" id="dish-search" placeholder="搜索菜名 / 食材 / 菜系" value="${escapeHtml(state.dishQuery)}" />
    </div>
    <div class="hscroll">
      <button class="chip ${state.dishCuisine === '' ? 'on' : ''}" data-action="cuisine" data-value="">全部 ${all.length}</button>
      ${cuisines
        .map((c) => {
          const n = all.filter((d) => d.cuisine === c).length;
          return `<button class="chip ${state.dishCuisine === c ? 'on' : ''}" data-action="cuisine" data-value="${escapeHtml(c)}">${escapeHtml(c)} ${n}</button>`;
        })
        .join('')}
    </div>
  `;

  let bodyHtml;
  if (state.loading.dishes) {
    bodyHtml = skeletonList(6);
  } else if (!searched.length) {
    bodyHtml = `<div class="empty"><span class="empty-ico">🔍</span><div class="empty-title">没有找到菜品</div><div class="empty-sub">换个关键词，或新增一道</div></div>`;
  } else if (q || state.dishCuisine) {
    bodyHtml = `<div class="list">${searched.map(dishItem).join('')}</div>`;
  } else {
    // 按菜系分组折叠
    const byCuisine = new Map();
    for (const d of all) {
      if (!byCuisine.has(d.cuisine)) byCuisine.set(d.cuisine, []);
      byCuisine.get(d.cuisine).push(d);
    }
    const groups = [...byCuisine.entries()].sort((a, b) => b[1].length - a[1].length);
    if (!state.openCuisines) state.openCuisines = new Set([groups[0][0]]);

    bodyHtml = groups
      .map(([cuisine, items]) => {
        const open = state.openCuisines.has(cuisine);
        const [t1, t2] = cuisineTheme(cuisine);
        return `
        <div class="group" data-open="${open ? 'true' : 'false'}">
          <button class="group-head" data-action="toggle-group" data-set="openCuisines" data-key="${escapeHtml(cuisine)}">
            <span class="group-dot" style="background:linear-gradient(135deg,${t1},${t2})"></span>
            <span class="group-name">${escapeHtml(cuisine)}</span>
            <span class="group-count">${items.length}</span>
            <span class="grow"></span>
            ${CHEV}
          </button>
          <div class="group-body"><div class="group-inner"><div class="group-pad">
            <div class="list">${items.map(dishItem).join('')}</div>
          </div></div></div>
        </div>
      `;
      })
      .join('');
  }

  $('#view').innerHTML = `
    <div class="stack${viewClass()}">
      ${searchHtml}
      ${bodyHtml}
    </div>
  `;
}

function dishItem(d) {
  return `
    <div class="list-item" data-action="edit-dish" data-id="${d.id}">
      ${dishTile(d, 'sm')}
      <div class="grow">
        <div class="row" style="gap:6px">
          <span class="item-name ellipsis">${escapeHtml(d.name)}</span>
          ${spicyBadge(d)}
        </div>
        <div class="item-sub ellipsis">¥${d.price} · ⏱${d.cook}分 · ${d.tags.map(escapeHtml).join('/') || '无标签'}</div>
        ${d.ingredients.length ? `<div class="item-sub ellipsis">🧺 ${escapeHtml(d.ingredients.join('、'))}</div>` : ''}
      </div>
    </div>
  `;
}

/* ============================================================
   用餐记录
   ============================================================ */
function renderRecords() {
  const total = state.meals.filter((m) => m.eaten_at.slice(0, 7) === localMonth()).length;
  const rated = state.meals.filter((m) => m.rating);
  const avg = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1)
    : '—';

  setAppbar({
    title: '用餐记录',
    sub: `本月 ${total} 餐 · 平均评分 ${avg}`
  });

  if (state.loading.meals) {
    $('#view').innerHTML = `<div class="stack${viewClass()}">${skeletonList(5)}</div>`;
    return;
  }

  if (!state.meals.length) {
    $('#view').innerHTML =
      `<div class="stack${viewClass()}"><div class="empty"><span class="empty-ico">📝</span><div class="empty-title">还没有记录</div><div class="empty-sub">去「推荐」里点「就吃它」记一顿吧</div></div></div>`;
    return;
  }

  const groups = new Map();
  for (const m of state.meals) {
    const day = fmtDay(m.eaten_at);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(m);
  }
  if (!state.openDays) state.openDays = new Set([groups.keys().next().value]);

  $('#view').innerHTML = `
    <div class="stack${viewClass()}">
      ${[...groups.entries()]
        .map(([day, items]) => {
          const open = state.openDays.has(day);
          return `
          <div class="group" data-open="${open ? 'true' : 'false'}">
            <button class="group-head" data-action="toggle-group" data-set="openDays" data-key="${escapeHtml(day)}">
              <span class="group-dot"></span>
              <span class="group-name">${escapeHtml(day)}</span>
              <span class="group-count">${items.length} 餐</span>
              <span class="grow"></span>
              ${CHEV}
            </button>
            <div class="group-body"><div class="group-inner"><div class="group-pad">
              <div class="list">${items.map(mealItem).join('')}</div>
            </div></div></div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

function mealItem(m) {
  return `
    <div class="swipe" data-swipe>
      <div class="swipe-action" data-action="delete-meal" data-id="${m.id}">删除</div>
      <div class="swipe-content">
        <div class="list-item">
          ${dishTile({ name: m.dish_name, cuisine: m.cuisine, tags: m.tags }, 'sm')}
          <div class="grow">
            <div class="row" style="gap:6px">
              ${mealBadge(m.meal_type)}
              <span class="item-name ellipsis">${escapeHtml(m.dish_name)}</span>
            </div>
            <div class="item-sub">${fmtTime(m.eaten_at)} · ¥${m.price}</div>
            <div class="stars" style="margin-top:4px">
              ${[1, 2, 3, 4, 5].map((s) => `<button class="star ${m.rating && m.rating >= s ? 'on' : ''}" data-action="rate" data-id="${m.id}" data-score="${s}">★</button>`).join('')}
            </div>
          </div>
          <button class="icon-btn only-desktop" data-action="delete-meal" data-id="${m.id}" aria-label="删除">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   统计
   ============================================================ */
const MEAL_COLORS = { breakfast: '#ffb648', lunch: '#ff7a45', dinner: '#6c5ce7' };

function donutGradient(byMealType) {
  const total = byMealType.reduce((s, b) => s + b.count, 0) || 1;
  let acc = 0;
  const segs = byMealType.map((b) => {
    const start = (acc / total) * 100;
    acc += b.count;
    const end = (acc / total) * 100;
    return `${MEAL_COLORS[b.meal_type] || '#94a3b8'} ${start}% ${end}%`;
  });
  return `conic-gradient(${segs.join(', ')})`;
}

function accordion({ key, icon, title, summary, inner, open }) {
  return `
    <div class="acc" data-open="${open ? 'true' : 'false'}">
      <button class="acc-head" data-action="toggle-acc" data-acc="${key}">
        <div class="acc-lead">
          <div class="acc-ico">${icon}</div>
          <div class="grow">
            <div class="acc-title">${title}</div>
            ${summary ? `<div class="acc-sum">${summary}</div>` : ''}
          </div>
        </div>
        ${CHEV}
      </button>
      <div class="acc-body"><div class="acc-inner"><div class="acc-pad">${inner}</div></div></div>
    </div>
  `;
}

function renderStats() {
  const s = state.stats;
  const [year, month] = state.statsMonth.split('-');

  setAppbar({
    title: '统计',
    sub: '看看这个月吃了啥',
    actions: `<button class="month-btn" data-action="open-month" aria-label="选择月份" title="选择月份">
      <svg class="month-btn-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
      <span>${year}年${Number(month)}月</span>
      <svg class="month-btn-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>`
  });

  if (!s) {
    $('#view').innerHTML = `<div class="stack${viewClass()}">${skeletonResults()}</div>`;
    return;
  }

  const { summary, topDishes, byCuisine, byMealType } = s;
  if (!summary.total_meals) {
    $('#view').innerHTML =
      `<div class="stack${viewClass()}"><div class="empty"><span class="empty-ico">📊</span><div class="empty-title">这个月还没有记录</div><div class="empty-sub">换个月份看看，或先去记一顿</div></div></div>`;
    return;
  }

  const maxTop = Math.max(1, ...topDishes.map((d) => d.count));
  const maxCuisine = Math.max(1, ...byCuisine.map((c) => c.count));

  const statCards = `
    <div class="stat-grid">
      <div class="stat">
        <div class="glow" style="background:radial-gradient(circle,#ffd9c4,transparent 70%)"></div>
        <div class="stat-ico">🍴</div>
        <div class="stat-num">${summary.total_meals}</div>
        <div class="stat-lbl">用餐次数</div>
      </div>
      <div class="stat">
        <div class="glow" style="background:radial-gradient(circle,#d6f5e3,transparent 70%)"></div>
        <div class="stat-ico">🌈</div>
        <div class="stat-num">${summary.distinct_dishes}</div>
        <div class="stat-lbl">吃了多少种</div>
      </div>
      <div class="stat">
        <div class="glow" style="background:radial-gradient(circle,#ffe6c4,transparent 70%)"></div>
        <div class="stat-ico">💸</div>
        <div class="stat-num">¥${summary.avg_price ?? 0}</div>
        <div class="stat-lbl">人均花费</div>
      </div>
      <div class="stat">
        <div class="glow" style="background:radial-gradient(circle,#e2dcff,transparent 70%)"></div>
        <div class="stat-ico">🧾</div>
        <div class="stat-num">¥${summary.est_cost ?? 0}</div>
        <div class="stat-lbl">当月估算花费</div>
      </div>
    </div>
  `;

  const donutHtml = byMealType.length
    ? `
    <div class="donut-wrap">
      <div class="donut" style="background:${donutGradient(byMealType)}">
        <div class="donut-center">
          <div class="donut-num">${summary.total_meals}</div>
          <div class="donut-lbl">总餐数</div>
        </div>
      </div>
      <div class="legend">
        ${byMealType
          .map(
            (b) => `
          <div class="legend-item">
            <span class="dot" style="background:${MEAL_COLORS[b.meal_type] || '#94a3b8'}"></span>
            <span>${MEAL_LABELS[b.meal_type] || b.meal_type}</span>
            <span class="legend-val">${b.count} 次</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
    : '';

  const topHtml = topDishes
    .map(
      (d) => `
    <div class="bar-row" style="margin-bottom:11px">
      ${dishTile({ name: d.name, cuisine: d.cuisine, tags: [] }, 'xs')}
      <div class="grow" style="min-width:0">
        <div class="between" style="margin-bottom:5px">
          <span class="bar-name ellipsis">${escapeHtml(d.name)}</span>
          <span class="bar-count">${d.count}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${(d.count / maxTop) * 100}%"></div></div>
      </div>
    </div>
  `
    )
    .join('');

  const cuisineHtml = byCuisine
    .map((c) => {
      const [t1, t2] = cuisineTheme(c.cuisine);
      return `
      <div class="bar-row" style="margin-bottom:11px">
        <span class="dot" style="background:linear-gradient(135deg,${t1},${t2});border-radius:6px;width:11px;height:11px"></span>
        <div class="grow" style="min-width:0">
          <div class="between" style="margin-bottom:5px">
            <span class="bar-name ellipsis">${escapeHtml(c.cuisine)}</span>
            <span class="bar-count">${c.count}</span>
          </div>
          <div class="bar-track"><div class="bar-fill alt" style="width:${(c.count / maxCuisine) * 100}%"></div></div>
        </div>
      </div>
    `;
    })
    .join('');

  $('#view').innerHTML = `
    <div class="stack${viewClass()}">
      ${statCards}
      ${donutHtml ? accordion({ key: 'mealType', icon: '🍱', title: '餐段分布', summary: `${byMealType.length} 个餐段`, inner: donutHtml, open: state.acc.mealType }) : ''}
      ${accordion({ key: 'topDishes', icon: '❤️', title: '最爱吃的菜', summary: `Top ${topDishes.length}`, inner: topHtml, open: state.acc.topDishes })}
      ${accordion({ key: 'cuisine', icon: '🌏', title: '菜系喜好', summary: `${byCuisine.length} 个菜系`, inner: cuisineHtml, open: state.acc.cuisine })}
    </div>
  `;
}

/* ============================================================
   底部弹层：菜品编辑
   ============================================================ */
function openDishSheet(dish) {
  const isNew = !dish;
  const d = dish || {
    name: '',
    cuisine: '家常',
    meals: ['lunch', 'dinner'],
    tags: [],
    spice: 0,
    cook: 20,
    price: 20,
    ingredients: []
  };

  $('#sheet-title').textContent = isNew ? '新增菜品' : '编辑菜品';
  $('#sheet-body').innerHTML = `
    <div class="field">
      <label>菜名 *</label>
      <input class="input" id="f-name" value="${escapeHtml(d.name)}" placeholder="例如：番茄炒蛋" />
    </div>
    <div class="field">
      <label>菜系</label>
      <input class="input" id="f-cuisine" value="${escapeHtml(d.cuisine)}" placeholder="例如：川菜 / 家常" />
    </div>
    <div class="field">
      <label>可当哪一餐</label>
      <div class="chips" id="f-meals">
        ${['breakfast', 'lunch', 'dinner'].map((m) => `<button class="chip ${d.meals.includes(m) ? 'on' : ''}" data-toggle="meal" data-value="${m}">${MEAL_LABELS[m]}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>标签</label>
      <div class="chips" id="f-tags">
        ${TAGS.map((t) => `<button class="chip ${d.tags.includes(t) ? 'on' : ''}" data-toggle="tag" data-value="${t}">${t}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>辣度</label>
      <div class="chips" id="f-spice">
        ${[0, 1, 2, 3].map((s) => `<button class="chip ${d.spice === s ? 'on' : ''}" data-toggle="spice" data-value="${s}">${s === 0 ? '不辣' : '🌶'.repeat(s)}</button>`).join('')}
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>耗时（分钟）</label>
        <input class="input" id="f-cook" type="number" min="0" value="${d.cook}" />
      </div>
      <div class="field">
        <label>人均（元）</label>
        <input class="input" id="f-price" type="number" min="0" value="${d.price}" />
      </div>
    </div>
    <div class="field">
      <label>主要食材（逗号分隔）</label>
      <input class="input" id="f-ingredients" value="${escapeHtml(d.ingredients.join('、'))}" placeholder="鸡蛋、番茄" />
    </div>
    <div class="sheet-actions">
      <button class="btn btn-primary" data-action="save-dish" data-id="${d.id ?? ''}">保存</button>
      ${isNew ? '' : `<button class="btn btn-danger" data-action="delete-dish" data-id="${d.id}">删除</button>`}
    </div>
  `;
  openSheet();
}

let sheetCloseTimer;
const SHEET_CLOSE_MS = 260;

function openSheet() {
  clearTimeout(sheetCloseTimer);
  $('#sheet-panel').style.transform = '';
  $('#sheet').classList.remove('hidden', 'closing');
}

function closeSheet() {
  const mask = $('#sheet');
  if (mask.classList.contains('hidden') || mask.classList.contains('closing')) return;
  mask.classList.add('closing');
  clearTimeout(sheetCloseTimer);
  sheetCloseTimer = setTimeout(() => {
    mask.classList.remove('closing');
    mask.classList.add('hidden');
  }, SHEET_CLOSE_MS);
}

function openMonthSheet() {
  const year = state.pickerYear ?? Number(state.statsMonth.slice(0, 4));
  const thisMonth = localMonth();
  $('#sheet-title').textContent = '选择月份';
  $('#sheet-body').innerHTML = `
    <div class="month-pick">
      <div class="year-nav">
        <button class="year-nav-btn" data-action="month-year" data-value="-1" aria-label="上一年">‹</button>
        <div class="year-label">${year}<span>年</span></div>
        <button class="year-nav-btn" data-action="month-year" data-value="1" aria-label="下一年">›</button>
      </div>
      <div class="month-grid">
        ${Array.from({ length: 12 }, (_, i) => {
          const value = `${year}-${String(i + 1).padStart(2, '0')}`;
          const on = value === state.statsMonth;
          const isNow = value === thisMonth;
          return `<button class="month-cell${on ? ' on' : ''}" data-action="pick-month" data-value="${value}">
            <b>${i + 1}月</b>${isNow ? '<small>本月</small>' : ''}
          </button>`;
        }).join('')}
      </div>
      <button class="btn btn-ghost btn-block" data-action="month-this">回到本月</button>
    </div>
  `;
  openSheet();
}

async function selectMonth(month) {
  closeSheet();
  if (month === state.statsMonth) return;

  // 按月份先后决定滑动方向：往后月份从右侧进，往前从左侧进
  const dir = month > state.statsMonth ? 1 : -1;
  state.statsMonth = month;

  const v = $('#view');
  await playViewExit(v, dir);
  v.scrollTop = 0;
  state.viewDir = dir > 0 ? 'right' : 'left';
  state.animateView = true;
  await loadStats();
  renderStats();
  state.animateView = false;
  state.viewDir = '';
}

function openSettingsSheet() {
  $('#sheet-title').textContent = '设置';
  $('#sheet-body').innerHTML = `
    <div class="field">
      <label>服务器地址（可选）</label>
      <input class="input" id="s-api-base" placeholder="留空即本机模式" value="${escapeHtml(API_BASE)}" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
    <div class="sub">留空时数据保存在本设备，离线也能用，不需要服务器。填写服务器地址（含 http:// 和端口）则改为联网模式。</div>
    <div class="sub">当前：${API_BASE ? escapeHtml(API_BASE) + '（联网）' : '本机模式（数据存在此设备）'}</div>
    <div class="row" style="gap:10px;margin-top:2px">
      <button class="btn btn-primary btn-block" data-action="save-settings">保存</button>
      ${API_BASE ? '<button class="btn btn-ghost" data-action="reset-settings">重置</button>' : ''}
    </div>
  `;
  openSheet();
}

function collectDishForm() {
  const meals = $$('#f-meals .chip.on').map((b) => b.dataset.value);
  const tags = $$('#f-tags .chip.on').map((b) => b.dataset.value);
  const spice = Number($('#f-spice .chip.on')?.dataset.value || 0);
  const ingredients = $('#f-ingredients')
    .value.split(/[,，、;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: $('#f-name').value.trim(),
    cuisine: $('#f-cuisine').value.trim() || '家常',
    meals: meals.length ? meals : ['lunch', 'dinner'],
    tags,
    spice,
    cook: Number($('#f-cook').value) || 20,
    price: Number($('#f-price').value) || 20,
    ingredients
  };
}

/* ============================================================
   数据加载 / 路由
   ============================================================ */
async function loadDishes() {
  state.dishes = await api('/api/dishes');
}
async function loadMeals() {
  state.meals = await api('/api/meals?limit=200');
}
async function loadStats() {
  state.stats = await api(`/api/stats?month=${state.statsMonth}`);
}

async function refreshCurrent() {
  if (state.tab === 'recommend') {
    await loadRecommend();
    renderRecommend();
  } else if (state.tab === 'dishes') {
    await loadDishes();
    renderDishes();
  } else if (state.tab === 'records') {
    await loadMeals();
    renderRecords();
  } else if (state.tab === 'stats') {
    await loadStats();
    renderStats();
  }
}

const TAB_ORDER = ['recommend', 'dishes', 'records', 'stats'];

function moveTabIndicator(tab) {
  const idx = TAB_ORDER.indexOf(tab);
  const indicator = $('.tab-indicator');
  if (indicator && idx >= 0) indicator.style.transform = `translateX(${idx * 100}%)`;
}

async function playViewExit(v, dir) {
  const kids = [...v.children];
  if (!kids.length) return;
  for (const k of kids) {
    k.classList.remove('view-enter', 'from-left', 'from-right');
    k.classList.add('view-exit');
    if (dir > 0) k.classList.add('to-left');
    else if (dir < 0) k.classList.add('to-right');
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise((r) => setTimeout(r, reduce ? 0 : 140));
}

async function switchTab(tab) {
  const from = state.tab;
  const dir = TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(from);
  state.tab = tab;
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
  moveTabIndicator(tab);
  const v = $('#view');

  await playViewExit(v, dir);
  v.scrollTop = 0;
  state.viewDir = dir > 0 ? 'right' : dir < 0 ? 'left' : '';

  try {
    if (tab === 'recommend') {
      state.animateView = false;
      if (!state.results) {
        state.loadingResults = true;
        renderRecommend();
        await loadRecommend();
        state.loadingResults = false;
      }
      state.animateView = true;
      renderRecommend();
    } else if (tab === 'dishes') {
      state.animateView = false;
      if (!state.dishes.length) {
        state.loading.dishes = true;
        renderDishes();
      }
      await loadDishes();
      state.loading.dishes = false;
      state.animateView = true;
      renderDishes();
    } else if (tab === 'records') {
      state.animateView = false;
      if (!state.meals.length) {
        state.loading.meals = true;
        renderRecords();
      }
      await loadMeals();
      state.loading.meals = false;
      state.animateView = true;
      renderRecords();
    } else if (tab === 'stats') {
      state.animateView = false;
      renderStats();
      await loadStats();
      state.animateView = true;
      renderStats();
    }
  } catch (e) {
    toast(e.message);
  }
  state.animateView = false;
  state.viewDir = '';
}

/* ============================================================
   事件
   ============================================================ */
document.querySelector('.tabbar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    vibrate(8);
    switchTab(tab.dataset.tab);
  }
});

// 顶栏：设置入口与新增等操作
$('#appbar-actions').addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="open-settings"]')) {
    openSettingsSheet();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el) await handleAction(el);
});

// 进场动画结束后移除标记类，避免后续交互（如摇一摇）重放整页动画
document.addEventListener('animationend', (e) => {
  if (['view-in', 'view-in-left', 'view-in-right'].includes(e.animationName)) {
    e.target.classList.remove('view-enter', 'from-left', 'from-right');
  }
});

async function handleAction(el) {
  const { action, value, key, id, score, set, acc } = el.dataset;

  try {
    if (action === 'toggle-acc') {
      const box = el.closest('.acc');
      const next = box.dataset.open !== 'true';
      box.dataset.open = next ? 'true' : 'false';
      state.acc[acc] = next;
      vibrate(6);
    } else if (action === 'toggle-group') {
      const box = el.closest('.group');
      const next = box.dataset.open !== 'true';
      box.dataset.open = next ? 'true' : 'false';
      if (set === 'openDays') {
        next ? state.openDays.add(key) : state.openDays.delete(key);
      } else {
        next ? state.openCuisines.add(key) : state.openCuisines.delete(key);
      }
      vibrate(6);
    } else if (action === 'set-filter') {
      state.filters[key] = value;
      syncFilterChips();
      vibrate(8);
      await reloadResults();
    } else if (action === 'shuffle') {
      await doShuffle();
    } else if (action === 'eat') {
      const mealType = state.filters.meal === 'any' ? state.meta.suggestedMeal : state.filters.meal;
      await api('/api/meals', {
        method: 'POST',
        body: { dish_id: Number(id), meal_type: mealType }
      });
      state.recordedIds.add(Number(id));
      state.openDays = null;
      vibrate(45);
      toast('已记录，开饭啦 🍴');
      $$(`#results [data-action="eat"][data-id="${id}"]`).forEach((btn) => {
        btn.disabled = true;
        if (btn.classList.contains('icon-btn')) btn.textContent = '✅';
        else btn.textContent = '✓ 已记录';
      });
    } else if (action === 'cuisine') {
      state.dishCuisine = value;
      renderDishes();
    } else if (action === 'new-dish') {
      openDishSheet(null);
    } else if (action === 'open-month') {
      state.pickerYear = Number(state.statsMonth.slice(0, 4));
      openMonthSheet();
      vibrate(6);
    } else if (action === 'month-year') {
      const base = state.pickerYear ?? Number(state.statsMonth.slice(0, 4));
      state.pickerYear = base + Number(value);
      openMonthSheet();
      vibrate(6);
    } else if (action === 'pick-month') {
      await selectMonth(value);
      vibrate(10);
    } else if (action === 'month-this') {
      await selectMonth(localMonth());
      vibrate(10);
    } else if (action === 'edit-dish') {
      const dish = state.dishes.find((d) => d.id === Number(id));
      if (dish) openDishSheet(dish);
    } else if (action === 'delete-dish') {
      if (!confirm('确定删除这个菜品吗？相关记录也会一并删除。')) return;
      await api(`/api/dishes/${id}`, { method: 'DELETE' });
      closeSheet();
      await loadDishes();
      renderDishes();
      toast('已删除');
    } else if (action === 'save-dish') {
      const body = collectDishForm();
      if (!body.name) return toast('请填写菜名');
      if (id) await api(`/api/dishes/${id}`, { method: 'PUT', body });
      else await api('/api/dishes', { method: 'POST', body });
      closeSheet();
      await loadDishes();
      renderDishes();
      toast('已保存');
    } else if (action === 'rate') {
      await api(`/api/meals/${id}`, { method: 'PATCH', body: { rating: Number(score) } });
      const m = state.meals.find((x) => x.id === Number(id));
      if (m) m.rating = Number(score);
      vibrate(20);
      renderRecords();
    } else if (action === 'delete-meal') {
      await api(`/api/meals/${id}`, { method: 'DELETE' });
      state.meals = state.meals.filter((m) => m.id !== Number(id));
      state.openDays = null;
      vibrate(25);
      toast('已删除记录');
      renderRecords();
    }
  } catch (err) {
    toast(err.message);
  }
}

$('#view').addEventListener('click', async (e) => {
  // 点击展开的滑动项以外区域 -> 收起
  const openSwipe = $('.swipe.open');
  if (openSwipe && !e.target.closest('.swipe')) openSwipe.classList.remove('open');

  const el = e.target.closest('[data-action]');
  if (el) await handleAction(el);
});

// 输入：食材 / 搜索
$('#view').addEventListener('input', (e) => {
  if (e.target.id === 'ing-input') {
    state.filters.ingredients = e.target.value;
  } else if (e.target.id === 'dish-search') {
    state.dishQuery = e.target.value;
    renderDishes();
    const el = $('#dish-search');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
});

$('#view').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && e.target.id === 'ing-input') {
    e.target.blur();
    await doShuffle();
  }
});

// 弹层内的多选 / 设置
$('#sheet-body').addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="save-settings"]')) {
    const value = $('#s-api-base').value.trim().replace(/\/+$/, '');
    API_BASE = value;
    if (value) localStorage.setItem('apiBase', value);
    else localStorage.removeItem('apiBase');
    closeSheet();
    toast(value ? '已切换为联网模式' : '已切换为本机模式');
    try {
      await loadMeta();
    } catch {
      toast('无法连接服务器');
    }
    refreshCurrent().catch(() => {});
    return;
  }
  if (e.target.closest('[data-action="reset-settings"]')) {
    localStorage.removeItem('apiBase');
    API_BASE = (CONFIG_BASE || '').replace(/\/+$/, '');
    closeSheet();
    toast(API_BASE ? '已重置为默认地址' : '已切换为本机模式');
    try {
      await loadMeta();
    } catch {
      toast('无法连接服务器');
    }
    refreshCurrent().catch(() => {});
    return;
  }
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    await handleAction(actionEl);
    return;
  }
  const btn = e.target.closest('[data-toggle]');
  if (!btn) return;
  if (btn.dataset.toggle === 'spice') {
    $$('#f-spice .chip').forEach((b) => b.classList.toggle('on', b === btn));
  } else {
    btn.classList.toggle('on');
  }
  vibrate(6);
});
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', (e) => {
  if (e.target.id === 'sheet') closeSheet();
});

// 弹层下拉关闭
(function sheetDrag() {
  const grab = $('#sheet-grab');
  const panel = $('#sheet-panel');
  let startY = null,
    dy = 0;
  grab.addEventListener(
    'touchstart',
    (e) => {
      startY = e.touches[0].clientY;
      panel.style.transition = 'none';
    },
    { passive: true }
  );
  grab.addEventListener(
    'touchmove',
    (e) => {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      panel.style.transform = `translateY(${dy}px)`;
    },
    { passive: true }
  );
  grab.addEventListener('touchend', () => {
    panel.style.transition = '';
    if (dy > 90) {
      closeSheet();
    }
    panel.style.transform = '';
    startY = null;
    dy = 0;
  });
})();

// appbar 阴影
$('#view').addEventListener(
  'scroll',
  () => {
    $('.appbar').classList.toggle('scrolled', $('#view').scrollTop > 4);
  },
  { passive: true }
);

/* ============================================================
   下拉刷新
   ============================================================ */
(function pullToRefresh() {
  const view = $('#view');
  const ptr = $('#ptr');
  const text = $('#ptr-text');
  let startY = null,
    dist = 0;

  view.addEventListener(
    'touchstart',
    (e) => {
      if (view.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        dist = 0;
      } else startY = null;
    },
    { passive: true }
  );

  view.addEventListener(
    'touchmove',
    (e) => {
      if (startY === null) return;
      const d = e.touches[0].clientY - startY;
      if (d <= 0) return;
      dist = Math.min(d * 0.45, 72);
      if (dist > 8) {
        ptr.classList.add('on');
        text.textContent = dist > 52 ? '松手刷新' : '下拉刷新';
      }
    },
    { passive: true }
  );

  view.addEventListener('touchend', async () => {
    if (startY === null) return;
    const trigger = dist > 52;
    startY = null;
    dist = 0;
    if (trigger) {
      text.textContent = '刷新中…';
      vibrate(15);
      try {
        await refreshCurrent();
      } catch {
        /* ignore */
      }
    }
    ptr.classList.remove('on');
  });
})();

/* ============================================================
   滑动删除
   ============================================================ */
(function swipeToDelete() {
  const view = $('#view');
  let sw = null;

  view.addEventListener(
    'touchstart',
    (e) => {
      const content = e.target.closest('.swipe-content');
      if (!content || e.target.closest('button')) {
        sw = null;
        return;
      }
      const el = content.parentElement;
      sw = {
        content,
        el,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        dx: 0,
        axis: null,
        open: el.classList.contains('open')
      };
    },
    { passive: true }
  );

  view.addEventListener(
    'touchmove',
    (e) => {
      if (!sw) return;
      const dx = e.touches[0].clientX - sw.startX;
      const dy = e.touches[0].clientY - sw.startY;
      if (!sw.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        sw.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (sw.axis !== 'x') return;
      const base = sw.open ? -84 : 0;
      sw.dx = Math.max(-104, Math.min(0, base + dx));
      sw.content.classList.add('dragging');
      sw.content.style.transform = `translateX(${sw.dx}px)`;
    },
    { passive: true }
  );

  view.addEventListener('touchend', () => {
    if (!sw) return;
    const { content, el, dx } = sw;
    content.classList.remove('dragging');
    content.style.transform = '';
    if (dx < -42) {
      $$('.swipe.open').forEach((o) => {
        if (o !== el) o.classList.remove('open');
      });
      el.classList.add('open');
    } else if (sw.open) {
      el.classList.remove('open');
    }
    sw = null;
  });
})();

/* ============================================================
   摇一摇
   ============================================================ */
const SHAKE_DELTA_THRESHOLD = 18;
const SHAKE_COOLDOWN_MS = 1300;
let lastShake = 0;
let lastAcceleration = null;
let motionListening = false;

function setShakeStatus(message) {
  const status = $('#shake-status');
  if (status) status.textContent = message;
  else toast(message);
}

function onMotion(e) {
  if (document.hidden || state.tab !== 'recommend') return;
  const acceleration = e.acceleration || e.accelerationIncludingGravity;
  if (!acceleration) return;

  const current = {
    x: acceleration.x || 0,
    y: acceleration.y || 0,
    z: acceleration.z || 0
  };
  if (!lastAcceleration) {
    lastAcceleration = current;
    return;
  }

  const delta =
    Math.abs(current.x - lastAcceleration.x) +
    Math.abs(current.y - lastAcceleration.y) +
    Math.abs(current.z - lastAcceleration.z);
  lastAcceleration = current;
  const now = Date.now();
  if (delta >= SHAKE_DELTA_THRESHOLD && now - lastShake > SHAKE_COOLDOWN_MS) {
    lastShake = now;
    void doShuffle();
  }
}

function startMotionListener() {
  if (motionListening) return;
  motionListening = true;
  lastAcceleration = null;
  window.addEventListener('devicemotion', onMotion, { passive: true });
  setShakeStatus('摇一摇换一批已开启');
}

function enableShake() {
  if (motionListening) return;
  if (typeof DeviceMotionEvent === 'undefined') {
    setShakeStatus('当前浏览器不支持运动传感器');
    return;
  }
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((permission) => {
        if (permission === 'granted') {
          startMotionListener();
        } else {
          setShakeStatus('请在浏览器设置中允许“运动与方向访问”');
        }
      })
      .catch(() => {
        setShakeStatus('无法获取运动权限；iPhone 通常需要通过 HTTPS 访问');
      });
  } else {
    startMotionListener();
  }
}
document.addEventListener(
  'click',
  (e) => {
    if (e.target.closest('#shuffle-btn')) enableShake();
  },
  { capture: true }
);

/* ============================================================
   启动
   ============================================================ */
async function loadMeta() {
  state.meta = await api('/api/meta');
}

function setupNativeBack() {
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!App || typeof App.addListener !== 'function') return;
  App.addListener('backButton', ({ canGoBack }) => {
    if (state.tab !== 'recommend') switchTab('recommend');
    else if (!canGoBack && App.exitApp) App.exitApp();
  });
}

(async function init() {
  try {
    await loadMeta();
  } catch {
    toast('数据初始化失败');
  }
  setupNativeBack();
  await switchTab('recommend');
})();
