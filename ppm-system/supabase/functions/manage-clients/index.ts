// Deploy to Supabase as manage-clients. Service-role key stays on the server.
// ينشئ حساب عميل (بريد وكلمة مرور مباشرة، بدون رابط دعوة) ويربطه بمنشأة
// واحدة أو أكثر ضمن فرع المشرف.
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
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    const password=typeof body.password==='string'?body.password:'';
    const clientIds=Array.isArray(body.client_ids)?body.client_ids.filter((x:unknown)=>typeof x==='string'):[];
    if(!name||name.length>100)return response({error:'أدخل اسماً صحيحاً'},400);
    if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return response({error:'أدخل بريدًا صحيحًا'},400);
    if(password.length<6||password.length>72)return response({error:'كلمة المرور يجب أن تكون ٦ أحرف على الأقل'},400);
    if(!clientIds.length)return response({error:'اختر منشأة واحدة على الأقل'},400);

    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});

    // تأكد أن كل المنشآت المختارة ضمن فرع هذا المشرف فعلاً
    const {data:allowedClients,error:clientsError}=await admin.from('clients').select('id').eq('branch',profile.branch).in('id',clientIds);
    if(clientsError)return response({error:'تعذر التحقق من المنشآت'},500);
    if((allowedClients||[]).length!==clientIds.length)return response({error:'إحدى المنشآت المختارة لا تتبع فرعك'},403);

    const {data:created,error:createError}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,user_metadata:{full_name:name}
    });
    if(createError||!created.user){
      const msg=/registered|exists/i.test(createError?.message||'')?'هذا البريد مُسجَّل بحساب آخر':(createError?.message||'تعذر إنشاء الحساب');
      return response({error:msg},400);
    }
    const newId=created.user.id;

    const {error:profileError}=await admin.from('profiles').insert({id:newId,full_name:name,role:'client',active:true});
    if(profileError){
      await admin.auth.admin.deleteUser(newId).catch(()=>{});
      return response({error:'تعذر إنشاء صلاحيات الحساب: '+profileError.message},500);
    }
    const {error:accessError}=await admin.from('client_access').insert(clientIds.map((cid:string)=>({profile_id:newId,client_id:cid})));
    if(accessError){
      await admin.from('profiles').delete().eq('id',newId).catch(()=>{});
      await admin.auth.admin.deleteUser(newId).catch(()=>{});
      return response({error:'تعذر ربط المنشآت بالحساب: '+accessError.message},500);
    }
    return response({ok:true,message:'أُنشئ حساب العميل',id:newId});
  }catch{return response({error:'تعذر تنفيذ الطلب'},500);}
});
