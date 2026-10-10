// Deploy as manage-client-accounts. Administration credentials remain on the server.
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
    const body=await req.json(),name=typeof body.full_name==='string'?body.full_name.trim():'',phone=typeof body.phone==='string'?body.phone.trim():'';
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!name||name.length>100||phone.length>40||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||
      typeof body.client_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.client_id))
      return response({error:'تأكد من بيانات الحساب والعميل'},400);
    // Validate the client using the caller's RLS and branch before creating an admin client.
    const {data:client,error:clientError}=await caller.from('clients').select('id,branch').eq('id',body.client_id).single();
    if(clientError||!client||client.branch!==profile.branch)return response({error:'العميل لا يخص فرعك'},403);
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    let invitedId:string;
    if(body.pending_user_id){
      const {data:{user:pending},error}=await admin.auth.admin.getUserById(body.pending_user_id);
      const metadata=pending?.app_metadata;
      if(error||!pending||pending.email?.toLowerCase()!==email||metadata?.ppm_invited_by!==user.id||metadata?.ppm_branch!==profile.branch||
        metadata?.ppm_client_id!==client.id||metadata?.ppm_invite_role!=='client')return response({error:'دعوة غير صالحة لهذا العميل'},403);
      const {data:existing,error:existingError}=await admin.from('profiles').select('id').eq('id',pending.id).maybeSingle();
      if(existingError)return response({error:'تعذر التحقق من الحساب'},500);
      if(existing)return response({error:'الحساب مرتبط بالفعل'},409);
      invitedId=pending.id;
    }else{
      const siteUrl=Deno.env.get('PPM_SITE_URL')||'https://ppm-maintenance.netlify.app';
      const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:siteUrl,data:{full_name:name}});
      if(error||!data.user)return response({error:error?.message||'تعذر إرسال الدعوة'},400);
      invitedId=data.user.id;
      // app_metadata is server-controlled; user-editable metadata cannot authorize a retry.
      const {error:metadataError}=await admin.auth.admin.updateUserById(invitedId,{app_metadata:{ppm_invited_by:user.id,ppm_branch:profile.branch,ppm_client_id:client.id,ppm_invite_role:'client'}});
      if(metadataError)return response({error:'أُرسلت الدعوة لكن تعذر تجهيز الحساب. راجع الحساب في Supabase قبل إعادة الدعوة.'},500);
    }
    const {error}=await admin.from('profiles').insert({id:invitedId,full_name:name,phone:phone||null,role:'client',client_id:client.id,branch:profile.branch,active:true});
    if(error)return response({error:'أُرسلت الدعوة لكن تعذر ربط العميل. أعد المحاولة لإكمال الربط.',pending_user_id:invitedId},409);
    return response({ok:true,id:invitedId});
  }catch{return response({error:'تعذر تنفيذ الطلب'},500);}
});
