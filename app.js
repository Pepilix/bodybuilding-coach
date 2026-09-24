
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
