-- =====================================================================
-- ترقية ١٩: يقدر العميل يطلب صيانة طارئة لجهاز بنفسه من صفحته (بدون
-- تحديد فني — يُكلَّف لاحقاً من المشرف)، ويصل للمشرف إشعار فوري.
-- آمنة للرجوع: لا تعديل على بيانات موجودة.
-- شغّلها بعد migration_018.
-- =====================================================================
begin;

-- طلب صيانة طارئة من العميل نفسه — لجهاز يتبع فرعه فقط، بدون فني
-- مُحدَّد (technician_id يبقى فارغاً حتى يكلّف المشرف أحداً).
create or replace function request_emergency_visit(p_asset_id uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare a assets%rowtype; new_id uuid;
begin
  if my_role() <> 'client' then raise exception 'Client access required'; end if;
  select * into a from assets where id = p_asset_id;
  if a.id is null or a.client_id is distinct from my_client() then
    raise exception 'Asset not found';
  end if;
  insert into visits(client_id, target_asset_id, visit_type, general_notes, status)
    values (a.client_id, p_asset_id, 'emergency', nullif(trim(p_note),''), 'draft')
    returning id into new_id;
  return new_id;
end $$;
revoke all on function request_emergency_visit(uuid,text) from public;
grant execute on function request_emergency_visit(uuid,text) to authenticated;

-- أضِف إشعار المشرفين عند طلب طارئة من العميل بدون فني محدَّد بعد
-- (الحالة الوحيدة غير المغطاة في الدالة القديمة، التي كانت تُشعِر
-- الفني فقط حين يكون محدَّداً أصلاً من نفس الإدراج).
create or replace function notify_visit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare branch_val text; client_name text; actor_name text; link text; msg text; r record;
begin
  select c.branch, c.name_ar into branch_val, client_name from clients c
    where c.id = coalesce(new.client_id, old.client_id);
  select full_name into actor_name from profiles where id = auth.uid();

  if tg_op = 'INSERT' and new.visit_type = 'emergency' and new.technician_id is not null then
    insert into notifications(profile_id, message, link)
      values (new.technician_id, 'طلب صيانة طارئة جديد: ' || coalesce(client_name,''), '#/visit/' || new.id);
  elsif tg_op = 'INSERT' and new.visit_type = 'emergency' and new.technician_id is null then
    for r in select id from profiles where role = 'supervisor' and branch = branch_val and active loop
      insert into notifications(profile_id, message, link)
        values (r.id, 'طلب صيانة طارئة من العميل: ' || coalesce(client_name,'') || ' — يحتاج تكليف فني', '#/visit/' || new.id);
    end loop;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'submitted' then
      link := '#/review/' || new.id;
      msg := coalesce(actor_name,'فني') || ' أرسل زيارة ' || coalesce(client_name,'') || ' للاعتماد';
      for r in select id from profiles where role = 'supervisor' and branch = branch_val and active loop
        insert into notifications(profile_id, message, link) values (r.id, msg, link);
      end loop;
    elsif new.status = 'approved' then
      link := '#/report/' || new.id;
      msg := 'اعتُمدت زيارة ' || coalesce(client_name,'');
      for r in
        select distinct tech_id from (
          select new.technician_id as tech_id
          union select technician_id from visit_technicians where visit_id = new.id
        ) t where tech_id is not null
      loop
        insert into notifications(profile_id, message, link) values (r.tech_id, msg, link);
      end loop;
    elsif new.status = 'rejected' then
      link := '#/visit/' || new.id;
      msg := 'أُعيدت زيارة ' || coalesce(client_name,'') || ' للتعديل'
        || case when new.reject_reason is not null then ': ' || new.reject_reason else '' end;
      for r in
        select distinct tech_id from (
          select new.technician_id as tech_id
          union select technician_id from visit_technicians where visit_id = new.id
        ) t where tech_id is not null
      loop
        insert into notifications(profile_id, message, link) values (r.tech_id, msg, link);
      end loop;
    end if;
  end if;
  return new;
end $$;

commit;
