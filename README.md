# Master-Thesis

مستودع يضم بحث الماجستير (Retrofit Paper) وبيانات التكاليف، بالإضافة إلى موقع تعبئة النماذج.

## هيكل المشروع

```
Master-Thesis/
├── thesis/                     # البحث العلمي
│   ├── paper/
│   │   ├── Retrofit_Paper_V3_Revised.docx   # النسخة النهائية (Word)
│   │   └── Retrofit_Paper_V3_Revised.md     # نسخة نصية
│   └── data/
│       ├── package_costs_detailed_with_references.xlsx  # تفاصيل تكلفة البكجات + المراجع
│       └── package_costs_summary.md                     # ملخص التكاليف
├── site/                       # موقع تعبئة النماذج (ثابت، جاهز للنشر)
│   ├── index.html, app.js, style.css
│   ├── templates.js, images.js # مولَّدة من ملفات إكسل (انظر tools/)
│   └── lib/                    # المكتبات (ExcelJS, html2pdf)
└── tools/
    └── build_assets.py         # يبني templates.js و images.js للموقع
```

## الموقع
انظر [`site/README.md`](site/README.md) للتشغيل والنشر. مجلد `site/` لم يتغير مساره.
