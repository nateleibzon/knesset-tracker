
import { 
  KNS_Bill, 
  KNS_Status, 
  KNS_BillInitiator, 
  KNS_Person, 
  KNS_Mk,
  KNS_Faction,
  BillModel, 
  Tag, 
  InitiatorType,
  KNS_BillHistory,
  Initiator,
  PlatformAlignment
} from '../types';

const BASE_URL = "https://knesset.gov.il/Odata/ParliamentInfo.svc";

// --- Constants ---

// Known Coalition Factions for 25th Knesset (Approximation for matching)
const COALITION_PARTIES = [
    "הליכוד", 
    "שס", "ש\"ס", "התאחדות הספרדים שומרי תורה",
    "יהדות התורה", "יהדות התורה והשבת", "אגודת ישראל", "דגל התורה",
    "עוצמה יהודית", 
    "הציונות הדתית", 
    "נעם"
];

// --- Helpers ---

const determineTag = (statusDesc: string): Tag => {
  if (!statusDesc) return Tag.Proposed;
  if (statusDesc.includes('אושר כחוק') || statusDesc.includes('פרסום ברשומות')) return Tag.Passed;
  if (['נפלה', 'נמשכה', 'הוסרה', 'דיון מוקדם - הוסרה'].some(s => statusDesc.includes(s))) return Tag.Removed;
  return Tag.Proposed;
};

const isCoalitionParty = (partyName: string | null): boolean => {
    if (!partyName) return false;
    return COALITION_PARTIES.some(c => partyName.includes(c));
};

const buildOfficialUrl = (bill: KNS_Bill): string => {
  if (bill.LawID) {
    return `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/Law.aspx?lawitemid=${bill.LawID}`;
  }
  return `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/Bill.aspx?billid=${bill.ID}`;
};

const cleanText = (text: string | null): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>?/gm, '').trim(); // Remove HTML tags if any
};

// Simulation of alignment analysis
// In a real app, this would use AI to check the bill text against the party platform
const determineAlignment = (billId: number): PlatformAlignment => {
    // This is just a basic default for "Real API" mode where we don't have text analysis
    // The "Mock Mode" calculates this dynamically in PartyPlatforms based on text
    const r = billId % 10;
    if (r < 5) return PlatformAlignment.Aligned;
    if (r === 6) return PlatformAlignment.Conflicting;
    return PlatformAlignment.Neutral;
};

const WORKER_URL = 'https://knesset-proxy.nayte22.workers.dev';

/**
 * CORS Proxy Helper
 * Routes requests through our Cloudflare Worker (runs from Israeli edge = no geo-block).
 */
const fetchWithProxy = async (url: string) => {
    const path = url.replace(BASE_URL + '/', '');
    const proxyUrl = `${WORKER_URL}/?path=${encodeURIComponent(path)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
        throw new Error(`Proxy Fetch failed: ${res.status} ${res.statusText}`);
    }
    return res;
};

// --- Fetch Logic ---

export const fetchMetadata = async () => {
  try {
    // 1. Statuses
    const statusRes = await fetchWithProxy(`${BASE_URL}/KNS_Status?$select=StatusID,Desc&$top=500`);
    const statusData = await statusRes.json();
    const rawStatuses = (statusData?.d?.results || statusData?.value || []) as any[];
    const statuses: KNS_Status[] = rawStatuses.map(s => ({ StatusID: s.StatusID, StatusDesc: s.Desc || s.StatusDesc || 'לא ידוע' }));

    // 2. Latest Knesset
    const knessetRes = await fetchWithProxy(`${BASE_URL}/KNS_Bill?$select=KnessetNum&$orderby=KnessetNum desc&$top=1`);
    const knessetData = await knessetRes.json();
    const knessetRows = knessetData?.d?.results || knessetData?.value || [];
    const latestKnessetNum = knessetRows[0]?.KnessetNum || 25;

    return { statuses, latestKnessetNum, isMock: false };
  } catch (e) {
    console.warn("Live API failed, trying cached data:", e);
    try {
      const cachedRes = await fetch('/data/bill-status.json');
      const cachedData = await cachedRes.json();
      const rawStatuses = (cachedData?.d?.results || cachedData?.value || []) as any[];
      const statuses: KNS_Status[] = rawStatuses.map((s: any) => ({ StatusID: s.StatusID, StatusDesc: s.Desc || s.StatusDesc || 'לא ידוע' }));
      return { statuses, latestKnessetNum: 25, isMock: false };
    } catch (ce) {
      console.warn("Cache also failed:", ce);
    }
    return {
      statuses: [
        { StatusID: 1, StatusDesc: 'מונחת' },
        { StatusID: 2, StatusDesc: 'אושר כחוק' },
        { StatusID: 3, StatusDesc: 'הוסרה מסדר היום' }
      ],
      latestKnessetNum: 25,
      isMock: true
    };
  }
};

export const fetchBills = async (knessetNum: number, statuses: KNS_Status[]): Promise<{ bills: BillModel[], persons: Map<number, string>, history: KNS_BillHistory[], isMock: boolean }> => {
  try {
    // Fetch Bills (v3 field names: BillID, SummaryLaw, SubTypeDesc)
    const billsRes = await fetchWithProxy(`${BASE_URL}/KNS_Bill?$filter=KnessetNum eq ${knessetNum}&$select=BillID,Name,StatusID,KnessetNum,SubTypeDesc,PublicationDate,LastUpdatedDate,SummaryLaw&$orderby=LastUpdatedDate desc&$top=200`);

    const billsData = await billsRes.json();
    const rawBills = (billsData?.d?.results || billsData?.value || []) as any[];

    const billIds = rawBills.map(b => b.BillID);

    // Fetch Initiators & Related Info
    let rawInitiators: KNS_BillInitiator[] = [];
    let rawPersons: KNS_Person[] = [];
    let rawMks: KNS_Mk[] = [];
    let rawFactions: KNS_Faction[] = [];

    try {
      if (billIds.length > 0) {
        const idsToFetch = billIds.slice(0, 40);
        const initRes = await fetchWithProxy(`${BASE_URL}/KNS_BillInitiator?$filter=BillID in (${idsToFetch.join(',')})&$select=BillID,PersonID`);
        if (initRes.ok) {
          const initData = await initRes.json();
          rawInitiators = initData?.d?.results || initData?.value || [];
        }

        const personIds = Array.from(new Set(rawInitiators.map(i => i.PersonID)));

        if (personIds.length > 0) {
          const personRes = await fetchWithProxy(`${BASE_URL}/KNS_Person?$filter=PersonID in (${personIds.join(',')})&$select=PersonID,FullName`);
          if (personRes.ok) {
            const personData = await personRes.json();
            rawPersons = personData?.d?.results || personData?.value || [];
          }

          const mkRes = await fetchWithProxy(`${BASE_URL}/KNS_Mk?$filter=PersonID in (${personIds.join(',')})&$select=PersonID,CurrentFactionID`);
          if (mkRes.ok) {
            const mkData = await mkRes.json();
            rawMks = mkData?.d?.results || mkData?.value || [];
          }

          const factionIds = Array.from(new Set(rawMks.map(m => m.CurrentFactionID).filter(id => id !== null))) as number[];
          if (factionIds.length > 0) {
            const factionRes = await fetchWithProxy(`${BASE_URL}/KNS_Faction?$filter=FactionID in (${factionIds.join(',')})&$select=FactionID,Name`);
            if (factionRes.ok) {
              const factionData = await factionRes.json();
              rawFactions = factionData?.d?.results || factionData?.value || [];
            }
          }
        }
      }
    } catch (e) {
      console.warn('Initiator fetch failed, skipping:', e);
    }

    // Lookup Maps
    const statusMap = new Map(statuses.map(s => [s.StatusID, s.StatusDesc]));
    const personMap = new Map(rawPersons.map(p => [p.PersonID, p.FullName]));
    
    // Map MK -> FactionID
    const mkFactionMap = new Map(rawMks.map(m => [m.PersonID, m.CurrentFactionID]));
    // Map FactionID -> Name
    const factionNameMap = new Map(rawFactions.map(f => [f.FactionID, f.Name]));
    
    const bills: BillModel[] = rawBills.map(b => {
      const billId = b.BillID ?? b.ID;
      const statusDesc = statusMap.get(b.StatusID) || 'לא ידוע';
      const isGov = b.IsGovernmentBill ?? (b.SubTypeDesc || '').includes('ממשלתית');
      const summary = cleanText(b.SummaryLaw || b.Summary || null);
      const explanation = cleanText(b.Explanation || null);

      const relatedInitiators = rawInitiators.filter(i => i.BillID === billId);
      const initiatorIds = relatedInitiators.map(i => i.PersonID);

      const initiators: Initiator[] = relatedInitiators.map(i => {
          const name = personMap.get(i.PersonID) || 'לא ידוע';
          const factionId = mkFactionMap.get(i.PersonID);
          const party = factionId ? factionNameMap.get(factionId) || null : null;
          const role = mkFactionMap.has(i.PersonID) ? 'חבר כנסת' : null;
          return { id: i.PersonID, name, party, role };
      });

      const initiatorNames = initiators.map(i => i.name);

      let isCoalition = isGov;
      if (!isCoalition && initiators.length > 0) {
          const firstParty = initiators[0].party;
          if (firstParty && isCoalitionParty(firstParty)) isCoalition = true;
      }

      return {
        id: billId,
        name: b.Name,
        statusId: b.StatusID,
        statusDesc,
        knessetNum: b.KnessetNum,
        isGovernment: isGov,
        publicationDate: b.PublicationDate,
        lastUpdatedDate: b.LastUpdatedDate,
        summary,
        explanation,
        lawId: b.LawID || null,
        docId: b.DocID || null,
        tag: determineTag(statusDesc),
        initiatorType: isGov ? InitiatorType.Government : InitiatorType.Private,
        officialUrl: `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/Bill.aspx?billid=${billId}`,
        displaySummary: summary || explanation || 'אין תקציר זמין',
        initiators,
        initiatorIds,
        initiatorNames,
        isCoalition,
        platformAlignment: determineAlignment(billId)
      };
    });

    return { bills, persons: personMap, history: [], isMock: false };

  } catch (e) {
    console.warn("Live API failed for bills, trying cache:", e);
    try {
      const cachedRes = await fetch(`/data/bills-${knessetNum}.json`);
      const cachedData = await cachedRes.json();
      const statusMap = new Map(statuses.map(s => [s.StatusID, s.StatusDesc]));
      const rawBills = (cachedData?.d?.results || cachedData?.value || []) as any[];
      const bills: BillModel[] = rawBills.map(b => {
        const billId = b.BillID ?? b.ID;
        const statusDesc = statusMap.get(b.StatusID) || 'לא ידוע';
        const isGov = b.IsGovernmentBill ?? (b.SubTypeDesc || '').includes('ממשלתית');
        const summary = cleanText(b.SummaryLaw || b.Summary || null);
        return {
          id: billId, name: b.Name, statusId: b.StatusID, statusDesc,
          knessetNum: b.KnessetNum, isGovernment: isGov,
          publicationDate: b.PublicationDate, lastUpdatedDate: b.LastUpdatedDate,
          summary, explanation: '', lawId: null, docId: null,
          tag: determineTag(statusDesc),
          initiatorType: isGov ? InitiatorType.Government : InitiatorType.Private,
          officialUrl: `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/Bill.aspx?billid=${billId}`,
          displaySummary: summary || 'אין תקציר זמין',
          initiators: [], initiatorIds: [], initiatorNames: [],
          isCoalition: isGov, platformAlignment: determineAlignment(billId)
        };
      });
      return { bills, persons: new Map(), history: [], isMock: false };
    } catch (ce) {
      console.warn("Cache also failed:", ce);
    }
    const mockData = generateMockData(knessetNum, statuses);
    return { ...mockData, isMock: true };
  }
};


// --- MOCK GENERATOR (Fallback for CORS/Errors) ---

const MOCK_TEMPLATES = [
    {
        name: "הצעת חוק לתיקון פקודת התעבורה (מס' 134) (החמרת ענישה על הפקרת פצוע)",
        summary: "החמרת הענישה על נהגים המעורבים בתאונות 'פגע וברח' והפקרת פצועים.",
        current: "הענישה המקסימלית כיום נמוכה ואינה מייצרת הרתעה מספקת.",
        change: "העלאת רף הענישה המינימלי וקביעת מאסר חובה במקרים של הפקרה.",
        beneficiaries: "הולכי רגל, רוכבי אופניים, כלל הציבור"
    },
    {
        name: "הצעת חוק הגנת הצרכן (תיקון - ביטול עסקה מתמשכת)",
        summary: "הקלת היכולת לבטל עסקאות מתמשכות (כגון מנוי לחדר כושר או שירותי תקשורת) בלחיצת כפתור.",
        current: "חברות מקשות על צרכנים להתנתק ומחייבות המתנה ארוכה לנציג.",
        change: "חיוב חברות לאפשר ניתוק באותה דרך שבה בוצעה ההתקשרות (למשל באתר אינטרנט).",
        beneficiaries: "צרכנים, קשישים"
    },
    {
        name: "חוק החלת ריבונות בבקעת הירדן וההתיישבות ביהודה ושומרון",
        summary: "החלת החוק הישראלי על שטחי בקעת הירדן ועל היישובים היהודיים ביו\"ש.",
        current: "השטח נמצא תחת ממשל צבאי וללא ריבונות ישראלית מלאה.",
        change: "החלת החוק הישראלי באופן מלא, חיזוק ההתיישבות וקביעת גבול המזרח.",
        beneficiaries: "תושבי הבקעה, ההתיישבות"
    },
    {
        name: "חוק יסוד: לימוד תורה (ערך עליון)",
        summary: "עיגון לימוד התורה כערך יסוד במדינת ישראל והשוואת מעמד לומדי התורה.",
        current: "מעמד לומדי התורה אינו מוגן בחוק יסוד ועומד לביקורת שיפוטית.",
        change: "הכרה חוקתית בלימוד תורה, מניעת גיוס בכפייה והבטחת תקציבים לישיבות.",
        beneficiaries: "לומדי תורה, המגזר החרדי"
    },
    {
        name: "חוק נישואים אזרחיים וגירושין (ברית הזוגיות)",
        summary: "מתן אפשרות לכל אזרח להינשא בנישואים אזרחיים בישראל ללא תלות ברבנות.",
        current: "נישואים בישראל אפשריים רק דרך המוסדות הדתיים (רבנות, שרעיה וכו').",
        change: "פתיחת מסלול אזרחי לנישואין עבור פסולי חיתון וזוגות שאינם מעוניינים בטקס דתי.",
        beneficiaries: "פסולי חיתון, להט\"ב, זוגות חילונים"
    },
    {
        name: "חוק המאבק בפרוטקשן ובפשיעה החקלאית (החמרת ענישה)",
        summary: "קביעת עונשי מינימום לעבירות סחיטת דמי חסות ופשיעה חקלאית בנגב ובגליל.",
        current: "הענישה קלה מדי ואינה מייצרת הרתעה מול ארגוני הפשיעה.",
        change: "עונשי מאסר חובה וחילוט רכוש למורשעים בסחיטה, חיזוק המשילות בפריפריה.",
        beneficiaries: "חקלאים, בעלי עסקים בפריפריה"
    },
    {
        name: "חוק השוויון בנטל (גיוס לכולם)",
        summary: "חובת שירות צבאי או לאומי לכל אזרח ישראלי בהגיעו לגיל 18.",
        current: "קיימים פטורים נרחבים לאוכלוסיות שונות, מה שיוצר חוסר שוויון.",
        change: "ביטול פטורים גורפים, חיוב בשירות לכל המגזרים כולל חרדים וערבים (שירות אזרחי).",
        beneficiaries: "משרתי המילואים, החברה הישראלית"
    },
    {
        name: "חוק הקפאת משכנתאות לזוגות צעירים",
        summary: "מתן אפשרות להקפאת תשלומי משכנתא למשך שנה עבור זוגות צעירים שנקלעו לקשיים.",
        current: "הבנקים מקשים על זוגות צעירים ואין מנגנון מדינתי מחייב לסיוע.",
        change: "חיוב הבנקים לאפשר 'גרייס' של שנה ללא ריבית פיגורים במצבי משבר.",
        beneficiaries: "זוגות צעירים, מעמד הביניים"
    },
    {
        name: "חוק הרפורמה המשפטית (פסקת ההתגברות)",
        summary: "הסדרת היחסים בין הכנסת לבית המשפט העליון ומתן אפשרות לכנסת לחוקק חוקים שנפסלו.",
        current: "בג\"ץ יכול לפסול חוקים של הכנסת ללא יכולת ערעור של המחוקק.",
        change: "הכנסת תוכל להתגבר על פסילת חוק ברוב של 61 חברי כנסת.",
        beneficiaries: "הכנסת, הרוב הקואליציוני"
    },
    {
        name: "חוק קידום תחבורה ציבורית בשבת",
        summary: "מתן סמכות לרשויות מקומיות להפעיל תחבורה ציבורית בימי המנוחה.",
        current: "אין תחבורה ציבורית בשבת ברוב הארץ, מה שפוגע בשכבות החלשות.",
        change: "כל עירייה תוכל להחליט האם להפעיל קווים בשבת בהתאם לאופי האוכלוסייה.",
        beneficiaries: "חילונים, חסרי רכב פרטי, נוער"
    },
    {
        name: "חוק עונש מוות למחבלים",
        summary: "הטלת עונש מוות חובה על מחבלים שרצחו אזרחים ישראלים על רקע לאומני.",
        current: "ניתן להטיל עונש מוות רק במקרים נדירים וברוב פה אחד של שופטים צבאיים.",
        change: "חיוב בתי המשפט לגזור עונש מוות על רוצחים בפיגועי טרור.",
        beneficiaries: "משפחות שכולות, הרתעה לאומית"
    },
    {
        name: "חוק כרטיסי מזון וביטחון תזונתי",
        summary: "הקמת מיזם לאומי לביטחון תזונתי וחלוקת כרטיסי מזון נטענים למשפחות מתחת לקו העוני.",
        current: "הסיוע תלוי בעמותות ואינו מוסדר באופן ממשלתי קבוע.",
        change: "תקצוב קבוע בתקציב המדינה לחלוקת כרטיסי מזון לזכאים.",
        beneficiaries: "משפחות נזקקות, עוני"
    },
    {
        name: "חוק חינוך חינם לגיל הרך (0-3)",
        summary: "הרחבת חוק חינוך חובה חינם גם למעונות יום לפעוטות.",
        current: "חינוך חינם ניתן רק מגיל 3, והורים משלמים אלפי שקלים על מעונות.",
        change: "סבסוד מלא של מעונות היום המפוקחים לכל הילדים בישראל.",
        beneficiaries: "הורים עובדים, זוגות צעירים"
    },
    {
        name: "חוק הכרה בכפרים הבלתי מוכרים בנגב",
        summary: "הסדרה תכנונית וחיבור לתשתיות של כפרים בדואים בנגב.",
        current: "אלפי תושבים חיים ללא תשתיות בסיסיות כמו מים וחשמל.",
        change: "הכרה ביישובים, מתן היתרי בניה וחיבור לרשת החשמל.",
        beneficiaries: "החברה הבדואית, תושבי הנגב"
    },
     {
        name: "חוק מאבק באלימות במשפחה ופיקוח אלקטרוני",
        summary: "איזוק אלקטרוני לגברים מכים שיש נגדם צו הרחקה.",
        current: "צווי הרחקה מופרים תדיר ואין יכולת פיקוח אפקטיבית.",
        change: "מעקב GPS בזמן אמת אחרי גברים אלימים למניעת התקרבות לקורבנות.",
        beneficiaries: "נשים בסיכון, קורבנות אלימות"
    }
];

const generateMockData = (knessetNum: number, statuses: KNS_Status[]) => {
    const mockBills: BillModel[] = [];
    const personMap = new Map<number, string>();
    
    // Mock Persons with specific parties to test Coalition vs Opposition
    const mockPersons = [
        { id: 1, name: "ישראל ישראלי", party: "הליכוד", role: "חבר כנסת" }, // Coalition
        { id: 2, name: "משה כהן", party: "יש עתיד", role: "חבר כנסת" }, // Opposition
        { id: 3, name: "דוד לוי", party: "ש״ס", role: "חבר כנסת" }, // Coalition
        { id: 4, name: "שרה אהרונסון", party: "העבודה / הדמוקרטים", role: "חבר כנסת" }, // Opposition
        { id: 5, name: "בנימין זאב", party: "הציונות הדתית", role: "חבר כנסת" }, // Coalition
        { id: 6, name: "רונית שוחרת", party: "המחנה הממלכתי", role: "חבר כנסת" }, // Opposition
        { id: 7, name: "יוסי שר", party: "יש עתיד", role: "שר האוצר" }, // Just a role
        { id: 8, name: "איתמר בן-גביר", party: "עוצמה יהודית", role: "שר לביטחון לאומי" },
        { id: 9, name: "אביגדור ליברמן", party: "ישראל ביתנו", role: "חבר כנסת" },
        { id: 10, name: "מנסור עבאס", party: "רע״מ", role: "חבר כנסת" },
        { id: 11, name: "איימן עודה", party: "חד״ש-תע״ל", role: "חבר כנסת" }
    ];
    
    mockPersons.forEach(p => personMap.set(p.id, p.name));

    const statusMap = new Map(statuses.map(s => [s.StatusID, s.StatusDesc]));

    // GENERATE 500 BILLS FOR A REALISTIC "FULL" DATASET
    for (let i = 0; i < 500; i++) {
        const isGov = Math.random() > 0.7;
        const statusId = statuses[Math.floor(Math.random() * statuses.length)]?.StatusID || 1;
        const statusDesc = statusMap.get(statusId) || 'בדיקה';
        const date = new Date();
        // Spread dates over 2 years
        date.setDate(date.getDate() - Math.floor(Math.random() * 730));
        
        const id = 1000 + i;
        
        const template = MOCK_TEMPLATES[i % MOCK_TEMPLATES.length];

        // Pick 1-3 random initiators for private bills
        const billInitiators: Initiator[] = [];
        if (!isGov) {
            const count = Math.floor(Math.random() * 2) + 1;
            const startIdx = Math.floor(Math.random() * (mockPersons.length - count));
            for(let j=0; j<count; j++) {
                const p = mockPersons[(startIdx + j) % mockPersons.length];
                billInitiators.push({
                    id: p.id,
                    name: p.name,
                    party: p.party,
                    role: p.role
                });
            }
        } else {
            if (Math.random() > 0.5) {
                 billInitiators.push({
                    id: 7,
                    name: "יוסי שר",
                    party: "יש עתיד",
                    role: "שר האוצר"
                 });
            }
        }

        // Mock Coalition Logic
        let isCoalition = isGov;
        if (!isGov && billInitiators.length > 0) {
             const p = billInitiators[0].party;
             if (p && isCoalitionParty(p)) {
                 isCoalition = true;
             }
        }

        mockBills.push({
            id: id,
            name: template.name + ` (תיקון מס' ${i})`,
            statusId,
            statusDesc,
            knessetNum,
            isGovernment: isGov,
            publicationDate: date.toISOString(),
            lastUpdatedDate: date.toISOString(),
            summary: template.summary,
            explanation: `דברי הסבר מפורטים: ${template.current} ${template.change}`,
            lawId: i % 5 === 0 ? 5000 + i : null,
            docId: null,
            tag: determineTag(statusDesc),
            initiatorType: isGov ? InitiatorType.Government : InitiatorType.Private,
            officialUrl: `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/Bill.aspx?billid=${id}`,
            displaySummary: template.summary,
            initiators: billInitiators,
            initiatorIds: billInitiators.map(bi => bi.id),
            initiatorNames: billInitiators.map(bi => bi.name),
            isCoalition,
            platformAlignment: determineAlignment(id), // Injected simulated logic
            // Pre-populate mock AI data
            aiAnalysis: {
                currentSituation: template.current,
                proposedChange: template.change,
                beneficiaryPopulation: template.beneficiaries
            }
        });
    }
    
    return { bills: mockBills, persons: personMap, history: [] };
}
