
const SUPABASE_URL = 'https://wdlnsnfxylpbedlsmiuu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EikNG5u7neTg3rPybU0Sug_UrUv5x8Y';
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
    const {data: exs} = await window.bbSupabase.from('exercises').select('id').eq('name',exerciseName).limit(1);
    if(!exs?.length) return [];
    const {data: wes} = await window.bbSupabase.from('workout_exercises')
      .select('id').eq('user_id',user.id).or(`performed_exercise_id.eq.${exs[0].id},prescribed_exercise_id.eq.${exs[0].id}`);
    if(!wes?.length) return [];
    const ids=wes.map(x=>x.id);
    const {data} = await window.bbSupabase.from('sets')
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
,
  async ensureWorkout(state, name='Shoulders + Arms') {
    const user=await this.user(); if(!user) throw new Error('Sign in to Cloud Data first.');
    let {data: existing,error:e1}=await window.bbSupabase.from('workouts')
      .select('id').eq('user_id',user.id).eq('client_session_id',state.sessionId).maybeSingle();
    if(e1) throw e1;
    if(existing) return existing.id;
    const {data,error}=await window.bbSupabase.from('workouts').insert({
      user_id:user.id, client_session_id:state.sessionId, name,
      actual_date:new Date(state.startedAt).toISOString().slice(0,10),
      started_at:state.startedAt, status:'in_progress'
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
    const workoutId=await this.ensureWorkout(state);
    const wxId=await this.ensureWorkoutExercise(workoutId,exerciseIndex+1,exercise.name,exerciseState.performed,exerciseState.technique);
    const payload={
      workout_exercise_id:wxId,workout_id:workoutId,user_id:user.id,set_no:setIndex+1,
      is_prescribed:setIndex < exercise.sets,
      load_value:setData.kg===''||setData.kg==null?null:Number(setData.kg),
      load_unit:'kg',load_kg:setData.kg===''||setData.kg==null?null:Number(setData.kg),
      reps:setData.reps===''||setData.reps==null?null:Number(setData.reps),
      rir:setData.rir===''||setData.rir==null?null:Number(setData.rir),
      technique:exerciseState.technique==='None'?null:exerciseState.technique,
      is_completed:!!setData.completed,
      completed_at:setData.completed?(setData.completedAt||new Date().toISOString()):null
    };
    const {error}=await window.bbSupabase.from('sets').upsert(payload,{onConflict:'workout_exercise_id,set_no'});
    if(error) throw error;
    return {workoutId,workoutExerciseId:wxId};
  },
  async finishWorkout(state) {
    const user=await this.user(); if(!user) return {skipped:true};
    const id=await this.ensureWorkout(state);
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

};
