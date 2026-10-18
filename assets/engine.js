/* =========================================================
   مبدعة التقنية — المحرّك المشترك لكل الدروس
   يقرأ: window.PLATFORM (platform.js) و window.LESSON (lesson.js لكل درس)
   ========================================================= */
(function(){
'use strict';
const P = window.PLATFORM, L = window.LESSON;
const ASSETS = document.currentScript.src.replace(/[^/]*$/, '');
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pct = (s,m) => m ? Math.round(s/m*100) : 0;
const fp = (v, sign) => '\u2066' + (sign && v>0 ? '+' : '') + v + '%\u2069'; // نسبة معزولة الاتجاه داخل النص العربي
const fmtDate = t => new Date(t).toLocaleString('ar-OM',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

/* ---------- التخزين ---------- */
const PKEY = 'tech-expo:profile';
const lkey = id => 'tech-expo:lesson:' + id;
const read = (k, d) => { try{ return Object.assign(d, JSON.parse(localStorage.getItem(k)) || {}); }catch(e){ return d; } };
const write = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
let PR = read(PKEY, {name:'', cls:'', sound:true, device:''});
if(!PR.device){ PR.device = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); write(PKEY, PR); }
const saveProfile = () => write(PKEY, PR);
const freshLesson = () => ({warm:false, done:{}, notes:{}, reflect:'', hist:[], sum:null});
let S = L ? read(lkey(L.id), freshLesson()) : null;

/* ---------- الأنشطة والنقاط (أفضل نتيجة تُشتق من السجل) ---------- */
function maxOf(g){
  if(g.type==='match') return g.pairs.length*10;
  if(g.type==='sort'||g.type==='order') return g.items.length*10;
  if(g.type==='pick') return g.items.filter(i=>i[1]).length*10;
  if(g.type==='mcq') return g.qs.length*10;
  if(g.type==='sim') return g.tasks.length*10;
  return 0;
}
const ACTS = L ? [
  ...L.pavilions.map(p => ({id:p.id, title:p.title, icon:p.icon, color:p.color, max:p.games.reduce((t,g)=>t+maxOf(g),0)})),
  {id:'final', title:L.final.title, icon:L.final.icon, color:L.final.color, max:(L.final.tf.length+L.final.mcq.length)*10}
] : [];
const MAX = ACTS.reduce((t,a)=>t+a.max,0);
const attemptsOf = id => S.hist.filter(h=>h.a===id);
const bestOf = id => { const h=attemptsOf(id); return h.length ? Math.max(...h.map(x=>x.s)) : null; };
const doneCount = () => L.pavilions.filter(p=>S.done[p.id]).length;
let runPts = 0, runId = null, runLog = [];
function total(){ return ACTS.reduce((t,a)=>t+(a.id===runId?Math.max(bestOf(a.id)||0,runPts):(bestOf(a.id)||0)),0); }
function save(){
  if(!S) return;
  const done = ACTS.filter(a=>S.done[a.id]).length;
  S.sum = {done, total:ACTS.length, best:pct(total(),MAX), attempts:S.hist.length};
  write(lkey(L.id), S);
}
function record(id, s, m, e){
  const t = Date.now(); S.hist.push({a:id, t, s, m, e}); save();
  const act = ACTS.find(x=>x.id===id), plain = h => { const d=document.createElement('div'); d.innerHTML=h; return d.textContent.trim(); };
  queueSend({ts:t, name:PR.name, cls:PR.cls, device:PR.device, lesson:L.id, lessonTitle:L.title, act:id, actTitle:act.title,
    attempt:attemptsOf(id).length, score:s, max:m, pct:pct(s,m), mistakes:e, acts:ACTS.length, misses:runLog.map(x=>plain(x.q)).slice(0,30), reflect:id==='final'?S.reflect.trim().slice(0,1000):''});
}
/* ---------- إرسال النتائج إلى جدول المعلمة (Google Sheets) ---------- */
const OUTBOX = 'tech-expo:outbox';
let sendState = 'off'; // off | sending | sent | queued
function queueSend(row){
  if(!P.sheetUrl) return;
  const q = read(OUTBOX, {items:[]}); q.items.push(row); write(OUTBOX, q); flush();
}
let flushing = null, flushAgain = false;
function flush(){ // إرسال واحد في كل مرة لمنع تكرار الصفوف
  if(!P.sheetUrl) return Promise.resolve();
  if(flushing){ flushAgain = true; return flushing; }
  const q = read(OUTBOX, {items:[]});
  if(!q.items.length) return Promise.resolve();
  sendState = 'sending';
  return flushing = Promise.all(q.items.map(row => fetch(P.sheetUrl, {method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(row)})
    .then(()=>row.ts+'|'+row.act, ()=>null)))
  .then(okIds => {
    const done = new Set(okIds.filter(Boolean)), cur = read(OUTBOX, {items:[]});
    cur.items = cur.items.filter(r => !done.has(r.ts+'|'+r.act)); write(OUTBOX, cur);
    sendState = cur.items.length ? 'queued' : 'sent'; syncNote();
  }).finally(() => { flushing = null; if(flushAgain){ flushAgain = false; flush(); } });
}
function syncNote(){
  const el = $('#syncNote'); if(!el || !P.sheetUrl) return;
  el.innerHTML = sendState==='sent' ? '☁️ وصلت نتيجتكِ إلى معلمتكِ ✅' : sendState==='queued' ? '📴 لا يوجد اتصال — ستُرسل نتيجتكِ إلى معلمتكِ تلقائيًا عند عودة الإنترنت' : '☁️ جارٍ إرسال نتيجتكِ إلى معلمتكِ…';
}
addEventListener('online', flush);
function addPts(n){ runPts += n; refreshHeader(); }
function logMiss(q, your, correct, why){ runLog.push({q, your, correct, why:why||''}); }

/* ---------- صوت، احتفال، تنبيه ---------- */
let AC = null;
function tone(type){
  if(!PR.sound) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const seq = {ok:[[660,.08],[880,.12]], no:[[240,.12],[180,.16]], tap:[[520,.04]], win:[[523,.1],[659,.1],[784,.1],[1046,.22]]}[type];
    let t = AC.currentTime;
    seq.forEach(([f,d])=>{ const o=AC.createOscillator(), g=AC.createGain(); o.type=type==='no'?'sawtooth':'triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(.16,t); g.gain.exponentialRampToValueAtTime(.001,t+d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+d+.02); t+=d; });
  }catch(e){}
}
const cv=$('#confetti'), cx=cv.getContext('2d'); let parts=[], raf=null;
function confetti(n=120){
  cv.width=innerWidth; cv.height=innerHeight;
  const cols=['#22d3ee','#a78bfa','#ec4899','#facc15','#f59e0b','#10b981','#14b8a6'];
  for(let i=0;i<n;i++) parts.push({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*.35,vx:(Math.random()-.5)*12,vy:Math.random()*-12-4,s:Math.random()*7+4,c:cols[i%cols.length],r:Math.random()*6,life:120+Math.random()*60});
  if(!raf) loop();
}
function loop(){
  cx.clearRect(0,0,cv.width,cv.height);
  parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.35;p.vx*=.99;p.r+=.1;p.life--;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore();});
  parts=parts.filter(p=>p.life>0&&p.y<cv.height+20);
  raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0,0,cv.width,cv.height), null);
}
let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2600); }
function msg(text, kind){ const m=$('#gMsg'); if(m){ m.innerHTML=text; m.className='gmsg'+(kind?' '+kind:''); } }

/* ---------- الهيكل: الرأس والتذييل ---------- */
const ROBOT = `<svg class="rb" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c7d2fe"/></linearGradient></defs>
<line x1="60" y1="6" x2="60" y2="20" stroke="#94a3b8" stroke-width="3"/><circle cx="60" cy="6" r="5" fill="#22d3ee"/>
<ellipse cx="60" cy="62" rx="48" ry="44" fill="url(#rg)" stroke="#a5b4fc" stroke-width="2"/><rect x="24" y="40" width="72" height="44" rx="20" fill="#0b1b3a"/>
<rect x="42" y="52" width="9" height="16" rx="4" fill="#38bdf8"/><rect x="69" y="52" width="9" height="16" rx="4" fill="#38bdf8"/>
<path d="M46 74 Q60 82 74 74" stroke="#38bdf8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M38 104 Q60 118 82 104 L78 128 Q60 136 42 128 Z" fill="url(#rg)" stroke="#a5b4fc" stroke-width="2"/></svg>`;

function shell(){
  const lessonBar = L ? `<span class="hdrStats"><span class="chip" title="النقاط">⭐ <span id="hScore">0</span></span>
      <span class="chip hideSm" title="الأوسمة">🏅 <span id="hBadges">0</span></span></span>` : '';
  $('#hdr').innerHTML = `<div class="bar">
    <a class="brand" id="homeLink" href="${L?'../':'./'}" aria-label="${P.name}: قائمة الدروس">
      <span class="mark"><img src="${ASSETS}logo-icon.svg" alt="شعار مبدعة التقنية"></span>
      <span style="min-width:0"><b>${L?esc(L.expo):P.name}</b><small>${L?`${P.name} • ${esc(L.grade)}`:esc(P.school)}</small></span>
    </a>${lessonBar}
    <button class="iconbtn" id="sndBtn" aria-label="تشغيل/إيقاف الصوت">🔊</button></div>`;
  $('#sndBtn').onclick = () => { PR.sound=!PR.sound; saveProfile(); refreshHeader(); tone('tap'); };
  $('#ftr').innerHTML = `${L?`${esc(L.subject)} • ${esc(L.grade)} • ${esc(L.unit)} — ${esc(L.subtitle)}<br>`:''}${esc(P.school)} • إعداد: <b>${esc(P.teacher)}</b> • <a href="${L?'../':''}teacher/" class="tlink">بوابة المعلمة</a>`;
  $('#guideBtn').innerHTML = `${ROBOT}<span>كيف أستخدم الصفحة؟</span>`;
  $('#guideBtn').onclick = startTour;
  refreshHeader();
}
function refreshHeader(){
  $('#sndBtn').textContent = PR.sound ? '🔊' : '🔇';
  if(L){ $('#hScore').textContent = total(); $('#hBadges').textContent = doneCount()+'/'+L.pavilions.length; }
}

let curTag = '';
function render(html, accent, tag){
  stopTour(); hideTip();
  document.documentElement.style.setProperty('--accent', accent || (L?L.color:'#14b8a6'));
  curTag = tag || '';
  $('#app').innerHTML = `<div class="screen">${html}</div>`;
  scrollTo({top:0,behavior:'smooth'});
  refreshHeader();
}
const orbit = (icons, core) => `<div class="orbit" aria-hidden="true"><span class="ring"></span><span class="ring r2"></span><span class="ring r3"></span>
  ${icons.map((x,i)=>`<span class="sat" style="--d:${34}s;--dl:${-(34/icons.length)*i}s;--rad:min(165px,36vw);--c:${x[1]}"><span><i>${x[0]}</i></span></span>`).join('')}
  <span class="core">${core}</span></div>`;

/* =========================================================
   مكتبة الدروس (الصفحة الرئيسة للمنصة)
   ========================================================= */
function library(){
  const cards = P.lessons.map(l=>{
    const st = read(lkey(l.id), freshLesson()), sm = st.sum;
    const p = sm ? Math.round(sm.done/sm.total*100) : 0;
    return `<a class="lcard" style="--c:${l.color}" href="${l.path}">
      <div class="top"><span class="ic">${l.icon}</span><span class="status ${sm&&sm.done===sm.total?'done':''}">${sm?(sm.done===sm.total?'مكتمل ✅':`${sm.done}/${sm.total} أنشطة`):'جديد ✨'}</span></div>
      <h3>${esc(l.title)}</h3><span class="meta">${esc(l.subject)} • ${esc(l.grade)} • ${esc(l.unit)}</span>
      <p class="muted" style="font-size:14px">${esc(l.desc)}</p>
      <div class="progress" aria-label="التقدّم ${fp(p)}"><div style="width:${p}%"></div></div>
      <span class="meta">${sm?`أفضل نتيجة: ${fp(sm.best)} • المحاولات: ${sm.attempts}`:'لم تبدئي بعد'}</span>
      <span class="go">${sm?'تابعي الدرس ←':'ابدئي الدرس ←'}</span></a>`;
  }).join('');
  render(`<section class="panel">
    <div class="hero">
      <div>
        <span class="kicker">🎓 ${esc(P.tagline)}</span>
        <h1><span class="grad">${esc(P.title)}</span></h1>
        <p class="desc">معارض تفاعلية لكل درس: تمهيد مشوّق، ومعلومات مختصرة، وألعاب، وتقويم، وشهادة رقمية — مع سجلّ يحفظ كل محاولاتكِ لتري تطوّركِ.</p>
        ${idFields('اسمكِ (يُحفظ لكل الدروس والشهادات):')}
      </div>
      ${orbit([['💻','#22d3ee'],['🤖','#a78bfa'],['☁️','#14b8a6'],['📡','#ec4899'],['🔐','#10b981'],['📊','#f59e0b']], '🎓')}
    </div>
    <h2 class="sectionT" style="font-size:22px">📚 الدروس المتاحة</h2>
    <div class="lessons">${cards}</div>
  </section>`, '#14b8a6', 'library');
  $('#nm').oninput = e => { PR.name = e.target.value.trim(); saveProfile(); };
  $('#cls').oninput = e => { PR.cls = e.target.value.trim(); saveProfile(); };
}
function idFields(label){
  return `<div class="idRow"><div class="field"><label for="nm">${label}</label>
      <input id="nm" maxlength="60" placeholder="مثال: مريم بنت سالم الحارثية" value="${esc(PR.name)}" autocomplete="name"></div>
    <div class="field"><label for="cls">الصف / الشعبة:</label>
      <input id="cls" maxlength="12" list="clsList" placeholder="مثال: 12/3" value="${esc(PR.cls)}"><datalist id="clsList">${(P.classes||[]).map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div></div>
    ${P.sheetUrl?'<p class="privacy">🔒 تُرسل نتائج الأنشطة (الاسم، والصف، والدرجات، وإجابة سؤال التأمل، وفتح الشهادة) إلى معلمتكِ فقط لمتابعة تقدّمكِ.</p>':''}`;
}

/* =========================================================
   الدرس: الترحيب ← التمهيد ← الخريطة ← الأجنحة ← التقويم ← الشهادة
   ========================================================= */
function welcome(){
  runId=null;
  render(`<section class="panel">
    <div class="hero">
      <div>
        <span class="kicker">${esc(L.subject)} • ${esc(L.grade)} • ${esc(L.unit)}</span>
        <h1>${esc(L.expo)}</h1>
        <p class="subt">${esc(L.subtitle)}</p>
        <p class="desc">${esc(L.welcome)}</p>
        <div class="tags"><span>⏳ تمهيد</span><span>📖 معلومات</span><span>🎮 ألعاب</span><span>💬 نقاش</span><span>🏆 تقويم وشهادة</span><span>📈 سجلّ المحاولات</span></div>
        ${idFields('اكتبي اسمكِ كما سيظهر في الشهادة:')}
        <div class="row"><button class="btn" id="startBtn">${S.warm?'تابعي الجولة ↩':'ادخلي المعرض ✨'}</button>
          <a class="btn ghost" href="../">📚 كل الدروس</a></div>
      </div>
      ${orbit(L.pavilions.map(p=>[p.icon,p.color]), L.icon)}
    </div></section>`, L.color, 'welcome');
  $('#startBtn').onclick = start;
  ['#nm','#cls'].forEach(s => $(s).addEventListener('keydown', e => { if(e.key==='Enter') start(); }));
}
function start(){
  const v = $('#nm').value.trim(), c = $('#cls').value.trim();
  const bad = (sel, m) => { $(sel).classList.add('shake'); setTimeout(()=>$(sel).classList.remove('shake'),400); toast(m); $(sel).focus(); };
  if(v.length < 3) return bad('#nm', 'اكتبي اسمكِ أولًا لنبدأ الجولة 🌸');
  if(!c) return bad('#cls', 'اكتبي الصف والشعبة (مثال: 12/3)');
  PR.name = v; PR.cls = c; saveProfile(); tone('tap');
  S.warm ? goHub() : warmup();
}

function warmup(){
  runId=null; const W=L.warmup, flipped=new Set();
  render(`<section class="panel">
    <span class="kicker">${W.icon} التمهيد</span>
    <h2 style="font-size:clamp(24px,4.5vw,36px);margin:8px 0">${esc(W.title)}</h2>
    <p class="lead">${esc(W.intro)}</p>
    <div class="grid" id="flips">${W.cards.map((c,i)=>`
      <button class="flip" data-i="${i}" aria-label="${esc(c.t)}: اضغطي للقلب">
        <div class="in">
          <div class="f"><span class="em">${c.em}</span><span class="lbl">قديمًا</span><h4>${c.t}</h4><p>${c.then}</p><span class="tap">👆 اضغطي لتري اليوم</span></div>
          <div class="b"><span class="em">${c.em}</span><span class="lbl">اليوم</span><h4>${c.t}</h4><p>${c.now}</p><span class="tap">✅</span></div>
        </div></button>`).join('')}</div>
    <p class="gmsg" id="gMsg" aria-live="polite"></p>
    <div id="wq"></div></section>`, W.color, 'warmup');
  $$('.flip').forEach(b => b.onclick = () => {
    b.classList.toggle('on'); tone('tap'); flipped.add(b.dataset.i);
    const left = W.cards.length - flipped.size;
    if(!left && !$('#wqBox')) warmQuestion(); else if(left) msg(`رائع! بقي ${left} من البطاقات…`);
  });
}
function warmQuestion(){
  const W=L.warmup, q=W.q;
  msg('ممتاز! والآن فكّري جيدًا… 🤔');
  $('#wq').innerHTML = `<div id="wqBox" class="screen" style="margin-top:18px"><div class="qcard"><div class="qtext">${q.q}</div>
    <div class="opts">${q.o.map((o,i)=>`<button class="tile" data-i="${i}">${o}</button>`).join('')}</div></div><div id="defArea"></div></div>`;
  $$('#wqBox .tile').forEach(b => b.onclick = () => {
    if(+b.dataset.i!==q.c){ b.classList.add('no','shake'); tone('no'); msg(q.wrong,'no'); return; }
    $$('#wqBox .tile').forEach(x=>x.disabled=true); b.classList.add('ok'); tone('ok'); confetti(60); msg(q.right,'ok');
    $('#defArea').innerHTML = `<div class="screen" style="margin-top:20px">
      <div class="defBox"><h3>${W.reveal.title}</h3><p>${W.reveal.html}</p></div>
      ${W.lists.map(li=>`<h3 class="sectionT">${li.title}</h3><div class="pillGrid">${li.items.map(x=>`<div class="pill"><i>${x[0]}</i>${x[1]}</div>`).join('')}</div>`).join('')}
      <div class="spacer"></div><div class="row c"><button class="btn gold" id="toHub">ادخلي إلى أجنحة المعرض 🗺️</button></div></div>`;
    $('#toHub').onclick = () => { S.warm=true; save(); tone('win'); goHub(); };
    setTimeout(()=>$('#defArea').scrollIntoView({behavior:'smooth',block:'start'}),200);
  });
  setTimeout(()=>$('#wqBox').scrollIntoView({behavior:'smooth',block:'start'}),250);
}

function goHub(){
  if(!PR.name) return welcome();
  if(!S.warm) return warmup();
  runId=null; tone('tap');
  const n=doneCount(), all=n===L.pavilions.length, fin=!!S.done.final, F=L.final;
  const card = (p,i) => { const b=bestOf(p.id), a=attemptsOf(p.id).length, m=ACTS.find(x=>x.id===p.id).max;
    return `<button class="pav" data-k="p" style="--c:${p.color}" data-id="${p.id}">
      <div class="top"><span class="ic">${p.icon}</span><span class="status ${S.done[p.id]?'done':''}">${S.done[p.id]?`مكتمل ✅ ${fp(pct(b,m))}`:'الجناح '+(i+1)}</span></div>
      <h3>${p.title}</h3><p><b style="color:${p.color}">${p.sub}</b><br>${p.desc}</p>
      <span class="go">${S.done[p.id]?`إعادة المحاولة ↺ (${a} ${a===1?'محاولة':'محاولات'})`:'ادخلي الجناح ←'}</span></button>`; };
  render(`<section class="panel">
    <div class="hubHead">
      <div><span class="kicker">🗺️ خريطة المعرض</span>
        <h2 style="font-size:clamp(20px,4vw,30px);margin-top:6px">أهلًا بكِ يا ${esc(PR.name)} 🌸 <span class="chip" style="font-size:13px">${esc(PR.cls)}</span></h2>
        <p class="muted">زوري الأجنحة بالترتيب الذي تحبّينه، ثم توجّهي إلى ${esc(F.title)}.</p></div>
      <div class="row"><span class="chip" style="font-size:15px">🏅 ${n} / ${L.pavilions.length}</span><button class="btn ghost sm" id="histBtn">📈 سجلّي</button></div>
    </div>
    <div class="progress"><div id="pg"></div></div>
    <div class="pavs">
      <button class="pav" style="--c:${L.warmup.color}" id="warmCard">
        <div class="top"><span class="ic">${L.warmup.icon}</span><span class="status done">التمهيد ✅</span></div>
        <h3>${esc(L.warmup.title.split(':')[0])}</h3><p>${esc(L.warmup.intro)}</p><span class="go">مراجعة ↺</span></button>
      ${L.pavilions.map(card).join('')}
      <button class="pav ${all?'':'locked'}" style="--c:${F.color}" id="finalCard">
        <div class="top"><span class="ic">${all?F.icon:'🔒'}</span><span class="status ${fin?'done':''}">${fin?`مكتمل ✅ ${fp(pct(bestOf('final'),ACTS.at(-1).max))}`:all?'مفتوح الآن!':'مقفل'}</span></div>
        <h3>${esc(F.title)}</h3><p><b style="color:${F.color}">${esc(F.sub)}</b><br>صح وخطأ، واختيار من متعدد، وسؤال تأمّل.</p>
        <span class="go">${all?(fin?'إعادة التقويم ↺':'ابدئي التقويم ←'):'أكملي الأجنحة أولًا'}</span></button>
      <button class="pav ${fin?'':'locked'}" style="--c:#14b8a6" id="certCard">
        <div class="top"><span class="ic">${fin?'📜':'🔒'}</span><span class="status ${fin?'done':''}">${fin?'جاهزة!':'مقفلة'}</span></div>
        <h3>${esc(L.cert.title)}</h3><p>شهادة ثلاثية الأبعاد باسمكِ، قابلة للطباعة والحفظ PDF.</p>
        <span class="go">${fin?'عرض الشهادة ←':'—'}</span></button>
    </div></section>`, L.color, 'hub');
  $$('.pav[data-id]').forEach(b => b.onclick = () => openPav(b.dataset.id));
  $('#warmCard').onclick = warmup;
  $('#finalCard').onclick = () => all ? openFinal() : toast('🔒 أكملي الأجنحة أولًا لفتح التقويم الختامي');
  $('#certCard').onclick = () => fin ? showCert() : toast('🔒 تُفتح الشهادة بعد إنهاء التقويم الختامي');
  $('#histBtn').onclick = history;
  requestAnimationFrame(()=>{ $('#pg').style.width = ((n+(fin?1:0))/(L.pavilions.length+1)*100)+'%'; });
}

/* ---------- الجناح: تعلّمي ثم العبي ---------- */
let curPav=null;
function pavHead(p, step){
  return `<div class="pavHead">
    <div><span class="kicker" style="--accent:${p.color}">${p.sub}</span><h2><span class="ic">${p.icon}</span>${p.title}</h2></div>
    <div class="row"><div class="steps"><span class="${step===0?'on':''}">1. تعلّمي 📖</span><span class="${step===1?'on':''}">2. العبي 🎮</span></div>
    <button class="btn ghost sm noPrint" id="mapBtn">🗺️ الخريطة</button></div></div>`;
}
function bindMap(){ const b=$('#mapBtn'); if(b) b.onclick=goHub; }
function openPav(id){
  tone('tap'); curPav = L.pavilions.find(p=>p.id===id); runId=null; const p=curPav;
  const blocks = p.learn.map(b=>{
    if(b.k==='cards') return `<div class="info">${b.items.map(c=>`<div class="icard"><span class="em">${c.em}</span><h4>${c.t}</h4>${c.en?`<span class="en">${c.en}</span>`:''}<p>${c.p}</p>${c.ex?`<div class="ex">${c.ex}</div>`:''}${c.sol?`<div class="sol">✅ ${c.sol}</div>`:''}</div>`).join('')}</div>`;
    if(b.k==='list') return `<div class="list">${b.items.map(x=>`<div><i>${x[0]}</i>${x[1]}</div>`).join('')}</div>`;
    if(b.k==='note') return `<div class="note">${b.html}</div>`;
    if(b.k==='timeline') return `<div class="timeline">${b.items.map((x,i)=>`<div class="tl" data-n="${i+1}"><h4>${x.t}</h4><span class="en">${x.en}</span><p>${x.p}</p></div>`).join('')}</div>`;
    return '';
  }).join('');
  render(`<section class="panel">${pavHead(p,0)}<p class="lead">${p.lead}</p>${blocks}
    <div class="spacer"></div><div class="row c"><button class="btn" id="playBtn">جاهزة؟ انطلقي إلى اللعبة 🎮</button></div></section>`, p.color, 'learn');
  bindMap(); $('#playBtn').onclick = startGames;
}
function startGames(){ runId=curPav.id; runPts=0; runLog=[]; playGame(0); }
function playGame(i){
  const p=curPav, g=p.games[i];
  if(!g) return finishPav();
  render(`<section class="panel">${pavHead(p,1)}<div class="game" id="game"></div></section>`, p.color, 'game-'+g.type);
  bindMap();
  ENGINES[g.type](g, $('#game'), () => playGame(i+1), p.games.length>1 ? `مرحلة ${i+1} من ${p.games.length}` : '');
}
function attemptNote(id, max){
  const h=attemptsOf(id), n=h.length, prev=h.slice(0,-1), last=h[n-1];
  const prevBest = prev.length ? Math.max(...prev.map(x=>x.s)) : null;
  const d = prevBest==null ? null : pct(last.s,max)-pct(prevBest,max);
  return `<div class="attemptNote"><span>🔁 المحاولة رقم ${n}</span>${prevBest!=null?`<span>🏅 أفضل نتيجة سابقة: ${fp(pct(prevBest,max))}</span>`:''}
    ${d!=null?(d>0?`<span class="up">📈 تحسّنتِ ${fp(d,1)}</span>`:d===0?'<span>➖ النتيجة نفسها</span>':`<span>📉 أقل بـ ${fp(-d)} — راجعي الأخطاء وحاولي مجددًا</span>`):''}</div>`;
}
function reviewHTML(log){
  if(!log.length) return `<div class="feedback ok" style="text-align:center">🎉 لا توجد أخطاء! أجبتِ عن كل شيء بشكل صحيح من المحاولة الأولى.</div>`;
  return `<h3 class="sectionT" style="color:var(--rose)">📝 دليل المراجعة: تعلّمي من أخطائكِ (${log.length})</h3>
    <div class="review">${log.map((m,i)=>`<div class="rv"><div class="rq"><span>${i+1}</span>${m.q}</div>
      <div class="ry">❌ إجابتكِ: ${m.your}</div><div class="rc">✅ الصحيح: ${m.correct}</div>${m.why?`<div class="rw">💡 ${m.why}</div>`:''}</div>`).join('')}</div>`;
}
const starsOf = p => { const s = p>=90?3:p>=60?2:1; return '⭐'.repeat(s)+'☆'.repeat(3-s); };
function finishPav(){
  const p=curPav, max=ACTS.find(a=>a.id===p.id).max;
  S.done[p.id]=true; runId=null; record(p.id, runPts, max, runLog.length);
  tone('win'); confetti(160);
  const pc=pct(runPts,max), left=L.pavilions.length-doneCount();
  render(`<section class="panel center">
    <div class="badgeBig">${p.icon}</div>
    <h2 style="font-size:clamp(22px,4vw,32px)">أحسنتِ! أكملتِ «${p.title}» 🏅</h2>
    <div class="stars">${starsOf(pc)}</div>
    <div class="scoreRow"><div>نتيجتكِ: <b>${runPts}</b> / ${max}</div><div>النسبة: <b>${fp(pc)}</b></div><div>الأخطاء: <b>${runLog.length}</b></div></div>
    ${attemptNote(p.id,max)}<p class="syncNote" id="syncNote"></p>
    <p class="lead">${runLog.length?'راجعي دليل الأخطاء بالأسفل، ثم حاولي مرة أخرى لتحسين نتيجتكِ 💪':left?`بقي ${left===1?'جناح واحد':left===2?'جناحان':left+' أجنحة'} قبل ${esc(L.final.title)}.`:`أكملتِ كل الأجنحة… ${esc(L.final.title)} بانتظاركِ! 🏆`}</p>
    ${reviewHTML(runLog)}
    <div class="spacer"></div>
    <div class="row c"><button class="btn ${runLog.length?'gold':''}" id="retryBtn">حاولي مرة أخرى ↺</button>
      <button class="btn ${runLog.length?'ghost':'gold'}" id="mapBtn">العودة إلى الخريطة 🗺️</button>
      <button class="btn ghost" id="learnBtn">مراجعة المعلومات 📖</button><button class="btn ghost" id="histBtn">📈 سجلّي</button></div>
  </section>`, p.color, 'result');
  bindMap(); syncNote(); $('#retryBtn').onclick=()=>{ tone('tap'); startGames(); }; $('#learnBtn').onclick=()=>openPav(p.id); $('#histBtn').onclick=history;
}

/* =========================================================
   محرّكات الألعاب
   ========================================================= */
function gHead(g,label,tag){ return `<div class="gTitle"><h3>${g.title}</h3><div class="row">${label?`<span class="muted" style="font-size:13px">${label}</span>`:''}<span class="gTag">${tag}</span></div></div>${g.howto?`<p class="howto">${g.howto}</p>`:''}`; }
function endGame(el,next,text){
  msg(text,'ok'); tone('win'); confetti(70);
  el.querySelector('#gEnd').innerHTML = `<div class="gameBar"><b style="color:var(--sun)">${text}</b><button class="btn gold" id="nx">متابعة ←</button></div>`;
  $('#nx').onclick=()=>{ tone('tap'); next(); };
  setTimeout(()=>el.querySelector('#gEnd').scrollIntoView({behavior:'smooth',block:'nearest'}),150);
}
const MSG_BOX = '<p class="gmsg" id="gMsg" aria-live="polite"></p><div id="gEnd"></div>';
const ENGINES = {
  match(g, el, next, label){
    const left = shuffle(g.pairs.map((p,i)=>({t:p[0],i}))), right = shuffle(g.pairs.map((p,i)=>({t:p[1],i})));
    let selL=null, selR=null, matched=0; const missed=new Set();
    el.innerHTML = `${gHead(g,label,'مطابقة')}
      <div class="match"><div class="col"><span class="colT">المواقف / الاستخدامات</span>${left.map(x=>`<button class="tile" data-side="L" data-i="${x.i}">${x.t}</button>`).join('')}</div>
      <div class="col"><span class="colT">الإجابات</span>${right.map(x=>`<button class="tile" data-side="R" data-i="${x.i}">${x.t}</button>`).join('')}</div></div>${MSG_BOX}`;
    el.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{
      tone('tap');
      if(b.dataset.side==='L'){ selL&&selL.classList.remove('sel'); selL=b; } else { selR&&selR.classList.remove('sel'); selR=b; }
      b.classList.add('sel');
      if(!(selL&&selR)) return;
      const a=+selL.dataset.i, c=+selR.dataset.i, Lt=selL, Rt=selR; selL=selR=null;
      if(a===c){
        Lt.classList.remove('sel'); Rt.classList.remove('sel'); Lt.classList.add('ok'); Rt.classList.add('ok','dim');
        Lt.insertAdjacentHTML('beforeend',`<span class="pair">✔ ${esc(g.pairs[a][1])}</span>`);
        addPts(missed.has(a)?4:10); tone('ok'); matched++;
        msg(['إجابة ذكية! 🌟','أحسنتِ! ✨','ممتاز! 💪','رائع جدًا! 🎯'][matched%4],'ok');
        if(matched===g.pairs.length) endGame(el,next,'أكملتِ المطابقة بنجاح! 🎉');
      } else {
        if(!missed.has(a)) logMiss(esc(g.pairs[a][0]), esc(g.pairs[c][1]), esc(g.pairs[a][1]));
        missed.add(a); tone('no');
        [Lt,Rt].forEach(x=>{x.classList.remove('sel');x.classList.add('no','shake');setTimeout(()=>x.classList.remove('no','shake'),600);});
        msg('ليست هذه… أعيدي قراءة الموقف وفكّري في الكلمة المفتاحية 🔍','no');
      }
    });
  },
  sort(g, el, next, label){
    const items = shuffle(g.items.map((x,i)=>({t:x[0],b:x[1],i}))); let sel=null, placed=0; const missed=new Set();
    const nm = id => g.bins.find(y=>y[0]===id)[2];
    el.innerHTML = `${gHead(g,label,'تصنيف')}
      <div class="chips">${items.map(x=>`<button class="tile" data-i="${x.i}" data-b="${x.b}">${x.t}</button>`).join('')}</div>
      <div class="bins">${g.bins.map(b=>`<button class="bin" data-b="${b[0]}"><span class="em">${b[1]}</span><h4>${b[2]}</h4></button>`).join('')}</div>${MSG_BOX}`;
    const bins = el.querySelectorAll('.bin');
    el.querySelectorAll('.chips .tile').forEach(t=>t.onclick=()=>{ tone('tap'); sel&&sel.classList.remove('sel'); sel=t; t.classList.add('sel'); bins.forEach(b=>b.classList.add('ready')); msg('والآن اضغطي على المجموعة المناسبة ⬇️'); });
    bins.forEach(b=>b.onclick=()=>{
      if(!sel){ toast('اختاري بطاقة أولًا 👆'); return; }
      const i=+sel.dataset.i;
      if(sel.dataset.b===b.dataset.b){
        b.insertAdjacentHTML('beforeend',`<span class="got">✔ ${esc(sel.textContent)}</span>`);
        sel.remove(); sel=null; bins.forEach(x=>x.classList.remove('ready'));
        addPts(missed.has(i)?4:10); tone('ok'); placed++;
        if(placed===g.items.length) endGame(el,next,'صنّفتِ كل البطاقات بشكل صحيح! 🎉'); else msg(`صحيح! بقي ${g.items.length-placed} 👏`,'ok');
      } else {
        if(!missed.has(i)) logMiss(esc(sel.textContent), nm(b.dataset.b), nm(sel.dataset.b));
        missed.add(i); tone('no'); b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),400); msg('ليست في هذا المكان… جرّبي مجموعة أخرى 🤔','no');
      }
    });
  },
  order(g, el, next, label){
    let cur = shuffle(g.items.map((t,i)=>({t,i})));
    while(cur.every((x,k)=>x.i===k)) cur=shuffle(cur);
    let tries=0;
    const draw = lock => {
      el.querySelector('#ord').innerHTML = cur.map((x,k)=>`<div class="oitem ${lock?(x.i===k?'ok':'no'):''}"><span class="n">${k+1}</span><span class="t">${x.t}</span>
        ${lock===true?'':`<span class="mv"><button aria-label="أعلى" ${k===0?'disabled':''} data-u="${k}">⬆️</button><button aria-label="أسفل" ${k===cur.length-1?'disabled':''} data-d="${k}">⬇️</button></span>`}</div>`).join('');
      el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const k=+b.dataset.u;[cur[k-1],cur[k]]=[cur[k],cur[k-1]];tone('tap');draw();});
      el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const k=+b.dataset.d;[cur[k+1],cur[k]]=[cur[k],cur[k+1]];tone('tap');draw();});
    };
    el.innerHTML = `${gHead(g,label,'ترتيب')}<div class="order" id="ord"></div><div class="spacer"></div><div class="row"><button class="btn" id="chk">تحقّقي ✔</button></div>${MSG_BOX}`;
    draw();
    el.querySelector('#chk').onclick=()=>{
      tries++;
      if(cur.every((x,k)=>x.i===k)){
        draw(true); el.querySelector('#chk').remove(); tone('ok');
        addPts(tries===1?g.items.length*10:tries===2?g.items.length*5:g.items.length*2);
        endGame(el,next, tries===1?'ترتيب صحيح من المحاولة الأولى! 🌟':'ترتيب صحيح! 👏');
      } else {
        if(tries===1) logMiss(esc(g.title.replace('لعبة: ','')), cur.map(x=>esc(x.t)).join(' ← '), g.items.map(esc).join(' ← '), g.why);
        tone('no'); draw('hint'); setTimeout(()=>draw(),1100); msg(g.hint||'بعض العناصر في غير مكانها (باللون الأحمر).','no');
      }
    };
  },
  pick(g, el, next, label){
    const items = shuffle(g.items.map((x,i)=>({t:x[0],ok:!!x[1],i}))); const on=new Set();
    el.innerHTML = `${gHead(g,label,'اكتشاف')}<div class="chips">${items.map(x=>`<button class="tile" data-i="${x.i}">${x.t}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="chk">تحقّقي ✔</button></div>${MSG_BOX}`;
    el.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{ tone('tap'); const i=+b.dataset.i; on.has(i)?on.delete(i):on.add(i); b.classList.toggle('sel'); });
    el.querySelector('#chk').onclick=()=>{
      if(!on.size){ toast('اختاري بطاقة واحدة على الأقل'); return; }
      let good=0, bad=0;
      el.querySelectorAll('.tile').forEach(b=>{ const it=items.find(x=>x.i===+b.dataset.i); b.disabled=true; b.classList.remove('sel');
        if(it.ok&&on.has(it.i)){ b.classList.add('ok'); good++; }
        else if(it.ok){ logMiss(esc(it.t),'لم تختاريها',g.okNote); b.classList.add('ok'); b.style.opacity=.6; b.insertAdjacentHTML('beforeend','<span class="pair">⬅ فاتكِ هذا</span>'); }
        else if(on.has(it.i)){ logMiss(esc(it.t),'اخترتِها',g.badNote); b.classList.add('no'); bad++; b.insertAdjacentHTML('beforeend',`<span class="pair" style="color:#fda4af">✖ ${g.badNote}</span>`); }
        else b.classList.add('dim'); });
      el.querySelector('#chk').remove();
      addPts(Math.max(0,(good-bad)*10)); tone(bad?'no':'ok');
      const all=items.filter(x=>x.ok).length;
      endGame(el,next, good===all&&!bad?'اكتشاف مثالي! 🎯':`اكتشفتِ ${good} من ${all}${bad?`، واخترتِ ${bad} دخيلة`:''}. راجعي البطاقات الخضراء 👀`);
    };
  },
  mcq(g, el, next, label){
    let k=0; const res=[];
    const show=()=>{
      const q=g.qs[k];
      el.innerHTML = `${gHead(g,label,g.tag||'اختيار')}
        <div class="dots">${g.qs.map((_,j)=>`<i class="${res[j]===true?'ok':res[j]===false?'no':j===k?'cur':''}"></i>`).join('')}</div>
        <div class="qcard"><div class="qmeta">السؤال ${k+1} من ${g.qs.length}</div><div class="qtext">${q.q}</div>
        <div class="opts ${q.o.length===2?'two':''}">${q.o.map((o,i)=>`<button class="tile" data-i="${i}">${o}</button>`).join('')}</div>
        <div id="fb" aria-live="polite"></div></div>`;
      el.querySelectorAll('.opts .tile').forEach(b=>b.onclick=()=>{
        const i=+b.dataset.i, ok=i===q.c; res[k]=ok;
        el.querySelectorAll('.opts .tile').forEach(x=>{ x.disabled=true; if(+x.dataset.i===q.c) x.classList.add('ok'); });
        if(!ok){ b.classList.add('no','shake'); logMiss(q.q, q.o[i], q.o[q.c], q.why); }
        tone(ok?'ok':'no'); if(ok){ addPts(10); confetti(25); }
        $('#fb').innerHTML = `<div class="feedback ${ok?'ok':'no'}">${ok?'✅ إجابة صحيحة! أحسنتِ':'❌ ليست الإجابة الصحيحة'}<span class="why">💡 ${q.why}</span></div>
          <div class="spacer"></div><button class="btn" id="nx">${k<g.qs.length-1?'السؤال التالي ←':'إنهاء ✔'}</button>`;
        $('#nx').onclick=()=>{ tone('tap'); if(++k<g.qs.length) show(); else next(res.filter(Boolean).length); };
        $('#nx').focus({preventScroll:true}); $('#fb').scrollIntoView({behavior:'smooth',block:'nearest'});
      });
    };
    show();
  },
  sim(g, el, next, label){ // محاكاة واجهة برنامج: تنفّذ الطالبة كل مهمة بالضغط على العناصر الصحيحة بالترتيب
    let ti=0, si=0, missed=false;
    const drawStep = () => {
      const T=g.tasks[ti], st=T.steps[si], ui=st.ui||'side';
      const opts = st.o.map((o,i)=>`<button class="simBtn" data-i="${i}">${o}</button>`).join('');
      const site = `<div class="simSite"><h4>${esc(g.site||'')}</h4><p>${esc(g.tagline||'')}</p></div>`;
      let screen;
      if(ui==='phone') screen = `<div class="simPhone"><div class="simBar">${esc(st.t||g.user||'')}</div><div class="simList">${opts}</div></div>`;
      else {
        const side = ui==='side' ? `<div class="simSide"><b class="simBrand">${esc(g.app||'')}</b>${st.t?`<span class="simT">${st.t}</span>`:''}<div class="simList">${opts}</div></div>`
          : `<div class="simSide"><b class="simBrand">${esc(g.app||'')}</b><div class="simList">${(g.deco||[]).map(d=>`<span class="simBtn off">${d}</span>`).join('')}</div></div>`;
        const canvas = ui==='canvas' ? `<div class="simCanvas">${site}<div class="simChips">${opts}</div></div>`
          : ui==='dialog' ? `<div class="simCanvas dim">${site}<div class="simDlg">${st.t?`<h5>${st.t}</h5>`:''}<div class="simList">${opts}</div></div></div>`
          : `<div class="simCanvas">${site}</div>`;
        screen = `<div class="simWin">${side}${canvas}</div>`;
      }
      el.innerHTML = `${gHead(g,label,'محاكاة')}
        <div class="simTask"><span class="kicker">🎯 المهمة ${ti+1} من ${g.tasks.length}</span><h4>${T.goal}</h4>
        <div class="simSteps">${T.steps.map((s,k)=>`<span class="${k<si?'ok':k===si?'cur':''}">${k<si?'✔ '+s.o[s.c]:k===si?'الخطوة '+(k+1):'•'}</span>`).join('')}</div></div>
        ${screen}${MSG_BOX}`;
      el.querySelectorAll('.simBtn[data-i]').forEach(b=>b.onclick=()=>{
        const i=+b.dataset.i;
        if(i===st.c){
          tone('ok');
          if(++si<T.steps.length) return drawStep();
          addPts(missed?4:10); confetti(30);
          const last = ti===g.tasks.length-1;
          el.querySelectorAll('.simBtn').forEach(x=>x.disabled=true); b.classList.add('ok');
          if(last) return endGame(el,next,'نفّذتِ كل المهام بنجاح! 🎉');
          msg(missed?'أنجزتِ المهمة 👏 ركّزي في المهمة التالية لتحصلي على العلامة الكاملة.':'مهمة مثالية من المحاولة الأولى! 🌟','ok');
          el.querySelector('#gEnd').innerHTML = `<div class="gameBar"><span></span><button class="btn" id="nt">المهمة التالية ←</button></div>`;
          $('#nt').onclick=()=>{ tone('tap'); ti++; si=0; missed=false; drawStep(); };
        } else {
          if(!missed) logMiss(`${T.goal} (الخطوة ${si+1})`, st.o[i], st.o[st.c], st.h);
          missed=true; tone('no'); b.classList.add('no','shake'); setTimeout(()=>b.classList.remove('no','shake'),600);
          msg('ليس هذا الزر… '+(st.h?'💡 '+st.h:'جرّبي مرة أخرى.'),'no');
        }
      });
    };
    drawStep();
  },
  discuss(g, el, next, label){
    el.innerHTML = `${gHead(g,label,'نقاش')}
      <div class="discuss"><h4>${g.q}</h4><p class="muted" style="font-size:14px">ناقشي الفكرة مع زميلاتكِ، ثم اكتبي خلاصة رأيكِ (اختياري).</p>
      <textarea id="ta" placeholder="اكتبي أفكاركِ هنا…">${esc(S.notes[g.id]||'')}</textarea></div>
      <div class="gameBar"><span class="muted">💾 يُحفظ ما تكتبينه تلقائيًا على جهازكِ</span><button class="btn" id="nx">متابعة ←</button></div>`;
    $('#ta').oninput=e=>{ S.notes[g.id]=e.target.value; save(); };
    $('#nx').onclick=()=>{ tone('tap'); next(); };
  }
};

/* =========================================================
   التقويم الختامي
   ========================================================= */
function openFinal(){
  tone('tap'); runId='final'; runPts=0; runLog=[];
  const F=L.final; let tfC=0, mcC=0;
  const head = step => `<div class="pavHead"><div><span class="kicker">${esc(F.sub)}</span><h2><span class="ic">${F.icon}</span>${esc(F.title)}</h2></div>
    <div class="row"><div class="steps">${['تدريب 1','تدريب 2','تدريب 3'].map((s,i)=>`<span class="${i===step?'on':''}">${s}</span>`).join('')}</div>
    <button class="btn ghost sm" id="mapBtn">🗺️ الخريطة</button></div></div>`;
  const tf = {title:'تدريب 1: صحيحة أم خاطئة؟', howto:'تحقّقي من كل عبارة؛ وعند الخطأ اقرئي التصحيح.', tag:'صح / خطأ', qs:F.tf.map(x=>({q:x.q, o:['صحيحة ✔','خاطئة ✖'], c:x.a?0:1, why:x.why}))};
  const mc = {title:'تدريب 2: اختاري الإجابة الصحيحة', tag:'اختيار', qs:F.mcq};
  render(`<section class="panel">${head(0)}<div class="game" id="game"></div></section>`, F.color, 'game-mcq'); bindMap();
  ENGINES.mcq(tf, $('#game'), c=>{
    tfC=c;
    render(`<section class="panel">${head(1)}<div class="game" id="game"></div></section>`, F.color, 'game-mcq'); bindMap();
    ENGINES.mcq(mc, $('#game'), c2=>{
      mcC=c2;
      render(`<section class="panel">${head(2)}
        <div class="discuss"><h4>✍️ ${esc(F.reflect)}</h4>
        <p class="muted" style="font-size:14px">اكتبي رأيكِ في ${F.reflectMin} حرفًا على الأقل. سيظهر جزء من إجابتكِ في شهادتكِ، وتصل إلى معلمتكِ.</p>
        <textarea id="ta" placeholder="${esc(F.reflectPh)}">${esc(S.reflect)}</textarea><div class="count" id="cnt"></div></div>
        <div class="gameBar"><span></span><button class="btn gold" id="fin" disabled>اعرضي نتيجتي 📊</button></div></section>`, F.color, 'reflect'); bindMap();
      const ta=$('#ta'), upd=()=>{ const n=ta.value.trim().length; S.reflect=ta.value; save(); $('#cnt').textContent=`${n} حرف`+(n<F.reflectMin?` — بقي ${F.reflectMin-n}`:' ✔'); $('#fin').disabled=n<F.reflectMin; };
      ta.oninput=upd; upd();
      $('#fin').onclick=()=>{ S.done.final=true; runId=null; record('final', runPts, ACTS.at(-1).max, runLog.length); tone('win'); confetti(160); finalResult(tfC, mcC); };
    });
  });
}
function finalResult(tfC, mcC){
  const F=L.final, max=ACTS.at(-1).max, pc=pct((tfC+mcC)*10,max);
  render(`<section class="panel center">
    <div class="badgeBig">${F.icon}</div>
    <h2 style="font-size:clamp(22px,4vw,32px)">نتيجتكِ في التقويم الختامي</h2>
    <div class="stars">${starsOf(pc)}</div>
    <div class="scoreRow"><div>تدريب 1: <b>${tfC}</b> / ${F.tf.length}</div><div>تدريب 2: <b>${mcC}</b> / ${F.mcq.length}</div><div>تدريب 3: <b>✔</b></div><div>النسبة: <b>${fp(pc)}</b></div></div>
    ${attemptNote('final',max)}<p class="syncNote" id="syncNote"></p>
    <p class="lead">${runLog.length?`راجعي أخطاءكِ جيدًا يا ${esc(PR.name)}، ثم أعيدي التقويم لتحسين نتيجتكِ وشهادتكِ 💪`:'نتيجة كاملة! 🌟'}</p>
    ${reviewHTML(runLog)}
    <div class="spacer"></div>
    <div class="row c"><button class="btn gold" id="certBtn">استلمي شهادتكِ 📜</button><button class="btn ${runLog.length?'':'ghost'}" id="retryBtn">أعيدي التقويم ↺</button>
      <button class="btn ghost" id="histBtn">📈 سجلّي</button><button class="btn ghost" id="mapBtn">🗺️ الخريطة</button></div>
  </section>`, F.color, 'result');
  bindMap(); syncNote(); $('#certBtn').onclick=showCert; $('#retryBtn').onclick=openFinal; $('#histBtn').onclick=history;
}

/* =========================================================
   سجلّي: تاريخ المحاولات والتقدّم
   ========================================================= */
function barsSVG(h, max, color){
  const list = h.slice(-12), n = list.length, W=320, H=130, top=18, base=H-22, padR=34, padL=6;
  const slot = (W-padR-padL)/Math.max(n,4), bw = Math.min(28, slot-6);
  const best = Math.max(...list.map(x=>x.s)), bestIdx = list.map(x=>x.s).lastIndexOf(best);
  const y = v => base - (base-top)*v/100;
  const path = (x,yt,w) => { const r=Math.min(4,w/2,base-yt); return `M${x},${base} V${yt+r} Q${x},${yt} ${x+r},${yt} H${x+w-r} Q${x+w},${yt} ${x+w},${yt+r} V${base} Z`; };
  const off = h.length - n;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نتائج المحاولات">`;
  [50,100].forEach(g=>{ s+=`<line x1="${padL}" x2="${W-padR}" y1="${y(g)}" y2="${y(g)}" stroke="rgba(255,255,255,.08)"/><text x="${W-2}" y="${y(g)+4}" font-size="10" fill="#a8b3d4" text-anchor="end">${fp(g)}</text>`; });
  s += `<line x1="${padL}" x2="${W-padR}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.25)"/>`;
  list.forEach((a,i)=>{
    const v = pct(a.s,max), xr = W-padR-slot*(i+.5), x = xr-bw/2, yt = Math.min(y(v), base-2);
    const label = (i===bestIdx || i===n-1) ? `<text x="${xr}" y="${yt-5}" font-size="11" font-weight="800" fill="#eef2ff" text-anchor="middle">${fp(v)}</text>` : '';
    const tip = `<b>المحاولة ${off+i+1}</b><br>${fmtDate(a.t)}<br>النتيجة: ${a.s} / ${max} (${fp(v)})<br>الأخطاء: ${a.e}`;
    s += `<g class="bar" tabindex="0" data-tip="${esc(tip)}"><rect x="${xr-slot/2}" y="${top-14}" width="${slot}" height="${base-top+30}" fill="transparent"/>
      <path class="m" d="${path(x,yt,bw)}" fill="${color}"/>${label}<text x="${xr}" y="${base+15}" font-size="10" fill="#a8b3d4" text-anchor="middle">${off+i+1}</text></g>`;
  });
  return s + '</svg>';
}
function history(){
  runId=null; tone('tap');
  const all = S.hist, tried = ACTS.filter(a=>attemptsOf(a.id).length);
  const gains = tried.map(a=>{ const h=attemptsOf(a.id); return pct(Math.max(...h.map(x=>x.s)),a.max)-pct(h[0].s,a.max); });
  const acts = ACTS.map(a=>{
    const h=attemptsOf(a.id);
    if(!h.length) return `<div class="hAct" style="--c:${a.color}"><div class="hh"><h4>${a.icon} ${esc(a.title)}</h4></div><div class="empty">لم تحاولي هذا النشاط بعد</div></div>`;
    const b=Math.max(...h.map(x=>x.s)), first=h[0].s, last=h[h.length-1].s, gain=pct(b,a.max)-pct(first,a.max);
    return `<div class="hAct" style="--c:${a.color}">
      <div class="hh"><h4>${a.icon} ${esc(a.title)}</h4><span class="status done">أفضل: ${fp(pct(b,a.max))}</span></div>
      <div class="kp"><span>🔁 ${h.length} ${h.length===1?'محاولة':'محاولات'}</span><span>🕒 الأخيرة: ${fp(pct(last,a.max))}</span><span>1️⃣ الأولى: ${fp(pct(first,a.max))}</span>${gain>0?`<span class="up">📈 ${fp(gain,1)}</span>`:''}</div>
      <div class="bars">${barsSVG(h,a.max,a.color)}</div>
      <details class="tbl"><summary>عرض جدول المحاولات</summary><table><thead><tr><th>#</th><th>التاريخ</th><th>النتيجة</th><th>الأخطاء</th></tr></thead>
        <tbody>${h.map((x,i)=>`<tr><td>${i+1}</td><td>${fmtDate(x.t)}</td><td>${x.s}/${a.max} (${fp(pct(x.s,a.max))})</td><td>${x.e}</td></tr>`).join('')}</tbody></table></details>
    </div>`;
  }).join('');
  render(`<section class="panel">
    <div class="hubHead"><div><span class="kicker">📈 سجلّي</span><h2 style="font-size:clamp(20px,4vw,30px);margin-top:6px">تقدّمكِ في ${esc(L.title)}، يا ${esc(PR.name)}</h2>
      <p class="muted">كل محاولة تُحفظ هنا؛ وتُحتسب أفضل نتيجة لكل نشاط في النقاط والشهادة.</p></div>
      <button class="btn ghost sm" id="mapBtn">🗺️ الخريطة</button></div>
    <div class="hTiles">
      <div class="hTile"><small>إجمالي المحاولات</small><b>${all.length}</b></div>
      <div class="hTile"><small>الأنشطة المنجزة</small><b>${tried.length}</b><em> / ${ACTS.length}</em></div>
      <div class="hTile"><small>مجموع أفضل النتائج</small><b>${fp(pct(total(),MAX))}</b><em> ${total()} / ${MAX}</em></div>
      <div class="hTile"><small>أكبر تحسّن</small><b>${gains.length&&Math.max(...gains)>0?fp(Math.max(...gains),1):'—'}</b></div>
    </div>
    <div class="hActs">${acts}</div>
    <div class="spacer"></div>
    <div class="row c"><button class="btn ghost sm" id="resetBtn">🗑️ مسح سجلّي في هذا الدرس</button></div>
  </section>`, L.color, 'history');
  bindMap();
  $('#resetBtn').onclick = () => { if(!confirm('هل تريدين مسح كل محاولاتكِ وتقدّمكِ في هذا الدرس؟')) return; S=freshLesson(); save(); welcome(); };
  $$('.bar').forEach(g=>{
    g.addEventListener('pointerenter', e=>showTip(g.dataset.tip, e)); g.addEventListener('pointermove', e=>showTip(g.dataset.tip, e));
    g.addEventListener('pointerleave', hideTip); g.addEventListener('focus', ()=>{ const r=g.getBoundingClientRect(); showTip(g.dataset.tip,{clientX:r.left+r.width/2,clientY:r.top}); });
    g.addEventListener('blur', hideTip);
    g.addEventListener('click', e=>{ e.stopPropagation(); const r=g.getBoundingClientRect(); showTip(g.dataset.tip,{clientX:r.left+r.width/2,clientY:r.top+20}); });
  });
}
function showTip(html, e){ const t=$('#tip'); t.innerHTML=html; t.classList.add('on');
  const w=t.offsetWidth, h=t.offsetHeight; t.style.left=Math.min(innerWidth-w-8,Math.max(8,e.clientX-w/2))+'px'; t.style.top=Math.max(8,e.clientY-h-14)+'px'; }
document.addEventListener('click', ()=>hideTip());
function hideTip(){ const t=$('#tip'); if(t) t.classList.remove('on'); }

/* =========================================================
   الشهادة ثلاثية الأبعاد
   ========================================================= */
function certEvent(act, actTitle){ queueSend({ts:Date.now(), name:PR.name, cls:PR.cls, device:PR.device, lesson:L.id, lessonTitle:L.title, act, actTitle}); }
function showCert(){
  if(!S.done.final) return goHub();
  runId=null;
  render(`<section>
    ${TechCert.html({P, L, name:PR.name, total:total(), max:MAX, attempts:S.hist.length, reflect:S.reflect, date:Date.now()})}
    <p class="center muted noPrint" style="font-size:13px;margin-top:10px">✨ حرّكي المؤشر أو إصبعكِ فوق الشهادة لرؤيتها بشكل ثلاثي الأبعاد</p>
    <div class="row c noPrint" style="margin-top:14px"><button class="btn gold" id="printBtn">🖨️ طباعة / حفظ PDF</button><button class="btn ghost" id="mapBtn">🗺️ العودة إلى المعرض</button></div>
  </section>`, '#facc15', 'cert');
  bindMap(); $('#printBtn').onclick=()=>{ certEvent('cert-print', 'طباعة الشهادة'); window.print(); };
  TechCert.tilt();
  certEvent('cert-view', 'فتح الشهادة');
  confetti(220);
}

/* =========================================================
   المرشد الآلي: جولة تعريفية لكل شاشة — تبدأ بالضغط فقط، ويمكن إيقافها مؤقتًا
   ========================================================= */
const TOURS = {
  library:[['.hero h1','أهلًا بكِ في منصة مبدعة التقنية! هنا تجدين الدروس التفاعلية.'],['#nm','اكتبي اسمكِ مرة واحدة؛ يُحفظ لكل الدروس وللشهادات.'],['.lcard','هذه بطاقة درس: اضغطي عليها لتدخلي معرضه. يظهر عليها تقدّمكِ وأفضل نتيجة.'],['#sndBtn','من هنا تشغّلين الأصوات أو توقفينها.'],['#guideBtn','وأنا هنا دائمًا: اضغطي عليّ في أي شاشة لأشرح لكِ طريقة استخدامها.']],
  welcome:[['.hero h1','هذا معرض الدرس. ستمرّين بالتمهيد، ثم الأجنحة، ثم التقويم والشهادة.'],['#nm','اكتبي اسمكِ كما تريدين ظهوره في الشهادة.'],['#startBtn','ثم اضغطي هنا لبدء الجولة.'],['.hdrStats','هنا تظهر نقاطكِ وعدد الأوسمة طوال الجولة.'],['#homeLink','اضغطي على الشعار للعودة إلى قائمة الدروس.']],
  warmup:[['.flip','اضغطي على البطاقة لقلبها ومقارنة «قديمًا» بـ«اليوم».'],['#flips','اقلبي كل البطاقات؛ بعدها يظهر سؤال تفكير في الأسفل.'],['#wqBox','اختاري الإجابة التي تجمع كل التغيّرات ليظهر لكِ التعريف.']],
  hub:[['.progress','شريط تقدّمكِ في الدرس.'],['.pav[data-k="p"]','كل جناح فيه خطوتان: تعلّمي المعلومات، ثم العبي لعبة عليها.'],['.pav[data-k="p"] .status','هنا حالة الجناح وأفضل نسبة حقّقتِها.'],['#finalCard','بعد إكمال كل الأجنحة يُفتح التقويم الختامي.'],['#certCard','وبعد التقويم تحصلين على شهادتكِ.'],['#histBtn','ومن «سجلّي» تتابعين كل محاولاتكِ وتطوّر نتائجكِ.']],
  learn:[['.lead','ابدئي بقراءة المقدمة.'],['.info,.timeline,.list','ثم اقرئي البطاقات بتمعّن؛ فاللعبة تعتمد عليها.'],['#playBtn','عندما تكونين جاهزة، اضغطي هنا لبدء اللعبة.'],['#mapBtn','ويمكنكِ العودة إلى الخريطة في أي وقت.']],
  'game-match':[['.howto','اقرئي طريقة اللعب أولًا.'],['[data-side="L"]','اضغطي على موقف من هذا العمود…'],['[data-side="R"]','ثم اضغطي على الإجابة المناسبة له؛ الصحيحة تتلوّن بالأخضر.'],['#gMsg','هنا تظهر الملاحظات بعد كل محاولة.']],
  'game-sort':[['.chips .tile','اختاري بطاقة أولًا…'],['.bin','ثم اضغطي على المجموعة التي تنتمي إليها.'],['#gMsg','هنا تظهر الملاحظات بعد كل محاولة.']],
  'game-order':[['.oitem','هذه العناصر مبعثرة.'],['.oitem .mv','استخدمي الأسهم لتحريك كل عنصر للأعلى أو للأسفل.'],['#chk','ثم اضغطي «تحقّقي».']],
  'game-pick':[['.chips .tile','اضغطي على كل بطاقة صحيحة لتحديدها، واضغطي مرة أخرى لإلغاء التحديد.'],['#chk','ثم اضغطي «تحقّقي» لرؤية النتيجة.']],
  'game-mcq':[['.dots','مؤشر الأسئلة: الأخضر صحيح والأحمر خطأ.'],['.opts','اختاري إجابة واحدة.'],['.qcard','بعد الإجابة يظهر التوضيح وزر السؤال التالي.']],
  'game-discuss':[['.discuss','ناقشي السؤال مع زميلاتكِ واكتبي خلاصة رأيكِ (اختياري).'],['#nx','ثم اضغطي «متابعة».']],
  'game-sim':[['.simTask','اقرئي المهمة المطلوبة؛ هنا تظهر الخطوات التي أنجزتِها.'],['.simWin,.simPhone','هذه محاكاة لشاشة البرنامج: اضغطي على الزر الصحيح كما تفعلين في البرنامج الحقيقي.'],['#gMsg','عند الخطأ يظهر هنا تلميح يساعدكِ.']],
  reflect:[['#ta','اكتبي رأيكِ هنا؛ يظهر عدّاد الحروف بالأسفل.'],['#fin','ثم اعرضي نتيجتكِ.']],
  result:[['.scoreRow','نتيجة هذه المحاولة.'],['.attemptNote','رقم المحاولة ومقارنتها بأفضل نتيجة سابقة.'],['.review,.feedback','دليل المراجعة: إجابتكِ، والصحيح، والسبب.'],['#retryBtn','حاولي مرة أخرى لتحسين نتيجتكِ؛ تُحفظ أفضل نتيجة.'],['#histBtn','وتجدين كل محاولاتكِ في «سجلّي».']],
  history:[['.hTiles','ملخّص تقدّمكِ في الدرس.'],['.hAct','لكل نشاط: عدد المحاولات، وأفضل نتيجة، ومقدار التحسّن.'],['.bars','كل عمود محاولة؛ مرّري المؤشر أو اضغطي عليه لرؤية التفاصيل.'],['details.tbl','أو افتحي الجدول لرؤية كل المحاولات بالتاريخ.']],
  cert:[['#cert','شهادتكِ! حرّكي المؤشر أو إصبعكِ فوقها لرؤيتها ثلاثية الأبعاد.'],['#printBtn','اطبعيها أو احفظيها PDF.']]
};
let T = null;
function startTour(){
  if(T) return;
  const steps = (TOURS[curTag]||[]).filter(s=>{ const e=document.querySelector(s[0]); return e && e.getClientRects().length; });
  if(!steps.length){ toast('لا توجد جولة لهذه الشاشة'); return; }
  const hole=document.createElement('div'); hole.className='tourHole';
  const box=document.createElement('div'); box.className='tourBox'; box.setAttribute('role','dialog'); box.setAttribute('aria-live','polite');
  box.innerHTML = `<div class="tb">${ROBOT}<div><span class="tn" id="tN"></span><div class="tt" id="tT"></div></div></div><div class="tp"><i id="tP"></i></div>
    <div class="tc"><button id="tPrev" aria-label="السابق">⏮ السابق</button><button class="pp" id="tPause" aria-label="إيقاف مؤقت">⏸ إيقاف</button><button id="tNext" aria-label="التالي">التالي ⏭</button><button id="tStop" aria-label="إنهاء">✖</button></div>`;
  document.body.append(hole, box);
  T = {steps, i:0, paused:false, hole, box, dur:0, rem:0, t0:0, timer:null, raf:null};
  $('#guideBtn').classList.add('busy');
  $('#tPrev').onclick=()=>go(T.i-1); $('#tNext').onclick=()=>go(T.i+1); $('#tStop').onclick=stopTour; $('#tPause').onclick=togglePause;
  addEventListener('resize', place); addEventListener('scroll', place, {passive:true}); addEventListener('keydown', tourKey);
  go(0);
}
function tourKey(e){ if(e.key==='Escape') stopTour(); }
function go(i){
  if(!T) return;
  if(i>=T.steps.length) return stopTour();
  T.i=Math.max(0,i); clearTimeout(T.timer);
  const [sel,text]=T.steps[T.i], el=document.querySelector(sel);
  $('#tN').textContent=`المرشد • ${T.i+1} / ${T.steps.length}`; $('#tT').textContent=text;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(place,380); place();
  T.dur = T.rem = 2600 + text.length*55;
  if(!T.paused) run();
  else $('#tP').style.width='0%';
}
function run(){ T.t0=performance.now(); clearTimeout(T.timer); T.timer=setTimeout(()=>go(T.i+1), T.rem); anim(); }
function anim(){ cancelAnimationFrame(T.raf); const f=()=>{ if(!T||T.paused) return; const el=T.dur-T.rem+(performance.now()-T.t0); $('#tP').style.width=Math.min(100,el/T.dur*100)+'%'; T.raf=requestAnimationFrame(f); }; f(); }
function togglePause(){
  T.paused=!T.paused; const b=$('#tPause');
  if(T.paused){ clearTimeout(T.timer); T.rem -= performance.now()-T.t0; b.textContent='▶ متابعة'; b.setAttribute('aria-label','متابعة'); }
  else { b.textContent='⏸ إيقاف'; b.setAttribute('aria-label','إيقاف مؤقت'); run(); }
}
function place(){
  if(!T) return;
  const el=document.querySelector(T.steps[T.i][0]); if(!el) return;
  const r=el.getBoundingClientRect(), pad=6, h=T.hole.style;
  h.top=(r.top-pad)+'px'; h.left=(r.left-pad)+'px'; h.width=(r.width+pad*2)+'px'; h.height=(r.height+pad*2)+'px';
  const bw=T.box.offsetWidth, bh=T.box.offsetHeight;
  let top = r.bottom+14+bh < innerHeight ? r.bottom+14 : r.top-14-bh;
  if(top<8 || top+bh>innerHeight-8) top = innerHeight-bh-12;
  T.box.style.top=top+'px'; T.box.style.left=Math.min(innerWidth-bw-12,Math.max(12,r.left+r.width/2-bw/2))+'px';
}
function stopTour(){
  if(!T) return;
  clearTimeout(T.timer); cancelAnimationFrame(T.raf); T.hole.remove(); T.box.remove(); T=null;
  removeEventListener('resize', place); removeEventListener('scroll', place); removeEventListener('keydown', tourKey);
  const g=$('#guideBtn'); if(g) g.classList.remove('busy');
}

/* ---------- البداية ---------- */
shell();
flush();
if(!L) library();
else (PR.name && S.warm) ? goHub() : welcome();
window.TechExpo = {state:()=>S, profile:()=>PR, goHub, openPav, openFinal, showCert, history, startTour, stopTour, total, MAX, LESSON:L};
})();
