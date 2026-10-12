/* =========================================================
   مبدعة التقنية — الشهادة ثلاثية الأبعاد (مشتركة بين صفحة الدرس وبوابة المعلمة)
   ========================================================= */
(function(){
'use strict';
const ASSETS = document.currentScript.src.replace(/[^/]*$/, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fp = v => '⁦' + v + '%⁩';

function rosette(P, year){
  const pts=[]; for(let i=0;i<48;i++){ const a=i*Math.PI/24, r=i%2?44:50; pts.push((60+r*Math.sin(a)).toFixed(1)+','+(60-r*Math.cos(a)).toFixed(1)); }
  return `<svg viewBox="0 0 120 150" class="rosette" aria-hidden="true"><defs>
    <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".35" stop-color="#e8b923"/><stop offset=".7" stop-color="#b7791f"/><stop offset="1" stop-color="#fde68a"/></linearGradient>
    <linearGradient id="rbn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#134e4a"/></linearGradient></defs>
    <path d="M38 95 L28 148 L42 138 L52 150 L58 100 Z" fill="url(#rbn)"/><path d="M82 95 L92 148 L78 138 L68 150 L62 100 Z" fill="url(#rbn)"/>
    <polygon points="${pts.join(' ')}" fill="url(#gd)" stroke="#92400e" stroke-width=".8"/>
    <circle cx="60" cy="60" r="36" fill="none" stroke="#92400e" stroke-width="1.2" stroke-dasharray="2 3"/><circle cx="60" cy="60" r="31" fill="url(#gd)" stroke="#fff7d6" stroke-width="1.5"/>
    <text x="60" y="56" text-anchor="middle" font-family="Cairo" font-weight="900" font-size="10" fill="#78350f">${esc(P.name)}</text>
    <text x="60" y="74" text-anchor="middle" font-family="Cairo" font-weight="900" font-size="12" fill="#78350f">${year}</text></svg>`;
}
function emblem(){ // إكليل غار ذهبي مع نجمة
  let leaves=''; for(let i=0;i<8;i++){ const deg=118+i*18, a=deg*Math.PI/180, x=60+42*Math.cos(a), y=58+42*Math.sin(a), rot=deg;
    leaves+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="11" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#lg)"/>`;
    const x2=120-x; leaves+=`<ellipse cx="${x2.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="11" transform="rotate(${-rot} ${x2.toFixed(1)} ${y.toFixed(1)})" fill="url(#lg)"/>`; }
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#d4a017"/><stop offset="1" stop-color="#92400e"/></linearGradient>
    <radialGradient id="cg" cx=".35" cy=".3"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></radialGradient></defs>
    ${leaves}<circle cx="60" cy="58" r="27" fill="url(#cg)" stroke="#e8b923" stroke-width="3"/>
    <path d="M60 40 L65 53 L79 53 L68 61 L72 75 L60 67 L48 75 L52 61 L41 53 L55 53 Z" fill="#fde68a" stroke="#b7791f" stroke-width="1"/></svg>`;
}
const CORNER = `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke-linecap="round">
  <path d="M4 60 V14 Q4 4 14 4 H60" stroke="#c9971a" stroke-width="3"/><path d="M12 70 V22 Q12 12 22 12 H70" stroke="#0f766e" stroke-width="1.6"/>
  <path d="M22 40 H38 V22" stroke="#14b8a6" stroke-width="1.6"/><circle cx="38" cy="22" r="3" fill="#f59e0b"/><circle cx="22" cy="40" r="3" fill="#ec4899"/>
  <path d="M30 56 V48 H48 V30 H56" stroke="#c9971a" stroke-width="1.4"/><circle cx="56" cy="30" r="2.5" fill="#22d3ee"/></g></svg>`;

// d = {P, L, name, total, max, attempts, reflect, date}
function html(d){
  const {P, L} = d, pc = d.max ? Math.round(d.total/d.max*100) : 0, grade = pc>=90?'امتياز':pc>=75?'جيد جدًا':pc>=60?'جيد':'مشاركة';
  const date = new Date(d.date), ds = date.toLocaleDateString('ar-OM',{year:'numeric',month:'long',day:'numeric'});
  const refl = String(d.reflect||'').trim(), short = refl.length>200 ? refl.slice(0,200)+'…' : refl;
  return `<div class="certStage" id="stage"><span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span>
      <div class="cert3d" id="cert"><span class="plate p3"></span><span class="plate p2"></span><span class="plate p1"></span>
        <div class="paper">
          <i class="corner c1">${CORNER}</i><i class="corner c2">${CORNER}</i><i class="corner c3">${CORNER}</i><i class="corner c4">${CORNER}</i>
          <div class="letter z1">
            <div class="school"><img src="${ASSETS}logo-mark.png" alt="شعار المدرسة"><div><b>${esc(P.school)}</b><small>${esc(P.ministry)}</small></div></div>
            <div class="vision">${esc(P.vision)}<small>${esc(L.subject)} • ${esc(L.grade)}</small></div>
          </div>
          <div class="emblem z3">${emblem()}</div>
          <div class="ribbon z3"><span>${esc(L.cert.title)}</span></div>
          <p class="cSub z1">${esc(L.expo)}</p>
          <p class="cTxt z1">تُمنح هذه الشهادة بكل فخر واعتزاز للطالبة المبدعة</p>
          <div class="cName z4">${esc(d.name)}</div>
          <p class="cTxt z1">${esc(L.cert.reason)}</p>
          <div class="cStats z2"><div><small>النقاط</small><b>${d.total}</b><small>من ${d.max}</small></div><div><small>النسبة</small><b>${fp(pc)}</b></div><div><small>التقدير</small><b>${grade}</b></div><div><small>المحاولات</small><b>${d.attempts}</b></div></div>
          ${short?`<div class="cRefl z1"><b>${esc(L.final.reflectLabel)}</b> ${esc(short)}</div>`:''}
          <div class="cFoot z2"><div><small>المعلمة</small><b class="sign">${esc(P.teacher)}</b></div><div class="sealWrap z4">${rosette(P, date.getFullYear())}</div><div><small>التاريخ</small><b>${ds}</b></div></div>
        </div><span class="holo"></span></div></div>`;
}
function tilt(){
  const st=document.querySelector('#stage'), c=document.querySelector('#cert');
  st.addEventListener('pointermove', e=>{ const r=c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    c.classList.add('live'); c.style.setProperty('--ry',((x-.5)*22).toFixed(2)+'deg'); c.style.setProperty('--rx',((.5-y)*16).toFixed(2)+'deg');
    c.style.setProperty('--mx',(x*100).toFixed(1)+'%'); c.style.setProperty('--my',(y*100).toFixed(1)+'%'); });
  st.addEventListener('pointerleave', ()=>{ c.classList.remove('live'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
}
window.TechCert = {html, tilt};
})();
