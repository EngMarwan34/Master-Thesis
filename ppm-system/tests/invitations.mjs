import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const ts=await import(process.env.TYPESCRIPT_MODULE||'typescript');
const source=(await readFile(new URL('../supabase/functions/manage-technicians/index.ts',import.meta.url),'utf8')).replace(/import \{ createClient \} from [^;]+;/,'const createClient=globalThis.fakeCreateClient;');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let profile={role:'supervisor',branch:'المدينة',active:true},user={id:'supervisor'},calls=[],profileError=null,pending={},existing=null;
const context=vm.createContext({Request,Response,console,Deno:{env:{get:k=>({SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only'})[k]},serve:fn=>context.handler=fn},fakeCreateClient:(_url,key)=>{
 calls.push({key});if(key==='public')return {auth:{getUser:async()=>({data:{user},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})};
 return {auth:{admin:{inviteUserByEmail:async(email,options)=>{calls.push({email,options});return {data:{user:{id:'new-user'}},error:null};},getUserById:async()=>({data:{user:pending},error:null})}},from:()=>({insert:async row=>{calls.push({row});return {error:profileError};},select:()=>({eq:()=>({maybeSingle:async()=>({data:existing})})})})};
}});
vm.runInContext(compiled,context);
async function req(body,authorization='Bearer session',method='POST'){
 const headers={};if(authorization)headers.Authorization=authorization;return context.handler(new Request('https://example.test/functions/v1/manage-technicians',{method,headers,...(method==='POST'?{body:JSON.stringify(body)}:{})}));
}
const valid={full_name:'فني جديد',email:'technician@example.test',phone:'0550000000'};
assert.equal((await req(valid,null)).status,401);
profile={role:'technician',branch:'المدينة',active:true};assert.equal((await req(valid)).status,403);
profile={role:'supervisor',branch:'المدينة',active:false};assert.equal((await req(valid)).status,403);
assert.ok(!calls.some(c=>c.key==='server-only'),'No admin client before authorization');
profile.active=true;assert.equal((await req({...valid,email:'bad'})).status,400);
let result=await req({...valid,role:'supervisor',branch:'جدة'});assert.equal(result.status,200);
const row=calls.find(c=>c.row).row;assert.equal(row.branch,'المدينة');assert.equal(row.role,'technician');assert.equal(row.active,true);
assert.equal(calls.find(c=>c.email).options.redirectTo,'https://ppm-maintenance.netlify.app');
profileError={message:'temporary database error'};result=await req(valid);assert.equal(result.status,409);assert.equal((await result.json()).pending_user_id,'new-user');
const invitations=calls.filter(c=>c.email).length;pending={id:'new-user',user_metadata:{ppm_invited_by:'supervisor',ppm_branch:'المدينة'}};profileError=null;
assert.equal((await req({...valid,pending_user_id:'new-user'})).status,200);
assert.equal(calls.filter(c=>c.email).length,invitations,'Retry completes profile without sending a second invitation');
pending.user_metadata.ppm_branch='جدة';assert.equal((await req({...valid,pending_user_id:'new-user'})).status,403);
assert.equal((await req(valid,null,'OPTIONS')).status,200);
console.log('PASS authenticated active supervisors only, server-held administration, forced technician role/branch, validation and retry-safe invitation linking');
