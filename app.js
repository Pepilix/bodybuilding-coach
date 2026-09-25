
const profile=DB.get('profile',{weight:77.5,calories:2500,bf:11.4,waist:80});
['weight','calories','bf','waist'].forEach(k=>{let e=document.getElementById(k);if(e)e.textContent=profile[k]});
(async function hydrateDashboard(){
 try{
  const rows=await BBDB.latestMetrics(); if(!rows.length)return;
  const latest=(field)=>rows.find(x=>x[field]!=null)?.[field];
  const map={weight:'weight_kg',bf:'body_fat_pct',waist:'waist_cm'};
  Object.entries(map).forEach(([id,field])=>{const v=latest(field),el=document.getElementById(id);if(v!=null&&el)el.textContent=v});
 }catch(e){console.warn('Cloud metrics unavailable',e)}
})();
async function editMetric(k,label){let v=prompt(label,profile[k]);if(v!==null&&!isNaN(parseFloat(v))){v=parseFloat(v);profile[k]=v;DB.set('profile',profile);DB.set('bodyLog',[{type:k,value:v,date:new Date().toISOString()},...DB.get('bodyLog',[])]);try{let saved=null;if(k==='weight')saved=await BBDB.saveBodyMetrics({weight_kg:v,source:'manual'});else if(k==='waist')saved=await BBDB.saveBodyMetrics({waist_cm:v,source:'manual'});if(saved)await BBDB.coachReview(k==='weight'?'weight':'general',{metric:k,value:v},saved.id)}catch(e){alert('Saved on this device, but cloud save failed: '+e.message)}location.reload()}}

['macroUpload','photoUpload'].forEach(id=>{let el=document.getElementById(id);if(el)el.onchange=()=>{if(el.files[0]){let log=DB.get('uploads',[]);log.unshift({type:id,name:el.files[0].name,date:new Date().toISOString()});DB.set('uploads',log);document.getElementById('uploads').textContent='Recorded: '+el.files[0].name+' · '+new Date().toLocaleString();}}});
let inbody=document.getElementById('inbodyUpload');if(inbody)inbody.onchange=async()=>{if(!inbody.files[0])return;const box=document.getElementById('uploads');box.textContent='InBody selected. Enter the values from the report to save them to your coaching history.';const weight=prompt('InBody weight (kg)');if(weight===null)return;const bf=prompt('InBody body fat (%)');if(bf===null)return;const muscle=prompt('InBody skeletal muscle mass (kg) — leave blank if unavailable','');try{const saved=await BBDB.saveBodyMetrics({weight_kg:Number(weight),body_fat_pct:Number(bf),skeletal_muscle_kg:muscle===''?null:Number(muscle),source:'inbody',notes:'Imported from '+inbody.files[0].name});box.textContent='InBody saved. Coach reviewing…';await BBDB.coachReview('weight',{source:'inbody',weight_kg:Number(weight),body_fat_pct:Number(bf),skeletal_muscle_kg:muscle===''?null:Number(muscle)},saved.id);box.textContent='InBody saved + coach review ✓';setTimeout(()=>location.reload(),600)}catch(e){box.textContent='InBody not saved: '+e.message}};

let cycleProgramme=null;
async function renderCycle(){
  let box=document.getElementById('week'); if(!box)return;
  const fallback=['Pull A','Legs + Abs','Rest / Steps','Push A','Shoulders + Arms','Pull B + Upper Chest','Rest'];
  let sessions=[];
  try{cycleProgramme=await BBDB.programme();sessions=(cycleProgramme?.sessions||[]).map(s=>({id:s.id,name:s.name,emphasis:s.emphasis,exercises:s.exercises||[]}));}catch(e){}
  const byName=new Map(sessions.map(s=>[s.name,s]));
  let cycle=fallback.map(name=>name.startsWith('Rest')?{name,rest:true}:{...(byName.get(name)||{name,exercises:[]}),rest:false});
  let sched=DB.get('schedule',{cursor:4,reschedules:[]}),days=['MON','TUE','WED','THU','FRI','SAT','SUN'];
  try{
    const cloud=await BBDB.cloudHistory(),latest=cloud.find(w=>w.status==='completed');
    if(latest){const doneIndex=fallback.indexOf(latest.name);if(doneIndex>=0&&doneIndex>=sched.cursor){sched.cursor=Math.min(doneIndex+1,fallback.length-1);DB.set('schedule',sched)}}
  }catch(e){console.warn('Could not reconcile training cycle',e)}
  box.innerHTML=cycle.map((s,i)=>{let cls=i<sched.cursor?'completed':i===sched.cursor?'today':'';return `<div class='${cls} cycleRow' data-cycle='${i}'><span>${days[i]}</span><b>${s.name}</b>${i===sched.cursor?'<span class="statuspill">NEXT</span>':''}</div><div class="cycleExpand hidden" id="cycle-${i}"></div>`}).join('');
  document.querySelectorAll('[data-cycle]').forEach(row=>row.onclick=()=>{const i=+row.dataset.cycle,s=cycle[i],d=document.getElementById('cycle-'+i),open=!d.classList.contains('hidden');document.querySelectorAll('.cycleExpand').forEach(x=>x.classList.add('hidden'));if(open)return;if(s.rest){d.innerHTML='<div class="cyclePreview"><b>Recovery day</b><span>No lifting prescribed · steps and recovery</span></div>'}else if(s.exercises?.length){d.innerHTML='<div class="cyclePreview"><div><b>'+(s.emphasis||s.name)+'</b><span>'+s.exercises.length+' exercises · '+s.exercises.reduce((n,x)=>n+(Number(x.prescribed_sets)||0),0)+' working sets</span></div><a href="workout.html?v=189&session='+encodeURIComponent(s.id)+'">View workout →</a></div>'}else d.innerHTML='<div class="cyclePreview"><span>Session details unavailable.</span></div>';d.classList.remove('hidden')});
}
renderCycle();
let restBtn=document.getElementById('restBtn'), modal=document.getElementById('rescheduleModal');
if(restBtn) restBtn.onclick=()=>modal.classList.remove('hidden');
let cancel=document.getElementById('cancelReschedule'); if(cancel) cancel.onclick=()=>modal.classList.add('hidden');
document.querySelectorAll('[data-reason]').forEach(b=>b.onclick=()=>{
  let sched=DB.get('schedule',{cursor:4,reschedules:[]});
  const cycle=['Pull A','Legs + Abs','Rest / Steps','Push A','Shoulders + Arms','Pull B + Upper Chest','Rest'];
  sched.reschedules=sched.reschedules||[];
  sched.reschedules.push({sessionIndex:sched.cursor,session:cycle[sched.cursor],reason:b.dataset.reason,date:new Date().toISOString()});
  DB.set('schedule',sched); modal.classList.add('hidden'); renderCycle();
});

let hist=document.getElementById('history');
if(hist){
  let h=DB.get('history',[]);
  hist.innerHTML=h.length?h.map((x,idx)=>{
    let lines=(x.exercises||[]).map(e=>{
      let sets=(e.sets||[]).filter(s=>s.completed).map(s=>`${s.kg||'?'} kg × ${s.reps||'?'} @ ${s.rir||'?'} RIR`).join(' · ');
      return sets?`<div><b>${e.performed||e.name}</b>: ${sets}</div>`:'';
    }).join('');
    return `<div class='historySession'><b>${x.name}</b><button class='editdate' data-editdate='${idx}'>Edit date</button><p class='muted'>${new Date(x.date).toLocaleString()} · ${x.completedSets||0} working sets</p><div class='historySets'>${lines||'Session saved without detailed set data.'}</div></div>`
  }).join(''):'<p class="muted">No completed sessions stored on this device yet.</p>';
  document.querySelectorAll('[data-editdate]').forEach(btn=>btn.onclick=()=>{
    let i=+btn.dataset.editdate, arr=DB.get('history',[]);
    let current=new Date(arr[i].date); let value=prompt('Workout date (YYYY-MM-DD)',current.toISOString().slice(0,10));
    if(value && /^\d{4}-\d{2}-\d{2}$/.test(value)){arr[i].date=value+'T12:00:00';DB.set('history',arr);location.reload()}
  });
}

function reminderSummary(){
 const box=document.getElementById('nextCheckin');if(!box)return;
 const defs=[{id:'macros',name:'Daily macros',priority:'Required',frequency:'daily',day:null,time:'20:30',enabled:true},{id:'weighin',name:'Friday weigh-in',priority:'Required',frequency:'weekly',day:5,time:'08:00',enabled:true},{id:'progress',name:'Waist + progress photos',priority:'Recommended',frequency:'fortnightly',day:5,time:'08:00',enabled:true},{id:'measurements',name:'Full measurements',priority:'Recommended',frequency:'monthly',day:5,time:'08:00',enabled:true},{id:'inbody',name:'InBody',priority:'Optional',frequency:'monthly',day:5,time:'08:00',enabled:true}];
 let rs=DB.get('reminders',null);if(!rs){rs=defs;DB.set('reminders',rs)}let h=DB.get('checkinHistory',[]);
 const last=id=>h.filter(x=>x.id===id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date;
 const due=r=>{let n=new Date(),l=last(r.id),d=l?new Date(l):null,x;if(r.frequency==='daily'){x=new Date(n);let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);if(d&&d>=x)x.setDate(x.getDate()+1);return x}if(r.frequency==='weekly'||r.frequency==='fortnightly'){if(d){x=new Date(d);x.setDate(x.getDate()+(r.frequency==='weekly'?7:14))}else{x=new Date(n);x.setDate(x.getDate()+((+r.day-x.getDay()+7)%7))}let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);return x}x=d?new Date(d):new Date(n);if(d)x.setMonth(x.getMonth()+1);else{x.setDate(1);if(x<n)x.setMonth(x.getMonth()+1)}let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);return x};
 let active=rs.filter(r=>r.enabled).map(r=>({...r,due:due(r)})).sort((a,b)=>a.due-b.due),over=active.filter(r=>r.due<=new Date()),n=over[0]||active[0];if(!n){box.innerHTML='<p class="muted">No reminders enabled.</p>';return}box.innerHTML='<div class="dashcheck '+(over.length?'overdue':'')+'"><div><span class="priority '+n.priority.toLowerCase()+'">'+n.priority+'</span><b>'+(over.length?over.length+' overdue':n.name)+'</b><small>'+(over.length?n.name:'Due '+n.due.toLocaleString('en-GB'))+'</small></div><a href="reminders.html">'+(over.length?'REVIEW':'OPEN')+' →</a></div>';
}
reminderSummary();

(async()=>{const box=document.getElementById('coachTodayText');if(!box)return;try{const r=await BBDB.latestCoachReview();box.innerHTML=r?'<p>'+String(r.summary).replace(/</g,'&lt;')+'</p><p><b>Next:</b> '+String(r.decision||'No change').replace(/</g,'&lt;')+'</p>':'<p class="muted">Complete a workout or body check-in to generate your first automatic coaching review.</p>'}catch(e){box.innerHTML='<p class="muted">Coach review unavailable.</p>'}})();