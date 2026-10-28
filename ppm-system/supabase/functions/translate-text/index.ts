// =====================================================================
// دالة Edge: ترجمة تقنية ثنائية الاتجاه (عربي ⇄ إنجليزي) لنصوص معدات
// المطابخ التجارية والتبريد والتكييف — ملاحظات الفني، القطع المطلوبة،
// التعليق المعتمد، وأسماء الأجهزة. تُستخدم من الفني والمشرف.
//
// تستلم مجموعة نصوص وتُرجع لكل نص: لغته الأصلية + نسخة عربية كاملة
// ونسخة إنجليزية كاملة، بالمصطلحات الفنية الثابتة نفسها دائماً.
//
// النشر (بدون سطر أوامر — عبر لوحة Supabase مباشرة):
//   1) Supabase ← Edge Functions ← Deploy a new function
//   2) اسم الدالة بالضبط: translate-text
//   3) الصق محتوى هذا الملف كاملاً في محرر الكود ثم اضغط Deploy
//   4) لا حاجة لإضافة أي Secret جديد — تستخدم ANTHROPIC_API_KEY نفسه
//      المُعدّ أصلاً لدالة fix-arabic-text (الأسرار مشتركة على مستوى
//      المشروع كامل). إن لم تكن مُعدّة من قبل، أضيفها من:
//      Edge Functions ← الدالة ← Secrets ← ANTHROPIC_API_KEY = sk-ant-...
//
// (أو عبر CLI: supabase functions deploy translate-text)
// =====================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.123.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.123.0/helpers/zod";
import { z } from "npm:zod@4.5.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TranslationSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    source_lang: z.enum(["ar", "en", "mixed", "empty"]),
    text_ar: z.string(),
    text_en: z.string(),
  })),
});

const SYSTEM_PROMPT = `أنت مترجم تقني متخصص في معدات المطابخ التجارية والتبريد والتكييف.
لكل نص تستلمه (قد يكون بالعربية، أو بالإنجليزية، أو خليطاً حقيقياً من الاثنين، أو فارغاً):

١) حدّد لغته الأصلية في source_lang:
   "ar" إن كان عربياً بالكامل تقريباً، "en" إن كان إنجليزياً بالكامل تقريباً،
   "mixed" إن كان خليطاً حقيقياً من الاثنين في الجملة نفسها، "empty" إن كان فارغاً أو مسافات فقط.

٢) أرجع نسخة عربية كاملة ونظيفة بالكامل في text_ar، ونسخة إنجليزية كاملة ونظيفة
   بالكامل في text_en. النسختان تحملان المعنى نفسه بالضبط ولا تُفقد منهما أي
   معلومة وردت في الأصل (مهما كانت لغته)، ولا تُضاف إليهما أي معلومة غير موجودة
   في الأصل. إن كان النص فارغاً أرجع النسختين فارغتين.

احتفظ تماماً بكل الأرقام والنسب والمقاسات ورموز الوحدات كما وردت بالضبط
(مثل 80%، R134، 100A، 4 م، 4 ملم، kW).

ترجمة تقنية دقيقة فقط، لا تلخيص ولا شرح ولا رأي شخصي.

استخدم المصطلحات الثابتة التالية دائماً، في كل مرة يتكرر فيها المصطلح:
gasket = جاسكت، hinge = مفصلة، thermostat = ثيرموستات، compressor = كمبروسر،
condenser = كوندنسر، selector switch = مفتاح اختيار، heating element = عنصر تسخين،
solenoid valve = صمام سولينويد، fan motor = موتور مروحة، refrigerant/freon = فريون،
body condition = حالة الهيكل.

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
    if (!profile || !["supervisor", "technician"].includes(profile.role)) {
      return json({ error: "هذا الإجراء متاح للفني أو المشرف فقط" }, 403);
    }

    const body = await req.json();
    const items: { id: string; text: string }[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return json({ items: [] });
    if (items.length > 100) return json({ error: "عدد النصوص كبير جداً في طلب واحد" }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY غير مُعدّ في أسرار الدالة" }, 500);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      output_config: { effort: "medium", format: zodOutputFormat(TranslationSchema) },
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
