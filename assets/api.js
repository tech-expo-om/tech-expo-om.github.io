/* Authenticated requests and encrypted, per-student browser history. */
(function(){
'use strict';
const AUTH='tech-expo:student-session';
const errors={auth:'انتهت الجلسة أو بيانات الدخول غير صحيحة.',configuration:'لم تكتمل تهيئة الخدمة. تواصلي مع المعلمة.',rate:'محاولات كثيرة؛ انتظري قليلًا ثم حاولي مجددًا.',validation:'بيانات غير صالحة. لم يُحفظ التسليم.',exists:'معرّف الطالبة مستخدم بالفعل.',busy:'الخدمة مشغولة؛ حاولي مجددًا.',conflict:'تعارض في معرّف التسليم. تواصلي مع المعلمة.'};
let ready=null;
async function checkService(signal){
  if(!ready) ready=(async()=>{
    const response=await fetch(window.PLATFORM.sheetUrl,{mode:'cors',credentials:'omit',signal});
    if(!response.ok) throw Error('تعذّر الاتصال بالخدمة.');
    const meta=await response.json();
    if(!meta||meta.protocol!==2) throw Error('يلزم تحديث خدمة المعلمة قبل استخدام هذه النسخة.');
  })().catch(error=>{ready=null;throw error;});
  return ready;
}
async function request(action,data={}) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
  try {
    if(!window.PLATFORM.sheetUrl) throw Error('لم يُضبط رابط الخدمة.');
    await checkService(controller.signal);
    const response=await fetch(window.PLATFORM.sheetUrl,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',
      headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data}),signal:controller.signal});
    if(!response.ok||response.type==='opaque') throw Error('تعذّر تأكيد الحفظ. ستبقى المحاولة في قائمة الانتظار.');
    const result=await response.json();
    if(!result||result.ok!==true) {const error=Error(errors[result&&result.error]||'تعذّر إكمال الطلب. حاولي مجددًا.');error.code=result&&result.error;throw error;}
    return result;
  } finally {clearTimeout(timer);}
}
const clone=value=>JSON.parse(JSON.stringify(value));
const bytes=hex=>new Uint8Array(hex.match(/../g).map(b=>parseInt(b,16)));
const base64=data=>{const b=new Uint8Array(data);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
const unbase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let vault={},key=null,storageKey='',identity='',saved=Promise.resolve();
async function decrypt(raw,currentKey,id){
  if(!raw) return {};
  const encrypted=JSON.parse(raw);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(encrypted.iv),additionalData:new TextEncoder().encode(id)},currentKey,unbase64(encrypted.data));
  return JSON.parse(new TextDecoder().decode(plain));
}
const versions={};
const Vault={
  async open(id,hex){
    key=await crypto.subtle.importKey('raw',bytes(hex),'AES-GCM',false,['encrypt','decrypt']);
    identity=id;storageKey='tech-expo:vault:'+id;vault={};
    const raw=localStorage.getItem(storageKey);
    vault=await decrypt(raw,key,id);
  },
  read(k,defaults){return Object.assign(defaults,clone(vault[k]||{}));},
  write(k,value){
    const previous=clone(vault[k]||{}),next=clone(value),version=(versions[k]||0)+1;versions[k]=version;
    vault[k]=clone(value);
    const currentKey=key,currentStorage=storageKey,currentIdentity=identity;
    saved=saved.catch(()=>{}).then(async()=>{
      if(!currentKey) throw Error('Student vault is closed');
      if(!navigator.locks) throw Error('This browser cannot safely save concurrent student history');
      await navigator.locks.request(currentStorage,async()=>{
        const disk=await decrypt(localStorage.getItem(currentStorage),currentKey,currentIdentity);
        let merged=next;
        if(k==='tech-expo:outbox'){
          const oldIds=new Set((previous.items||[]).map(r=>r.submissionId)),newIds=new Set(next.items.map(r=>r.submissionId));
          const removed=new Set([...oldIds].filter(id=>!newIds.has(id)));
          const items=new Map((disk[k]?.items||[]).filter(r=>!removed.has(r.submissionId)).map(r=>[r.submissionId,r]));
          next.items.filter(r=>!oldIds.has(r.submissionId)).forEach(r=>items.set(r.submissionId,r));
          merged={items:[...items.values()]};
        } else if(k.startsWith('tech-expo:lesson:')){
          const prior=disk[k]||{},hist=new Map((prior.hist||[]).map(h=>[h.submissionId,h]));
          next.hist.forEach(h=>hist.set(h.submissionId,h));
          merged={...next,warm:prior.warm||next.warm,done:{...prior.done,...next.done},hist:[...hist.values()]};
        }
        disk[k]=merged;
        const iv=crypto.getRandomValues(new Uint8Array(12));
        const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(currentIdentity)},currentKey,new TextEncoder().encode(JSON.stringify(disk)));
        localStorage.setItem(currentStorage,JSON.stringify({iv:base64(iv),data:base64(data)}));
        if(key===currentKey&&versions[k]===version) vault[k]=clone(merged);
      });
    });
    saved.catch(()=>{});
  },
  saved(){return saved;},
  close(){vault={};key=null;storageKey='';identity='';}
};
async function archiveLegacy(hex){
  if(!hex) throw Error('يلزم تشغيل initializeSecurity لأرشفة السجل القديم.');
  const archiveKey=await crypto.subtle.importKey('raw',bytes(hex),'AES-GCM',false,['encrypt','decrypt']);
  const id='teacher-legacy-archive',place='tech-expo:legacy-archive';
  return navigator.locks.request(place,async()=>{
    const savedArchive=await decrypt(localStorage.getItem(place),archiveKey,id);
    const archive=savedArchive.snapshots||[];
    const originals={};
    for(const k of Object.keys(localStorage)) if(k==='tech-expo:profile'||k==='tech-expo:outbox'||k.startsWith('tech-expo:lesson:')) originals[k]=localStorage.getItem(k);
    if(Object.keys(originals).length){
      archive.push({id:crypto.randomUUID(),date:new Date().toISOString(),records:originals});
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},archiveKey,new TextEncoder().encode(JSON.stringify({snapshots:archive})));
      localStorage.setItem(place,JSON.stringify({iv:base64(iv),data:base64(data)}));
      const verified=await decrypt(localStorage.getItem(place),archiveKey,id);
      if(JSON.stringify(verified.snapshots)!==JSON.stringify(archive)) throw Error('لم يتأكد حفظ الأرشيف.');
      // Only remove exact plaintext copies after verifying their encrypted archive.
      for(const [k,v] of Object.entries(originals)) if(localStorage.getItem(k)===v) localStorage.removeItem(k);
    }
    return archive;
  });
}
window.TechAPI={request,Vault,
  archiveLegacy,
  session(){try{return JSON.parse(sessionStorage.getItem(AUTH)||'null');}catch{return null;}},
  saveSession(data){sessionStorage.setItem(AUTH,JSON.stringify({token:data.token,id:data.student.id}));},
  clearSession(){sessionStorage.removeItem(AUTH);sessionStorage.removeItem('tech-expo:teacher-pin');Vault.close();},
  id(){return crypto.randomUUID();}
};
})();
