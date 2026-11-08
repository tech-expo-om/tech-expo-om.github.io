/* =========================================================
   مبدعة التقنية — لوحة المعلمة لمتابعة تقدّم الطالبات
   تقرأ المحاولات عبر جلسة معلمة؛ تبقى قرارات المراجعة محفوظة مع كل محاولة.
   ========================================================= */
(function(){
'use strict';
const P = window.PLATFORM;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fp = v => '⁦' + v + '%⁩';
const fmt = t => new Date(t).toLocaleString('ar-OM',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const API=window.TechAPI;
let teacherSession='',archiveKey='';
sessionStorage.removeItem('tech-expo:teacher-pin');
// Google Sheets يحوّل الصف «12/8» إلى تاريخ في الصفوف القديمة؛ نعيده إلى شكله الأصلي
const fixCls = c => /^\d{4}-\d\d-\d\dT/.test(String(c)) ? (d => `${d.getMonth()+1}/${d.getDate()}`)(new Date(c)) : c;
let ROWS = [], F = {lesson:'', cls:'', q:''}, SORT = {k:'overall', dir:-1}, OPEN = null;

$('#hdr').innerHTML = `<div class="bar"><a class="brand" href="../"><span class="mark"><img src="../assets/logo-icon.svg" alt="شعار مبدعة التقنية"></span>
  <span style="min-width:0"><b>بوابة المعلمة</b><small>${esc(P.name)} • ${esc(P.school)}</small></span></a>
  <button class="btn ghost sm" id="setupBtn">⚙️ الإعداد</button></div>`;
$('#ftr').innerHTML = `${esc(P.school)} • إعداد: <b>${esc(P.teacher)}</b>`;
$('#setupBtn').onclick = setup;

function render(html){ $('#app').innerHTML = `<div class="screen">${html}</div>`; }

/* ---------- الإعداد (مرة واحدة) ---------- */
function setup(){
  render(`<section class="panel">
    <span class="kicker">⚙️ إعداد مرة واحدة (10 دقائق تقريبًا)</span>
    <h2 style="font-size:clamp(22px,4vw,30px);margin:8px 0">ربط المنصة بجدول Google Sheets</h2>
    <p class="muted">تصل نتيجة كل نشاط تنهيه الطالبة إلى جدول في حسابكِ على Google، وتعرض هذه الصفحة ملخّص الصف منه. البيانات تبقى في حسابكِ فقط.</p>
    <ol class="steps2">
      <li>افتحي <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> لإنشاء جدول جديد، وسمّيه مثلًا «نتائج مبدعة التقنية».</li>
      <li>من القائمة: <b>Extensions ← Apps Script</b> (الإضافات ← برمجة التطبيقات).</li>
      <li>احذفي الكود الموجود، والصقي الكود بالأسفل (زر «نسخ الكود»).</li>
      <li>احفظي ثم شغّلي <code>initializeSecurity</code> مرة واحدة من المحرّر. افتحي <b>Project Settings ← Script Properties</b> وانسخي <code>TEACHER_SECRET</code> الخاص بكِ إلى مكان آمن. لا تضعيه في ملفات المنصة.</li>
      <li>اضغطي <b>Deploy ← New deployment</b>، واختاري النوع <b>Web app</b>، ثم:<br><b>Execute as: Me</b> — <b>Who has access: Anyone</b> ← <b>Deploy</b>.</li>
      <li>وافقي على الأذونات (Authorize access ← اختاري حسابكِ ← Advanced ← Go to project ← Allow).</li>
      <li>انسخي <b>Web app URL</b> (ينتهي بـ <code>/exec</code>) وأرسليه لإضافته إلى المنصة. بعدها تبدأ النتائج بالوصول.</li>
    </ol>
    <div class="row" style="margin:14px 0"><button class="btn" id="copyCode">📋 نسخ الكود</button><span class="muted" id="copyMsg"></span></div>
    <pre class="code" id="code" dir="ltr">جارٍ تحميل الكود…</pre>
    <div class="note"><b>🔒 الخصوصية:</b> لكل طالبة رمز دخول خاص تصدرينه بعد دخول اللوحة. تُحفظ جميع المحاولات وقرارات المراجعة دون حذف المعتمد منها. عند تحديث الكود اختاري <b>Deploy ← Manage deployments ← Edit ← New version</b>. اختبري الدخول وتسليم محاولة وتأكيد الحفظ قبل نشر الموقع.</div>
    ${P.sheetUrl?'<div class="spacer"></div><div class="row c"><button class="btn gold" id="toDash">العودة إلى اللوحة ←</button></div>':''}
  </section>`);
  fetch('apps-script.gs').then(r=>r.text()).then(t=>{ $('#code').textContent=t; });
  $('#copyCode').onclick = () => navigator.clipboard.writeText($('#code').textContent).then(()=>{ $('#copyMsg').textContent='✅ تم النسخ'; });
  if($('#toDash')) $('#toDash').onclick = ()=>teacherSession?load():login();
}

/* ---------- الدخول بالرمز السري ---------- */
function login(){
  if(!P.sheetUrl) return setup();
  render(`<section class="panel center" style="max-width:520px;margin:0 auto">
    <div class="badgeBig">👩‍🏫</div><h2 style="font-size:26px">بوابة المعلمة</h2>
    <p class="muted">أدخلي مفتاح المعلمة من Script Properties. لا يُحفظ المفتاح في المتصفح.</p>
    <div class="field"><input id="pin" type="password" placeholder="الرمز السري" autocomplete="current-password"></div>
    <button class="btn" id="go">دخول 🔓</button><p class="gmsg no" id="err"></p></section>`);
  const go = () => load($('#pin').value.trim());
  $('#go').onclick = go; $('#pin').addEventListener('keydown', e => { if(e.key==='Enter') go(); }); $('#pin').focus();
}
async function load(secret){
  if($('#err')) $('#err').textContent = '';
  render(`<section class="panel center"><p class="lead">⏳ جارٍ تحميل النتائج…</p></section>`);
  try {
    if(secret){ const auth=await API.request('teacherLogin',{secret});teacherSession=auth.token;archiveKey=auth.archiveKey;secret=''; }
    const d=await API.request('teacherList',{token:teacherSession});
    ROWS=d.rows.map(r=>{
      const safe={...r,cls:fixCls(r.cls),reviews:Array.isArray(r.reviews)?r.reviews:[]};
      for(const k of ['t','attempt','score','max','pct','mistakes','acts']) safe[k]=Number.isFinite(Number(r[k]))?Number(r[k]):0;
      safe.acts=Math.max(0,Math.min(100,safe.acts));
      safe.misses=Array.isArray(r.misses)?r.misses:[];
      return safe;
    }); dashboard();
  } catch(error){
    if(error.code==='auth'||!teacherSession){teacherSession='';login();$('#err').textContent=error.message;return;}
    render(`<section class="panel center"><p id="loadError" class="lead"></p><button class="btn" id="re">إعادة المحاولة</button><button class="btn ghost" id="exit">خروج</button></section>`);
    $('#loadError').textContent=error.message;$('#re').onclick=()=>load();$('#exit').onclick=logout;
  }
}
function logout(){const token=teacherSession;teacherSession='';archiveKey='';ROWS=[];OPEN=null;login();if(token) API.request('logout',{token}).catch(()=>{});}

/* ---------- تجميع البيانات ---------- */
const actOrder = a => a==='final' ? 999 : (parseInt(String(a).replace(/\D/g,''))||500);
const isCert = r => String(r.act).startsWith('cert-'); // فتح الشهادة أو طباعتها — ليست نشاطًا
function model(){
  const all = ROWS.filter(r => r.lesson===F.lesson && (!F.cls || r.cls===F.cls));
  const rows = all.filter(r => !isCert(r)), certs = all.filter(isCert);
  const acts = [...new Map(rows.map(r=>[r.act,{id:r.act,title:r.actTitle}])).values()].sort((a,b)=>actOrder(a.id)-actOrder(b.id));
  const nActs = Math.max(acts.length, ...rows.map(r=>r.acts||0), 1);
  const studs = new Map();
  const stud = r => { const k = r.studentId||('legacy:'+String(r.name).trim()+'|'+String(r.cls).trim());
    if(!studs.has(k)) studs.set(k, {id:k,name:String(r.name).trim(), cls:String(r.cls).trim(), best:{}, tries:{}, hist:[], certs:[], last:0});
    return studs.get(k); };
  rows.forEach(r => {
    const s = stud(r); s.hist.push(r); s.last = Math.max(s.last, r.t);
    s.best[r.act] = Math.max(s.best[r.act]??-1, Number(r.pct)); s.tries[r.act] = (s.tries[r.act]||0)+1;
  });
  certs.forEach(r => { const s = stud(r); s.certs.push(r); s.last = Math.max(s.last, r.t); });
  const actMax = {}; rows.forEach(r => { actMax[r.act] = Number(r.max); });
  const list = [...studs.values()].map(s => {
    const done = Object.keys(s.best).length;
    s.done = done; s.attempts = s.hist.length;
    // أحداث شهادة المشاركة يبلّغ عنها حساب الطالبة؛ لا تُعدّ قرار اعتماد من المعلمة.
    s.cert = !('final' in s.best) && !s.certs.length ? 0 : s.certs.some(r=>r.act==='cert-print') ? 3 : s.certs.length ? 2 : 1; // للترتيب
    s.overall = done ? Math.round(Object.values(s.best).reduce((t,v)=>t+v,0) / done) : 0; // متوسط أفضل نتائج الأنشطة التي حاولتها
    return s;
  }).filter(s => !F.q || s.name.includes(F.q));
  const miss = new Map();
  rows.forEach(r => (r.misses||[]).forEach(q => { if(q) miss.set(q, (miss.get(q)||0)+1); }));
  const topMiss = [...miss.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  return {rows, acts, nActs, list, topMiss, actMax};
}

/* ---------- اللوحة ---------- */
function dashboard(){
  const lessons = [...new Map(ROWS.map(r=>[r.lesson, r.lessonTitle])).entries()];
  P.lessons.forEach(l => { if(!lessons.find(x=>x[0]===l.id)) lessons.push([l.id, l.title]); });
  if(!F.lesson) F.lesson = (lessons[0]||[''])[0];
  const classes = [...new Set(ROWS.filter(r=>r.lesson===F.lesson).map(r=>String(r.cls).trim()))].sort();
  const M = model();
  const k = SORT.k, dir = SORT.dir;
  M.list.sort((a,b) => { const va = k.startsWith('act:') ? (a.best[k.slice(4)]??-1) : a[k], vb = k.startsWith('act:') ? (b.best[k.slice(4)]??-1) : b[k];
    return (typeof va==='string' ? va.localeCompare(vb,'ar') : va-vb) * dir; });
  const done = M.list.filter(s=>s.done>=M.nActs).length, weak = M.list.filter(s=>s.overall<60).length;
  const avg = M.list.length ? Math.round(M.list.reduce((t,s)=>t+s.overall,0)/M.list.length) : 0;
  const cell = v => v==null ? '<td class="hc empty">—</td>' : `<td class="hc" style="--v:${v}">${fp(v)}</td>`;
  const th = (key, label) => `<th><button class="sortBtn" data-k="${esc(key)}">${label}${SORT.k===key?(SORT.dir>0?' ▲':' ▼'):''}</button></th>`;
  const maxMiss = M.topMiss.length ? M.topMiss[0][1] : 1;
  $('#app').innerHTML = `<div class="screen"><section class="panel">
    <div class="hubHead"><div><span class="kicker">👩‍🏫 لوحة المتابعة</span><h2 style="font-size:clamp(20px,4vw,30px);margin-top:6px">تقدّم الطالبات</h2>
      <p class="muted">آخر تحديث: ${fmt(Date.now())} — تُحتسب أفضل نتيجة لكل نشاط.</p></div>
      <div class="row"><button class="btn ghost sm" id="enroll">إضافة / تجديد رمز طالبة</button><button class="btn ghost sm" id="legacyArchive">أرشفة / عرض سجل المتصفح القديم</button><button class="btn ghost sm" id="refresh">🔄 تحديث</button><button class="btn ghost sm" id="csv">⬇️ تصدير CSV</button><button class="btn ghost sm" id="logout">🔒 خروج</button></div></div>
    <p class="muted">النتائج تدريبية يرسلها حساب الطالبة. اعتماد المعلمة قرار منفصل، وتبقى جميع المحاولات وقراراتها متاحة للمراجعة.</p>
    <div class="filters">
      <label>الدرس <select id="fLesson">${lessons.map(l=>`<option value="${esc(l[0])}" ${l[0]===F.lesson?'selected':''}>${esc(l[1])}</option>`).join('')}</select></label>
      <label>الصف <select id="fCls"><option value="">كل الشعب</option>${classes.map(c=>`<option ${c===F.cls?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
      <label>بحث <input id="fQ" placeholder="اسم الطالبة" value="${esc(F.q)}"></label>
    </div>
    <div class="hTiles">
      <div class="hTile"><small>الطالبات</small><b>${M.list.length}</b></div>
      <div class="hTile"><small>أكملن الدرس</small><b>${done}</b><em> / ${M.list.length}</em></div>
      <div class="hTile"><small>متوسط نتائج الصف</small><b>${fp(avg)}</b></div>
      <div class="hTile"><small>يحتجن دعمًا (أقل من 60%)</small><b>${weak}</b></div>
      <div class="hTile"><small>إجمالي المحاولات</small><b>${M.rows.length}</b></div>
    </div>
    ${M.list.length ? `<div class="tblWrap"><table class="dash">
      <thead><tr>${th('name','الطالبة')}${th('cls','الصف')}${th('done','الإنجاز')}${th('overall','متوسط النتائج')}
        ${M.acts.map(a=>th('act:'+a.id, esc(a.title))).join('')}${th('cert','📜 الشهادة')}${th('attempts','المحاولات')}${th('last','آخر نشاط')}</tr></thead>
      <tbody>${M.list.map((s,i)=>`<tr class="srow" data-i="${i}">
        <td><b>${esc(s.name)}</b></td><td>${esc(s.cls)}</td><td>${s.done} / ${M.nActs}</td>
        <td class="hc strong" style="--v:${s.overall}">${fp(s.overall)}${s.overall<60?' ⚠️':''}</td>
        ${M.acts.map(a=>cell(s.best[a.id])).join('')}<td class="${s.cert?'':'muted'}">${CERT[s.cert]}</td><td>${s.attempts}</td><td class="muted">${fmt(s.last)}</td></tr>
        ${OPEN===s.id?`<tr class="detail"><td colspan="${7+M.acts.length}">${detail(s, M.acts, i)}</td></tr>`:''}`).join('')}</tbody>
    </table></div><p class="muted" style="font-size:12.5px;margin-top:6px">اضغطي على اسم الطالبة لعرض كل محاولاتها • اضغطي على عنوان العمود للترتيب • «متوسط النتائج» يُحسب من الأنشطة التي حاولتها الطالبة • ⚠️ = أقل من 60% • 📜 حصلت على الشهادة، 👁️ فتحتها، 🖨️ ضغطت «طباعة / حفظ PDF»</p>`
    : `<div class="empty">لا توجد نتائج بعد لهذا الدرس${F.cls?' في هذه الشعبة':''}. ستظهر هنا فور إنهاء الطالبات أول نشاط.</div>`}
    <h3 class="sectionT">❗ أكثر الأسئلة خطأً</h3>
    ${M.topMiss.length ? `<div class="missList">${M.topMiss.map(([q,n])=>`<div class="mi"><span class="mq">${esc(q)}</span><span class="mb"><i style="width:${Math.round(n/maxMiss*100)}%"></i></span><b>${n}</b></div>`).join('')}</div>`
      : '<div class="empty">لا توجد أخطاء مسجّلة بعد.</div>'}
  </section></div>`;
  $('#fLesson').onchange = e => { F.lesson=e.target.value; F.cls=''; OPEN=null; dashboard(); };
  $('#fCls').onchange = e => { F.cls=e.target.value; OPEN=null; dashboard(); };
  $('#fQ').oninput = e => { F.q=e.target.value.trim(); clearTimeout(window.__q); window.__q=setTimeout(()=>{ dashboard(); const q=$('#fQ'); q.focus(); q.setSelectionRange(q.value.length,q.value.length); },300); };
  $$('.sortBtn').forEach(b => b.onclick = () => { const key=b.dataset.k; SORT = {k:key, dir: SORT.k===key ? -SORT.dir : (key==='name'||key==='cls'?1:-1)}; dashboard(); });
  $$('.srow').forEach(r => r.onclick = () => { const s=M.list[+r.dataset.i]; OPEN = OPEN===s.id?null:s.id; dashboard(); });
  $('#refresh').onclick = () => load();
  $('#logout').onclick = logout;
  $('#enroll').onclick = enroll;
  $('#legacyArchive').onclick=legacyArchive;
  $('#csv').onclick = () => exportCSV(M.rows);
  $$('.certView').forEach(b => b.onclick = () => certScreen(M.list[+b.dataset.i], M));
  $$('.reviewAttempt').forEach(b=>b.onclick=e=>{e.stopPropagation();reviewScreen(ROWS.find(r=>r.submissionId===b.dataset.id));});
}
const CERT = ['—', '📜 تقويم تدريبي مُرسل', '👁️ فتحت شهادة مشاركة', '🖨️ ضغطت طباعة المشاركة'];
function detail(s, acts, i){
  const views = s.certs.filter(r=>r.act==='cert-view').sort((x,y)=>x.t-y.t), prints = s.certs.filter(r=>r.act==='cert-print').sort((x,y)=>x.t-y.t);
  const cert = `<div class="hAct" style="--c:#facc15"><div class="hh"><h4>📜 الشهادة</h4><span class="status ${s.cert?'done':''}">${s.cert?CERT[s.cert]:'لم تحصل عليها بعد'}</span></div>
    ${s.cert ? `<div class="kp"><span>👁️ ${views.length?`فتحتها ${views.length} ${views.length===1?'مرة':'مرات'} — أول مرة: ${fmt(views[0].t)}`:'لم تفتحها بعد'}</span>
      <span>🖨️ ${prints.length?`ضغطت «طباعة / حفظ PDF» ${prints.length} ${prints.length===1?'مرة':'مرات'} — آخرها: ${fmt(prints.at(-1).t)}`:'لم تضغط «طباعة / حفظ PDF» بعد'}</span></div>
      <button class="btn gold sm certView" data-i="${i}">عرض الشهادة 📜</button>`
    : `<div class="empty">لم تصل نتيجة التقويم الختامي بعد — تُبنى الشهادة من الأنشطة التي أنجزتها.</div>
      <button class="btn gold sm certView" data-i="${i}">إنشاء الشهادة 📜</button>`}</div>`;
  return `<div class="hActs">${cert}${acts.map(a=>{ const h=s.hist.filter(r=>r.act===a.id).sort((x,y)=>x.t-y.t);
    if(!h.length) return `<div class="hAct" style="--c:#475569"><h4>${esc(a.title)}</h4><div class="empty">لم تحاول بعد</div></div>`;
    return `<div class="hAct" style="--c:#14b8a6"><div class="hh"><h4>${esc(a.title)}</h4><span class="status done">أفضل: ${fp(Math.max(...h.map(r=>r.pct)))}</span></div>
      <table class="mini"><thead><tr><th>#</th><th>التاريخ</th><th>النتيجة</th><th>الأخطاء</th></tr></thead><tbody>
      ${h.map((r,i)=>`<tr><td>${i+1}</td><td>${fmt(r.t)}</td><td>${r.score}/${r.max} (${fp(r.pct)})</td><td>${r.mistakes}</td></tr>
        <tr><td colspan="4"><button class="btn ghost sm reviewAttempt" data-id="${esc(r.submissionId)}">${esc(statusLabel(r.status))} — عرض المحاولة وسجل المراجعات</button></td></tr>`).join('')}</tbody></table>
      ${h.some(r=>r.misses.length)?`<details class="tbl"><summary>الأسئلة التي أخطأت فيها</summary><ul class="ml">${[...new Set(h.flatMap(r=>r.misses))].map(q=>`<li>${esc(q)}</li>`).join('')}</ul></details>`:''}
    </div>`; }).join('')}</div>`;
}
/* ---------- عرض شهادة طالبة (تُبنى من النتائج المسجّلة في الجدول) ---------- */
const LESSONS = {};
function lessonData(id){ // تحميل lesson.js للدرس عند الحاجة لمعرفة عنوان الشهادة ونصّها
  if(LESSONS[id]) return Promise.resolve(LESSONS[id]);
  const l = P.lessons.find(x=>x.id===id);
  if(!l) return Promise.reject();
  return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = '../' + l.path + 'lesson.js';
    sc.onload = () => ok(LESSONS[id] = window.LESSON); sc.onerror = no; document.head.append(sc); });
}
function certScreen(s, M){
  render(`<section class="panel center"><p class="lead">⏳ جارٍ تجهيز الشهادة…</p></section>`); scrollTo(0,0);
  lessonData(F.lesson).then(L => {
    const finals = s.hist.filter(r=>r.act==='final').sort((a,b)=>a.t-b.t), refl = finals.filter(r=>r.reflect);
    const done = M.acts.filter(a => a.id in s.best); // الأنشطة التي أنجزتها فقط، فتطابق النسبة ما في اللوحة تقريبًا
    const total = done.reduce((t,a) => t + Math.max(...s.hist.filter(r=>r.act===a.id).map(r=>Number(r.score))), 0);
    const max = done.reduce((t,a) => t + M.actMax[a.id], 0);
    render(`<section>${TechCert.html({P, L, name:s.name, total, max, attempts:s.attempts, reflect:refl.length?refl.at(-1).reflect:'', date:finals.length?finals.at(-1).t:s.last})}
      <p class="center muted noPrint" style="font-size:13px;margin-top:10px">نسخة من شهادة ${esc(s.name)} (${esc(s.cls)}) مبنية على أفضل نتائجها المسجّلة في الجدول، بتاريخ ${finals.length?'آخر تقويم ختامي':'آخر نشاط لها'}.</p>
      <div class="row c noPrint" style="margin-top:14px"><button class="btn gold" id="printBtn">🖨️ طباعة / حفظ PDF</button><button class="btn ghost" id="backBtn">العودة إلى اللوحة ←</button></div></section>`);
    TechCert.tilt(); $('#printBtn').onclick = () => window.print(); $('#backBtn').onclick = dashboard;
  }).catch(() => { render(`<section class="panel center"><p class="lead">تعذّر تحميل بيانات الدرس.</p><button class="btn" id="backBtn">العودة إلى اللوحة</button></section>`); $('#backBtn').onclick = dashboard; });
}
function exportCSV(rows){
  const head = ['التاريخ','الاسم','الصف','الدرس','النشاط','رقم المحاولة','النتيجة','الدرجة العظمى','النسبة','الأخطاء'];
  // Every exported field is literal text, including names beginning with =,+,-,@.
  const q = v => '"\t' + String(v==null?'':v).replace(/[\x00-\x1f\x7f]/g,' ').replace(/"/g,'""') + '"';
  const lines = [head.map(q).join(',')].concat(rows.map(r => [new Date(r.t).toLocaleString('ar-OM'), r.name, r.cls, r.lessonTitle, r.actTitle, r.attempt, r.score, r.max, r.pct, r.mistakes].map(q).join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `نتائج-${F.lesson}${F.cls?'-'+F.cls.replace('/','_'):''}.csv`; a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function statusLabel(status){return ({approved:'معتمد',changes_requested:'بحاجة إلى تعديل',submitted:'بانتظار المراجعة'})[status]||'بانتظار المراجعة';}
function evidenceView(text){
  if(!text) return '<p>لا تتوفر تفاصيل إضافية لهذه المحاولة القديمة.</p>';
  try {
    const data=JSON.parse(text),task=data.activity&&data.activity.task;
    const questions=Array.isArray(task)?task.flatMap(g=>[g.title,...(g.qs||[]).map(q=>q.q),g.q].filter(Boolean)):task?[...(task.tf||[]),...(task.mcq||[])].map(q=>q.q):[];
    const misses=Array.isArray(data.misses)?data.misses:[];
    const notes=data.notes&&typeof data.notes==='object'?Object.values(data.notes):[];
    return `${questions.length?`<h4>محتوى النشاط وقت التسليم</h4><ul>${questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`:''}
      ${misses.length?`<h4>إجابات احتاجت إلى مراجعة</h4>${misses.map(m=>`<p><b>${esc(m.q)}</b><br>إجابة الطالبة: ${esc(m.your)}<br>الإجابة المتوقعة: ${esc(m.correct)}</p>`).join('')}`:'<p>لا توجد أخطاء مسجلة لهذه المحاولة.</p>'}
      ${notes.length?`<h4>ملاحظات النقاش المرسلة</h4>${notes.map(n=>`<p style="white-space:pre-wrap">${esc(n)}</p>`).join('')}`:''}`;
  } catch {return `<p style="white-space:pre-wrap">${esc(text)}</p>`;}
}
async function legacyArchive(){
  render('<section class="panel"><h2>سجل المتصفح القديم</h2><p id="archiveMessage"></p><pre id="archiveContent" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><button class="btn ghost" id="backDash">العودة إلى اللوحة</button></section>');
  $('#backDash').onclick=dashboard;
  try {
    const records=await API.archiveLegacy(archiveKey);
    if($('#archiveContent')){$('#archiveContent').textContent=JSON.stringify(records,null,2);$('#archiveMessage').textContent='حُفظت نسخ السجل القديم في أرشيف مشفّر على هذا المتصفح ويمكن عرضه هنا لاحقًا. محاولات Google Sheets لم تتغير.';}
  } catch(error){if($('#archiveMessage')) $('#archiveMessage').textContent=error.message;}
}
function reviewScreen(row){
  if(!row) return;
  render(`<section class="panel"><h2>مراجعة المحاولة</h2><p>${esc(row.name)} — ${esc(row.actTitle)} — ${fmt(row.t)}</p>
    <p>النتيجة التدريبية: ${row.score} / ${row.max} — ${esc(statusLabel(row.status))}</p>
    <h3>التأمل</h3><p style="white-space:pre-wrap">${esc(row.reflect||'لا يوجد')}</p>
    <h3>تفاصيل التسليم المحفوظة</h3>${evidenceView(row.evidence)}
    <h3>سجل قرارات المراجعة</h3>${row.reviews.map(r=>`<p><b>${esc(statusLabel(r.status))}</b> — ${fmt(r.t)} — ${esc(r.reviewer)}<br>${esc(r.note)}</p>`).join('')||'<p>لم تُراجع بعد.</p>'}
    <form id="reviewForm"><div class="field"><label>القرار <select id="reviewStatus"><option value="approved">اعتماد</option><option value="changes_requested">طلب تعديل</option><option value="submitted">إعادة فتح للمراجعة</option></select></label></div>
    <div class="field"><label for="reviewNote">ملاحظة</label><textarea id="reviewNote" maxlength="1000"></textarea></div><button class="btn" id="saveReview">حفظ قرار جديد</button></form>
    <p id="reviewError" role="alert"></p><p class="muted">تبقى المحاولة وجميع قراراتها السابقة محفوظة حتى بعد الاعتماد أو إعادة الفتح.</p><button class="btn ghost" id="backDash">العودة إلى اللوحة</button></section>`);
  const reviewId=API.id();
  $('#reviewForm').onsubmit=async e=>{
    e.preventDefault();$('#saveReview').disabled=true;
    try {await API.request('review',{token:teacherSession,submissionId:row.submissionId,reviewId,status:$('#reviewStatus').value,note:$('#reviewNote').value});await load();}
    catch(error){$('#reviewError').textContent=error.message;$('#saveReview').disabled=false;}
  };
  $('#backDash').onclick=dashboard;
}
function enroll(){
  render(`<section class="panel"><h2>رمز دخول خاص لطالبة</h2><form id="enrollForm"><div class="field"><label for="accessMode">الإجراء</label><select id="accessMode"><option value="enroll">إضافة طالبة جديدة</option><option value="rotateStudentCode">تجديد رمز طالبة موجودة وإلغاء جلساتها السابقة</option></select></div>
    <div class="field"><label for="newId">معرّف ثابت (أحرف إنجليزية وأرقام)</label><input id="newId" required maxlength="60" pattern="[A-Za-z0-9_-]+" dir="ltr"></div>
    <div class="field"><label for="newName">الاسم</label><input id="newName" required minlength="3" maxlength="80"></div><div class="field"><label for="newCls">الصف</label><input id="newCls" required maxlength="20"></div><button class="btn" id="createStudent">إنشاء الرمز</button></form>
    <p id="enrollError" role="alert"></p><div id="accessCode"></div><button class="btn ghost" id="backDash">العودة إلى اللوحة</button></section>`);
  $('#enrollForm').onsubmit=async e=>{
    e.preventDefault();$('#createStudent').disabled=true;
    try {
      const d=await API.request($('#accessMode').value,{token:teacherSession,studentId:$('#newId').value.trim(),name:$('#newName').value.trim(),cls:$('#newCls').value.trim()});
      $('#enrollForm').hidden=true;$('#accessCode').textContent=`معرّف الطالبة: ${d.studentId}\nرمز الدخول (يظهر مرة واحدة؛ شاركيه معها بشكل خاص): ${d.code}`;$('#accessCode').style.whiteSpace='pre-wrap';
    } catch(error){$('#enrollError').textContent=error.message;$('#createStudent').disabled=false;}
  };
  $('#accessMode').onchange=()=>{const existing=$('#accessMode').value==='rotateStudentCode';['#newName','#newCls'].forEach(id=>{$(id).required=!existing;$(id).disabled=existing;});};
  $('#backDash').onclick=dashboard;
}

login();
})();
