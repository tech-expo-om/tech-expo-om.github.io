/* =========================================================
   المعرض التقني — لوحة المعلمة لمتابعة تقدّم الطالبات
   تقرأ المحاولات من Google Sheets عبر Apps Script (doGet + الرمز السري)
   ========================================================= */
(function(){
'use strict';
const P = window.PLATFORM;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fp = v => '⁦' + v + '%⁩';
const fmt = t => new Date(t).toLocaleString('ar-OM',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const PINKEY = 'tech-expo:teacher-pin';
let ROWS = [], F = {lesson:'', cls:'', q:''}, SORT = {k:'overall', dir:-1}, OPEN = null;

$('#hdr').innerHTML = `<div class="bar"><a class="brand" href="../"><span class="mark"><img src="../assets/logo-mark.png" alt="شعار المدرسة"></span>
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
      <li>افتحي <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> لإنشاء جدول جديد، وسمّيه مثلًا «نتائج المعرض التقني».</li>
      <li>من القائمة: <b>Extensions ← Apps Script</b> (الإضافات ← برمجة التطبيقات).</li>
      <li>احذفي الكود الموجود، والصقي الكود بالأسفل (زر «نسخ الكود»).</li>
      <li>في السطر الأول غيّري <code>TEACHER_PIN</code> إلى رمز سري تختارينه — ستستخدمينه لفتح هذه اللوحة. ثم احفظي 💾.</li>
      <li>اضغطي <b>Deploy ← New deployment</b>، واختاري النوع <b>Web app</b>، ثم:<br><b>Execute as: Me</b> — <b>Who has access: Anyone</b> ← <b>Deploy</b>.</li>
      <li>وافقي على الأذونات (Authorize access ← اختاري حسابكِ ← Advanced ← Go to project ← Allow).</li>
      <li>انسخي <b>Web app URL</b> (ينتهي بـ <code>/exec</code>) وأرسليه لإضافته إلى المنصة. بعدها تبدأ النتائج بالوصول.</li>
    </ol>
    <div class="row" style="margin:14px 0"><button class="btn" id="copyCode">📋 نسخ الكود</button><span class="muted" id="copyMsg"></span></div>
    <pre class="code" id="code" dir="ltr">جارٍ تحميل الكود…</pre>
    <div class="note"><b>🔒 الخصوصية:</b> تُرسل المنصة اسم الطالبة وصفّها ونتائج الأنشطة فقط. لا يستطيع أحد قراءة الجدول من هذه الصفحة دون الرمز السري. وإذا غيّرتِ الكود لاحقًا فاختاري <b>Deploy ← Manage deployments ← Edit ← New version</b> ليبقى الرابط نفسه.</div>
    ${P.sheetUrl?'<div class="spacer"></div><div class="row c"><button class="btn gold" id="toDash">العودة إلى اللوحة ←</button></div>':''}
  </section>`);
  fetch('apps-script.gs').then(r=>r.text()).then(t=>{ $('#code').textContent=t; });
  $('#copyCode').onclick = () => navigator.clipboard.writeText($('#code').textContent).then(()=>{ $('#copyMsg').textContent='✅ تم النسخ'; });
  if($('#toDash')) $('#toDash').onclick = login;
}

/* ---------- الدخول بالرمز السري ---------- */
function login(){
  if(!P.sheetUrl) return setup();
  const saved = sessionStorage.getItem(PINKEY);
  if(saved) return load(saved);
  render(`<section class="panel center" style="max-width:520px;margin:0 auto">
    <div class="badgeBig">👩‍🏫</div><h2 style="font-size:26px">بوابة المعلمة</h2>
    <p class="muted">أدخلي الرمز السري الذي وضعتِه في Apps Script.</p>
    <div class="field"><input id="pin" type="password" placeholder="الرمز السري" autocomplete="current-password"></div>
    <button class="btn" id="go">دخول 🔓</button><p class="gmsg no" id="err"></p></section>`);
  const go = () => load($('#pin').value.trim());
  $('#go').onclick = go; $('#pin').addEventListener('keydown', e => { if(e.key==='Enter') go(); }); $('#pin').focus();
}
function load(pin){
  if($('#err')) $('#err').textContent = '';
  render(`<section class="panel center"><p class="lead">⏳ جارٍ تحميل النتائج…</p></section>`);
  fetch(P.sheetUrl + (P.sheetUrl.includes('?')?'&':'?') + 'pin=' + encodeURIComponent(pin))
    .then(r => r.json()).then(d => {
      if(!d.ok){ sessionStorage.removeItem(PINKEY); login(); $('#err').textContent='الرمز السري غير صحيح'; return; }
      sessionStorage.setItem(PINKEY, pin); const seen = new Set(); ROWS = d.rows.filter(r => { const k=r.device+'|'+r.t+'|'+r.act; if(!r.name || seen.has(k)) return false; seen.add(k); return true; }); dashboard();
    }).catch(() => { render(`<section class="panel center"><p class="lead">تعذّر الاتصال بجدول النتائج. تأكّدي من الإنترنت ومن رابط Web app.</p><button class="btn" id="re">إعادة المحاولة</button></section>`); $('#re').onclick=()=>load(pin); });
}

/* ---------- تجميع البيانات ---------- */
const actOrder = a => a==='final' ? 999 : (parseInt(String(a).replace(/\D/g,''))||500);
function model(){
  const rows = ROWS.filter(r => r.lesson===F.lesson && (!F.cls || r.cls===F.cls));
  const acts = [...new Map(rows.map(r=>[r.act,{id:r.act,title:r.actTitle}])).values()].sort((a,b)=>actOrder(a.id)-actOrder(b.id));
  const nActs = Math.max(acts.length, ...rows.map(r=>r.acts||0), 1);
  const studs = new Map();
  rows.forEach(r => {
    const k = String(r.name).trim()+'|'+String(r.cls).trim();
    if(!studs.has(k)) studs.set(k, {name:String(r.name).trim(), cls:String(r.cls).trim(), best:{}, tries:{}, hist:[], last:0});
    const s = studs.get(k); s.hist.push(r); s.last = Math.max(s.last, r.t);
    s.best[r.act] = Math.max(s.best[r.act]??-1, Number(r.pct)); s.tries[r.act] = (s.tries[r.act]||0)+1;
  });
  const list = [...studs.values()].map(s => {
    const done = Object.keys(s.best).length;
    s.done = done; s.attempts = s.hist.length;
    s.overall = done ? Math.round(Object.values(s.best).reduce((t,v)=>t+v,0) / done) : 0; // متوسط أفضل نتائج الأنشطة التي حاولتها
    return s;
  }).filter(s => !F.q || s.name.includes(F.q));
  const miss = new Map();
  rows.forEach(r => (r.misses||[]).forEach(q => { if(q) miss.set(q, (miss.get(q)||0)+1); }));
  const topMiss = [...miss.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  return {rows, acts, nActs, list, topMiss};
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
  const th = (key, label) => `<th><button class="sortBtn" data-k="${key}">${label}${SORT.k===key?(SORT.dir>0?' ▲':' ▼'):''}</button></th>`;
  const maxMiss = M.topMiss.length ? M.topMiss[0][1] : 1;
  $('#app').innerHTML = `<div class="screen"><section class="panel">
    <div class="hubHead"><div><span class="kicker">👩‍🏫 لوحة المتابعة</span><h2 style="font-size:clamp(20px,4vw,30px);margin-top:6px">تقدّم الطالبات</h2>
      <p class="muted">آخر تحديث: ${fmt(Date.now())} — تُحتسب أفضل نتيجة لكل نشاط.</p></div>
      <div class="row"><button class="btn ghost sm" id="refresh">🔄 تحديث</button><button class="btn ghost sm" id="csv">⬇️ تصدير CSV</button><button class="btn ghost sm" id="logout">🔒 خروج</button></div></div>
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
        ${M.acts.map(a=>th('act:'+a.id, esc(a.title))).join('')}${th('attempts','المحاولات')}${th('last','آخر نشاط')}</tr></thead>
      <tbody>${M.list.map((s,i)=>`<tr class="srow" data-i="${i}">
        <td><b>${esc(s.name)}</b></td><td>${esc(s.cls)}</td><td>${s.done} / ${M.nActs}</td>
        <td class="hc strong" style="--v:${s.overall}">${fp(s.overall)}${s.overall<60?' ⚠️':''}</td>
        ${M.acts.map(a=>cell(s.best[a.id])).join('')}<td>${s.attempts}</td><td class="muted">${fmt(s.last)}</td></tr>
        ${OPEN===s.name+'|'+s.cls?`<tr class="detail"><td colspan="${6+M.acts.length}">${detail(s, M.acts)}</td></tr>`:''}`).join('')}</tbody>
    </table></div><p class="muted" style="font-size:12.5px;margin-top:6px">اضغطي على اسم الطالبة لعرض كل محاولاتها • اضغطي على عنوان العمود للترتيب • «متوسط النتائج» يُحسب من الأنشطة التي حاولتها الطالبة • ⚠️ = أقل من 60%</p>`
    : `<div class="empty">لا توجد نتائج بعد لهذا الدرس${F.cls?' في هذه الشعبة':''}. ستظهر هنا فور إنهاء الطالبات أول نشاط.</div>`}
    <h3 class="sectionT">❗ أكثر الأسئلة خطأً</h3>
    ${M.topMiss.length ? `<div class="missList">${M.topMiss.map(([q,n])=>`<div class="mi"><span class="mq">${esc(q)}</span><span class="mb"><i style="width:${Math.round(n/maxMiss*100)}%"></i></span><b>${n}</b></div>`).join('')}</div>`
      : '<div class="empty">لا توجد أخطاء مسجّلة بعد.</div>'}
  </section></div>`;
  $('#fLesson').onchange = e => { F.lesson=e.target.value; F.cls=''; OPEN=null; dashboard(); };
  $('#fCls').onchange = e => { F.cls=e.target.value; OPEN=null; dashboard(); };
  $('#fQ').oninput = e => { F.q=e.target.value.trim(); clearTimeout(window.__q); window.__q=setTimeout(()=>{ dashboard(); const q=$('#fQ'); q.focus(); q.setSelectionRange(q.value.length,q.value.length); },300); };
  $$('.sortBtn').forEach(b => b.onclick = () => { const key=b.dataset.k; SORT = {k:key, dir: SORT.k===key ? -SORT.dir : (key==='name'||key==='cls'?1:-1)}; dashboard(); });
  $$('.srow').forEach(r => r.onclick = () => { const s=M.list[+r.dataset.i], key=s.name+'|'+s.cls; OPEN = OPEN===key?null:key; dashboard(); });
  $('#refresh').onclick = () => load(sessionStorage.getItem(PINKEY));
  $('#logout').onclick = () => { sessionStorage.removeItem(PINKEY); ROWS=[]; login(); };
  $('#csv').onclick = () => exportCSV(M.rows);
}
function detail(s, acts){
  return `<div class="hActs">${acts.map(a=>{ const h=s.hist.filter(r=>r.act===a.id).sort((x,y)=>x.t-y.t);
    if(!h.length) return `<div class="hAct" style="--c:#475569"><h4>${esc(a.title)}</h4><div class="empty">لم تحاول بعد</div></div>`;
    return `<div class="hAct" style="--c:#14b8a6"><div class="hh"><h4>${esc(a.title)}</h4><span class="status done">أفضل: ${fp(Math.max(...h.map(r=>r.pct)))}</span></div>
      <table class="mini"><thead><tr><th>#</th><th>التاريخ</th><th>النتيجة</th><th>الأخطاء</th></tr></thead><tbody>
      ${h.map((r,i)=>`<tr><td>${i+1}</td><td>${fmt(r.t)}</td><td>${r.score}/${r.max} (${fp(r.pct)})</td><td>${r.mistakes}</td></tr>`).join('')}</tbody></table>
      ${h.some(r=>r.misses.length)?`<details class="tbl"><summary>الأسئلة التي أخطأت فيها</summary><ul class="ml">${[...new Set(h.flatMap(r=>r.misses))].map(q=>`<li>${esc(q)}</li>`).join('')}</ul></details>`:''}
    </div>`; }).join('')}</div>`;
}
function exportCSV(rows){
  const head = ['التاريخ','الاسم','الصف','الدرس','النشاط','رقم المحاولة','النتيجة','الدرجة العظمى','النسبة','الأخطاء'];
  const q = v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
  const lines = [head.map(q).join(',')].concat(rows.map(r => [new Date(r.t).toLocaleString('ar-OM'), r.name, r.cls, r.lessonTitle, r.actTitle, r.attempt, r.score, r.max, r.pct, r.mistakes].map(q).join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `نتائج-${F.lesson}${F.cls?'-'+F.cls.replace('/','_'):''}.csv`; a.click();
}

login();
})();
