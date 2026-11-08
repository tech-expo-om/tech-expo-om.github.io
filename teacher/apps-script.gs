/**
 * Run initializeSecurity in the Apps Script editor. Read TEACHER_SECRET in
 * Project Settings > Script Properties. Redeploy a NEW VERSION on the existing
 * web-app deployment. Existing attempts and review decisions are retained.
 */
const SHEET_NAME = 'المحاولات';
const HEAD = ['التاريخ','الاسم','الصف','الدرس','رمز الدرس','النشاط','رمز النشاط','رقم المحاولة',
  'النتيجة','الدرجة العظمى','النسبة %','الأخطاء','عدد أنشطة الدرس','الأسئلة الخاطئة','معرّف الجهاز','نص التأمل',
  'معرّف التسليم','معرّف الطالبة','دليل المحاولة'];
const REVIEW_HEAD = ['معرّف التسليم','التاريخ','القرار','الملاحظة','المراجِعة','معرّف القرار'];
// BEGIN GENERATED CATALOG
const LESSON_CATALOG = {
  "digital-transformation": {
    "title": "التحوُّل الرقمي",
    "activities": {
      "p1": {
        "title": "جناح الفوائد",
        "max": 40
      },
      "p2": {
        "title": "المدينة الرقمية",
        "max": 100
      },
      "p3": {
        "title": "واحة عُمان 2040",
        "max": 80
      },
      "p4": {
        "title": "نفق الزمن الرقمي",
        "max": 90
      },
      "p5": {
        "title": "مختبر التقنيات",
        "max": 70
      },
      "p6": {
        "title": "قلعة الأمان",
        "max": 50
      },
      "final": {
        "title": "منصة التتويج",
        "max": 130
      }
    }
  },
  "e-marketing": {
    "title": "التسويق الإلكتروني",
    "activities": {
      "p1": {
        "title": "محطة التحوُّل",
        "max": 80
      },
      "p2": {
        "title": "سوق القنوات",
        "max": 80
      },
      "p3": {
        "title": "ميزان التسويق",
        "max": 120
      },
      "p4": {
        "title": "جسر التقليدي والرقمي",
        "max": 60
      },
      "final": {
        "title": "منصة التتويج",
        "max": 120
      }
    }
  },
  "e-store-create": {
    "title": "إنشاء متجر إلكتروني",
    "activities": {
      "p1": {
        "title": "منصة الانطلاق",
        "max": 90
      },
      "p2": {
        "title": "لوحة التخطيط",
        "max": 80
      },
      "p3": {
        "title": "ورشة التنفيذ",
        "max": 70
      },
      "p4": {
        "title": "استوديو الصفحات",
        "max": 30
      },
      "final": {
        "title": "منصة التتويج",
        "max": 110
      }
    }
  },
  "e-store-customize": {
    "title": "تخصيص المتجر الإلكتروني",
    "activities": {
      "p1": {
        "title": "جناح الرفوف",
        "max": 40
      },
      "p2": {
        "title": "مختبر الأسعار",
        "max": 80
      },
      "p3": {
        "title": "ركن المنتجات",
        "max": 60
      },
      "p4": {
        "title": "بوابة الدفع والشحن",
        "max": 60
      },
      "p5": {
        "title": "برج الواجهة",
        "max": 30
      },
      "final": {
        "title": "منصة التتويج",
        "max": 110
      }
    }
  },
  "e-store-publish": {
    "title": "نشر المتجر الإلكتروني",
    "activities": {
      "p1": {
        "title": "مكتب العناوين",
        "max": 70
      },
      "p2": {
        "title": "مركز الترجمة",
        "max": 60
      },
      "p3": {
        "title": "منصة الإطلاق",
        "max": 60
      },
      "p4": {
        "title": "برج البحث",
        "max": 70
      },
      "final": {
        "title": "منصة التتويج",
        "max": 110
      }
    }
  },
  "e-ads": {
    "title": "الإعلانات الإلكترونية",
    "activities": {
      "p1": {
        "title": "شارع اللافتات",
        "max": 80
      },
      "p2": {
        "title": "استوديو Instagram",
        "max": 20
      },
      "p3": {
        "title": "معرض المنشورات",
        "max": 70
      },
      "p4": {
        "title": "غرفة القيادة",
        "max": 130
      },
      "p5": {
        "title": "محكمة الأخلاق",
        "max": 110
      },
      "final": {
        "title": "منصة التتويج",
        "max": 130
      }
    }
  }
};
// END GENERATED CATALOG

function initializeSecurity() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEACHER_SECRET')) props.setProperty('TEACHER_SECRET', random_());
  if (!props.getProperty('LEGACY_ARCHIVE_KEY')) props.setProperty('LEGACY_ARCHIVE_KEY', random_());
  sheet_(); reviewSheet_(); locked_(assignLegacyIds_);
  console.log('Read TEACHER_SECRET in Script Properties; keep it private.');
}
function random_() { return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''); }
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value))
    .map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
function same_(a,b) {
  a=String(a||''); b=String(b||''); let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function fail_(error) { throw new Error(error); }
function txt_(v,n) { return "'" + String(v==null?'':v).slice(0,n); }
function text_(v,n) {
  if(typeof v!=='string'||v.length>n||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) fail_('validation');
  return v;
}
function integer_(v,min,max) {
  if(!Number.isSafeInteger(v)||v<min||v>max) fail_('validation');
  return v;
}
function owns_(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
function locked_(fn) {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000)) fail_('busy');
  try { return fn(); } finally { lock.releaseLock(); }
}
function table_(name,head) {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(name);
  if(!sh) { sh=ss.insertSheet(name); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  if(sh.getMaxColumns()<head.length) sh.insertColumnsAfter(sh.getMaxColumns(),head.length-sh.getMaxColumns());
  if(sh.getRange(1,head.length).isBlank()) sh.getRange(1,1,1,head.length).setValues([head]).setFontWeight('bold');
  return sh;
}
function sheet_() { return table_(SHEET_NAME,HEAD); }
function reviewSheet_() { return table_('المراجعات',REVIEW_HEAD); }
function data_(sh) { return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues(); }
function assignLegacyIds_() {
  const sh=sheet_();
  data_(sh).forEach((r,i)=>{if(!r[16]) sh.getRange(i+2,17).setValue(txt_('legacy-'+random_(),80));});
}
function limit_(key,max,seconds) {
  const cache=CacheService.getScriptCache();
  locked_(() => {
    const n=Number(cache.get(key)||0);
    if(n>=max) fail_('rate');
    cache.put(key,String(n+1),seconds);
  });
}
function configured_() {
  const secret=PropertiesService.getScriptProperties().getProperty('TEACHER_SECRET');
  if(!secret||secret.length<32||secret==='غيّريني-1234') fail_('configuration');
  return secret;
}
function session_(role,id,version) {
  const token=random_();
  CacheService.getScriptCache().put('session:'+hash_(token),JSON.stringify({role,id,version,expires:Date.now()+14400000}),14400);
  return token;
}
function principal_(d,role) {
  text_(d.token,128);
  const raw=CacheService.getScriptCache().get('session:'+hash_(d.token));
  if(!raw) fail_('auth');
  const p=JSON.parse(raw);
  if(p.role!==role||p.expires<Date.now()) fail_('auth');
  if(role==='teacher'&&!same_(p.version,hash_(configured_()))) fail_('auth');
  if(role==='student') {
    const stored=PropertiesService.getScriptProperties().getProperty('student:'+p.id);
    if(!stored) fail_('auth');
    p.student=JSON.parse(stored);
    if(p.student.disabled||!same_(p.version,p.student.codeHash)) fail_('auth');
  }
  return p;
}
function login_(d) {
  if(d.action==='teacherLogin') {
    limit_('login:teacher',10,900);
    if(!same_(hash_(text_(d.secret,256)),hash_(configured_()))) fail_('auth');
    CacheService.getScriptCache().remove('login:teacher');
    return {ok:true,token:session_('teacher','teacher',hash_(configured_())),archiveKey:PropertiesService.getScriptProperties().getProperty('LEGACY_ARCHIVE_KEY')};
  }
  const id=text_(d.studentId,60);
  if(!/^[a-zA-Z0-9_-]{1,60}$/.test(id)) fail_('auth');
  limit_('login:student:'+hash_(id),10,900);
  const raw=PropertiesService.getScriptProperties().getProperty('student:'+id);
  const s=raw?JSON.parse(raw):null;
  if(!s||s.disabled||!same_(hash_(text_(d.code,128)),s.codeHash)) fail_('auth');
  CacheService.getScriptCache().remove('login:student:'+hash_(id));
  return {ok:true,token:session_('student',id,s.codeHash),student:{id,name:s.name,cls:s.cls},vaultKey:s.vaultKey};
}
function rotateStudent_(d) {
  const id=text_(d.studentId,60),code=random_();
  if(!/^[a-zA-Z0-9_-]{1,60}$/.test(id)) fail_('validation');
  locked_(()=>{
    const props=PropertiesService.getScriptProperties(),raw=props.getProperty('student:'+id);
    if(!raw) fail_('missing');
    const student=JSON.parse(raw);student.codeHash=hash_(code);
    props.setProperty('student:'+id,JSON.stringify(student));
  });
  return {ok:true,studentId:id,code};
}
function enroll_(d) {
  const id=text_(d.studentId,60), name=text_(d.name,80).trim(), cls=text_(d.cls,20).trim();
  if(!/^[a-zA-Z0-9_-]{1,60}$/.test(id)||name.length<3||!cls) fail_('validation');
  const code=random_();
  locked_(() => {
    const props=PropertiesService.getScriptProperties();
    if(props.getProperty('student:'+id)) fail_('exists');
    props.setProperty('student:'+id,JSON.stringify({name,cls,codeHash:hash_(code),vaultKey:random_()}));
  });
  return {ok:true,studentId:id,code};
}
function rows_() {
  return data_(sheet_()).map((r,i) => ({
    t:new Date(r[0]).getTime()||0,name:String(r[1]||''),cls:String(r[2]||''),lessonTitle:String(r[3]||''),lesson:String(r[4]||''),
    actTitle:String(r[5]||''),act:String(r[6]||''),attempt:Number(r[7])||0,score:Number(r[8])||0,max:Number(r[9])||0,
    pct:Number(r[10])||0,mistakes:Number(r[11])||0,acts:Number(r[12])||0,misses:r[13]?String(r[13]).split(' | '):[],
    device:String(r[14]||''),reflect:String(r[15]||''),submissionId:String(r[16]||('legacy-'+(i+2))),studentId:String(r[17]||''),
    evidence:String(r[18]||''),reviews:[]
  }));
}
function withReviews_(rows) {
  const map=Object.create(null); rows.forEach(r=>{map[r.submissionId]=r;});
  data_(reviewSheet_()).forEach(r=>{
    const item=map[String(r[0])];
    if(item) item.reviews.push({t:new Date(r[1]).getTime()||0,status:String(r[2]),note:String(r[3]||''),reviewer:String(r[4]),id:String(r[5])});
  });
  rows.forEach(r=>{r.status=r.reviews.length?r.reviews[r.reviews.length-1].status:'submitted';});
  return rows;
}
function submit_(d,p) {
  const r=d.row;
  if(!r||typeof r!=='object'||Array.isArray(r)) fail_('validation');
  const id=text_(r.submissionId,80);
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) fail_('validation');
  const lessonId=text_(r.lesson,60);
  if(!owns_(LESSON_CATALOG,lessonId)) fail_('validation');
  const lesson=LESSON_CATALOG[lessonId];
  const actId=text_(r.act,20), cert=actId==='cert-view'||actId==='cert-print';
  const act=lesson.activities[actId];
  if(!cert&&!owns_(lesson.activities,actId)) fail_('validation');
  const score=cert?0:integer_(r.score,0,act.max);
  const mistakes=cert?0:integer_(r.mistakes,0,1000);
  const reflect=text_(r.reflect==null?'':r.reflect,1000);
  const misses=r.misses==null?[]:r.misses;
  if(!Array.isArray(misses)||misses.length>30) fail_('validation');
  misses.forEach(m=>text_(m,500));
  const evidence=r.evidence==null?'':text_(r.evidence,32000);
  const device=text_(r.device==null?'':r.device,40);
  return locked_(() => {
    const sh=sheet_(), all=rows_(), existing=all.find(x=>x.submissionId===id);
    if(existing) {
      if(existing.studentId!==p.id||existing.lesson!==r.lesson||existing.act!==actId) fail_('conflict');
      return {ok:true,submissionId:id,duplicate:true};
    }
    const cache=CacheService.getScriptCache(), key='submit:'+p.id;
    const n=Number(cache.get(key)||0); if(n>=60) fail_('rate');
    const previous=all.filter(x=>x.studentId===p.id&&x.lesson===r.lesson&&x.act===actId);
    const max=cert?0:act.max, pc=max?Math.round(score/max*100):0;
    sh.appendRow([new Date(),txt_(p.student.name,80),txt_(p.student.cls,20),txt_(lesson.title,80),txt_(r.lesson,60),
      txt_(cert?(actId==='cert-view'?'فتح شهادة مشاركة':'طباعة شهادة مشاركة'):act.title,80),txt_(actId,20),previous.length+1,
      score,max,pc,mistakes,Object.keys(lesson.activities).length,txt_(misses.join(' | '),16000),txt_(device,40),txt_(reflect,1000),
      txt_(id,80),txt_(p.id,60),txt_(evidence,32000)]);
    cache.put(key,String(n+1),60);
    return {ok:true,submissionId:id};
  });
}
function review_(d) {
  const submissionId=text_(d.submissionId,80), status=text_(d.status,20), note=text_(d.note||'',1000), reviewId=text_(d.reviewId,80);
  if(!['approved','changes_requested','submitted'].includes(status)||!/^[a-zA-Z0-9_-]{16,80}$/.test(reviewId)) fail_('validation');
  return locked_(() => {
    if(!rows_().some(r=>r.submissionId===submissionId)) fail_('missing');
    const previous=data_(reviewSheet_()).find(r=>r[5]===reviewId);
    if(previous) {
      if(previous[0]!==submissionId||previous[2]!==status||String(previous[3]||'')!==note) fail_('conflict');
      return {ok:true,reviewId};
    }
    reviewSheet_().appendRow([txt_(submissionId,80),new Date(),txt_(status,20),txt_(note,1000),txt_('teacher',60),txt_(reviewId,80)]);
    return {ok:true,reviewId};
  });
}
function doPost(e) {
  try {
    configured_();
    const raw=e&&e.postData&&e.postData.contents;
    if(typeof raw!=='string'||raw.length>64000) fail_('validation');
    let d;try{d=JSON.parse(raw);}catch{fail_('validation');}
    if(!d||typeof d!=='object'||Array.isArray(d)) fail_('validation');
    let result;
    if(d.action==='teacherLogin'||d.action==='studentLogin') result=login_(d);
    else if(d.action==='teacherList'||d.action==='enroll'||d.action==='rotateStudentCode'||d.action==='review') {
      principal_(d,'teacher');
      if(d.action==='teacherList') {locked_(assignLegacyIds_);result={ok:true,rows:withReviews_(rows_())};}
      else result=d.action==='enroll'?enroll_(d):d.action==='rotateStudentCode'?rotateStudent_(d):review_(d);
    } else if(d.action==='submit'||d.action==='studentResume') {
      const p=principal_(d,'student');
      result=d.action==='submit'?submit_(d,p):{ok:true,student:{id:p.id,name:p.student.name,cls:p.student.cls},vaultKey:p.student.vaultKey,
        rows:withReviews_(rows_().filter(r=>r.studentId===p.id)),lessonTotals:Object.fromEntries(Object.entries(LESSON_CATALOG).map(([id,l])=>[id,{count:Object.keys(l.activities).length,max:Object.values(l.activities).reduce((n,a)=>n+a.max,0)}]))};
    } else if(d.action==='logout') {
      text_(d.token,128); CacheService.getScriptCache().remove('session:'+hash_(d.token)); result={ok:true};
    } else fail_('validation');
    return json_(result);
  } catch(err) {
    const allowed=['auth','configuration','validation','rate','busy','exists','missing','conflict'];
    return json_({ok:false,error:allowed.includes(err.message)?err.message:'server'});
  }
}
function doGet() { return json_({ok:true,protocol:2}); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
