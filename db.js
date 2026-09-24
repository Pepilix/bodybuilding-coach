
const SUPABASE_URL = 'https://opmjehceohcobnribzcb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vdvL92gDicRRqSUCvfY6QQ_8irXIvdT';
window.bbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.BBDB = {
  async user() {
    const {data} = await window.bbSupabase.auth.getUser();
    return data.user || null;
  },
  async signIn(email) {
    return await window.bbSupabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname }
    });
  },
  async signOut() { return await window.bbSupabase.auth.signOut(); },
  async lastSets(exerciseName, limit=20) {
    const user = await this.user(); if(!user) return [];
    const {data: exs} = await window.bbSupabase.schema('bodybuilding').from('exercises').select('id').eq('name',exerciseName).limit(1);
    if(!exs?.length) return [];
    const {data: wes} = await window.bbSupabase.schema('bodybuilding').from('workout_exercises')
      .select('id').eq('user_id',user.id).or(`performed_exercise_id.eq.${exs[0].id},prescribed_exercise_id.eq.${exs[0].id}`);
    if(!wes?.length) return [];
    const ids=wes.map(x=>x.id);
    const {data} = await window.bbSupabase.schema('bodybuilding').from('sets')
      .select('load_kg,reps,rir,completed_at,workout_exercise_id')
      .eq('user_id',user.id).eq('is_completed',true).in('workout_exercise_id',ids)
      .order('completed_at',{ascending:false}).limit(limit);
    return data||[];
  },
  target(history, repMin, repMax) {
    if(!history?.length) return null;
    const last=history[0], load=Number(last.load_kg||0), reps=Number(last.reps||0), rir=Number(last.rir??2);
    let nextLoad=load, targetReps=Math.max(repMin,reps);
    if(reps>=repMax && rir<=1) { nextLoad=Math.round((load+2.5)*2)/2; targetReps=repMin; }
    else if(reps<repMax) targetReps=Math.min(repMax,reps+1);
    return {load:nextLoad,reps:targetReps,rir:'1–2'};
  }
};
