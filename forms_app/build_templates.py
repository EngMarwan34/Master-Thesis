"""يبني قوالب فارغة (ورقة واحدة لكل نموذج) من ملفي الإكسل الأصليين.
تشغيله مرة واحدة فقط: python build_templates.py"""
import openpyxl

def make(src, sheet, dst, clear):
    wb = openpyxl.load_workbook(src)
    for ws in list(wb.worksheets):
        if ws.title != sheet:
            wb.remove(ws)
    ws = wb[sheet]
    for rng in clear:
        for row in ws[rng]:
            for c in row:
                if type(c).__name__ != "MergedCell":
                    c.value = None
    wb.save(dst)

# كشف الساعات الإضافية (من الملف الأول)
make("templates/_a.xlsx", "الساعات الاضافيه", "templates/overtime.xlsx",
     ["A12:A14", "D14:D14", "A10:A10", "B17:G30", "G31:G31"])
# بدل وجبة (من الملف الثاني) — العناوين تُكتب من البرنامج
make("templates/_b.xlsx", "الوجبات", "templates/meals.xlsx",
     ["A13:A16", "C20:I29", "H30:H30"])
# طلب شراء (من الملف الأول)
make("templates/_a.xlsx", "الوجبات", "templates/purchase.xlsx",
     ["D14:D17", "D19:D21", "D22:D22", "F22:F22", "H22:H22",
      "D24:D26", "D27:D27", "F27:F27", "H27:H27", "C31:I35", "I36:I36"])
print("done")
