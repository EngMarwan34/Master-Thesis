// =====================================================================
// دالة Edge: تحويل اسم فني عربي كامل إلى تهجئته الشائعة بالحروف
// اللاتينية (كما تُكتب عادة في جوازات السفر والتقارير الخليجية)،
// احتياطياً فقط عندما يترك المشرف خانة الاسم الإنجليزي فارغة.
//
// النشر (بدون سطر أوامر — عبر لوحة Supabase مباشرة):
//   1) Supabase ← Edge Functions ← Deploy a new function
//   2) اسم الدالة بالضبط: transliterate-name
//   3) الصق محتوى هذا الملف كاملاً في محرر الكود ثم اضغط Deploy
//   4) لا حاجة لإضافة أي Secret جديد — تستخدم ANTHROPIC_API_KEY نفسه
//      المُعدّ أصلاً لدوال الترجمة الأخرى (الأسرار مشتركة على مستوى
//      المشروع كامل).
// =====================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.123.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.123.0/helpers/zod";
import { z } from "npm:zod@4.5.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NameSchema = z.object({
  items: z.array(z.object({ id: z.string(), name_en: z.string() })),
});

const SYSTEM_PROMPT = `أنت متخصص بكتابة الأسماء العربية الكاملة بالحروف اللاتينية
بالتهجئة الشائعة المعتادة في جوازات السفر والتقارير الرسمية الخليجية — وليس
ترجمة أو تفسيراً. لكل اسم تستلمه:

- أعد نفس الاسم بالحروف اللاتينية فقط، بنفس عدد الكلمات وترتيبها بالضبط.
- اجعل أول حرف من كل كلمة كبيراً (Title Case)، وباقي الحروف صغيرة.
- لا تُضف ولا تحذف أي جزء من الاسم، ولا تُترجم معناه.
- استخدم التهجئة الأكثر شيوعاً لكل اسم (مثال: علي = Ali، عدنان = Adnan،
  عمر = Omar، فاروق = Farouk، مصطفى = Mustafa، بسطاوي = Bastawi،
  محمد = Mohammed، عبدالله = Abdullah).

أرجع كل العناصر بنفس الترتيب وعدد العناصر المُرسلة، بنفس المعرّفات (id).`;

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "جلسة غير صالحة" }, 401);

    const { data: profile } = await userClient
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || profile.role !== "supervisor") {
      return json({ error: "هذا الإجراء متاح للمشرف فقط" }, 403);
    }

    const body = await req.json();
    const items: { id: string; text: string }[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return json({ items: [] });
    if (items.length > 50) return json({ error: "عدد الأسماء كبير جداً في طلب واحد" }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY غير مُعدّ في أسرار الدالة" }, 500);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(NameSchema) },
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
