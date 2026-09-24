
const DEFAULT_REMINDERS = [
  {id:'macros',title:'Daily macros',frequency:'daily',time:'20:30',level:'Required',enabled:true,description:'Upload or enter calories, protein, carbs and fat.'},
  {id:'weight',title:'Friday weigh-in',frequency:'weekly',weekday:5,time:'06:00',level:'Required',enabled:true,description:'Morning body weight under consistent conditions.'},
  {id:'physique',title:'Waist + progress photos',frequency:'fortnightly',weekday:5,time:'06:00',level:'Recommended',enabled:true,description:'Waist at navel plus front, side and back photos.'},
  {id:'measurements',title:'Full measurements',frequency:'monthly',weekday:5,time:'06:00',level:'Recommended',enabled:true,description:'Waist, chest, arms, thighs and calves on the first Friday.'},
  {id:'inbody',title:'InBody',frequency:'monthly',weekday:5,time:'06:00',level:'Optional',enabled:true,description:'Monthly body-composition trend check.'}
];
function cloneDefaults(){ return JSON.parse(JSON.stringify(DEFAULT_REMINDERS)); }
function loadReminders(){
  const existing = DB.get('reminders', null);
  if (!existing) {
    const defaults = cloneDefaults();
    DB.set('reminders', defaults);
    return defaults;
  }
  return existing.map(function(r){
    const d = DEFAULT_REMINDERS.find(function(x){ return x.id === r.id; }) || {};
    return Object.assign({}, d, r);
  });
}
function saveReminders(items){ DB.set('reminders', items); }
function levelClass(level){ return String(level || '').toLowerCase(); }
function humanFrequency(r){
  if (r.frequency === 'daily') return 'Every day';
  if (r.frequency === 'weekly') return 'Every Friday';
  if (r.frequency === 'fortnightly') return 'Every 2 weeks · Friday';
  if (r.frequency === 'monthly') return 'First Friday monthly';
  return r.frequency;
}
function nextOccurrence(r, from){
  from = from || new Date();
  const bits = (r.time || '08:00').split(':').map(Number);
  const hh = bits[0], mm = bits[1];
  let d = new Date(from);
  if (r.frequency === 'daily') {
    d.setHours(hh, mm, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
  }
  if (r.frequency === 'weekly' || r.frequency === 'fortnightly') {
    const target = r.weekday == null ? 5 : r.weekday;
    let add = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + add);
    d.setHours(hh, mm, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 7);
    if (r.frequency === 'fortnightly') {
      const anchor = new Date('2026-09-25T06:00:00');
      const weeks = Math.floor((d - anchor) / (7 * 86400000));
      if (weeks % 2 !== 0) d.setDate(d.getDate() + 7);
    }
    return d;
  }
  if (r.frequency === 'monthly') {
    let y = d.getFullYear(), m = d.getMonth();
    for (let tries = 0; tries < 3; tries++) {
      let first = new Date(y, m, 1, hh, mm, 0, 0);
      let add = (5 - first.getDay() + 7) % 7;
      first.setDate(1 + add);
      if (first > from) return first;
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
  }
  return null;
}
function markComplete(id){
  const history = DB.get('reminderHistory', []);
  history.unshift({id:id, date:new Date().toISOString()});
  DB.set('reminderHistory', history.slice(0,100));
  render();
}
function updateReminder(id, key, value){
  const items = loadReminders();
  const r = items.find(function(x){ return x.id === id; });
  if (!r) return;
  r[key] = value;
  saveReminders(items);
  render();
}
function render(){
  const items = loadReminders();
  const list = document.getElementById('reminderList');
  list.innerHTML = items.map(function(r){
    return "<div class='reminderrow "+(r.enabled?"":"disabled")+"'>"+
      "<div class='remindermain'><div><span class='levelpill "+levelClass(r.level)+"'>"+r.level+"</span><h3>"+r.title+"</h3><p>"+r.description+"</p></div>"+
      "<label class='switch'><input type='checkbox' "+(r.enabled?"checked":"")+" onchange=\"updateReminder('"+r.id+"','enabled',this.checked)\"><span></span></label></div>"+
      "<div class='remindercontrols'><div><small>Schedule</small><b>"+humanFrequency(r)+"</b></div>"+
      "<label><small>Time</small><input type='time' value='"+r.time+"' onchange=\"updateReminder('"+r.id+"','time',this.value)\"></label>"+
      "<button onclick=\"markComplete('"+r.id+"')\">Mark done</button></div></div>";
  }).join('');
  const upcoming = items.filter(function(r){ return r.enabled; }).map(function(r){ return {r:r,date:nextOccurrence(r)}; }).filter(function(x){ return x.date; }).sort(function(a,b){ return a.date-b.date; });
  const next = upcoming[0];
  const nextBox = document.getElementById('nextCheckin');
  if (next) {
    nextBox.innerHTML = "<span class='eyebrow'>"+next.r.level.toUpperCase()+"</span><h2>"+next.r.title+"</h2><p>"+next.date.toLocaleString([], {weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+"</p><button onclick=\"markComplete('"+next.r.id+"')\">Mark complete now</button>";
    document.getElementById('nextCheckinMeta').textContent = 'Upcoming';
  } else {
    nextBox.innerHTML = "<p class='muted'>No reminders enabled.</p>";
    document.getElementById('nextCheckinMeta').textContent = '';
  }
  const hist = DB.get('reminderHistory', []);
  document.getElementById('reminderHistory').innerHTML = hist.length ? hist.slice(0,20).map(function(h){
    const r = items.find(function(x){ return x.id === h.id; });
    return "<div class='historyline'><b>"+((r && r.title) || h.id)+"</b><span>"+new Date(h.date).toLocaleString()+"</span></div>";
  }).join('') : "<p class='muted'>No reminder completions recorded yet.</p>";
}
render();
