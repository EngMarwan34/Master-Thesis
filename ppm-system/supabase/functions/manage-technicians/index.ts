// Deploy to Supabase as manage-technicians. Service-role key stays on the server.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return response({error:'POST only'},405);
  try{
    const authorization=req.headers.get('Authorization');if(!authorization)return response({error:'تسجيل الدخول مطلوب'},401);
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
    const {data:{user},error:authError}=await caller.auth.getUser();
    if(authError||!user)return response({error:'جلسة غير صالحة'},401);
    const {data:profile}=await caller.from('profiles').select('role,branch,active').eq('id',user.id).single();
    if(profile?.role!=='supervisor'||!profile.active||!profile.branch)return response({error:'متاح لمشرف الفرع فقط'},403);
    const body=await req.json();
    const name=typeof body.full_name==='string'?body.full_name.trim():'';
    const phone=typeof body.phone==='string'?body.phone.trim():'';
    if(!name||name.length>100||phone.length>40)return response({error:'تأكد من الاسم ورقم الهاتف'},400);
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    // Retry-safe linking: only a pending user previously invited by this supervisor.
    let invitedId:string;
    if(body.pending_user_id){
      const {data:{user:pending},error}=await admin.auth.admin.getUserById(body.pending_user_id);
      if(error||pending?.user_metadata?.ppm_invited_by!==user.id||pending?.user_metadata?.ppm_branch!==profile.branch)
        return response({error:'دعوة غير صالحة'},403);
      const {data:existing}=await admin.from('profiles').select('id').eq('id',pending.id).maybeSingle();
      if(existing)return response({error:'الحساب مرتبط بالفعل'},409);
      invitedId=pending.id;
    }else{
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return response({error:'أدخل بريدًا صحيحًا'},400);
      const siteUrl=Deno.env.get('PPM_SITE_URL')||'https://ppm-maintenance.netlify.app';
      const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:siteUrl,data:{full_name:name,ppm_invited_by:user.id,ppm_branch:profile.branch}});
      if(error||!data.user)return response({error:error?.message||'تعذر إرسال الدعوة'},400);
      invitedId=data.user.id;
    }
    const {error:profileError}=await admin.from('profiles').insert({id:invitedId,full_name:name,phone:phone||null,role:'technician',branch:profile.branch,active:true});
    if(profileError)return response({error:'أُرسلت الدعوة لكن تعذر ربط الصلاحيات. أعد المحاولة لإكمال الربط.',pending_user_id:invitedId},409);
    return response({ok:true,message:'أُرسلت دعوة للفني لتعيين كلمة مروره',id:invitedId});
  }catch{return response({error:'تعذر تنفيذ الطلب'},500);}
});
