/* إعدادات المنصة وسجل الدروس — أضيفي كل درس جديد هنا */
window.PLATFORM = {
  name: 'المعرض التقني',
  tagline: 'دروس تفاعلية بأسلوب المعارض',
  school: 'مدرسة أمامة بنت أبي العاص للتعليم الأساسي (9–12)',
  ministry: 'سلطنة عُمان • وزارة التعليم',
  vision: 'رؤية عُمان 2040',
  teacher: 'أ. نسرين الفارسي',
  // رابط تطبيق Google Apps Script (Web app) الذي يستقبل النتائج — اتركيه فارغًا لإيقاف الإرسال
  sheetUrl: 'https://script.google.com/macros/s/AKfycbxJcjwN7qLpr4_ecOmqt-URtyHce3shg9NAFQtPoj_dZLkRd-oWWPfJY-cATWMIzqw/exec',
  // الشعب المقترحة في خانة «الصف / الشعبة» (اختياري)
  classes: ['12/1','12/2','12/3','12/4','12/5','12/6'],
  lessons: [
    { id:'digital-transformation', path:'digital-transformation/', icon:'🚀', color:'#14b8a6',
      title:'التحوُّل الرقمي', subtitle:'الدرس الأول: مقدمة إلى التحوُّل الرقمي',
      subject:'تقنية المعلومات', grade:'الصف الثاني عشر', unit:'الوحدة الثانية',
      desc:'رحلة في معرض المستقبل: مفهوم التحوُّل الرقمي، وفوائده، ومجالاته، والتحوُّل الرقمي في عُمان، ومراحله، وتقنياته، وتحدياته.' }
  ]
};
