
const SUPABASE_URL = 'https://wdlnsnfxylpbedlsmiuu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EikNG5u7neTg3rPybU0Sug_UrUv5x8Y';
window.bbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});

window.BBDB = {
  async user() {
    const {data} = await window.bbSupabase.auth.getUser();
    return data.user || null;
  },
  async signInWithPassword(email,password){ return await window.bbSupabase.auth.signInWithPassword({email,password}); },
  async resetPassword(email){ return await window.bbSupabase.auth.resetPasswordForEmail(email,{redirectTo:'https://pepilix.github.io/bodybuilding-coach/reset-password.html?v=194'}); },
  async setPassword(password){ return await window.bbSupabase.auth.updateUser({password}); },
  async signIn(email) {
    return await window.bbSupabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname }
    });
  },
  async signOut() { return await window.bbSupabase.auth.signOut(); },
  async lastSets(exerciseName, limit=20) {
    const user = await this.user(); if(!user) return [];
    const {data: exs} = await window.bbSupabase.from('exercises').select('id').eq('name',exerciseName).limit(1);
    if(!exs?.length) return [];
    const {data: wes} = await window.bbSupabase.from('workout_exercises')
      .select('id').eq('user_id',user.id).or(`performed_exercise_id.eq.${exs[0].id},prescribed_exercise_id.eq.${exs[0].id}`);
    if(!wes?.length) return [];
    const ids=wes.map(x=>x.id);
    const {data} = await window.bbSupabase.from('sets')
      .select('load_kg,load_value,load_unit,reps,rir,completed_at,workout_exercise_id')
      .eq('user_id',user.id).eq('is_completed',true).in('workout_exercise_id',ids)
      .order('completed_at',{ascending:false}).limit(limit);
    return data||[];
  },
  target(history, repMin, repMax) {
    if(!history?.length) return null;
    const last=history[0], load=Number(last.load_value ?? last.load_kg ?? 0), reps=Number(last.reps||0), rir=Number(last.rir??2);
    const unit=last.load_unit || 'kg';
    let nextLoad=load, targetReps=Math.max(repMin,reps);
    const step=unit==='lb'?5:2.5;
    if(reps>=repMax && rir<=1) { nextLoad=Math.round((load+step)*2)/2; targetReps=repMin; }
    else if(reps<repMax) targetReps=Math.min(repMax,reps+1);
    return {load:nextLoad,reps:targetReps,rir:'1–2',unit};
  }
,
  async ensureWorkout(state, name='Shoulders + Arms') {
    const user=await this.user(); if(!user) throw new Error('Sign in to Cloud Data first.');
    let {data: existing,error:e1}=await window.bbSupabase.from('workouts')
      .select('id').eq('user_id',user.id).eq('client_session_id',state.sessionId).maybeSingle();
    if(e1) throw e1;
    if(existing) return existing.id;
    const {data,error}=await window.bbSupabase.from('workouts').insert({
      user_id:user.id, client_session_id:state.sessionId, name,
      actual_date:new Date(state.startedAt).toLocaleDateString('en-CA'),
      started_at:state.startedAt, status:'in_progress', block_id:state.blockId||null, program_session_id:state.programSessionId||null
    }).select('id').single();
    if(error) throw error; return data.id;
  },
  async ensureWorkoutExercise(workoutId, orderNo, prescribedName, performedName, technique='None') {
    const user=await this.user(); if(!user) throw new Error('Not signed in.');
    let {data: existing,error:e1}=await window.bbSupabase.from('workout_exercises')
      .select('id').eq('workout_id',workoutId).eq('order_no',orderNo).maybeSingle();
    if(e1) throw e1;
    const names=[prescribedName,performedName];
    const {data: exs}=await window.bbSupabase.from('exercises').select('id,name').in('name',names);
    const idFor=n=>(exs||[]).find(x=>x.name===n)?.id||null;
    const payload={user_id:user.id,workout_id:workoutId,order_no:orderNo,
      prescribed_exercise_id:idFor(prescribedName),performed_exercise_id:idFor(performedName),
      prescribed_name:prescribedName,performed_name:performedName,technique:technique==='None'?null:technique};
    if(existing){
      const {error}=await window.bbSupabase.from('workout_exercises').update(payload).eq('id',existing.id);
      if(error) throw error; return existing.id;
    }
    const {data,error}=await window.bbSupabase.from('workout_exercises').insert(payload).select('id').single();
    if(error) throw error; return data.id;
  },
  async syncSet(state, exerciseIndex, setIndex, exercise, exerciseState, setData) {
    const user=await this.user(); if(!user) return {skipped:true};
    const workoutId=await this.ensureWorkout(state,state.workoutName||'Workout');
    const wxId=await this.ensureWorkoutExercise(workoutId,exerciseIndex+1,exercise.name,exerciseState.performed,exerciseState.technique);
    const payload={
      workout_exercise_id:wxId,workout_id:workoutId,user_id:user.id,set_no:setIndex+1,
      is_prescribed:setIndex < exercise.sets,
      load_value:setData.kg===''||setData.kg==null?null:Number(setData.kg),
      load_unit:'kg',load_kg:setData.kg===''||setData.kg==null?null:Number(setData.kg),
      reps:setData.reps===''||setData.reps==null?null:Number(setData.reps),
      rir:setData.rir===''||setData.rir==null?null:Number(setData.rir),
      technique:setData.technique|| (exerciseState.technique==='None'?null:exerciseState.technique),
      is_completed:!!setData.completed,
      completed_at:setData.completed?(setData.completedAt||new Date().toISOString()):null
    };
    const {error}=await window.bbSupabase.from('sets').upsert(payload,{onConflict:'workout_exercise_id,set_no'});
    if(error) throw error;
    return {workoutId,workoutExerciseId:wxId};
  },
  async finishWorkout(state) {
    const user=await this.user(); if(!user) return {skipped:true};
    const id=await this.ensureWorkout(state,state.workoutName||'Workout');
    const {error}=await window.bbSupabase.from('workouts').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
    if(error) throw error; return {id};
  },
  async coach(question, workoutState) {
    const user=await this.user(); if(!user) throw new Error('Sign in to Cloud Data before using AI Coach.');
    const {data,error}=await window.bbSupabase.functions.invoke('coach',{body:{question,workoutState}});
    if(error) {
      let msg=error.message||'Coach request failed';
      try { const body=await error.context?.json(); if(body?.error) msg=body.error; } catch {}
      throw new Error(msg);
    }
    if(data?.error) throw new Error(data.error);
    return data?.answer||'No coaching response returned.';
  }
,
  async role(){ const {data,error}=await window.bbSupabase.rpc('my_role'); if(error) throw error; return data; },
  async programme(){ const {data,error}=await window.bbSupabase.rpc('client_programme'); if(error) throw error; return data; },
  async claimInvite(code){ const {data,error}=await window.bbSupabase.rpc('claim_coach_invite',{p_code:code}); if(error) throw error; return data; },
  async saveOnboarding(form, membershipId=null){
    const user=await this.user(); if(!user) throw new Error('Sign in first.');
    const profile={id:user.id,display_name:form.display_name||user.email};
    let {error}=await window.bbSupabase.from('profiles').upsert(profile); if(error) throw error;
    const row={user_id:user.id,coach_client_id:membershipId||null,date_of_birth:form.date_of_birth||null,height_cm:form.height_cm?Number(form.height_cm):null,
      sex:form.sex||null,experience_level:form.experience_level||null,primary_goal:form.primary_goal||null,target_event:form.target_event||null,
      target_event_date:form.target_event_date||null,training_days_per_week:form.training_days_per_week?Number(form.training_days_per_week):null,
      session_minutes:form.session_minutes?Number(form.session_minutes):null,equipment_access:form.equipment_access||null,occupation_activity:form.occupation_activity||null,
      injuries_limitations:form.injuries_limitations||null,exercise_preferences:form.exercise_preferences||null,notes:form.notes||null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    ({error}=await window.bbSupabase.from('client_onboarding').upsert(row,{onConflict:'user_id'})); if(error) throw error; return row;
  },
  async onboarding(){ const user=await this.user(); if(!user)return null; const {data,error}=await window.bbSupabase.from('client_onboarding').select('*').eq('user_id',user.id).maybeSingle(); if(error)throw error; return data; },
  async createInvite(name,email){ const {data,error}=await window.bbSupabase.rpc('create_client_invite',{p_name:name||null,p_email:email||null}); if(error)throw error; return data?.[0]||null; },
  async coachClients(){ const {data,error}=await window.bbSupabase.rpc('coach_client_overview'); if(error)throw error; return data||[]; },
  async coachClientDetail(userId){ const {data,error}=await window.bbSupabase.rpc('coach_client_detail',{p_user:userId}); if(error)throw error; return data; },
  async coachProgramme(userId){ const {data,error}=await window.bbSupabase.rpc('coach_programme',{p_user:userId}); if(error)throw error; return data; },
  async exercises(){ const {data,error}=await window.bbSupabase.from('exercises').select('*').order('name'); if(error)throw error; return data||[]; },
  async createBlock(clientId,p){ const {data,error}=await window.bbSupabase.rpc('coach_create_block',{p_client:clientId,p_name:p.name,p_goal:p.goal,p_priority:p.priority||[],p_secondary:p.secondary||[],p_maintain:p.maintain||[],p_start:p.start||new Date().toISOString().slice(0,10),p_end:p.end||null}); if(error)throw error; return data; },
  async addSession(clientId,blockId,p){ const {data,error}=await window.bbSupabase.rpc('coach_add_session',{p_client:clientId,p_block:blockId,p_sequence:p.sequence,p_name:p.name,p_emphasis:p.emphasis||null,p_day:p.day||null}); if(error)throw error; return data; },
  async addSessionExercise(clientId,sessionId,p){ const {data,error}=await window.bbSupabase.rpc('coach_add_session_exercise',{p_client:clientId,p_session:sessionId,p_exercise:p.exercise_id,p_order:p.order,p_sets:p.sets,p_rep_min:p.rep_min,p_rep_max:p.rep_max,p_rir_start:p.rir_start,p_rir_end:p.rir_end,p_rest:p.rest,p_notes:p.notes||null,p_unit:p.unit||'kg'}); if(error)throw error; return data; },
  async latestMetrics(){ const user=await this.user(); if(!user)return []; const {data,error}=await window.bbSupabase.from('body_metrics').select('*').eq('user_id',user.id).order('recorded_at',{ascending:false}).limit(20); if(error)throw error; return data||[]; },
  async saveBodyMetrics(p){
    const user=await this.user(); if(!user)throw new Error('Sign in first.');
    const row={user_id:user.id,recorded_at:p.recorded_at||new Date().toISOString(),weight_kg:p.weight_kg??null,body_fat_pct:p.body_fat_pct??null,waist_cm:p.waist_cm??null,chest_cm:p.chest_cm??null,skeletal_muscle_kg:p.skeletal_muscle_kg??null,source:p.source||'manual',notes:p.notes||null};
    const {data,error}=await window.bbSupabase.from('body_metrics').insert(row).select().single(); if(error)throw error; return data;
  },
  async saveNutritionTargets(p){ const user=await this.user(); if(!user)throw new Error('Sign in first.'); const row={user_id:user.id,type:'nutrition_target',recorded_at:new Date().toISOString(),extracted_data:p,notes:'Nutrition target'}; const {data,error}=await window.bbSupabase.from('checkins').insert(row).select().single(); if(error)throw error; return data; },
  async latestNutritionTarget(){ const user=await this.user(); if(!user)return null; const {data,error}=await window.bbSupabase.from('checkins').select('*').eq('user_id',user.id).eq('type','nutrition_target').order('recorded_at',{ascending:false}).limit(1).maybeSingle(); if(error)throw error; return data?.extracted_data||null; },
  async cloudHistory(){ const user=await this.user(); if(!user)return []; const {data,error}=await window.bbSupabase.from('workouts').select('id,name,actual_date,started_at,completed_at,status,program_session_id,workout_exercises(performed_name,sets(load_value,load_unit,reps,rir,is_completed,set_no))').eq('user_id',user.id).order('completed_at',{ascending:false,nullsFirst:false}).order('started_at',{ascending:false,nullsFirst:false}).limit(30); if(error)throw error; return data||[]; }
};