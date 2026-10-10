// =====================================================================
// دالة Edge: تصحيح إملائي/نحوي لنصوص الفني (ملاحظات + قطع مطلوبة + توصيات)
// باستخدام Claude، دون تغيير المعنى أو الأرقام أو أسماء الأجهزة/القطع.
//
// يستدعيها المشرف فقط من شاشة "مراجعة الزيارة" (زر "✨ صحّح الكشف إملائياً").
// النص المصحَّح يُعرض في الحقول القابلة للتعديل — لا يُحفظ تلقائياً؛
// المشرف يراجعه ثم يضغط "اعتماد" ليُحفظ فعلياً.
//
// النشر (بدون سطر أوامر — عبر لوحة Supabase مباشرة):
//   1) Supabase ← Edge Functions ← Deploy a new function
//   2) اسم الدالة بالضبط: fix-arabic-text
//   3) الصق محتوى هذا الملف كاملاً في محرر الكود ثم اضغط Deploy
//   4) Edge Functions ← الدالة ← Secrets ← أضف:
//        ANTHROPIC_API_KEY = sk-ant-...  (من console.anthropic.com)
//
// (أو عبر CLI: supabase functions deploy fix-arabic-text
//              supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)
// =====================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.123.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.123.0/helpers/zod";
// zod v4 (not v3): the SDK's zodOutputFormat() calls the v4-only `z.toJSONSchema()`
// internally, so the schema below must come from an actual zod v4 install.
import { z } from "npm:zod@4.5.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CorrectionsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    corrected: z.string(),
  })),
});

const SYSTEM_PROMPT = `أنت مدقق لغوي لتقارير صيانة معدات فندقية/مطعمية مكتوبة بالعربية (وأحياناً مصطلحات إنجليزية).
صحّح فقط الأخطاء الإملائية والنحوية وعلامات الترقيم في كل نص تستلمه.
لا تُغيّر المعنى، ولا الأرقام، ولا الكميات، ولا أسماء الأجهزة أو القطع أو الوحدات (kW, R134A, V...)، ولا الأسلوب العام للجملة.
إن كان النص صحيحاً بالفعل أعده كما هو دون أي تغيير.
إن كان النص فارغاً أعده فارغاً.
أعد كل النصوص بنفس ترتيب وعدد العناصر المُرسلة، بنفس المعرّفات (id).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرَّح" }, 401);

    // تحقّق أن المستخدم الحالي "مشرف" فعلاً (وليس فقط الاعتماد على إخفاء الزر بالواجهة)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "جلسة غير صالحة" }, 401);

    const { data: profile } = await userClient
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "supervisor") {
      return json({ error: "هذا الإجراء متاح للمشرف فقط" }, 403);
    }

    const body = await req.json();
    const items: { id: string; text: string }[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return json({ items: [] });
    if (items.length > 200) return json({ error: "عدد الحقول كبير جداً في طلب واحد" }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY غير مُعدّ في أسرار الدالة" }, 500);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      output_config: { effort: "medium", format: zodOutputFormat(CorrectionsSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify({ items }) }],
    });

    if (!response.parsed_output) {
      return json({ error: "تعذّر تفسير رد الذكاء الاصطناعي" }, 502);
    }

    return json({ items: response.parsed_output.items });
  } catch (e) {
    console.error(e);
    return json({ error: e?.message || "خطأ غير متوقع" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
