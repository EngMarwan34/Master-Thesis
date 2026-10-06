"""يبني site/templates.js و site/images.js من ملفي الإكسل الأصليين.
python tools/build_assets.py <overtime_purchase.xlsx> <meals.xlsx>"""
import base64, io, json, sys, openpyxl
from PIL import Image

A, B = sys.argv[1], sys.argv[2]

def make(src, sheet, clear):
    wb = openpyxl.load_workbook(src)
    for ws in list(wb.worksheets):
        if ws.title != sheet: wb.remove(ws)
    ws = wb[sheet]
    ws._images = []          # الصور تُضاف من المتصفح (exceljs لا يحافظ على القص)
    for rng in clear:
        for row in ws[rng]:
            for c in row:
                if type(c).__name__ != "MergedCell": c.value = None
    buf = io.BytesIO(); wb.save(buf)
    return base64.b64encode(buf.getvalue()).decode()

T = {
 "meals": make(B, "الوجبات", ["A13:A16","C20:I29","H30:H30"]),
 "purchase": make(A, "الوجبات", ["D14:D17","D19:D21","D22:D22","F22:F22","H22:H22","D24:D26","D27:D27","F27:F27","H27:H27","C31:I35","I36:I36"]),
}
open("site/templates.js","w").write("window.TEMPLATES="+json.dumps(T)+";")

def uri(img, fmt="JPEG"):
    b = io.BytesIO(); img.convert("RGB").save(b, fmt, quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

import zipfile
za, zb = zipfile.ZipFile(A), zipfile.ZipFile(B)
def img(z, n): return Image.open(io.BytesIO(z.read(n)))
m = img(zb, "xl/media/image2.jpeg"); w, h = m.size
meals = m.crop((int(w*.04189), int(h*.0403), int(w*(1-.04764)), int(h*(1-.85863))))
meals.thumbnail((1600, 1600))
I = {"new": uri(img(za, "xl/media/image2.jpg")),
     "meals": uri(meals),
     "check": uri(img(za, "xl/media/image3.jpeg"))}
open("site/images.js","w").write("window.IMG="+json.dumps(I)+";")
print({k: len(v) for k, v in T.items()}, {k: len(v) for k, v in I.items()})
