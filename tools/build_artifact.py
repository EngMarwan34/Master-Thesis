"""يجمع الموقع في ملف HTML واحد لنشره كـ Artifact على claude.ai.
python tools/build_artifact.py <output.html>"""
import re, sys
r = lambda p: open(p, encoding="utf-8").read()
idx = r("site/index.html")
body = re.search(r"<header>.*?</div>\n(?=<script)", idx, re.S).group(0)
out = f"""<title>تعبئة النماذج</title>
<style>
{r('site/style.css')}
</style>
{body}
<script src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.14.0/dist/html2pdf.bundle.min.js"></script>
<script>{r('site/templates.js')}</script>
<script>{r('site/images.js')}</script>
<script>
{r('site/app.js')}
</script>
"""
open(sys.argv[1], "w", encoding="utf-8").write(out)
print(len(out) // 1024, "KB")
