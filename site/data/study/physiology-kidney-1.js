/*
  data/study/physiology-kidney-1.js
  ----------------------------------------------------------------
  اختبار تفاعلي لمحاضرة: Physiology of Kidney، المحاضرة 1 (Dr. Ashrafpour).
  المصدر: 31 سؤالاً من ملف الأسئلة المرفوع (أسئلة الدكتور، وفصل Guyton 26، والامتحانات السابقة).
  تم تصحيح السؤال 20: الإجابة الصحيحة هي الكأس الصغير (Minor calyx).

  قواعد الكتابة (يتحقق منها tests/data_check.js):
    - en: الجملة الإنجليزية من المادة، وتظهر في سطر مستقل.
    - ar و trick و why: عربي فقط بلا أي حرف لاتيني.
    - لكل معلومة (fact) حيلة حفظ (trick).
    - quiz: أسئلة اختيار من متعدد، وanswer رقم الخيار الصحيح بدءاً من 0.
*/
window.STUDY = window.STUDY || {};
STUDY["physiology-kidney-1"] = {
  topics: [
    // مربع واحد يضم أسئلة السنوات السابقة الـ31 (يظهر أولاً).
    {
      "id": "exam",
      "term": "Kidney Exam",
      "title": "الاختبار التفاعلي",
      "facts": [],
      "quiz": [
        {
          "q": "The primary means of eliminating most metabolic waste products is the:",
          "options": [
            "Lungs",
            "Liver",
            "Kidneys",
            "Skin"
          ],
          "answer": 2,
          "why": "الكلية هي الوسيلة الأساسية لإخراج معظم فضلات الأيض، والكبد والرئتان لا تقومان بهذا الدور بالكامل."
        },
        {
          "q": "Which waste product comes from creatine in skeletal muscle?",
          "options": [
            "Urea",
            "Creatinine",
            "Uric acid",
            "Bilirubin"
          ],
          "answer": 1,
          "why": "الكرياتينين يتكون من الكرياتين الموجود في العضلات الهيكلية."
        },
        {
          "q": "Uric acid is produced mainly from the breakdown of:",
          "options": [
            "Amino acids",
            "Creatine",
            "Nucleic acids",
            "Hemoglobin"
          ],
          "answer": 2,
          "why": "حمض اليوريك يأتي من تكسير الأحماض النووية، وهي البيورينات."
        },
        {
          "q": "Bilirubin is an end product of the breakdown of:",
          "options": [
            "Hemoglobin",
            "Creatine",
            "Glucose",
            "Urea"
          ],
          "answer": 0,
          "why": "البيليروبين ناتج تكسر الهيموغلوبين، وتطرحه الكلية."
        },
        {
          "q": "The kidneys are the ONLY way to eliminate which of the following acids?",
          "options": [
            "Carbonic acid (CO2 with water)",
            "Sulfuric acid",
            "Lactic acid",
            "Acetone"
          ],
          "answer": 1,
          "why": "الكلية هي الطريقة الوحيدة لإخراج بعض الأحماض مثل الكبريتيك والفوسفوريك الناتجة من تكسير البروتين."
        },
        {
          "q": "When ADH is high, what happens in the collecting ducts?",
          "options": [
            "Water excretion increases",
            "Water reabsorption increases",
            "Sodium excretion increases",
            "No change"
          ],
          "answer": 1,
          "why": "الهرمون المضاد لإدرار البول يزيد نفاذية الأنابيب الجامعة للماء، فيعود الماء إلى الدم وينتج بول أقل وأكثر تركيزاً."
        },
        {
          "q": "Lack of ADH causes which condition?",
          "options": [
            "Diabetes insipidus",
            "Hyperkalemia",
            "Acidosis",
            "Anemia"
          ],
          "answer": 0,
          "why": "نقص الهرمون المضاد لإدرار البول يسبب بولاً كثيراً ومخففاً مع عطش شديد."
        },
        {
          "q": "Which is the main positive ion inside cells?",
          "options": [
            "Sodium",
            "Potassium",
            "Chloride",
            "Calcium"
          ],
          "answer": 1,
          "why": "البوتاسيوم هو الأيون الموجب الرئيسي داخل الخلايا، والصوديوم هو الرئيسي خارجها."
        },
        {
          "q": "Hyperkalemia (high potassium) can cause which dangerous complication?",
          "options": [
            "Cardiac arrhythmias",
            "Jaundice",
            "Bone fracture",
            "Anemia"
          ],
          "answer": 0,
          "why": "ارتفاع البوتاسيوم في الدم يغير النشاط الكهربائي للقلب ويسبب اضطراب النظم."
        },
        {
          "q": "After a sudden 10-fold increase in sodium intake, sodium excretion becomes equal to intake within:",
          "options": [
            "2 hours",
            "2 to 3 days",
            "2 weeks",
            "It never happens"
          ],
          "answer": 1,
          "why": "بعد زيادة الصوديوم في الغذاء يحتاج الجسم إلى يومين أو ثلاثة حتى يساوي الإخراج الدخول."
        },
        {
          "q": "Compared with the lungs, the kidneys regulate acid-base balance:",
          "options": [
            "Faster, within minutes",
            "Slower, over hours to days",
            "Only during sleep",
            "Not at all"
          ],
          "answer": 1,
          "why": "الرئتان تغيران إخراج ثاني أكسيد الكربون بسرعة، أما الكلية فتعدل البيكربونات وإخراج الحمض ببطء، من ساعات إلى أيام."
        },
        {
          "q": "Sodium-hydrogen exchange in the proximal tubule is needed for:",
          "options": [
            "Reabsorption of bicarbonate",
            "Excretion of glucose",
            "Production of renin",
            "Secretion of ADH"
          ],
          "answer": 0,
          "why": "البيكربونات تعبر الغشاء الراسي للخلية الظهارية للتوبول القريب بالاعتماد على تبادل الصوديوم مع الهيدروجين."
        },
        {
          "q": "The kidney cells that secrete renin are the:",
          "options": [
            "Macula densa cells",
            "Granular cells",
            "Podocytes",
            "Mesangial cells"
          ],
          "answer": 1,
          "why": "الخلايا الحبيبية في الجهاز المجاور للكبيبة هي التي تصنع وتفرز الرينين."
        },
        {
          "q": "Which kidney hormone stimulates red blood cell production in the bone marrow?",
          "options": [
            "Renin",
            "Calcitriol",
            "Erythropoietin",
            "ADH"
          ],
          "answer": 2,
          "why": "الكلية تفرز الإريثروبويتين الذي ينشط إنتاج خلايا الدم الحمراء في نخاع العظم."
        },
        {
          "q": "The active form of vitamin D produced by the kidney is:",
          "options": [
            "25-hydroxyvitamin D",
            "1,25-dihydroxyvitamin D3 (calcitriol)",
            "Vitamin D2",
            "Renin"
          ],
          "answer": 1,
          "why": "الكلية تحوّل الشكل المخزون إلى الشكل النشط 1,25 عند الموضع رقم 1 من الهيدروكسيل."
        },
        {
          "q": "Each human kidney contains about how many nephrons?",
          "options": [
            "10,000",
            "100,000",
            "1,000,000",
            "10,000,000"
          ],
          "answer": 2,
          "why": "كل كلية تحتوي تقريباً على مليون نيفرون، ولا تتجدد هذه النيفرونات بعد الولادة."
        },
        {
          "q": "The renal functional unit is the:",
          "options": [
            "Glomerulus",
            "Nephron",
            "Ureter",
            "Papilla"
          ],
          "answer": 1,
          "why": "النيفرون هو الوحدة الوظيفية للكلية، لأنه وحده يكوّن البول."
        },
        {
          "q": "Which nephrons have vasa recta around their long loops of Henle?",
          "options": [
            "Cortical nephrons",
            "Juxtamedullary nephrons",
            "Superficial nephrons only",
            "Collecting ducts"
          ],
          "answer": 1,
          "why": "النيفرونات المجاورة للنخاع لها حلقات هنلة طويلة ومعها الأوعية المستقيمة، وتشكل نحو 20 إلى 30 بالمئة من النيفرونات."
        },
        {
          "q": "The macula densa is located at the end of the:",
          "options": [
            "Descending thin limb",
            "Thick ascending limb",
            "Proximal tubule",
            "Collecting duct"
          ],
          "answer": 1,
          "why": "بقعة الكثافة توجد في نهاية الفرع الصاعد السميك لحلقة هنلة."
        },
        {
          "q": "Urine flows from the papilla to which structure next?",
          "options": [
            "Minor calyx",
            "Major calyx",
            "Renal pelvis",
            "Ureter"
          ],
          "answer": 0,
          "why": "البول يمر من الحليمة إلى الكأس الصغير أولاً، ثم الكأس الكبير، ثم الحوض، ثم الحالب."
        },
        {
          "q": "Renal blood flow in a normal adult at rest is about:",
          "options": [
            "500 mL/min",
            "1100 mL/min",
            "3000 mL/min",
            "5000 mL/min"
          ],
          "answer": 1,
          "why": "الكلية تستقبل حوالي 22 بالمئة من الناتج القلبي، أي حوالي 1100 مل في الدقيقة."
        },
        {
          "q": "The highest hydrostatic pressure (about 60 mmHg) is found in the:",
          "options": [
            "Glomerular capillaries",
            "Peritubular capillaries",
            "Renal vein",
            "Ureter"
          ],
          "answer": 0,
          "why": "الضغط داخل الشعيرات الكبيبية حوالي 60 ملم زئبق، وهو عالٍ ليدفع الترشيح، أما الشعيرات حول الأنابيب فحوالي 13 ملم زئبق."
        },
        {
          "q": "Which substance is normally NOT filtered at the glomerulus?",
          "options": [
            "Water",
            "Glucose",
            "Plasma proteins (albumin)",
            "Sodium"
          ],
          "answer": 2,
          "why": "الترشيح يسمح بالماء والأملاح والجلوكوز واليوريا، لكن البروتينات الكبيرة والخلايا الحمراء تبقى في الدم."
        },
        {
          "q": "Which substance is freely filtered and completely reabsorbed, so it does not appear in urine?",
          "options": [
            "Creatinine",
            "Glucose",
            "Urea",
            "Uric acid"
          ],
          "answer": 1,
          "why": "الجلوكوز يُرشَّح بالكامل ثم يُعاد امتصاصه بالكامل في الظروف الطبيعية، لذلك لا يظهر في البول."
        },
        {
          "q": "Creatinine is freely filtered, not reabsorbed, and not secreted. Its excretion rate equals:",
          "options": [
            "Its reabsorption rate",
            "Its filtration rate",
            "Zero",
            "Its secretion rate only"
          ],
          "answer": 1,
          "why": "الكرياتينين لا يُعاد امتصاصه ولا يُفرز، فكمية إخراجه تساوي كمية ترشيحه."
        },
        {
          "q": "The proximal tubule reabsorbs about what percentage of filtered sodium and water?",
          "options": [
            "10 percent",
            "30 percent",
            "65 to 70 percent",
            "100 percent"
          ],
          "answer": 2,
          "why": "التوبول القريب يعيد حوالي 65 إلى 70 بالمئة من الصوديوم والماء المرشحين."
        },
        {
          "q": "The fundamental equation for urine formation is:",
          "options": [
            "Excretion = Filtration − Reabsorption + Secretion",
            "Excretion = Filtration + Reabsorption − Secretion",
            "Excretion = Secretion only",
            "Excretion = Filtration only"
          ],
          "answer": 0,
          "why": "البول يتكون من الترشيح، ينقص منه ما يعاد امتصاصه، ويضاف إليه ما يفرز."
        },
        {
          "q": "The thick ascending limb of Henle's loop is:",
          "options": [
            "Permeable to water",
            "Impermeable to water",
            "Impermeable to sodium",
            "Permeable to urea only"
          ],
          "answer": 1,
          "why": "الفرع الصاعد السميك لا يسمح بمرور الماء، ويعيد امتصاص الصوديوم والبوتاسيوم والكلوريد، وهذا يكوّن التدرج الأسموزي في النخاع."
        },
        {
          "q": "The main normal mechanism that controls GFR from moment to moment is:",
          "options": [
            "ADH",
            "Renal autoregulation",
            "Insulin",
            "Sympathetic stimulation"
          ],
          "answer": 1,
          "why": "التنظيم الذاتي للكلية يحافظ على ثبات الترشيح الكبيبي عند تغير ضغط الدم."
        },
        {
          "q": "When arterial pressure falls, the afferent arteriole dilates and the efferent arteriole constricts. This tends to:",
          "options": [
            "Decrease GFR",
            "Increase glomerular pressure and help maintain GFR",
            "Stop filtration",
            "Decrease renal blood flow only"
          ],
          "answer": 1,
          "why": "توسع الوارد وتضيق الصادر يرفع ضغط الشعيرات الكبيبية، فيحافظ الجسم على الترشيح."
        },
        {
          "q": "The vasa recta mainly help by:",
          "options": [
            "Producing renin",
            "Returning reabsorbed water and solutes and preserving the medullary gradient",
            "Filtering proteins",
            "Secreting ADH"
          ],
          "answer": 1,
          "why": "الأوعية المستقيمة تعيد الماء والمواد المعاد امتصاصها إلى الدورة، وتحافظ على التدرج الأسموزي اللازم لتركيز البول."
        }
      ]
    },
    {
      id: "t1",
      term: "Renal Functions",
      title: "وظائف الكلية",
      facts: [
        {
          en: "The kidneys are the primary means of eliminating most metabolic waste products.",
          ar: "الكلية هي الوسيلة الأساسية لإخراج معظم فضلات الأيض.",
          trick: "الكلية كيس الفضلات الرئيسي: كل ما يزعج الجسم يُلقى فيها."
        },
        {
          en: "Creatinine comes from creatine in skeletal muscle, uric acid from nucleic acids, and bilirubin from hemoglobin breakdown.",
          ar: "الكرياتينين يتكون من الكرياتين في العضلات الهيكلية، وحمض اليوريك من تكسر الأحماض النووية، والبيليروبين من تكسر الهيموغلوبين.",
          trick: "لكل فضلة أصل: العضلة تعطي الكرياتينين، والدم القديم يعطي البيليروبين، والمادة الوراثية تعطي حمض اليوريك."
        },
        {
          en: "The kidneys are the only route for eliminating fixed acids such as sulfuric and phosphoric acid.",
          ar: "الكلية هي الطريق الوحيد لإخراج الأحماض الثابتة مثل الكبريتيك والفوسفوريك.",
          trick: "الرئة تطرد الغاز، والكلية تطرد الأحماض الثابتة: الرئة للهواء والكلية للحمض الصلب."
        }
      ],
      quiz: [
        {
          q: "The primary means of eliminating most metabolic waste products is the:",
          options: ["Lungs", "Liver", "Kidneys", "Skin"],
          answer: 2,
          why: "الكلية هي الوسيلة الأساسية لإخراج معظم فضلات الأيض، والكبد والرئتان لا تقومان بهذا الدور بالكامل."
        },
        {
          q: "Which waste product comes from creatine in skeletal muscle?",
          options: ["Urea", "Creatinine", "Uric acid", "Bilirubin"],
          answer: 1,
          why: "الكرياتينين يتكون من الكرياتين الموجود في العضلات الهيكلية."
        },
        {
          q: "Uric acid is produced mainly from the breakdown of:",
          options: ["Amino acids", "Creatine", "Nucleic acids", "Hemoglobin"],
          answer: 2,
          why: "حمض اليوريك يأتي من تكسير الأحماض النووية، وهي البيورينات."
        },
        {
          q: "Bilirubin is an end product of the breakdown of:",
          options: ["Hemoglobin", "Creatine", "Glucose", "Urea"],
          answer: 0,
          why: "البيليروبين ناتج تكسر الهيموغلوبين، وتطرحه الكلية."
        },
        {
          q: "The kidneys are the ONLY way to eliminate which of the following acids?",
          options: ["Carbonic acid (CO2 with water)", "Sulfuric acid", "Lactic acid", "Acetone"],
          answer: 1,
          why: "الكلية هي الطريقة الوحيدة لإخراج بعض الأحماض مثل الكبريتيك والفوسفوريك الناتجة من تكسير البروتين."
        }
      ]
    },
    {
      id: "t2",
      term: "Water and Electrolyte Balance",
      title: "التوازن المائي والشاردي",
      facts: [
        {
          en: "ADH increases water reabsorption in the collecting ducts, so less and more concentrated urine is made.",
          ar: "الهرمون المضاد لإدرار البول يزيد إعادة امتصاص الماء في الأنابيب الجامعة، فيصبح البول أقل وأكثر تركيزاً.",
          trick: "الهرمون المضاد لإدرار البول يقفل الماء في الجسم: كلما زاد، احتفظ الجسم بالماء."
        },
        {
          en: "Lack of ADH causes diabetes insipidus, with large volumes of dilute urine and intense thirst.",
          ar: "نقص الهرمون يسبب داء السكري الكاظم، وفيه بول كثير ومخفف مع عطش شديد.",
          trick: "الكاظم يعني بلا طعم: البول مخفف كالماء."
        },
        {
          en: "Potassium is the main positive ion inside cells, while sodium is the main positive ion outside them.",
          ar: "البوتاسيوم أهم أيون موجب داخل الخلية، والصوديوم أهم أيون موجب خارجها.",
          trick: "البوتاسيوم في البيت الداخلي، والصوديوم في الشارع الخارجي."
        }
      ],
      quiz: [
        {
          q: "When ADH is high, what happens in the collecting ducts?",
          options: ["Water excretion increases", "Water reabsorption increases", "Sodium excretion increases", "No change"],
          answer: 1,
          why: "الهرمون المضاد لإدرار البول يزيد نفاذية الأنابيب الجامعة للماء، فيعود الماء إلى الدم وينتج بول أقل وأكثر تركيزاً."
        },
        {
          q: "Lack of ADH causes which condition?",
          options: ["Diabetes insipidus", "Hyperkalemia", "Acidosis", "Anemia"],
          answer: 0,
          why: "نقص الهرمون المضاد لإدرار البول يسبب بولاً كثيراً ومخففاً مع عطش شديد."
        },
        {
          q: "Which is the main positive ion inside cells?",
          options: ["Sodium", "Potassium", "Chloride", "Calcium"],
          answer: 1,
          why: "البوتاسيوم هو الأيون الموجب الرئيسي داخل الخلايا، والصوديوم هو الرئيسي خارجها."
        },
        {
          q: "Hyperkalemia (high potassium) can cause which dangerous complication?",
          options: ["Cardiac arrhythmias", "Jaundice", "Bone fracture", "Anemia"],
          answer: 0,
          why: "ارتفاع البوتاسيوم في الدم يغير النشاط الكهربائي للقلب ويسبب اضطراب النظم."
        },
        {
          q: "After a sudden 10-fold increase in sodium intake, sodium excretion becomes equal to intake within:",
          options: ["2 hours", "2 to 3 days", "2 weeks", "It never happens"],
          answer: 1,
          why: "بعد زيادة الصوديوم في الغذاء يحتاج الجسم إلى يومين أو ثلاثة حتى يساوي الإخراج الدخول."
        }
      ]
    },
    {
      id: "t3",
      term: "Acid-Base Regulation",
      title: "تنظيم الحمض والقاعدة",
      facts: [
        {
          en: "The kidneys regulate acid-base balance slowly, over hours to days, while the lungs act within minutes.",
          ar: "الكلية تنظم الحمض والقاعدة ببطء على مدى ساعات إلى أيام، أما الرئتان فتعملان خلال دقائق.",
          trick: "الرئة سريعة كعدّاء المئة متر، والكلية صبورة كالماراثون."
        },
        {
          en: "Sodium-hydrogen exchange in the proximal tubule is needed for reabsorption of bicarbonate.",
          ar: "تبادل الصوديوم مع الهيدروجين في التوبول القريب ضروري لإعادة امتصاص البيكربونات.",
          trick: "الصوديوم يدخل والهيدروجين يخرج، والبيكربونات ترجع معه."
        }
      ],
      quiz: [
        {
          q: "Compared with the lungs, the kidneys regulate acid-base balance:",
          options: ["Faster, within minutes", "Slower, over hours to days", "Only during sleep", "Not at all"],
          answer: 1,
          why: "الرئتان تغيران إخراج ثاني أكسيد الكربون بسرعة، أما الكلية فتعدل البيكربونات وإخراج الحمض ببطء، من ساعات إلى أيام."
        },
        {
          q: "Sodium-hydrogen exchange in the proximal tubule is needed for:",
          options: ["Reabsorption of bicarbonate", "Excretion of glucose", "Production of renin", "Secretion of ADH"],
          answer: 0,
          why: "البيكربونات تعبر الغشاء الراسي للخلية الظهارية للتوبول القريب بالاعتماد على تبادل الصوديوم مع الهيدروجين."
        }
      ]
    },
    {
      id: "t4",
      term: "Renal Hormones",
      title: "هرمونات الكلية",
      facts: [
        {
          en: "Granular cells of the juxtaglomerular apparatus secrete renin.",
          ar: "الخلايا الحبيبية في الجهاز المجاور للكبيبة هي التي تفرز الرينين.",
          trick: "الخلية الحبيبية تحمل حبيبات الرينين المخزنة."
        },
        {
          en: "Erythropoietin stimulates red blood cell production in the bone marrow.",
          ar: "هرمون الإريثروبويتين ينشط إنتاج كريات الدم الحمراء في نخاع العظم.",
          trick: "إريثرو تعني أحمر: هرمون الكريات الحمراء."
        },
        {
          en: "The kidney converts 25-hydroxyvitamin D into its active form, 1,25-dihydroxyvitamin D3 (calcitriol).",
          ar: "الكلية تحوّل فيتامين دي المخزون إلى شكله النشط عند الموضع الأول من الهيدروكسيل.",
          trick: "الرقم واحد في الكلية: الموضع الأول يعني الشكل النشط."
        }
      ],
      quiz: [
        {
          q: "The kidney cells that secrete renin are the:",
          options: ["Macula densa cells", "Granular cells", "Podocytes", "Mesangial cells"],
          answer: 1,
          why: "الخلايا الحبيبية في الجهاز المجاور للكبيبة هي التي تصنع وتفرز الرينين."
        },
        {
          q: "Which kidney hormone stimulates red blood cell production in the bone marrow?",
          options: ["Renin", "Calcitriol", "Erythropoietin", "ADH"],
          answer: 2,
          why: "الكلية تفرز الإريثروبويتين الذي ينشط إنتاج خلايا الدم الحمراء في نخاع العظم."
        },
        {
          q: "The active form of vitamin D produced by the kidney is:",
          options: ["25-hydroxyvitamin D", "1,25-dihydroxyvitamin D3 (calcitriol)", "Vitamin D2", "Renin"],
          answer: 1,
          why: "الكلية تحوّل الشكل المخزون إلى الشكل النشط 1,25 عند الموضع رقم 1 من الهيدروكسيل."
        }
      ]
    },
    {
      id: "t5",
      term: "Renal Anatomy",
      title: "تشريح الكلية",
      facts: [
        {
          en: "Each kidney contains about one million nephrons, and they are not regenerated after birth.",
          ar: "كل كلية تحتوي على نحو مليون نيفرون، ولا تتجدد هذه النيفرونات بعد الولادة.",
          trick: "الكلية مصنع فيه مليون عامل، والعمال لا يُعيَّنون بعد الولادة."
        },
        {
          en: "Juxtamedullary nephrons have long loops of Henle and vasa recta around them.",
          ar: "النيفرونات المجاورة للنخاع لها حلقات هنلة طويلة ومعها الأوعية المستقيمة حولها.",
          trick: "المجاورة يعني بجانب النخاع، وفيها الأوعية المستقيمة تمر حول الحلقة."
        },
        {
          en: "Urine flows from the papilla to the minor calyx, then the major calyx, the renal pelvis, and the ureter.",
          ar: "البول يمر من الحليمة إلى الكأس الصغير، ثم الكأس الكبير، ثم الحوض، ثم الحالب.",
          trick: "نهر يبدأ من الحليمة ويصب في الحوض ثم في الأنبوب: الصغير قبل الكبير."
        }
      ],
      quiz: [
        {
          q: "Each human kidney contains about how many nephrons?",
          options: ["10,000", "100,000", "1,000,000", "10,000,000"],
          answer: 2,
          why: "كل كلية تحتوي تقريباً على مليون نيفرون، ولا تتجدد هذه النيفرونات بعد الولادة."
        },
        {
          q: "The renal functional unit is the:",
          options: ["Glomerulus", "Nephron", "Ureter", "Papilla"],
          answer: 1,
          why: "النيفرون هو الوحدة الوظيفية للكلية، لأنه وحده يكوّن البول."
        },
        {
          q: "Which nephrons have vasa recta around their long loops of Henle?",
          options: ["Cortical nephrons", "Juxtamedullary nephrons", "Superficial nephrons only", "Collecting ducts"],
          answer: 1,
          why: "النيفرونات المجاورة للنخاع لها حلقات هنلة طويلة ومعها الأوعية المستقيمة، وتشكل نحو 20 إلى 30 بالمئة من النيفرونات."
        },
        {
          q: "The macula densa is located at the end of the:",
          options: ["Descending thin limb", "Thick ascending limb", "Proximal tubule", "Collecting duct"],
          answer: 1,
          why: "بقعة الكثافة توجد في نهاية الفرع الصاعد السميك لحلقة هنلة."
        },
        {
          q: "Urine flows from the papilla to which structure next?",
          options: ["Minor calyx", "Major calyx", "Renal pelvis", "Ureter"],
          answer: 0,
          why: "البول يمر من الحليمة إلى الكأس الصغير أولاً، ثم الكأس الكبير، ثم الحوض، ثم الحالب."
        }
      ]
    },
    {
      id: "t6",
      term: "Renal Blood Flow",
      title: "تدفق الدم الكلوي",
      facts: [
        {
          en: "Renal blood flow at rest is about 1100 mL per minute, roughly 22 percent of cardiac output.",
          ar: "تدفق الدم الكلوي أثناء الراحة نحو 1100 مل في الدقيقة، أي نحو 22 بالمئة من الناتج القلبي.",
          trick: "الكلية تأخذ ربع الدم تقريباً، والرقم 1100 قريب من لتر."
        },
        {
          en: "Glomerular capillaries have the highest hydrostatic pressure, about 60 mmHg, which drives filtration.",
          ar: "الشعيرات الكبيبية لها أعلى ضغط هيدروستاتيكي، نحو 60 ملم زئبق، ليدفع الترشيح.",
          trick: "عالٍ في الكبيبة للترشيح، ومنخفض حول الأنابيب لإعادة الامتصاص."
        }
      ],
      quiz: [
        {
          q: "Renal blood flow in a normal adult at rest is about:",
          options: ["500 mL/min", "1100 mL/min", "3000 mL/min", "5000 mL/min"],
          answer: 1,
          why: "الكلية تستقبل حوالي 22 بالمئة من الناتج القلبي، أي حوالي 1100 مل في الدقيقة."
        },
        {
          q: "The highest hydrostatic pressure (about 60 mmHg) is found in the:",
          options: ["Glomerular capillaries", "Peritubular capillaries", "Renal vein", "Ureter"],
          answer: 0,
          why: "الضغط داخل الشعيرات الكبيبية حوالي 60 ملم زئبق، وهو عالٍ ليدفع الترشيح، أما الشعيرات حول الأنابيب فحوالي 13 ملم زئبق."
        }
      ]
    },
    {
      id: "t7",
      term: "Urine Formation",
      title: "تكوين البول",
      facts: [
        {
          en: "Glomerular filtrate contains water, salts, glucose and urea, but not large plasma proteins or blood cells.",
          ar: "الراشح الكبيبي يحوي الماء والأملاح والجلوكوز واليوريا، لكن لا يحوي البروتينات الكبيرة ولا خلايا الدم.",
          trick: "البروتين كبير على ثقوب المصفاة، مثل المعكرونة الكبيرة."
        },
        {
          en: "Excretion = Filtration minus Reabsorption plus Secretion.",
          ar: "الإخراج يساوي الترشيح ناقص إعادة الامتصاص زائد الإفراز.",
          trick: "فلتر، رجّع، سلّم: ناقص الرجوع وزائد التسليم."
        },
        {
          en: "The proximal tubule reabsorbs about 65 to 70 percent of filtered sodium and water.",
          ar: "التوبول القريب يعيد امتصاص نحو 65 إلى 70 بالمئة من الصوديوم والماء المرشحين.",
          trick: "ثلثان تقريباً يرجعان من التوبول القريب."
        }
      ],
      quiz: [
        {
          q: "Which substance is normally NOT filtered at the glomerulus?",
          options: ["Water", "Glucose", "Plasma proteins (albumin)", "Sodium"],
          answer: 2,
          why: "الترشيح يسمح بالماء والأملاح والجلوكوز واليوريا، لكن البروتينات الكبيرة والخلايا الحمراء تبقى في الدم."
        },
        {
          q: "Which substance is freely filtered and completely reabsorbed, so it does not appear in urine?",
          options: ["Creatinine", "Glucose", "Urea", "Uric acid"],
          answer: 1,
          why: "الجلوكوز يُرشَّح بالكامل ثم يُعاد امتصاصه بالكامل في الظروف الطبيعية، لذلك لا يظهر في البول."
        },
        {
          q: "Creatinine is freely filtered, not reabsorbed, and not secreted. Its excretion rate equals:",
          options: ["Its reabsorption rate", "Its filtration rate", "Zero", "Its secretion rate only"],
          answer: 1,
          why: "الكرياتينين لا يُعاد امتصاصه ولا يُفرز، فكمية إخراجه تساوي كمية ترشيحه."
        },
        {
          q: "The proximal tubule reabsorbs about what percentage of filtered sodium and water?",
          options: ["10 percent", "30 percent", "65 to 70 percent", "100 percent"],
          answer: 2,
          why: "التوبول القريب يعيد حوالي 65 إلى 70 بالمئة من الصوديوم والماء المرشحين."
        },
        {
          q: "The fundamental equation for urine formation is:",
          options: ["Excretion = Filtration − Reabsorption + Secretion", "Excretion = Filtration + Reabsorption − Secretion", "Excretion = Secretion only", "Excretion = Filtration only"],
          answer: 0,
          why: "البول يتكون من الترشيح، ينقص منه ما يعاد امتصاصه، ويضاف إليه ما يفرز."
        }
      ]
    },
    {
      id: "t8",
      term: "Control of Filtration",
      title: "تنظيم الترشيح",
      facts: [
        {
          en: "The thick ascending limb is impermeable to water and reabsorbs sodium, potassium and chloride, forming the medullary gradient.",
          ar: "الفرع الصاعد السميك لا يسمح بمرور الماء، ويعيد امتصاص الصوديوم والبوتاسيوم والكلوريد، فيكوّن التدرج الأسموزي في النخاع.",
          trick: "الصاعد يطرد الملح ويحبس الماء."
        },
        {
          en: "Renal autoregulation keeps GFR stable when arterial pressure changes.",
          ar: "التنظيم الذاتي للكلية يحافظ على ثبات الترشيح الكبيبي عند تغير ضغط الدم.",
          trick: "الكلية تضبط نفسها بنفسها دون أوامر خارجية."
        },
        {
          en: "Afferent arteriole dilation and efferent arteriole constriction raise glomerular pressure and help maintain GFR.",
          ar: "توسّع الشريين الوارد وضيق الشريين الصادر يرفع ضغط الكبيبة ويحافظ على الترشيح.",
          trick: "الوارد يفتح والصادر يسد: ضغط أعلى داخل الكبيبة."
        }
      ],
      quiz: [
        {
          q: "The thick ascending limb of Henle's loop is:",
          options: ["Permeable to water", "Impermeable to water", "Impermeable to sodium", "Permeable to urea only"],
          answer: 1,
          why: "الفرع الصاعد السميك لا يسمح بمرور الماء، ويعيد امتصاص الصوديوم والبوتاسيوم والكلوريد، وهذا يكوّن التدرج الأسموزي في النخاع."
        },
        {
          q: "The main normal mechanism that controls GFR from moment to moment is:",
          options: ["ADH", "Renal autoregulation", "Insulin", "Sympathetic stimulation"],
          answer: 1,
          why: "التنظيم الذاتي للكلية يحافظ على ثبات الترشيح الكبيبي عند تغير ضغط الدم."
        },
        {
          q: "When arterial pressure falls, the afferent arteriole dilates and the efferent arteriole constricts. This tends to:",
          options: ["Decrease GFR", "Increase glomerular pressure and help maintain GFR", "Stop filtration", "Decrease renal blood flow only"],
          answer: 1,
          why: "توسع الوارد وتضيق الصادر يرفع ضغط الشعيرات الكبيبية، فيحافظ الجسم على الترشيح."
        },
        {
          q: "The vasa recta mainly help by:",
          options: ["Producing renin", "Returning reabsorbed water and solutes and preserving the medullary gradient", "Filtering proteins", "Secreting ADH"],
          answer: 1,
          why: "الأوعية المستقيمة تعيد الماء والمواد المعاد امتصاصها إلى الدورة، وتحافظ على التدرج الأسموزي اللازم لتركيز البول."
        }
      ]
    }
  ]
};
