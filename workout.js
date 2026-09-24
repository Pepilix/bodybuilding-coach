
const baseExercises=[
{name:'Cable Lateral Raise',target:'Lateral delt',sets:3,reps:'10–15',rir:'2 → 0–1',rest:90,last:'Use first set to establish baseline',today:'Controlled reps · progress reps before load',alts:['Machine Lateral Raise','DB Lateral Raise']},
{name:'Machine / DB Shoulder Press',target:'Delts',sets:3,reps:'8–12',rir:'2 → 0–1',rest:150,last:'Use current machine baseline',today:'8–12 · stable execution',alts:['Machine Shoulder Press','Dumbbell Shoulder Press']},
{name:'Reverse Pec Deck',target:'Rear delt',sets:3,reps:'12–15',rir:'2 → 0–1',rest:90,last:'—',today:'12–15 · rear delt bias',alts:['Cable Rear-Delt Fly','Bent-over DB Rear-Delt Fly']},
{name:'Lateral Raise — Variation 2',target:'Lateral delt',sets:2,reps:'12–20',rir:'1 → 0',rest:75,last:'—',today:'12–20 · controlled burn',alts:['Cable Lateral Raise','Machine Lateral Raise']},
{name:'Cable Biceps Curl',target:'Biceps',sets:3,reps:'8–12',rir:'2 → 0',rest:105,last:'65 lb × 8 @ 0 RIR',today:'Earn load increases through reps',alts:['EZ Cable Curl','DB Curl']},
{name:'Overhead Cable Triceps Extension',target:'Triceps',sets:3,reps:'10–15',rir:'2 → 0–1',rest:105,last:'—',today:'10–15 · lengthened triceps',alts:['Single-arm Overhead Cable Extension','DB Overhead Extension']},
{name:'Preacher Curl',target:'Biceps',sets:2,reps:'8–12',rir:'2 → 1',rest:105,last:'30 kg × 8 @ 1 RIR',today:'Match or beat reps before load',alts:['Machine Preacher Curl','Cable Preacher Curl']},
{name:'Triceps Pressdown',target:'Triceps',sets:2,reps:'10–15',rir:'1 → 0',rest:90,last:'—',today:'10–15 · finish with clean reps',alts:['Single-arm Pressdown','Rope Pressdown']}
];
let state=DB.get('todayWorkout',null);
if(!state || state.version!==15){
 state={version:15,sessionId:'shoulders-arms-'+new Date().toISOString().slice(0,10),startedAt:new Date().toISOString(),exercises:{}};
 DB.set('todayWorkout',state);
}
let list=document.getElementById('exerciseList');
function opts(a,b,step=1,sel=''){let s='';for(let x=a;x<=b+1e-9;x+=step){let v=Math.round(x*10)/10;s+=`<option value='${v}' ${String(v)===String(sel)?'selected':''}>${v}</option>`}return s}
function exState(ei){let e=baseExercises[ei];state.exercises[ei]=state.exercises[ei]||{count:e.sets,sets:[],performed:e.name,technique:'None'};return state.exercises[ei]}
function render(){
 list.innerHTML='';
 baseExercises.forEach((e,ei)=>{
   let saved=exState(ei), count=saved.count||e.sets, rows='';
   for(let i=0;i<count;i++){
     let d=saved.sets[i]||{}, completed=!!d.completed;
     rows+=`<div class='setrow ${completed?'completed':''}'><span>S${i+1}</span>
     <select data-k='kg' data-e='${ei}' data-s='${i}'><option value=''>kg</option>${opts(0,200,.5,d.kg)}</select>
     <select data-k='reps' data-e='${ei}' data-s='${i}'><option value=''>reps</option>${opts(1,30,1,d.reps)}</select>
     <select data-k='rir' data-e='${ei}' data-s='${i}'><option value=''>RIR</option>${opts(0,5,1,d.rir)}</select>
     <button class='done ${completed?'completed':''}' data-done='${ei}-${i}' aria-label='${completed?'Untick':'Complete'} set'>${completed?'✓':'○'}</button></div>`
   }
   let el=document.createElement('section');el.className='exercise';
   el.innerHTML=`<div class='exerciseTop'><div><div class='tag'>${e.target.toUpperCase()}</div><h2>${saved.performed}</h2>${saved.performed!==e.name?`<div class='smallnote'>Prescribed: ${e.name}</div>`:''}</div><button class='swap' data-swap='${ei}'>Swap</button></div>
   <div class='prescription'><div><span>LAST</span><b>${e.last}</b></div><div><span>COACH TARGET</span><b>${e.today}</b></div></div>
   <p class='muted'>${e.sets} prescribed sets · ${e.reps} reps · RIR ${e.rir} · ${e.rest}s rest</p>${rows}
   <button class='addset' data-add='${ei}'>+ Add Set (override)</button>
   <div class='techniques'>Intensity technique <select data-tech='${ei}'><option ${saved.technique==='None'?'selected':''}>None</option><option ${saved.technique==='Drop set'?'selected':''}>Drop set</option><option ${saved.technique==='Rest-pause'?'selected':''}>Rest-pause</option><option ${saved.technique==='Partials'?'selected':''}>Partials</option><option ${saved.technique==='Assisted reps'?'selected':''}>Assisted reps</option></select></div>`;
   list.appendChild(el)
 });
 DB.set('todayWorkout',state);
}
render();

document.addEventListener('change',ev=>{
 let t=ev.target;
 if(t.dataset.k!==undefined){let e=+t.dataset.e,s=+t.dataset.s,es=exState(e);es.sets[s]=es.sets[s]||{};es.sets[s][t.dataset.k]=t.value;DB.set('todayWorkout',state)}
 if(t.dataset.tech!==undefined){exState(+t.dataset.tech).technique=t.value;DB.set('todayWorkout',state)}
});
document.addEventListener('click',ev=>{
 let a=ev.target.dataset.add;
 if(a!==undefined){let es=exState(+a);es.count++;DB.set('todayWorkout',state);render();return}
 let d=ev.target.dataset.done;
 if(d!==undefined){
   let [e,s]=d.split('-').map(Number),es=exState(e);es.sets[s]=es.sets[s]||{};
   es.sets[s].completed=!es.sets[s].completed;
   if(es.sets[s].completed){es.sets[s].completedAt=new Date().toISOString();startRest(baseExercises[e].rest)}
   else{delete es.sets[s].completedAt}
   DB.set('todayWorkout',state);render();
   BBDB.syncSet(state,e,s,baseExercises[e],es,es.sets[s]).catch(err=>console.error('Cloud set sync:',err));
   return
 }
 let sw=ev.target.dataset.swap;
 if(sw!==undefined){showSwap(+sw);return}
 let choice=ev.target.dataset.swapchoice;
 if(choice!==undefined){
   let ei=+ev.target.dataset.ei; exState(ei).performed=choice; exState(ei).swapped=true; DB.set('todayWorkout',state);
   document.getElementById('swapModal').classList.add('hidden');render();return
 }
});
function showSwap(ei){
 let e=baseExercises[ei],m=document.getElementById('swapModal'),choices=document.getElementById('swapChoices');
 document.getElementById('swapTitle').textContent='Swap '+exState(ei).performed;
 choices.innerHTML=e.alts.map(a=>`<button data-swapchoice="${a}" data-ei="${ei}">${a}</button>`).join('');
 m.classList.remove('hidden');
}
document.getElementById('cancelSwap').onclick=()=>document.getElementById('swapModal').classList.add('hidden');

let timer,remaining=0;
function startRest(sec){clearInterval(timer);remaining=sec;document.getElementById('restBar').classList.remove('hidden');tick();timer=setInterval(()=>{remaining--;tick();if(remaining<=0){clearInterval(timer);if(navigator.vibrate)navigator.vibrate([200,100,200])}},1000)}
function tick(){let m=Math.floor(Math.max(0,remaining)/60),s=Math.max(0,remaining)%60;document.getElementById('restTime').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
document.getElementById('skipRest').onclick=()=>{clearInterval(timer);document.getElementById('restBar').classList.add('hidden')};
document.getElementById('addRest').onclick=()=>{remaining+=30;tick()};
document.getElementById('askBtn').onclick=async()=>{
 let q=document.getElementById('coachQuestion').value.trim(),ans=document.getElementById('coachAnswer'),btn=document.getElementById('askBtn');
 if(!q)return;
 btn.disabled=true;btn.textContent='Coach thinking…';ans.innerHTML=`<div class='coachreply'>Reviewing your session and recent training data…</div>`;
 try{const reply=await BBDB.coach(q,state);ans.innerHTML=`<div class='coachreply'>${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`}
 catch(err){ans.innerHTML=`<div class='coachreply'><b>Coach unavailable.</b><br>${String(err.message||err).replace(/</g,'&lt;')}</div>`}
 finally{btn.disabled=false;btn.textContent='Ask Coach'}
};
document.getElementById('finishBtn').onclick=()=>{
 let ex=baseExercises.map((e,ei)=>{let es=exState(ei);return {name:e.name,performed:es.performed,swapped:!!es.swapped,technique:es.technique,sets:(es.sets||[]).map(s=>({...s}))}});
 let completedSets=ex.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0);
 if(!completedSets && !confirm('No completed sets are ticked. Save this workout anyway?'))return;
 let h=DB.get('history',[]);
 h.unshift({id:state.sessionId,name:'Shoulders + Arms',date:state.startedAt,finishedAt:new Date().toISOString(),completedSets,exercises:ex});
 DB.set('history',h);
 let sched=DB.get('schedule',{cursor:4,reschedules:[]});sched.cursor=Math.min(6,(sched.cursor||4)+1);DB.set('schedule',sched);
 BBDB.finishWorkout(state).catch(err=>console.error('Cloud workout finish:',err));
 localStorage.removeItem('todayWorkout');
 alert(`Workout saved: ${completedSets} completed working sets.`);
 location.href='history.html';
};
