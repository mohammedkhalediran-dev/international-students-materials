/*
  data/study/nutrition-principles-1.js
  ----------------------------------------------------------------
  محتوى وضع الدراسة لمحاضرة: General Principles of nutrition، المحاضرة 1 (Fat soluble vitamins).
  المصدر الوحيد: ملف الشرائح (Dr. Parvin Sajadi) المرفوع من صفحة الرفع. لا تُضف معلومة ليست فيه.

  قواعد الكتابة (يتحقق منها tests/data_check.js):
    - en: الجملة الإنجليزية من المادة، وتظهر في سطر مستقل.
    - ar و trick و why: عربي فقط بلا أي حرف لاتيني، حتى لا يختلط الاتجاه على الشاشة.
    - لكل معلومة (fact) حيلة حفظ (trick).
    - words: الكلمات الصعبة مع نطقها بحروف عربية، مقسوماً بشرطة إلى جزأين (ثلاثة للكلمة الطويلة).
    - quiz: أسئلة اختيار من متعدد بالإنجليزية، وanswer رقم الخيار الصحيح بدءاً من 0.
*/
window.STUDY = window.STUDY || {};
STUDY["nutrition-principles-1"] = {
  topics: [
    {
      id: "t1",
      term: "Vitamins: Water-Soluble and Fat-Soluble",
      title: "نوعا الفيتامينات",
      words: [
        { en: "Vitamins", pron: "فاي-تامينز" },
        { en: "Essential nutrients", pron: "إسن-شل نيو-ترينتس" },
        { en: "Water-soluble", pron: "ووتر-سوليوبل" },
        { en: "Fat-soluble", pron: "فات-سوليوبل" },
        { en: "Well-being", pron: "ويل-بيينغ" }
      ],
      facts: [
        {
          en: "Vitamins: essential nutrients for health and well-being.",
          ar: "الفيتامينات مغذيات أساسية يحتاجها الجسم ليبقى بصحة وعافية.",
          trick: "كلمة فيتامين تبدأ بـ«فيتا» وتعني الحياة: مغذيات لا تعيش بدونها."
        },
        {
          en: "Vitamins are divided into two groups: water-soluble and fat-soluble.",
          ar: "تنقسم الفيتامينات إلى مجموعتين فقط: مجموعة تذوب في الماء، ومجموعة تذوب في الدهون.",
          trick: "مثل السكر والزبدة: السكر يذوب في الشاي، والزبدة تذوب في الزيت. قسمان فقط: ماء ودهن."
        },
        {
          en: "Water-soluble vitamins: the vitamin B group and vitamin C.",
          ar: "الفيتامينات الذائبة في الماء هي مجموعة فيتامين بي، وفيتامين سي.",
          trick: "الماء موجود في «البحر» و«السيل»: الباء من البحر لفيتامين بي، والسين من السيل لفيتامين سي."
        },
        {
          en: "Fat-soluble vitamins: vitamin A, vitamin D, vitamin E and vitamin K.",
          ar: "الفيتامينات الذائبة في الدهون أربعة: فيتامين إيه، وفيتامين دي، وفيتامين إي، وفيتامين كيه.",
          trick: "الدهن على «إيدِك»: اقرأ أوائل الحروف معاً، إيه ثم دي ثم إي ثم كيه، فتسمع «إيدِك»."
        },
        {
          en: "Fat-soluble vitamins: their functions, defects, toxicity and sources.",
          ar: "لكل فيتامين من الأربعة نحفظ أربعة أشياء: وظيفته، والمرض عند نقصه، والضرر عند زيادته وهو السمية، ومصادره.",
          trick: "اسأل كل فيتامين أربعة أسئلة: ماذا تعمل؟ ماذا يحدث إذا نقصت؟ ماذا يحدث إذا زدت؟ من أين آخذك؟ «عمل، نقص، زيادة، مصدر»."
        }
      ],
      quiz: [
        {
          q: "Which of the following is a water-soluble vitamin?",
          options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
          answer: 1,
          why: "الذائبة في الماء هي مجموعة فيتامين بي وفيتامين سي فقط. تذكّر البحر والسيل."
        },
        {
          q: "Which group contains only fat-soluble vitamins?",
          options: ["Vitamins A, D, E and K", "Vitamins B, C, D and K", "Vitamins A, B, C and E", "Vitamins C, D, E and K"],
          answer: 0,
          why: "الأربعة الذائبة في الدهون تُقرأ معاً «إيدِك»: إيه، دي، إي، كيه."
        },
        {
          q: "The vitamin B group belongs to the:",
          options: ["Water-soluble vitamins", "Fat-soluble vitamins"],
          answer: 0,
          why: "فيتامين بي من البحر، أي من المجموعة الذائبة في الماء."
        }
      ]
    },
    {
      id: "t2",
      term: "Vitamin A: Forms and Main Functions",
      title: "فيتامين إيه: أشكاله ووظائفه",
      words: [
        { en: "Retinol", pron: "رِتي-نول" },
        { en: "Retinal", pron: "رِتي-نال" },
        { en: "Retinoic acid", pron: "رِتي-نويك أسِد" },
        { en: "Beta-carotene", pron: "بيتا-كارو-تين" },
        { en: "Precursor", pron: "بري-كيرسر" },
        { en: "Cornea", pron: "كور-نيا" },
        { en: "Epithelial cells", pron: "إبي-ثيليال سيلز" },
        { en: "Gene expression", pron: "جين إكس-بريشن" }
      ],
      facts: [
        {
          en: "Vitamin A: retinol, retinal, retinoic acid.",
          ar: "لفيتامين إيه ثلاثة أشكال، وكلها تبدأ بـ«رِتي»: الريتينول، والريتينال، وحمض الريتينويك.",
          trick: "«رِتي» تذكّرك بالرَّتينا، أي شبكية العين، لأن فيتامين إيه فيتامين النظر. ثلاثة إخوة: ريتينول، ريتينال، ريتينويك."
        },
        {
          en: "Beta-carotene is its main precursor.",
          ar: "البيتا كاروتين هو المادة الأولية الرئيسية لفيتامين إيه. والمادة الأولية مادة يحوّلها الجسم إلى الفيتامين.",
          trick: "«كاروتين» تشبه «كاروت» أي الجزرة: الجزر البرتقالي يتحول في جسمك إلى فيتامين إيه."
        },
        {
          en: "Main functions: vision and maintenance of the cornea.",
          ar: "أهم وظائفه النظر، والحفاظ على القرنية، وهي الطبقة الشفافة في مقدمة العين.",
          trick: "قالوا لك وأنت صغير: كُل الجزر حتى يقوى نظرك. الجزر يعطي فيتامين إيه، وفيتامين إيه للعين."
        },
        {
          en: "Maintenance of epithelial cells, mucous membranes and skin.",
          ar: "يحافظ على الخلايا الطلائية التي تغطي سطوح الجسم، وعلى الأغشية المخاطية، وعلى الجلد.",
          trick: "فيتامين إيه حارس «الأغطية»: الجلد غطاء الجسم من الخارج، والأغشية المخاطية والخلايا الطلائية غطاء الأعضاء من الداخل."
        },
        {
          en: "Bone and tooth development, and reproduction.",
          ar: "يساعد على نمو العظام والأسنان، وعلى التكاثر أي الإنجاب.",
          trick: "ثلاثة أشياء تكبر بفيتامين إيه: «عظم، سنّ، نسل»."
        },
        {
          en: "Regulation of gene expression, and immunity.",
          ar: "ينظّم عمل الجينات، أي يحدد أي جين يعمل ومتى، ويدعم المناعة.",
          trick: "فيتامين إيه «مدير»: يدير الجينات، ويقود جنود المناعة. وإذا غاب المدير دخل الغزاة، وهذا ما ستراه في نقصه."
        }
      ],
      quiz: [
        {
          q: "The main precursor of vitamin A is:",
          options: ["Cholesterol", "Beta-carotene", "Tocopherol", "Phylloquinone"],
          answer: 1,
          why: "البيتا كاروتين يتحول إلى فيتامين إيه. أما الكوليسترول فهو أصل فيتامين دي."
        },
        {
          q: "Which of the following is NOT a form of vitamin A?",
          options: ["Retinol", "Retinal", "Retinoic acid", "Calciferol"],
          answer: 3,
          why: "الكالسيفيرول اسم لفيتامين دي. أشكال فيتامين إيه كلها تبدأ بـ«رِتي»."
        },
        {
          q: "Maintenance of the cornea is a main function of:",
          options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
          answer: 0,
          why: "القرنية جزء من العين، والعين كلها لفيتامين إيه."
        },
        {
          q: "Regulation of gene expression is listed as a function of:",
          options: ["Vitamin K", "Vitamin E", "Vitamin A", "Vitamin D"],
          answer: 2,
          why: "فيتامين إيه هو المدير الذي ينظّم عمل الجينات ويدعم المناعة."
        }
      ]
    },
    {
      id: "t3",
      term: "Vitamin A: Defects and Toxicity",
      title: "فيتامين إيه: نقصه وزيادته",
      words: [
        { en: "Night blindness", pron: "نايت-بلايندنس" },
        { en: "Xerophthalmia", pron: "زيروف-ثال-ميا" },
        { en: "Keratinization", pron: "كيراتي-ناي-زيشن" },
        { en: "Toxicity", pron: "توك-سيستي" },
        { en: "Chronic", pron: "كرو-نك" },
        { en: "Acute", pron: "أ-كيوت" },
        { en: "Intracranial pressure", pron: "إنترا-كريْنيال بريشر" },
        { en: "Incoordination", pron: "إنكو-أوردي-نيشن" },
        { en: "Dizziness", pron: "دِزي-نِس" }
      ],
      facts: [
        {
          en: "Defects of vitamin A: infectious diseases.",
          ar: "نقص فيتامين إيه يجعل الجسم عرضة للأمراض المعدية، لأنه يدعم المناعة ويحافظ على الأغشية التي تصدّ الميكروبات.",
          trick: "المدير غاب فدخل الغزاة: لا مناعة ولا أغطية، إذن عدوى."
        },
        {
          en: "Defects of vitamin A: night blindness, then blindness (xerophthalmia).",
          ar: "نقصه يسبب العشى الليلي، وهو ضعف الرؤية في الظلام، وقد يصل إلى العمى، واسمه جفاف العين.",
          trick: "اسم المرض يبدأ بصوت «زيرو» أي صفر: عين جافة وصفر نظر. والليل أول ما يختفي."
        },
        {
          en: "Defects of vitamin A: keratinization.",
          ar: "نقصه يسبب التقرّن، أي يصير الجلد والأغشية قاسية وجافة مثل القرن، لأن الفيتامين كان يحافظ عليها.",
          trick: "الكيراتين مادة الأظافر والقرون: بلا فيتامين إيه يصير جلدك مثل الظفر."
        },
        {
          en: "Chronic toxicity: decreased bone mineral mass, liver disorders, birth defects.",
          ar: "السمية المزمنة، أي الزيادة لمدة طويلة، تسبب نقص كتلة معادن العظم، واضطرابات الكبد، وتشوهات الأجنة.",
          trick: "الزيادة الطويلة تضرب ثلاثة من الداخل: «عظم، كبد، جنين»."
        },
        {
          en: "Acute toxicity: large amounts at once or over a short period of time.",
          ar: "السمية الحادة تعني جرعة كبيرة دفعة واحدة، أو خلال مدة قصيرة.",
          trick: "حاد يعني سريع: كمية كبيرة في وقت قصير. ومزمن يعني طويل."
        },
        {
          en: "Acute toxicity: blurred vision, nausea, vomiting, dizziness.",
          ar: "من أعراض السمية الحادة: تشوش الرؤية، والغثيان، والقيء، والدوخة.",
          trick: "مثل راكب سفينة في عاصفة: لا يرى جيداً، ويشعر بالغثيان، ويتقيأ، ويدوخ."
        },
        {
          en: "Acute toxicity: increased intracranial pressure, muscle incoordination.",
          ar: "ومن أعراضها أيضاً: ارتفاع الضغط داخل الجمجمة، وعدم تناسق حركة العضلات.",
          trick: "الحاد كله في الرأس: الرأس ينتفخ من الضغط، فيترنح الجسم ولا تتناسق حركته."
        }
      ],
      quiz: [
        {
          q: "Night blindness is caused by deficiency of:",
          options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
          answer: 0,
          why: "العين كلها لفيتامين إيه، ونقصه يبدأ بالعشى الليلي."
        },
        {
          q: "Xerophthalmia is:",
          options: ["Blindness due to vitamin A deficiency", "Bone softening due to vitamin D deficiency", "Bleeding due to vitamin K deficiency", "Erythrocyte hemolysis due to vitamin E deficiency"],
          answer: 0,
          why: "جفاف العين هو العمى الناتج عن نقص فيتامين إيه. تذكّر «زيرو»: صفر نظر."
        },
        {
          q: "Which of the following is a sign of CHRONIC vitamin A toxicity?",
          options: ["Blurred vision", "Birth defects", "Nausea", "Dizziness"],
          answer: 1,
          why: "تشوش الرؤية والغثيان والدوخة من السمية الحادة. أما المزمنة فهي العظم والكبد والجنين."
        },
        {
          q: "Increased intracranial pressure is a feature of:",
          options: ["Vitamin A deficiency", "Chronic vitamin A toxicity", "Acute vitamin A toxicity", "Vitamin K deficiency"],
          answer: 2,
          why: "الحاد كله في الرأس: تشوش الرؤية والدوخة وارتفاع الضغط داخل الجمجمة."
        },
        {
          q: "Keratinization is a result of:",
          options: ["Vitamin A deficiency", "Vitamin D toxicity", "Vitamin E toxicity", "Vitamin K deficiency"],
          answer: 0,
          why: "فيتامين إيه يحافظ على الجلد والأغشية، وبدونه تتقرّن وتصير مثل الظفر."
        }
      ]
    },
    {
      id: "t4",
      term: "Vitamin A: Sources",
      title: "فيتامين إيه: مصادره",
      words: [
        { en: "Dairy products", pron: "ديري برو-دكتس" },
        { en: "Broccoli", pron: "بروكو-لي" },
        { en: "Apricots", pron: "إيبري-كوتس" },
        { en: "Cantaloupe", pron: "كانتا-لوب" },
        { en: "Pumpkin", pron: "بمب-كن" },
        { en: "Sweet potatoes", pron: "سويت بو-تيتوز" },
        { en: "Winter squash", pron: "وِنتر-سكواش" }
      ],
      facts: [
        {
          en: "Retinol: milk and dairy products, eggs, liver.",
          ar: "الريتينول مصدره حيواني: الحليب ومشتقاته، والبيض، والكبد.",
          trick: "الريتينول من الحيوان: «بقرة ودجاجة وكبد»، أي حليب وبيض وكبد."
        },
        {
          en: "Beta-carotene: spinach and other dark green leaves, broccoli.",
          ar: "البيتا كاروتين مصدره نباتي. أوله الخضار الورقية الخضراء الداكنة مثل السبانخ، ثم البروكلي.",
          trick: "اللون الأخضر الغامق: سبانخ وبروكلي."
        },
        {
          en: "Beta-carotene: orange fruits (apricots, cantaloupe).",
          ar: "ومن الفواكه البرتقالية: المشمش، والشمّام المعروف بالكانتالوب.",
          trick: "مشمش وشمّام: في الكلمتين «شم»، فتخيّل أنك تشمّ رائحة فاكهة برتقالية."
        },
        {
          en: "Beta-carotene: orange vegetables (carrots, pumpkin, sweet potatoes, winter squash).",
          ar: "ومن الخضار البرتقالية: الجزر، واليقطين، والبطاطا الحلوة، والقرع الشتوي.",
          trick: "كل شيء برتقالي فيه بيتا كاروتين. وكل شيء حيواني فيه ريتينول."
        }
      ],
      quiz: [
        {
          q: "Which of the following is a source of retinol?",
          options: ["Carrots", "Spinach", "Liver", "Cantaloupe"],
          answer: 2,
          why: "الريتينول من الحيوان: الحليب والبيض والكبد. والبقية مصادر للبيتا كاروتين."
        },
        {
          q: "Carrots, pumpkin and sweet potatoes are sources of:",
          options: ["Retinol", "Beta-carotene", "Tocopherol", "Vitamin D"],
          answer: 1,
          why: "كل ما هو برتقالي من الخضار والفواكه مصدر للبيتا كاروتين."
        },
        {
          q: "Apricots and cantaloupe are listed as:",
          options: ["Dark green leaves", "Dairy products", "Orange fruits rich in beta-carotene", "Fatty fish"],
          answer: 2,
          why: "المشمش والشمّام فاكهتان برتقاليتان، وفيهما البيتا كاروتين."
        }
      ]
    },
    {
      id: "t5",
      term: "Vitamin D: Forms and Main Functions",
      title: "فيتامين دي: أشكاله ووظيفته",
      words: [
        { en: "Calciferol", pron: "كال-سيفي-رول" },
        { en: "Cholecalciferol", pron: "كولي-كالسي-فيرول" },
        { en: "Dihydroxyvitamin D", pron: "داي-هايدروكسي-فايتامين دي" },
        { en: "Cholesterol", pron: "كوليس-ترول" },
        { en: "Mineralization", pron: "مينرا-لايزيشن" },
        { en: "Phosphorus", pron: "فوس-فورس" },
        { en: "Renal reabsorption", pron: "رينال ري-أبزورب-شن" }
      ],
      facts: [
        {
          en: "Vitamin D: calciferol, cholecalciferol, dihydroxyvitamin D.",
          ar: "لفيتامين دي ثلاثة أسماء: الكالسيفيرول، والكوليكالسيفيرول، وثنائي هيدروكسي فيتامين دي.",
          trick: "أول اسمين فيهما «كالسي» أي الكالسيوم: فيتامين دي صديق الكالسيوم. والثالث اسمه فيه حرف دي نفسه."
        },
        {
          en: "Cholesterol is its precursor.",
          ar: "الكوليسترول هو المادة الأولية التي يُصنع منها فيتامين دي.",
          trick: "«كوليسترول» و«كوليكالسيفيرول» يبدآن بالصوت نفسه «كولي». وقارن: أصل إيه الجزر، وأصل دي الكوليسترول."
        },
        {
          en: "Main function: mineralization of bones.",
          ar: "وظيفته الأساسية تمعدن العظام، أي ترسيب الكالسيوم والفوسفور في العظم حتى يصير صلباً.",
          trick: "دي = «دعامة» العظم. الحرفان يبدآن بالدال."
        },
        {
          en: "It increases blood calcium and phosphorus by increasing absorption from the digestive tract.",
          ar: "يرفع الكالسيوم والفوسفور في الدم من ثلاثة طرق. الطريق الأول: يزيد امتصاصهما من الجهاز الهضمي.",
          trick: "الباب الأول هو الأمعاء: تأخذ الكالسيوم من الطعام."
        },
        {
          en: "...expelling calcium from the bones...",
          ar: "الطريق الثاني: يُخرج الكالسيوم من العظام إلى الدم.",
          trick: "الباب الثاني هو العظم: العظم «بنك» الكالسيوم، وفيتامين دي يسحب منه إلى الدم."
        },
        {
          en: "...and promoting renal reabsorption.",
          ar: "الطريق الثالث: يزيد إعادة امتصاص الكالسيوم في الكلية، فلا يضيع في البول.",
          trick: "الباب الثالث هو الكلية: تعيد الكالسيوم بدل أن ترميه. احفظ الأبواب الثلاثة: «أمعاء، عظم، كلية»."
        }
      ],
      quiz: [
        {
          q: "The precursor of vitamin D is:",
          options: ["Beta-carotene", "Cholesterol", "Retinol", "Menaquinone"],
          answer: 1,
          why: "الكوليسترول أصل فيتامين دي، و«كولي» في أول الاسمين. والبيتا كاروتين أصل فيتامين إيه."
        },
        {
          q: "Vitamin D increases blood calcium by all of the following EXCEPT:",
          options: ["Increasing absorption from the digestive tract", "Expelling calcium from the bones", "Promoting renal reabsorption", "Increasing calcium loss in urine"],
          answer: 3,
          why: "فيتامين دي يرفع كالسيوم الدم من الأمعاء والعظم والكلية، والكلية تعيد امتصاصه لا تخرجه."
        },
        {
          q: "Cholecalciferol is a form of:",
          options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
          answer: 1,
          why: "فيه «كالسي» أي الكالسيوم، وصديق الكالسيوم هو فيتامين دي."
        },
        {
          q: "Mineralization of bones is the main function of:",
          options: ["Vitamin D", "Vitamin E", "Vitamin A", "Vitamin K"],
          answer: 0,
          why: "فيتامين دي دعامة العظم، يرسّب فيه الكالسيوم والفوسفور."
        }
      ]
    },
    {
      id: "t6",
      term: "Vitamin D: Defects, Toxicity and Sources",
      title: "فيتامين دي: نقصه وزيادته ومصادره",
      words: [
        { en: "Rickets", pron: "ريكي-تس" },
        { en: "Osteomalacia", pron: "أوستيو-مالي-شيا" },
        { en: "Soft tissue calcification", pron: "سوفت تِشو كالسي-فيكيشن" },
        { en: "Margarine", pron: "مارجا-رين" },
        { en: "Fortified cereals", pron: "فورتي-فايد سيريالز" },
        { en: "Salmon", pron: "سا-مَن" },
        { en: "Sardines", pron: "سار-دينز" }
      ],
      facts: [
        {
          en: "Defects of vitamin D: rickets, osteomalacia.",
          ar: "نقص فيتامين دي يسبب الكُساح، وهو لين العظام عند الأطفال، ويسبب تليّن العظام عند الكبار.",
          trick: "العظم بلا دعامة يلين. و«أوستيو» تعني عظم، و«مالاشيا» تعني لين: عظم ليّن."
        },
        {
          en: "Toxicity: calcium imbalance (soft tissue calcification and stone formation).",
          ar: "زيادته تسبب اختلال توازن الكالسيوم: يترسب الكالسيوم في الأنسجة الرخوة، وتتكون الحصى.",
          trick: "الكالسيوم الزائد يبحث عن مكان يجلس فيه: يتحجر في الأنسجة الطرية، ويصير حصى."
        },
        {
          en: "It is made in the body with the help of sunlight.",
          ar: "يصنعه الجسم بنفسه بمساعدة أشعة الشمس.",
          trick: "«دي» تشبه «ضيّ» أي الضوء: فيتامين دي فيتامين الضيّ والشمس."
        },
        {
          en: "Sources: milk, margarine, butter, fortified cereals, eggs.",
          ar: "مصادره من الطعام: الحليب، والسمن النباتي المعروف بالمارجرين، والزبدة، والحبوب المدعّمة أي المضاف إليها الفيتامين، والبيض.",
          trick: "فطور الصباح كله فيتامين دي: كوب حليب، وخبز بالزبدة أو المارجرين، وحبوب الإفطار، وبيضة."
        },
        {
          en: "Sources: liver, fatty fish (salmon, sardines).",
          ar: "ومصادره أيضاً: الكبد، والأسماك الدهنية مثل السلمون والسردين.",
          trick: "سمكتان تبدآن بالسين: «سلمون» و«سردين»."
        }
      ],
      quiz: [
        {
          q: "Rickets and osteomalacia result from deficiency of:",
          options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
          answer: 1,
          why: "فيتامين دي دعامة العظم، وبدونه يلين العظم."
        },
        {
          q: "Soft tissue calcification and stone formation are signs of:",
          options: ["Vitamin D toxicity", "Vitamin D deficiency", "Vitamin E toxicity", "Vitamin K deficiency"],
          answer: 0,
          why: "زيادة فيتامين دي ترفع الكالسيوم حتى يترسب في الأنسجة الطرية ويصير حصى."
        },
        {
          q: "Which vitamin is made in the body with the help of sunlight?",
          options: ["Vitamin K", "Vitamin A", "Vitamin D", "Vitamin E"],
          answer: 2,
          why: "فيتامين دي فيتامين الضيّ والشمس. أما فيتامين كيه فتصنعه بكتيريا الأمعاء."
        },
        {
          q: "Salmon and sardines are listed as sources of:",
          options: ["Vitamin D", "Vitamin K", "Beta-carotene", "Vitamin C"],
          answer: 0,
          why: "السلمون والسردين أسماك دهنية، وهي من مصادر فيتامين دي."
        }
      ]
    },
    {
      id: "t7",
      term: "Vitamin E: Functions, Defects, Toxicity and Sources",
      title: "فيتامين إي",
      words: [
        { en: "Alpha-tocopherol", pron: "ألفا-توكو-فيرول" },
        { en: "Tocopherol", pron: "توكو-فيرول" },
        { en: "Antioxidant", pron: "أنتي-أوكسيدنت" },
        { en: "Polyunsaturated fatty acids", pron: "بولي-أنساتشو-ريتد فاتي أسِدز" },
        { en: "Erythrocyte hemolysis", pron: "إريثرو-سايت هيمو-لايسس" },
        { en: "Hemorrhaging", pron: "هيمو-ريجنغ" },
        { en: "Wheat germ", pron: "ويت-جيرم" },
        { en: "Shortenings", pron: "شورتي-نِنغز" }
      ],
      facts: [
        {
          en: "Vitamin E: alpha-tocopherol, tocopherol.",
          ar: "أسماء فيتامين إي: ألفا توكوفيرول، والتوكوفيرول.",
          trick: "«توكو» تشبه «توكة» الشعر: التوكة تثبّت الشعر، وفيتامين إي يثبّت أغشية الخلايا كما سترى في وظيفته."
        },
        {
          en: "Main function: antioxidant.",
          ar: "وظيفته الأساسية أنه مضاد للأكسدة، أي يحمي الخلايا من التلف الذي تسببه الأكسدة.",
          trick: "الأكسدة مثل صدأ الحديد، وفيتامين إي طلاء يمنع الصدأ عن خلاياك."
        },
        {
          en: "It stabilizes cell membranes and regulates oxidation reactions.",
          ar: "يثبّت أغشية الخلايا، وينظّم تفاعلات الأكسدة.",
          trick: "التوكة تثبّت، والطلاء يمنع الصدأ: فيتامين إي يثبّت جدار الخلية، ويضبط سرعة الصدأ."
        },
        {
          en: "It protects polyunsaturated fatty acids (PUFA) and vitamin A.",
          ar: "يحمي الأحماض الدهنية المتعددة غير المشبعة من الأكسدة، ويحمي فيتامين إيه أيضاً.",
          trick: "«إي» يحرس أخاه «إيه»: الاسمان متقاربان في الصوت، والصغير يحمي الكبير."
        },
        {
          en: "Defects: erythrocyte hemolysis, nerve damage.",
          ar: "نقصه يسبب تكسّر كريات الدم الحمراء، وتلف الأعصاب.",
          trick: "بلا طلاء يصدأ أضعف جدارين: جدار الكرية الحمراء فتنفجر، وغلاف العصب فيتلف."
        },
        {
          en: "Toxicity: hemorrhaging effects.",
          ar: "زيادته تسبب النزف.",
          trick: "زيادة «إي» تعطي نزفاً، ونقص «كيه» يعطي نزفاً أيضاً: احفظهما معاً."
        },
        {
          en: "Sources: polyunsaturated vegetable oils (margarine, salad dressings, shortenings).",
          ar: "مصادره الزيوت النباتية المتعددة غير المشبعة، مثل المارجرين، وصلصات السلطة، والسمن النباتي الصلب المستعمل في المعجنات.",
          trick: "فيتامين إي يحمي الزيوت من الأكسدة، فتجده حيث يوجد الزيت."
        },
        {
          en: "Sources: green and leafy vegetables, wheat germ, whole grain products, nuts, seeds.",
          ar: "ومن مصادره أيضاً: الخضار الخضراء الورقية، وجنين القمح، ومنتجات الحبوب الكاملة، والمكسرات، والبذور.",
          trick: "صحن سلطة بالزيت والخضار، وفوقه مكسرات وبذور، وبجانبه خبز حبوب كاملة: هذه وجبة فيتامين إي."
        }
      ],
      quiz: [
        {
          q: "The main function of vitamin E is:",
          options: ["Synthesis of blood clotting proteins", "Antioxidant", "Mineralization of bones", "Vision"],
          answer: 1,
          why: "فيتامين إي طلاء يمنع الصدأ، أي مضاد للأكسدة."
        },
        {
          q: "Erythrocyte hemolysis is a sign of deficiency of:",
          options: ["Vitamin K", "Vitamin D", "Vitamin E", "Vitamin A"],
          answer: 2,
          why: "بلا فيتامين إي تنفجر الكرية الحمراء ويتلف العصب."
        },
        {
          q: "Vitamin E toxicity causes:",
          options: ["Soft tissue calcification", "Hemorrhaging effects", "Birth defects", "Night blindness"],
          answer: 1,
          why: "زيادة فيتامين إي تسبب النزف. تذكّر الزوج: زيادة إي ونقص كيه."
        },
        {
          q: "Vitamin E protects polyunsaturated fatty acids and:",
          options: ["Vitamin A", "Vitamin K", "Vitamin D", "Vitamin C"],
          answer: 0,
          why: "الأخ «إي» يحرس أخاه «إيه»."
        },
        {
          q: "Wheat germ and nuts are listed as sources of:",
          options: ["Vitamin E", "Vitamin D", "Retinol", "Vitamin C"],
          answer: 0,
          why: "جنين القمح والمكسرات والبذور والزيوت من مصادر فيتامين إي."
        }
      ]
    },
    {
      id: "t8",
      term: "Vitamin K: Functions, Defects, Toxicity and Sources",
      title: "فيتامين كيه",
      words: [
        { en: "Phylloquinone", pron: "فيلو-كوينون" },
        { en: "Menaquinone", pron: "مينا-كوينون" },
        { en: "Blood clotting", pron: "بلَد-كلوتنغ" },
        { en: "Hemorrhage", pron: "هيمو-ريج" },
        { en: "Synthesized", pron: "سِنثي-سايزد" },
        { en: "Cruciferous", pron: "كروسي-فيرس" }
      ],
      facts: [
        {
          en: "Vitamin K: phylloquinone, menaquinone.",
          ar: "لفيتامين كيه شكلان: الفيلوكوينون، والميناكوينون.",
          trick: "الاسمان ينتهيان بـ«كوينون»، وكيه أول صوت في «كوينون». و«فيلو» تعني ورقة، والفيتامين موجود في الخضار الورقية."
        },
        {
          en: "Main function: synthesis of blood clotting proteins and bone proteins.",
          ar: "وظيفته صنع بروتينات تخثر الدم، وبروتينات العظم.",
          trick: "كيه = «كتلة» الدم: هو الذي يجعل الدم يتكتّل ويتخثر. ومعها العظم."
        },
        {
          en: "Defects: hemorrhage.",
          ar: "نقصه يسبب النزف، لأن الدم لا يتخثر.",
          trick: "لا كتلة، إذن الدم يسيل."
        },
        {
          en: "Toxicity: not known.",
          ar: "سميته غير معروفة، أي لم تُذكر له أضرار عند الزيادة.",
          trick: "هو الوحيد بين الأربعة بلا سمية معروفة: «كيه كويّس» حتى لو زاد."
        },
        {
          en: "It is synthesized in the body by bacteria in the digestive tract.",
          ar: "تصنعه في الجسم بكتيريا تعيش في الجهاز الهضمي.",
          trick: "اثنان يصنعهما الجسم: دي بالشمس من فوق، وكيه بالبكتيريا من الداخل."
        },
        {
          en: "Sources: green leafy vegetables, cruciferous vegetables, vegetable oils.",
          ar: "مصادره من الطعام: الخضار الورقية الخضراء، والخضار الصليبية مثل الملفوف والقرنبيط، والزيوت النباتية.",
          trick: "كيه = «كرنب»، والكرنب من الخضار الصليبية، وأوراقه خضراء، ويُطبخ بالزيت."
        }
      ],
      quiz: [
        {
          q: "Vitamin K is needed for the synthesis of:",
          options: ["Blood clotting proteins and bone proteins", "The cornea", "Cell membrane antioxidants", "Polyunsaturated fatty acids"],
          answer: 0,
          why: "فيتامين كيه كتلة الدم: يصنع بروتينات التخثر وبروتينات العظم."
        },
        {
          q: "Deficiency of vitamin K causes:",
          options: ["Rickets", "Night blindness", "Hemorrhage", "Nerve damage"],
          answer: 2,
          why: "بلا فيتامين كيه لا يتخثر الدم، فيحدث النزف."
        },
        {
          q: "The toxicity of vitamin K is:",
          options: ["Hemorrhaging effects", "Calcium imbalance", "Liver disorders", "Not known"],
          answer: 3,
          why: "كيه كويّس: لا سمية معروفة له. والنزف من زيادة فيتامين إي."
        },
        {
          q: "Phylloquinone and menaquinone are forms of:",
          options: ["Vitamin K", "Vitamin E", "Vitamin D", "Vitamin A"],
          answer: 0,
          why: "الاسمان ينتهيان بـ«كوينون»، وأول صوت فيه كيه."
        },
        {
          q: "Vitamin K is synthesized in the body by:",
          options: ["Sunlight on the skin", "Bacteria in the digestive tract", "The liver from beta-carotene", "The kidney from cholesterol"],
          answer: 1,
          why: "بكتيريا الجهاز الهضمي تصنع فيتامين كيه. أما الشمس فتساعد على صنع فيتامين دي."
        }
      ]
    },
    {
      id: "t9",
      term: "Review: Comparing the Fat-Soluble Vitamins",
      title: "مراجعة: مقارنة الفيتامينات الأربعة",
      words: [
        { en: "Precursor", pron: "بري-كيرسر" },
        { en: "Hemorrhage", pron: "هيمو-ريج" }
      ],
      facts: [
        {
          en: "Precursors: beta-carotene for vitamin A; cholesterol for vitamin D.",
          ar: "المادة الأولية لفيتامين إيه هي البيتا كاروتين، ولفيتامين دي هي الكوليسترول.",
          trick: "الجزرة لعينك، والكوليسترول لعظمك."
        },
        {
          en: "Made in the body: vitamin D with the help of sunlight; vitamin K by bacteria in the digestive tract.",
          ar: "الجسم يصنع فيتامين دي بمساعدة الشمس، وتصنع بكتيريا الجهاز الهضمي فيتامين كيه.",
          trick: "شمس من فوق لفيتامين دي، وبكتيريا من الداخل لفيتامين كيه."
        },
        {
          en: "Bleeding: vitamin E toxicity causes hemorrhaging effects; vitamin K deficiency causes hemorrhage.",
          ar: "النزف يأتي من حالتين: زيادة فيتامين إي، ونقص فيتامين كيه.",
          trick: "زيادة إي تساوي نقص كيه: النتيجة واحدة، نزف."
        },
        {
          en: "Toxicity not known: only vitamin K.",
          ar: "فيتامين كيه هو الوحيد بين الأربعة الذي سميته غير معروفة.",
          trick: "كيه كويّس."
        },
        {
          en: "Bones: vitamin A (bone development), vitamin D (mineralization of bones), vitamin K (bone proteins).",
          ar: "ثلاثة فيتامينات لها علاقة بالعظم: إيه لنمو العظم، ودي لتمعدنه، وكيه لبروتينات العظم. وزيادة إيه المزمنة تُنقص كتلة معادن العظم.",
          trick: "إي وحده لا يلمس العظم في هذه المحاضرة. الباقون الثلاثة كلهم أصدقاء العظم."
        },
        {
          en: "Milk, eggs and liver are sources of both vitamin A (retinol) and vitamin D.",
          ar: "الحليب والبيض والكبد مصادر مشتركة للريتينول، أي فيتامين إيه، ولفيتامين دي.",
          trick: "سلة واحدة فيها حليب وبيض وكبد، وفيها فيتامينان: إيه ودي."
        },
        {
          en: "Green leafy vegetables are listed for vitamin A (beta-carotene), vitamin E and vitamin K; margarine for vitamin D and vitamin E.",
          ar: "الخضار الورقية الخضراء مصدر للبيتا كاروتين ولفيتامين إي ولفيتامين كيه. والمارجرين مصدر لفيتامين دي ولفيتامين إي.",
          trick: "الورق الأخضر يعطي ثلاثة ولا يعطي دي. والمارجرين على الخبز يعطي اثنين: دي وإي."
        }
      ],
      quiz: [
        {
          q: "Hemorrhage is associated with:",
          options: ["Vitamin E toxicity and vitamin K deficiency", "Vitamin A toxicity and vitamin D deficiency", "Vitamin D toxicity and vitamin E deficiency", "Vitamin K toxicity and vitamin A deficiency"],
          answer: 0,
          why: "زيادة إي تساوي نقص كيه: النتيجة نزف."
        },
        {
          q: "According to the lecture, which two vitamins are made in the body by sunlight or by bacteria in the digestive tract?",
          options: ["Vitamin A and vitamin E", "Vitamin D and vitamin K", "Vitamin A and vitamin K", "Vitamin D and vitamin E"],
          answer: 1,
          why: "دي بالشمس، وكيه ببكتيريا الأمعاء."
        },
        {
          q: "Which fat-soluble vitamin has no known toxicity?",
          options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
          answer: 3,
          why: "كيه كويّس: لا سمية معروفة له."
        },
        {
          q: "Milk, eggs and liver are sources of:",
          options: ["Vitamin E and vitamin K", "Vitamin A (retinol) and vitamin D", "Beta-carotene only", "Vitamin K only"],
          answer: 1,
          why: "السلة الواحدة: حليب وبيض وكبد، فيها إيه ودي."
        },
        {
          q: "Which vitamin is NOT listed with green leafy vegetables as a source?",
          options: ["Vitamin A (beta-carotene)", "Vitamin E", "Vitamin K", "Vitamin D"],
          answer: 3,
          why: "الورق الأخضر يعطي إيه وإي وكيه، ولا يعطي دي."
        }
      ]
    }
  ]
};
