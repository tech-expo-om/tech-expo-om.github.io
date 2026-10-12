/**
 * مبدعة التقنية — استقبال نتائج الطالبات في Google Sheets
 * ---------------------------------------------------------
 * 1) غيّري الرمز السري أدناه إلى رمز تختارينه (لا تشاركيه مع الطالبات).
 * 2) Deploy ← New deployment ← Web app
 *      Execute as: Me      |      Who has access: Anyone
 * 3) انسخي رابط Web app وأرسليه لإضافته إلى المنصة.
 */
const TEACHER_PIN = 'غيّريني-1234';

const SHEET_NAME = 'المحاولات';
const HEAD = ['التاريخ', 'الاسم', 'الصف', 'الدرس', 'رمز الدرس', 'النشاط', 'رمز النشاط', 'رقم المحاولة',
              'النتيجة', 'الدرجة العظمى', 'النسبة %', 'الأخطاء', 'عدد أنشطة الدرس', 'الأسئلة الخاطئة', 'معرّف الجهاز', 'نص التأمل'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  if (sh.getRange(1, HEAD.length).isBlank()) { // جدول قديم: إضافة عناوين الأعمدة الجديدة
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  }
  return sh;
}

// نص آمن: يقصّ الطول ويمنع تحويل النص إلى معادلة
function txt_(v, n) {
  let s = String(v == null ? '' : v).slice(0, n);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
const num_ = v => (isFinite(Number(v)) ? Number(v) : 0);

// تستقبل محاولة واحدة من صفحة الدرس
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_().appendRow([
      new Date(num_(d.ts) || Date.now()), txt_(d.name, 80), txt_(d.cls, 20), txt_(d.lessonTitle, 80), txt_(d.lesson, 60),
      txt_(d.actTitle, 80), txt_(d.act, 20), num_(d.attempt), num_(d.score), num_(d.max), num_(d.pct), num_(d.mistakes),
      num_(d.acts), txt_((d.misses || []).join(' | '), 3000), txt_(d.device, 40), txt_(d.reflect, 1000)
    ]);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// تقرأ كل المحاولات للوحة المعلمة — تتطلب الرمز السري
function doGet(e) {
  if (String(e.parameter.pin || '') !== TEACHER_PIN) return json_({ ok: false, error: 'pin' });
  const values = sheet_().getDataRange().getValues();
  values.shift();
  const rows = values.map(r => ({
    t: new Date(r[0]).getTime(), name: r[1], cls: r[2], lessonTitle: r[3], lesson: r[4], actTitle: r[5], act: r[6],
    attempt: r[7], score: r[8], max: r[9], pct: r[10], mistakes: r[11], acts: r[12],
    misses: r[13] ? String(r[13]).split(' | ') : [], device: r[14], reflect: String(r[15] || '')
  }));
  return json_({ ok: true, rows: rows });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
