/*
  data/courses.js
  ----------------------------------------------------------------
  كل بيانات الموقع هنا. لإضافة مادة: أضف كائناً واحداً في COURSES.
  لإضافة محاضرة: أضف كائناً في مصفوفة lectures الخاصة بالمادة.

  تسمية الملفات (كلها PDF) ومكانها داخل مجلد files/ :
      files/الكورس/المحاضرة-رقم-عنوان.pdf
  مثال على المسار الذي تكتبه في path (نسبةً إلى مجلد files/):
      "تشريح-التنفس/المحاضرة-1-مقدمة.pdf"

  مثال محاضرة (انسخه داخل lectures عند رفع أول ملف):
      {
        number: 1,
        title: "Introduction",          // العنوان كما هو في الملف (إنجليزي)
        titleAr: "مقدمة",               // اختياري
        files: [
          {
            label: "Slides",
            path: "تشريح-التنفس/المحاضرة-1-مقدمة.pdf",
            added: "2026-10-20"         // اختياري: تاريخ الرفع، لقسم "آخر الملفات المضافة"
          }
        ]
      }

  حقل pron (اختياري) نطق العنوان بحروف عربية، مقسوماً بشرطات، ويظهر تحت العنوان:
        pron: "أوفر-فيو أوف ذي إي-ميون سس-تم"

  حقل credits هو الدرجات (نظري، عملي، المجموع) وليس ساعات معتمدة،
  ومجموعها لكل المواد هو درجة الكورس كاملاً.

  حقل icon يحدد الأيقونة: lungs, kidney, flask, hormone, shield, leaf,
  book, quill, dumbbell, heart, droplet, chat, crescent
*/

const SITE = {
  title: "مواد الطلاب الدوليين",
  subtitle: "كل ملفات الكورس الثالث في مكان واحد. اختر المادة، ثم المحاضرة، وافتح الملف.",
  filesBase: "files/",
  disclaimer:
    "موقع غير رسمي من إعداد طالب، ولا يمثل الجامعة. سيبقى هذا التنويه حتى تؤكد الجامعة الموقع رسمياً.",
  university: {
    name: "جامعة بابل للعلوم الطبية",
    nameEn: "Babol University of Medical Sciences",
    nameFa: "دانشگاه علوم پزشکی بابل",
    // مسار صورة الجامعة داخل المجلد، مثل "assets/university.jpg".
    // اتركه فارغاً حتى تضع الصورة، فلا يظهر شيء مكسور.
    image: "assets/university.webp",
    imageWidth: 1400,
    imageHeight: 714,
    imageAlt: "المدخل الرئيسي لجامعة بابل للعلوم الطبية"
  }
};

const SEMESTERS = [
  { id: 3, name: "الكورس الثالث", nameEn: "3rd semester" }
];

const CATEGORIES = [
  // layout: "folders" = أضابير بارزة، "list" = قائمة مختصرة
  { id: "basic", name: "العلوم الطبية الأساسية", nameEn: "Basic medical sciences", layout: "folders" },
  { id: "general", name: "المواد العامة", nameEn: "General subjects", layout: "list" }
];

const COURSES = [
  /* ---------- المواد العامة ---------- */
  {
    id: "medical-manners-1",
    semester: 3,
    category: "general",
    icon: "heart",
    name: "Medical manners 1",
    nameAr: "آداب المهنة الطبية 1",
    code: "1111141",
    credits: { theory: 0, practical: 0.5, total: 0.5 },
    professors: [{ name: "Dr. Ramezani" }],
    lectures: []
  },
  {
    id: "medical-manners-2",
    semester: 3,
    category: "general",
    icon: "heart",
    name: "Medical manners 2",
    nameAr: "آداب المهنة الطبية 2",
    code: "1111142",
    credits: { theory: 0, practical: 0.5, total: 0.5 },
    professors: [{ name: "Dr. Azizi" }],
    lectures: []
  },
  {
    id: "general-english",
    semester: 3,
    category: "general",
    icon: "chat",
    name: "General English",
    nameAr: "اللغة الإنجليزية العامة",
    code: "11114418",
    credits: { theory: 2, practical: 0, total: 2 },
    professors: [{ name: "Dr. Shams" }],
    lectures: []
  },
  {
    id: "islamic-thought-2",
    semester: 3,
    category: "general",
    icon: "crescent",
    name: "Islamic thought 2",
    nameAr: "الفكر الإسلامي 2",
    code: "1114433",
    credits: { theory: 2, practical: 0, total: 2 },
    professors: [{ name: "Dr. Yadolahpour" }],
    lectures: []
  },
  {
    id: "persian-literature-preliminary-3",
    semester: 3,
    category: "general",
    icon: "quill",
    name: "Persian literature Preliminary3",
    nameAr: "الأدب الفارسي (تمهيدي 3)",
    code: "1114462",
    credits: { theory: 0, practical: 2, total: 2 },
    professors: [{ name: "Dr. Mohammadzade" }],
    lectures: []
  },
  {
    id: "physical-training-2",
    semester: 3,
    category: "general",
    icon: "dumbbell",
    name: "Physical Training2",
    nameAr: "التربية البدنية 2",
    code: "1114420",
    credits: { theory: 0, practical: 1, total: 1 },
    professors: [
      { name: "Mr. Abedi", role: "Boys" },
      { name: "Mrs. Shirkhani", role: "Girls" }
    ],
    lectures: []
  },

  /* ---------- العلوم الطبية الأساسية ---------- */
  {
    id: "anatomy-respiratory",
    semester: 3,
    category: "basic",
    icon: "lungs",
    name: "Anatomy of the respiratory System",
    nameAr: "تشريح الجهاز التنفسي",
    code: "1111105",
    credits: { theory: 0.47, practical: 0.25, total: 0.72 },
    professors: [
      { name: "Dr. Babazadeh", role: "histo" },
      { name: "Dr. Jorsaraei", role: "embryo & anatomy" }
    ],
    lectures: []
  },
  {
    id: "anatomy-urogenital",
    semester: 3,
    category: "basic",
    icon: "droplet",
    name: "Anatomy of the Urogenital System",
    nameAr: "تشريح الجهاز البولي التناسلي",
    code: "1111110",
    credits: { theory: 0.85, practical: 0.25, total: 1.1 },
    professors: [
      { name: "Dr. Feyzi", role: "histo" },
      { name: "Dr. Noshadian", role: "embryo & anatomy" }
    ],
    lectures: []
  },
  {
    id: "physiology-respiratory",
    semester: 3,
    category: "basic",
    icon: "lungs",
    name: "Physiology of respiratory",
    nameAr: "فسيولوجيا الجهاز التنفسي",
    code: "1111713",
    credits: { theory: 0.59, practical: 0.12, total: 0.71 },
    professors: [{ name: "Dr. Khaleghzade" }],
    lectures: []
  },
  {
    id: "physiology-kidney",
    semester: 3,
    category: "basic",
    icon: "kidney",
    name: "Physiology of Kidney",
    nameAr: "فسيولوجيا الكلية",
    code: "22222252",
    credits: { theory: 0.7, practical: 0.12, total: 0.82 },
    professors: [{ name: "Dr. Ashrafpour" }],
    lectures: []
  },
  {
    id: "biochemistry-hormones",
    semester: 3,
    category: "basic",
    icon: "hormone",
    name: "Biochemistry of Hormones",
    nameAr: "الكيمياء الحيوية للهرمونات",
    code: "22222253",
    credits: { theory: 0.71, practical: 0, total: 0.71 },
    professors: [{ name: "Dr. Ghojagh" }],
    lectures: []
  },
  {
    id: "biochemistry-kidney",
    semester: 3,
    category: "basic",
    icon: "flask",
    name: "Biochemistry of Kidney",
    nameAr: "الكيمياء الحيوية للكلية",
    code: "22222254",
    credits: { theory: 0.24, practical: 0, total: 0.24 },
    professors: [{ name: "Dr. Halalkhor" }],
    lectures: []
  },
  {
    id: "medical-immunology",
    semester: 3,
    category: "basic",
    icon: "shield",
    name: "Medical immunology",
    nameAr: "المناعة الطبية",
    code: "11111131",
    credits: { theory: 1.8, practical: 0.2, total: 2 },
    professors: [
      { name: "Dr. Mohammadnia" },
      { name: "Dr. Shahbazi" },
      { name: "Dr. Nori" }
    ],
    lectures: [
      {
        number: 1,
        title: "Overview of the Immune System",
        titleAr: "نظرة عامة على الجهاز المناعي",
        pron: "أوفر-فيو أوف ذي إي-ميون سس-تم",
        files: [
          {
            label: "Slides (Dr. Shahbazi)",
            path: "المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf",
            added: "2026-10-13"
          }
        ]
      }
    ]
  },
  {
    id: "nutrition-principles",
    semester: 3,
    category: "basic",
    icon: "leaf",
    name: "General Principles of nutrition",
    nameAr: "المبادئ العامة للتغذية",
    code: "11111125",
    credits: { theory: 2, practical: 0, total: 2 },
    professors: [{ name: "Dr. Sajadi" }, { name: "Dr. Ghadimi" }],
    lectures: []
  }
];
