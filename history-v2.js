(async()=>{
 const box=document.getElementById('history'),perf=document.getElementById('performance');
 try{
  const a=await BBDB.cloudHistory();
  box.innerHTML=a.length?a.map(w=>'<div class="historySession"><b>'+w.name+'</b><p class="muted">'+w.actual_date+' · '+w.status+'</p><div class="historySets">'+(w.workout_exercises||[]).map(e=>'<div><button class="exerciseHistoryLink" data-exercise="'+encodeURIComponent(e.performed_name)+'">'+e.performed_name+'</button>: '+(e.sets||[]).filter(s=>s.is_completed).sort((a,b)=>a.set_no-b.set_no).map(s=>(s.load_value==null?'BW':s.load_value+' '+(s.load_unit||'kg'))+' × '+s.reps+(s.rir==null?'':' @'+s.rir)).join(' · ')+'</div>').join('')+'</div></div>').join(''):'<p class="muted">No completed sessions yet.</p>';
  renderPerformance(a,perf); bindExerciseHistory();
 }catch(e){box.innerHTML='<p class="muted">'+e.message+'</p>';if(perf)perf.innerHTML='<p class="muted">Performance data unavailable.</p>'}
})();
function renderPerformance(workouts,box){
 if(!box)return;
 const rows={};
 [...workouts].reverse().forEach(w=>(w.workout_exercises||[]).forEach(e=>{
  const sets=(e.sets||[]).filter(s=>s.is_completed&&s.reps>0&&s.load_value!=null&&Number(s.load_value)>0);
  if(!sets.length)return;
  const units=[...new Set(sets.map(s=>s.load_unit||'kg'))]; if(units.length>1)return;
  const best=Math.max(...sets.map(s=>Number(s.load_value)*Number(s.reps)*(1+(Math.max(0,3-Number(s.rir??2))*.025))));
  const name=e.performed_name||'Exercise',unit=sets[0].load_unit||'kg';
  (rows[name]??=[]).push({date:w.actual_date,score:best,unit});
 }));
 const changes=[];
 Object.entries(rows).forEach(([name,x])=>{if(x.length<2)return;const first=x[0].score,last=x[x.length-1].score;if(!first)return;changes.push({name,pct:(last-first)/first*100,n:x.length})});
 if(!changes.length){box.innerHTML='<p class="muted">More repeated exercise exposures are needed before a reliable performance trend can be calculated.</p>';return}
 const avg=changes.reduce((s,x)=>s+x.pct,0)/changes.length,up=changes.filter(x=>x.pct>1).length,stable=changes.filter(x=>Math.abs(x.pct)<=1).length,down=changes.filter(x=>x.pct < -1).length;
 const leaders=[...changes].sort((a,b)=>b.pct-a.pct).slice(0,3);
 box.innerHTML='<div class="performanceHero"><span>OVERALL PERFORMANCE</span><b class="'+(avg>=0?'positive':'negative')+'">'+(avg>=0?'↑ ':'↓ ')+Math.abs(avg).toFixed(1)+'%</b><small>Across '+changes.length+' comparable exercises</small></div><div class="performanceCounts"><div><b>'+up+'</b><span>Progressing</span></div><div><b>'+stable+'</b><span>Stable</span></div><div><b>'+down+'</b><span>Declining</span></div></div><div class="performanceLeaders"><span>BIGGEST PROGRESSIONS</span>'+leaders.map(x=>'<div><b>'+x.name+'</b><strong>'+(x.pct>=0?'+':'')+x.pct.toFixed(1)+'%</strong></div>').join('')+'</div><p class="smallnote">Index compares repeated working-set performance for the same exercise using load, reps and RIR. It is a trend indicator, not a 1RM estimate.</p>';
}
function bindExerciseHistory(){document.querySelectorAll('.exerciseHistoryLink').forEach(b=>b.onclick=()=>openExerciseHistory(decodeURIComponent(b.dataset.exercise)))}
async function openExerciseHistory(name){
 const modal=document.getElementById('exerciseHistoryModal'),title=document.getElementById('exerciseHistoryTitle'),body=document.getElementById('exerciseHistoryBody');
 title.textContent=name;body.innerHTML='<p class="muted">Loading performance history…</p>';modal.classList.remove('hidden');
 try{
  const a=await BBDB.cloudHistory(),entries=[];
  [...a].reverse().forEach(w=>(w.workout_exercises||[]).filter(e=>e.performed_name===name).forEach(e=>{const sets=(e.sets||[]).filter(s=>s.is_completed).sort((x,y)=>x.set_no-y.set_no);if(sets.length)entries.push({date:w.actual_date,sets})}));
  if(!entries.length){body.innerHTML='<p class="muted">No completed sets found.</p>';return}
  body.innerHTML=entries.map((x,i)=>{const best=Math.max(...x.sets.filter(s=>s.load_value!=null).map(s=>Number(s.load_value)*Number(s.reps)),0);const prev=i?Math.max(...entries[i-1].sets.filter(s=>s.load_value!=null).map(s=>Number(s.load_value)*Number(s.reps)),0):0;const pct=prev&&best?((best-prev)/prev*100):null;return '<div class="exerciseHistoryEntry"><div><b>'+x.date+'</b>'+(pct===null?'':'<strong class="'+(pct>=0?'positive':'negative')+'">'+(pct>=0?'+':'')+pct.toFixed(1)+'%</strong>')+'</div><p>'+x.sets.map(s=>(s.load_value==null?'BW':s.load_value+' '+(s.load_unit||'kg'))+' × '+s.reps+(s.rir==null?'':' @'+s.rir+' RIR')).join(' · ')+'</p></div>'}).join('');
 }catch(e){body.innerHTML='<p class="muted">'+e.message+'</p>'}
}