
const profile=DB.get('profile',{weight:77.5,calories:2500,bf:11.4,waist:80});
['weight','calories','bf','waist'].forEach(k=>{let e=document.getElementById(k);if(e)e.textContent=profile[k]});
function editMetric(k,label){let v=prompt(label,profile[k]);if(v!==null&&!isNaN(parseFloat(v))){profile[k]=parseFloat(v);DB.set('profile',profile);DB.set('bodyLog',[{type:k,value:parseFloat(v),date:new Date().toISOString()},...DB.get('bodyLog',[])]);location.reload()}}

['macroUpload','inbodyUpload','photoUpload'].forEach(id=>{let el=document.getElementById(id);if(el)el.onchange=()=>{if(el.files[0]){let log=DB.get('uploads',[]);log.unshift({type:id,name:el.files[0].name,date:new Date().toISOString()});DB.set('uploads',log);document.getElementById('uploads').textContent='Recorded: '+el.files[0].name+' · '+new Date().toLocaleString()+'. Image analysis/storage comes with the backend.';}}});

const cycle=['Pull A','Legs + Abs','Rest / Steps','Push A','Shoulders + Arms','Pull B + Upper Chest','Rest'];
function renderCycle(){
  let box=document.getElementById('week'); if(!box)return;
  let sched=DB.get('schedule',{cursor:4,reschedules:[]});
  let days=['MON','TUE','WED','THU','FRI','SAT','SUN'];
  box.innerHTML=cycle.map((name,i)=>{
    let cls=i<sched.cursor?'completed':i===sched.cursor?'today':'';
    let moved=(sched.reschedules||[]).some(r=>r.sessionIndex===i);
    if(moved) cls+=' rescheduled';
    return `<div class='${cls}'><span>${days[i]}</span><b>${name}</b>${i===sched.cursor?'<span class="statuspill">NEXT</span>':''}</div>`
  }).join('');
}
renderCycle();

let restBtn=document.getElementById('restBtn'), modal=document.getElementById('rescheduleModal');
if(restBtn) restBtn.onclick=()=>modal.classList.remove('hidden');
let cancel=document.getElementById('cancelReschedule'); if(cancel) cancel.onclick=()=>modal.classList.add('hidden');
document.querySelectorAll('[data-reason]').forEach(b=>b.onclick=()=>{
  let sched=DB.get('schedule',{cursor:4,reschedules:[]});
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
 const defs=[{id:'macros',name:'Daily macros',priority:'Required',frequency:'daily',day:null,time:'20:30',enabled:true},{id:'weighin',name:'Friday weigh-in',priority:'Required',frequency:'weekly',day:5,time:'06:00',enabled:true},{id:'progress',name:'Waist + progress photos',priority:'Recommended',frequency:'fortnightly',day:5,time:'06:00',enabled:true},{id:'measurements',name:'Full measurements',priority:'Recommended',frequency:'monthly',day:5,time:'06:00',enabled:true},{id:'inbody',name:'InBody',priority:'Optional',frequency:'monthly',day:5,time:'07:00',enabled:true}];
 let rs=DB.get('reminders',null);if(!rs){rs=defs;DB.set('reminders',rs)}let h=DB.get('checkinHistory',[]);
 const last=id=>h.filter(x=>x.id===id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date;
 const due=r=>{let n=new Date(),l=last(r.id),d=l?new Date(l):null,x;if(r.frequency==='daily'){x=new Date(n);let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);if(d&&d>=x)x.setDate(x.getDate()+1);return x}if(r.frequency==='weekly'||r.frequency==='fortnightly'){if(d){x=new Date(d);x.setDate(x.getDate()+(r.frequency==='weekly'?7:14))}else{x=new Date(n);x.setDate(x.getDate()+((+r.day-x.getDay()+7)%7))}let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);return x}x=d?new Date(d):new Date(n);if(d)x.setMonth(x.getMonth()+1);else{x.setDate(1);if(x<n)x.setMonth(x.getMonth()+1)}let [a,b]=r.time.split(':');x.setHours(+a,+b,0,0);return x};
 let active=rs.filter(r=>r.enabled).map(r=>({...r,due:due(r)})).sort((a,b)=>a.due-b.due),over=active.filter(r=>r.due<=new Date()),n=over[0]||active[0];if(!n){box.innerHTML='<p class="muted">No reminders enabled.</p>';return}box.innerHTML='<div class="dashcheck '+(over.length?'overdue':'')+'"><div><span class="priority '+n.priority.toLowerCase()+'">'+n.priority+'</span><b>'+(over.length?over.length+' overdue':n.name)+'</b><small>'+(over.length?n.name:'Due '+n.due.toLocaleString('en-GB'))+'</small></div><a href="reminders.html">'+(over.length?'REVIEW':'OPEN')+' →</a></div>';
}
reminderSummary();
(async function nutritionTargets(){const tk=document.getElementById('trainKcal');if(!tk)return;let local=DB.get('nutritionTargets',{training:profile.calories||2500,rest:2200,protein:180});try{const cloud=await BBDB.latestNutritionTarget();if(cloud)local={...local,...cloud}}catch(e){}tk.value=local.training||2500;restKcal.value=local.rest||2200;proteinTarget.value=local.protein||180;profile.calories=Number(tk.value);DB.set('profile',profile);document.getElementById('calories').textContent=profile.calories;document.getElementById('calorieMetric').onclick=()=>document.getElementById('nutritionCard').scrollIntoView({behavior:'smooth'});document.getElementById('saveNutrition').onclick=async()=>{const p={training:Number(tk.value),rest:Number(restKcal.value),protein:Number(proteinTarget.value)};DB.set('nutritionTargets',p);profile.calories=p.training;DB.set('profile',profile);document.getElementById('calories').textContent=p.training;nutritionMsg.textContent='Targets updated on this device.';try{await BBDB.saveNutritionTargets(p);nutritionMsg.textContent='Nutrition targets updated and saved to coaching data.'}catch(e){nutritionMsg.textContent+=' Sign in to sync them to coaching data.'}}})();