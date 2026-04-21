# 🏛️ מעקב חוקי הכנסת — Knesset Law Tracker

אתר בעברית (RTL) למעקב חוקי הכנסת עם נתונים חיים מה-API הרשמי.

## מבנה הקבצים

```
knesset-tracker/
├── public/
│   └── index.html          ← האתר עצמו
├── netlify/
│   └── functions/
│       └── knesset-proxy.js ← ה-proxy שמחבר ל-API
├── netlify.toml             ← הגדרות Netlify
└── README.md
```

## פריסה ב-Netlify

1. העלה את כל התיקיה ל-GitHub
2. ב-Netlify: New Site from Git → בחר את ה-repo
3. Build settings:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Deploy!

## API

מתחבר ל: `https://knesset.gov.il/Odata/ParliamentInfo.svc/`
