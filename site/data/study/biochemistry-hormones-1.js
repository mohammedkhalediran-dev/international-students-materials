/*
  data/study/biochemistry-hormones-1.js
  ----------------------------------------------------------------
  محتوى وضع الدراسة لمحاضرة: Biochemistry of Hormones، المحاضرة 1 (Hormone basic overview).
  المصدر الوحيد: ملف الشرائح (Endocrine Glands: Secretion and Action of Hormones) المرفوع من صفحة الرفع.
  لا تُضف معلومة ليست فيه.

  قواعد الكتابة (يتحقق منها tests/data_check.js):
    - en: الجملة الإنجليزية من المادة، وتظهر في سطر مستقل.
    - ar و trick و why: عربي فقط بلا أي حرف لاتيني، حتى لا يختلط الاتجاه على الشاشة.
    - لكل معلومة (fact) حيلة حفظ (trick).
    - words: الكلمات الصعبة مع نطقها بحروف عربية، مقسوماً بشرطة إلى جزأين (ثلاثة للكلمة الطويلة).
    - quiz: أسئلة اختيار من متعدد بالإنجليزية، وanswer رقم الخيار الصحيح بدءاً من 0.
*/
window.STUDY = window.STUDY || {};
STUDY["biochemistry-hormones-1"] = {
  topics: [
    {
      id: "t1",
      term: "Hormones and Endocrinology",
      title: "ما هو الهرمون؟ وما هو علم الغدد الصماء؟",
      words: [
        { en: "Hormones", pron: "هور-مونز" },
        { en: "Endocrine glands", pron: "إندو-كرين غلاندز" },
        { en: "Endocrinology", pron: "إندوكري-نولوجي" },
        { en: "Effector organs", pron: "إفِكتر-أورغانز" },
        { en: "Adrenalin", pron: "أدري-نالين" },
        { en: "Glycogen degradation", pron: "غلايكوجين ديغرا-ديشن" },
        { en: "Intercellular", pron: "إنتر-سيليولر" }
      ],
      facts: [
        {
          en: "Hormones are chemical messengers carried by blood to non-adjacent \"target\" cells where they regulate the metabolism.",
          ar: "الهرمونات رسل كيميائية يحملها الدم إلى خلايا «هدف» بعيدة غير مجاورة، وهناك تنظّم عمليات الأيض.",
          trick: "الهرمون «ساعي بريد»: يركب الدم، ويوصل الرسالة إلى عنوان بعيد هو الخلية الهدف."
        },
        {
          en: "Example: adrenalin is produced in the adrenal gland and released into blood; it works in other tissues such as the liver and muscle, promoting glycogen degradation.",
          ar: "مثال: الأدرينالين يُصنع في الغدة الكظرية ويُطلق في الدم، ثم يعمل في أنسجة أخرى مثل الكبد والعضلات، فيحفّز تكسير الجلايكوجين، وهو مخزن السكر.",
          trick: "الأدرينالين هرمون الخوف: عندما تخاف تحتاج سكراً سريعاً، فيكسر مخزن السكر في الكبد والعضلات لتهرب."
        },
        {
          en: "Hormones are synthesized in specialized cells, often associated to form endocrine glands, released into the blood and transported to their effector organs.",
          ar: "تُصنع الهرمونات في خلايا متخصصة تتجمع غالباً لتكوّن الغدد الصماء، ثم تُطلق في الدم وتُنقل إلى الأعضاء المستجيبة لها.",
          trick: "مصنع ثم طريق ثم زبون: الغدة تصنع، والدم ينقل، والعضو يستجيب."
        },
        {
          en: "In contrast to endocrine hormones, tissue hormones are only active in the immediate vicinity of the cells that secrete them.",
          ar: "على عكس هرمونات الغدد الصماء، الهرمونات النسيجية تعمل فقط قرب الخلايا التي أفرزتها مباشرة.",
          trick: "هرمون الغدة يسافر بعيداً، والهرمون النسيجي «ابن الحارة» لا يخرج من الحي."
        },
        {
          en: "Endocrinology = intercellular chemical communication; it is about communication systems and information transfer.",
          ar: "علم الغدد الصماء هو علم التواصل الكيميائي بين الخلايا، أي علم أنظمة الاتصال ونقل المعلومات.",
          trick: "اعتبره «علم الهواتف» بين الخلايا: من يرسل، وماذا يقول، ومن يسمع."
        }
      ],
      quiz: [
        {
          q: "Hormones are best defined as:",
          options: ["Chemical messengers carried by blood to non-adjacent target cells", "Enzymes acting only inside the cell that made them", "Nerve impulses carried along axons", "Structural proteins of the cell membrane"],
          answer: 0,
          why: "الهرمون ساعي بريد يركب الدم إلى خلايا هدف بعيدة."
        },
        {
          q: "Hormones that are active only in the immediate vicinity of the cells that secrete them are called:",
          options: ["Endocrine hormones", "Tissue hormones", "Prehormones", "Trophic hormones"],
          answer: 1,
          why: "الهرمون النسيجي ابن الحارة، يعمل قرب الخلية التي أفرزته فقط."
        },
        {
          q: "Adrenalin acting on liver and muscle promotes:",
          options: ["Glycogen synthesis", "Glycogen degradation", "Protein storage", "Fat storage"],
          answer: 1,
          why: "هرمون الخوف يكسر مخزن السكر لتحصل على طاقة سريعة."
        }
      ]
    },
    {
      id: "t2",
      term: "Elements of an Endocrine System",
      title: "عناصر نظام الغدد الصماء الثمانية",
      words: [
        { en: "Nondestructive medium", pron: "نون-دستركتف ميديَم" },
        { en: "Hormone binders", pron: "هورمون-بايندرز" },
        { en: "Receptor protein", pron: "ريسِبتر-بروتين" },
        { en: "Transducer", pron: "ترانز-ديوسر" },
        { en: "Second messengers", pron: "سِكند-مسنجرز" },
        { en: "Amplifier", pron: "أمبلي-فاير" },
        { en: "Effector", pron: "إي-فِكتر" }
      ],
      facts: [
        {
          en: "Sender = sending cell; Signal = hormone.",
          ar: "المُرسِل هو الخلية التي تُفرز، والإشارة هي الهرمون نفسه.",
          trick: "مثل رسالة هاتفية: المرسل شخص، والرسالة هي الكلام."
        },
        {
          en: "Nondestructive medium = serum and hormone binders.",
          ar: "الوسط الذي لا يُتلف الرسالة هو مصل الدم والبروتينات الحاملة للهرمون.",
          trick: "الطريق الآمن: الدم هو الشارع، والبروتين الحامل هو السيارة التي تحمي الرسالة من التلف."
        },
        {
          en: "Selective receiver = receptor protein.",
          ar: "المستقبِل الانتقائي هو بروتين المستقبِل، الذي يلتقط هرموناً محدداً فقط.",
          trick: "المستقبل قفل، والهرمون مفتاحه الخاص. لا يفتح القفل إلا مفتاحه."
        },
        {
          en: "Transducer = transducer proteins and second messengers; Amplifier = transducer/effector enzymes.",
          ar: "المحوِّل هو بروتينات التحويل والرسل الثانية، أي التي تحوّل الإشارة من خارج الخلية إلى داخلها. والمضخِّم هو إنزيمات التحويل والتنفيذ التي تكبّر الإشارة.",
          trick: "المحوّل مترجم ينقل الكلام إلى لغة الخلية، والمضخّم مكبّر صوت يجعل الهمسة صرخة."
        },
        {
          en: "Effector = effector proteins; Response = cellular response (secondary hormones).",
          ar: "المنفِّذ هو البروتينات المنفِّذة، والاستجابة هي ردّ فعل الخلية، وقد يكون إفراز هرمونات ثانوية.",
          trick: "احفظ الثمانية كقصة: مرسل يرسل إشارة في طريق آمن إلى مستقبل، فيترجمها المحوّل، ويكبّرها المضخّم، وينفّذها المنفّذ، فتحدث الاستجابة."
        }
      ],
      quiz: [
        {
          q: "In an endocrine system, the selective receiver is the:",
          options: ["Receptor protein", "Hormone binder", "Sending cell", "Effector enzyme"],
          answer: 0,
          why: "المستقبل الانتقائي هو بروتين المستقبل، القفل الذي لا يفتحه إلا مفتاحه."
        },
        {
          q: "Serum and hormone binders represent the:",
          options: ["Amplifier", "Transducer", "Nondestructive medium", "Response"],
          answer: 2,
          why: "الدم والبروتين الحامل هما الطريق الآمن الذي لا يُتلف الرسالة."
        },
        {
          q: "Transducer proteins and second messengers act as the:",
          options: ["Sender", "Signal", "Transducer", "Effector"],
          answer: 2,
          why: "المحوّل يترجم الإشارة من خارج الخلية إلى داخلها."
        }
      ]
    },
    {
      id: "t3",
      term: "Endocrine Functions",
      title: "وظائف الهرمونات",
      words: [
        { en: "Homeostasis", pron: "هوميو-ستاسِس" },
        { en: "Ovulation", pron: "أوفيو-ليشن" },
        { en: "Menstruation", pron: "منستر-ويشن" },
        { en: "Pregnancy", pron: "بريغ-نانسي" },
        { en: "External stimuli", pron: "إكستيرنال-ستيميولاي" }
      ],
      facts: [
        {
          en: "Endocrine functions: maintain internal homeostasis (parameters maintained within relatively narrow limits).",
          ar: "أول وظيفة: الحفاظ على الاتزان الداخلي، أي إبقاء قيم البيئة الداخلية مثل السكر والأملاح ضمن حدود ضيقة نسبياً.",
          trick: "الهرمونات «منظّم حرارة» في البيت: تُبقي كل شيء في المدى المريح."
        },
        {
          en: "Support cell growth and coordinate development (regulation of growth and development).",
          ar: "تدعم نمو الخلايا، وتنسّق التطور، أي تنظّم النمو والتطور.",
          trick: "الهرمون «مهندس البناء»: يقرر متى يكبر الجسم وكيف."
        },
        {
          en: "Coordinate reproduction: control of reproductive processes (ovulation, menstruation, maintenance of pregnancy).",
          ar: "تنسّق التكاثر: تتحكم بعمليات الجهاز التناسلي مثل الإباضة، والدورة الشهرية، والحفاظ على الحمل.",
          trick: "ثلاث محطات تناسلية: بويضة تخرج، ودورة تتكرر، وحمل يستمر."
        },
        {
          en: "Facilitate responses to external stimuli, and effects on behavior (modification, modulation, initiation of specific patterns).",
          ar: "تسهّل استجابة الجسم للمؤثرات الخارجية، وتؤثر في السلوك: تعدّله، وتضبطه، وتبدأ أنماطاً سلوكية معينة.",
          trick: "احفظ الوظائف بكلمة «اتزان، نمو، تكاثر، سلوك»: البيت المتزن، والطفل الذي يكبر، والعائلة، وطريقة التصرف."
        }
      ],
      quiz: [
        {
          q: "Which of the following is NOT listed as an endocrine function?",
          options: ["Maintain internal homeostasis", "Coordinate reproduction", "Facilitate responses to external stimuli", "Conduct action potentials along axons"],
          answer: 3,
          why: "نقل الإشارة الكهربائية على المحور العصبي عمل الأعصاب. الوظائف: اتزان، نمو، تكاثر، سلوك واستجابة."
        },
        {
          q: "Maintenance of pregnancy is an example of hormonal:",
          options: ["Control of reproductive processes", "Homeostatic control of electrolytes", "Effects on behavior", "Glycogen degradation"],
          answer: 0,
          why: "الحفاظ على الحمل من محطات التكاثر الثلاث مع الإباضة والدورة."
        }
      ]
    },
    {
      id: "t4",
      term: "The Endocrine Glands; Prohormones and Prehormones",
      title: "الغدد الصماء والهرمونات الأولية",
      words: [
        { en: "Hypothalamus", pron: "هايبو-ثالامس" },
        { en: "Pituitary", pron: "بيتيو-تري" },
        { en: "Parathyroid", pron: "بارا-ثايرويد" },
        { en: "Pancreatic islets", pron: "بانكرياتك-آيلتس" },
        { en: "Prohormone", pron: "برو-هورمون" },
        { en: "Preprohormone", pron: "بري-برو-هورمون" },
        { en: "Prehormone", pron: "بري-هورمون" },
        { en: "Proinsulin", pron: "برو-إنسولين" }
      ],
      facts: [
        {
          en: "The endocrine system consists of several glands: hypothalamus, pituitary, thyroid, parathyroid, adrenal, kidneys, pancreatic islets, ovaries, testes.",
          ar: "يتكون جهاز الغدد الصماء من عدة غدد في أماكن مختلفة: تحت المهاد، والغدة النخامية، والدرقية، والجار درقية، والكظرية، والكليتان، وجزر البنكرياس، والمبيضان، والخصيتان.",
          trick: "انزل من الرأس إلى الحوض: في الدماغ تحت المهاد والنخامية، في الرقبة الدرقية والجار درقية، في البطن الكظرية والكلية والبنكرياس، وفي الحوض المبيض والخصية."
        },
        {
          en: "Prohormone: a longer polypeptide precursor that is cut and spliced to make the hormone; example: proinsulin.",
          ar: "الهرمون الأولي سلسلة ببتيدية أطول تُقص وتُوصل لتصنع الهرمون. مثاله طليعة الإنسولين.",
          trick: "«برو» قطعة قماش طويلة يقصها الخياط ليصنع الثوب: الثوب هو الإنسولين."
        },
        {
          en: "Preprohormone: prohormone derived from a larger precursor molecule; example: preproinsulin.",
          ar: "ما قبل الهرمون الأولي جزيء أكبر يُشتق منه الهرمون الأولي. مثاله ما قبل طليعة الإنسولين.",
          trick: "الترتيب بالحجم من الأكبر: «بري برو» ثم «برو» ثم الهرمون. كل كلمة تُحذف تعني قصاً جديداً."
        },
        {
          en: "Prehormone: molecules secreted by endocrine glands that are inactive until changed into hormones by target cells; example: thyroxine (T4) converted to T3.",
          ar: "قبل الهرمون جزيء تُفرزه الغدة وهو غير فعّال، ولا يصير هرموناً إلا عندما تحوّله الخلية الهدف. مثاله تحويل الثايروكسين رباعي اليود إلى ثلاثي اليود.",
          trick: "«بري» وحدها تعني ضيفاً يدخل البيت بلا عمل، والخلية الهدف هي التي تعطيه العمل. الرابع يصير ثالثاً."
        }
      ],
      quiz: [
        {
          q: "Proinsulin is an example of a:",
          options: ["Prehormone", "Prohormone", "Preprohormone", "Tissue hormone"],
          answer: 1,
          why: "طليعة الإنسولين سلسلة أطول تُقص وتُوصل لتصنع الإنسولين، وهذا هو الهرمون الأولي."
        },
        {
          q: "T4 converted to T3 in target cells is an example of a:",
          options: ["Prehormone", "Prohormone", "Preprohormone", "Second messenger"],
          answer: 0,
          why: "قبل الهرمون يخرج من الغدة غير فعّال، والخلية الهدف تحوّله إلى هرمون."
        },
        {
          q: "Which molecule is the largest precursor of insulin?",
          options: ["Proinsulin", "Insulin", "Preproinsulin", "C-peptide"],
          answer: 2,
          why: "الترتيب من الأكبر: ما قبل طليعة الإنسولين، ثم طليعة الإنسولين، ثم الإنسولين."
        },
        {
          q: "Which of the following is listed among the endocrine glands?",
          options: ["Spleen", "Kidneys", "Lungs", "Gallbladder"],
          answer: 1,
          why: "الكليتان ضمن قائمة الغدد الصماء في المحاضرة."
        }
      ]
    },
    {
      id: "t5",
      term: "Chemical Classification of Hormones",
      title: "التصنيف الكيميائي للهرمونات",
      words: [
        { en: "Steroids", pron: "ستي-رويدز" },
        { en: "Cholesterol", pron: "كوليس-ترول" },
        { en: "Glycoproteins", pron: "غلايكو-بروتينز" },
        { en: "Amines", pron: "أ-مينز" },
        { en: "Tyrosine", pron: "تايرو-سين" },
        { en: "Tryptophan", pron: "تربتو-فان" },
        { en: "Prostaglandins", pron: "بروستا-غلاندنز" },
        { en: "Lipophilic", pron: "لايبو-فيلك" }
      ],
      facts: [
        {
          en: "Steroids are synthesized from cholesterol by the adrenal cortex, testis, ovary and placenta; for example cortisol and estradiol.",
          ar: "الستيرويدات تُصنع من الكوليسترول في قشرة الكظرية، والخصية، والمبيض، والمشيمة. مثالها الكورتيزول والإستراديول.",
          trick: "أربعة مصانع للستيرويد: «قشرة، خصية، مبيض، مشيمة»، وكلها تطبخ من مادة واحدة هي الكوليسترول."
        },
        {
          en: "Nitrogen-containing hormones: amines (epinephrine, norepinephrine), peptides (oxytocin, ADH), proteins (growth hormone, insulin), glycoproteins (FSH, TSH).",
          ar: "الهرمونات المحتوية على النيتروجين أربعة أنواع: الأمينات مثل الإبينفرين والنورإبينفرين، والببتيدات مثل الأوكسيتوسين والهرمون المضاد لإدرار البول، والبروتينات مثل هرمون النمو والإنسولين، والبروتينات السكرية مثل الهرمون المنبه للجريب والهرمون المنبه للدرقية.",
          trick: "من الأصغر إلى الأكبر: أمين ثم ببتيد ثم بروتين ثم بروتين عليه سكر."
        },
        {
          en: "Amines: hormones derived from tyrosine and tryptophan; NE, Epi, T4.",
          ar: "الأمينات هرمونات مشتقة من الحمضين الأمينيين التايروسين والتربتوفان، ومنها النورإبينفرين والإبينفرين والثايروكسين رباعي اليود.",
          trick: "الأمينات «أبناء حمضين»: تايروسين وتربتوفان. وانتبه: هرمون الدرقية أمين وليس ستيرويد."
        },
        {
          en: "Polypeptides: chains of less than 100 amino acids (ADH); protein hormones: chains with more than 100 amino acids (growth hormone).",
          ar: "الببتيد المتعدد سلسلة أقل من مئة حمض أميني، مثل الهرمون المضاد لإدرار البول. والهرمون البروتيني سلسلة أكثر من مئة حمض أميني، مثل هرمون النمو.",
          trick: "الحد هو مئة: تحت المئة ببتيد صغير، وفوق المئة بروتين كبير. وهرمون النمو كبير لأنه «ينمو» فوق المئة."
        },
        {
          en: "Lipids derived from cholesterol are lipophilic hormones: testosterone, estradiol, cortisol, progesterone.",
          ar: "الهرمونات الدهنية المشتقة من الكوليسترول محبة للدهون، ومنها التستوستيرون، والإستراديول، والكورتيزول، والبروجستيرون.",
          trick: "هرمونات الجنس والكورتيزول كلها من الكوليسترول، فهي تحب الدهن."
        },
        {
          en: "Four major chemical classes: steroid hormones (progesterone), peptide hormones (insulin), amino acid derivatives (epinephrine), prostaglandins and related compounds.",
          ar: "في تقسيم آخر أربع فئات كيميائية كبرى: الستيرويدات مثل البروجستيرون، والببتيدات مثل الإنسولين، ومشتقات الأحماض الأمينية مثل الإبينفرين، والبروستاغلاندينات وما يشبهها.",
          trick: "«ستيرويد، ببتيد، أميني، بروستا»: أربعة أصدقاء يبدأ كل واحد بحرف مختلف."
        }
      ],
      quiz: [
        {
          q: "Steroid hormones are synthesized from:",
          options: ["Tyrosine", "Cholesterol", "Tryptophan", "Glucose"],
          answer: 1,
          why: "كل الستيرويدات تُطبخ من الكوليسترول."
        },
        {
          q: "A hormone with a polypeptide chain of more than 100 amino acids, such as growth hormone, is classified as a:",
          options: ["Polypeptide", "Protein hormone", "Amine", "Steroid"],
          answer: 1,
          why: "فوق المئة بروتين، وتحت المئة ببتيد."
        },
        {
          q: "Thyroxine (T4) is chemically classified as a(n):",
          options: ["Steroid", "Glycoprotein", "Amine", "Prostaglandin"],
          answer: 2,
          why: "هرمون الدرقية أمين مشتق من التايروسين، وليس ستيرويداً."
        },
        {
          q: "FSH and TSH belong to which class?",
          options: ["Glycoproteins", "Amines", "Steroids", "Polypeptides under 100 amino acids"],
          answer: 0,
          why: "الهرمون المنبه للجريب والمنبه للدرقية بروتينات عليها سكر."
        },
        {
          q: "Which of the following is NOT a steroid hormone?",
          options: ["Cortisol", "Estradiol", "Oxytocin", "Progesterone"],
          answer: 2,
          why: "الأوكسيتوسين ببتيد، أما البقية فمن الكوليسترول."
        }
      ]
    },
    {
      id: "t6",
      term: "Hormone Transport, Storage, Metabolism and Excretion",
      title: "نقل الهرمون وتخزينه والتخلص منه",
      words: [
        { en: "Plasma proteins", pron: "بلازما-بروتينز" },
        { en: "Capillary walls", pron: "كابيلري-وولز" },
        { en: "Metabolic clearance rate", pron: "ميتابولك-كليرنس ريت" },
        { en: "Half-life", pron: "هاف-لايف" },
        { en: "Internalized", pron: "إنتير-نالايزد" },
        { en: "Chromatin", pron: "كروما-تين" },
        { en: "Catecholamines", pron: "كاتيكو-لامينز" }
      ],
      facts: [
        {
          en: "Water-soluble hormones are transported dissolved in blood plasma; others circulate bound to plasma proteins; the free hormone diffuses across capillary walls to its target cells.",
          ar: "الهرمونات الذائبة في الماء تُنقل ذائبة في بلازما الدم، والأخرى تدور مرتبطة ببروتينات البلازما. والهرمون الحر وحده هو الذي ينتشر عبر جدار الشعيرات ليصل إلى خلاياه الهدف.",
          trick: "الراكب المحمول في السيارة لا يدخل البيت، ينزل أولاً ثم يدخل: الحر فقط يعبر."
        },
        {
          en: "Lipophilic steroid and thyroid hormones are attached to plasma carrier proteins and dissociate from them to pass through the lipid component of the target plasma membrane.",
          ar: "هرمونات الستيرويد والدرقية المحبة للدهون ترتبط ببروتينات حاملة في البلازما، ثم تنفصل عنها لتعبر الطبقة الدهنية لغشاء الخلية الهدف.",
          trick: "محب الدهن لا يسبح في الماء وحده، فيركب حاملاً، ويعبر غشاء الدهن بسهولة لأنه من جنسه."
        },
        {
          en: "Plasma concentration depends on rate of secretion and rate of removal; hormones are excreted by kidneys or metabolized in blood or target cells.",
          ar: "تركيز الهرمون في البلازما يعتمد على سرعة إفرازه وسرعة إزالته. ويُتخلص منه إما بإخراجه عن طريق الكلية، وإما بتفكيكه في الدم أو في الخلايا الهدف.",
          trick: "مثل حوض ماء: الصنبور هو الإفراز، والمصرف هو الإزالة، ومستوى الماء هو التركيز."
        },
        {
          en: "Metabolic clearance rate (MCR) defines the quantitative removal of hormone from plasma; the bulk is cleared by liver and kidneys, only a small fraction by target tissue.",
          ar: "معدل التصفية الأيضية يحدد كمية الهرمون التي تُزال من البلازما. معظم الهرمون يصفّيه الكبد والكليتان، وجزء صغير فقط يزيله النسيج الهدف.",
          trick: "عمّال النظافة الكبار هما الكبد والكلية، والخلية الهدف تنظف قليلاً فقط."
        },
        {
          en: "Protein and amine hormones bind to receptors and are internalized and degraded; steroid and thyroid hormones are degraded after the hormone-receptor complex binds to nuclear chromatin.",
          ar: "الهرمونات البروتينية والأمينية ترتبط بمستقبلها ثم تُسحب إلى داخل الخلية وتُفكَّك. أما الستيرويد والدرقية فتُفكَّك بعد ارتباط معقد الهرمون والمستقبل بالمادة الوراثية في النواة.",
          trick: "البروتيني يُبلع ويُهضم عند الباب، والستيرويدي يصل إلى غرفة النواة أولاً ثم يُفكَّك."
        },
        {
          en: "Half-lives: amines 2-3 min; T4 6.7 days; T3 0.75 days; polypeptides 4-40 min; proteins 15-170 min; steroids 4-120 min.",
          ar: "أعمار النصف: الأمينات دقيقتان إلى ثلاث، والثايروكسين رباعي اليود 6.7 يوم، وثلاثي اليود 0.75 يوم، والببتيدات 4 إلى 40 دقيقة، والبروتينات 15 إلى 170 دقيقة، والستيرويدات 4 إلى 120 دقيقة.",
          trick: "الأمين «ومضة» دقيقتان أو ثلاث، والدرقية «معمّرة» بالأيام: الرابع قرابة أسبوع، والثالث أقل من يوم."
        },
        {
          en: "Storage in cell: steroids and 1,25(OH)2-D3 none; catecholamines and PTH hours; insulin days; T3 and T4 weeks.",
          ar: "التخزين داخل الخلية: الستيرويدات وفيتامين دي الفعّال لا تُخزَّن أبداً، والكاتيكولامينات وهرمون الجار درقية تُخزَّن ساعات، والإنسولين أياماً، وهرمونات الدرقية أسابيع.",
          trick: "السلم من صفر إلى أسابيع: «ستيرويد صفر، أدرينالين ساعات، إنسولين أيام، درقية أسابيع». الستيرويد لا يُخزَّن لأنه يتسرب من الغشاء الدهني."
        }
      ],
      quiz: [
        {
          q: "Which form of a hormone diffuses across capillary walls to reach target cells?",
          options: ["Protein-bound hormone", "Free hormone", "Prohormone", "Hormone-receptor complex"],
          answer: 1,
          why: "الراكب ينزل من السيارة أولاً: الهرمون الحر وحده يعبر."
        },
        {
          q: "The bulk of circulating hormone is cleared by:",
          options: ["Target tissues", "Liver and kidneys", "Lungs", "Red blood cells"],
          answer: 1,
          why: "عمّال النظافة الكبار هما الكبد والكلية."
        },
        {
          q: "Which hormone has the longest half-life?",
          options: ["Epinephrine", "T4", "Insulin", "Cortisol"],
          answer: 1,
          why: "الثايروكسين رباعي اليود يعيش قرابة سبعة أيام، وهو الأطول."
        },
        {
          q: "Which hormones are NOT stored in the cell?",
          options: ["T3 and T4", "Insulin", "Steroids and 1,25(OH)2-D3", "Catecholamines"],
          answer: 2,
          why: "الستيرويد وفيتامين دي الفعّال تخزينهما صفر."
        },
        {
          q: "The half-life of amine hormones is about:",
          options: ["2-3 minutes", "6.7 days", "15-170 minutes", "Several weeks"],
          answer: 0,
          why: "الأمين ومضة: دقيقتان أو ثلاث."
        }
      ]
    },
    {
      id: "t7",
      term: "Hormone Receptors and Receptor Regulation",
      title: "المستقبلات وتنظيم أعدادها",
      words: [
        { en: "Affinity", pron: "أفي-نيتي" },
        { en: "Noncovalent", pron: "نون-كوفيلنت" },
        { en: "Dissociation constant", pron: "ديسوسي-إيشن كونستنت" },
        { en: "Up-regulation", pron: "أب-ريغيوليشن" },
        { en: "Down-regulation", pron: "داون-ريغيوليشن" },
        { en: "Antagonism", pron: "أنتاغو-نِزم" }
      ],
      facts: [
        {
          en: "All hormone action is receptor mediated; a tissue becomes a target by expressing a specific receptor; hormones reach all tissues but only cells with receptors are targets.",
          ar: "كل عمل للهرمون يتم عبر مستقبل. الهرمون يصل إلى كل الأنسجة بالدم، لكن الخلية لا تصير هدفاً إلا إذا كان عندها مستقبل خاص به.",
          trick: "الإذاعة تصل إلى كل البيوت، لكن لا يسمعها إلا من عنده جهاز راديو."
        },
        {
          en: "Hormone receptors are cellular proteins that bind hormones with high affinity, are altered in shape and function by binding, and exist in limited numbers.",
          ar: "مستقبلات الهرمون بروتينات خلوية ترتبط بالهرمون بألفة عالية، ويتغير شكلها ووظيفتها عند الارتباط، وعددها محدود.",
          trick: "ثلاث صفات للمستقبل: «يحب بقوة، يتغير شكله، عدده قليل»."
        },
        {
          en: "Binding to hormone is noncovalent and reversible; hormone binding may alter binding to other cellular proteins and activate receptor enzyme actions.",
          ar: "ارتباط الهرمون بمستقبله ليس رابطة تساهمية، وهو قابل للعكس. وقد يغيّر ارتباطه بالبروتينات الأخرى، وينشّط عمل إنزيمي في المستقبل.",
          trick: "مصافحة وليست لحاماً: يمسك ثم يترك."
        },
        {
          en: "The interaction is defined by the dissociation constant (Kd); it is very specific and Kd ranges from 10^-9 to 10^-12 molar.",
          ar: "يُقاس هذا الارتباط بثابت التفكك، وهو يدل على سهولة إزاحة الهرمون من مستقبله، أي ألفته. والارتباط شديد الخصوصية، وثابت التفكك بين عشرة أس سالب تسعة وعشرة أس سالب اثني عشر مولار.",
          trick: "رقم صغير جداً يعني ألفة عالية جداً: من تسعة إلى اثني عشر صفراً بعد الفاصلة."
        },
        {
          en: "A low concentration of hormone is compensated by an increase in the number of receptors (up-regulation); a high concentration leads to a decrease (down-regulation).",
          ar: "إذا قلّ الهرمون زادت المستقبلات تعويضاً، وهذا هو التنظيم الصاعد. وإذا كثر الهرمون قلّت المستقبلات، وهذا هو التنظيم الهابط.",
          trick: "عكس الاتجاه دائماً: صوت خافت فتفتح أذنيك أكثر، وصوت عالٍ فتسدّهما."
        },
        {
          en: "A hormone can reduce the number of receptors for a second hormone (antagonism), or increase them, increasing the latter's effectiveness.",
          ar: "قد يُنقص هرمون عدد مستقبلات هرمون آخر فتضعف فعاليته، وهذا هو التضاد. وقد يزيد عدد مستقبلات الهرمون الآخر فتقوى فعاليته.",
          trick: "زميل يسرق كراسي زميله فيضعفه، وزميل يضيف له كراسي فيقويه."
        }
      ],
      quiz: [
        {
          q: "An increase in receptor number in response to a low hormone concentration is called:",
          options: ["Down-regulation", "Up-regulation", "Antagonism", "Internalization"],
          answer: 1,
          why: "الصوت الخافت يجعلك تفتح أذنيك أكثر: تنظيم صاعد."
        },
        {
          q: "Hormone-receptor binding is:",
          options: ["Covalent and irreversible", "Noncovalent and reversible", "Covalent and reversible", "Nonspecific"],
          answer: 1,
          why: "مصافحة وليست لحاماً: غير تساهمية وقابلة للعكس."
        },
        {
          q: "The Kd of hormone-receptor interactions ranges from:",
          options: ["10^-3 to 10^-6 M", "10^-9 to 10^-12 M", "10^-1 to 10^-2 M", "10^-15 to 10^-18 M"],
          answer: 1,
          why: "ثابت التفكك بين عشرة أس سالب تسعة وعشرة أس سالب اثني عشر مولار."
        },
        {
          q: "When one hormone reduces the number of receptors for a second hormone, this is:",
          options: ["Up-regulation", "Antagonism", "Amplification", "Transduction"],
          answer: 1,
          why: "سرقة كراسي الزميل تُضعفه: هذا هو التضاد."
        }
      ]
    },
    {
      id: "t8",
      term: "Types and Location of Hormone Receptors",
      title: "أنواع المستقبلات وأماكنها",
      words: [
        { en: "Membrane receptors", pron: "ممبرين-ريسِبترز" },
        { en: "Nuclear receptors", pron: "نيوكلير-ريسِبترز" },
        { en: "Integral proteins", pron: "إنتيغرال-بروتينز" },
        { en: "Hormone recognition elements", pron: "ريكوغ-نيشن إليمنتس" },
        { en: "Promoter regions", pron: "بروموتر-ريجنز" },
        { en: "Hydrophobic", pron: "هايدرو-فوبك" },
        { en: "Kinases", pron: "كاي-نيسز" }
      ],
      facts: [
        {
          en: "Peptide hormones and catecholamines bind to cell surface receptors; steroid and thyroid hormones act via intracellular receptors.",
          ar: "الهرمونات الببتيدية والكاتيكولامينات ترتبط بمستقبلات على سطح الخلية، أما الستيرويد والدرقية فتعمل عبر مستقبلات داخل الخلية.",
          trick: "الذائب في الماء يقف عند الباب لأنه لا يعبر غشاء الدهن، والمحب للدهن يدخل البيت."
        },
        {
          en: "Membrane receptors: imbedded in the target cell membrane; integral proteins/glycoproteins that penetrate through the membrane.",
          ar: "مستقبلات الغشاء مغروسة في غشاء الخلية الهدف، وهي بروتينات أو بروتينات سكرية تخترق الغشاء من جهة إلى أخرى.",
          trick: "مستقبل الغشاء «جرس الباب»: نصفه في الخارج يُضغط، ونصفه في الداخل يرنّ."
        },
        {
          en: "Nuclear receptors: nuclear proteins that usually act in pairs and bind to hormone recognition elements (HREs) in the promoter regions of target genes; for small hydrophobic molecules (steroids, thyroid hormones).",
          ar: "المستقبلات النووية بروتينات داخل النواة تعمل غالباً أزواجاً، وترتبط بتسلسلات خاصة على الحمض النووي تسمى عناصر التعرف على الهرمون، في مناطق المحفّز للجينات الهدف. وهي للجزيئات الصغيرة الكارهة للماء مثل الستيرويد والدرقية.",
          trick: "المستقبل النووي «زوجان» يقفان على باب الجين في منطقة المحفّز."
        },
        {
          en: "Table: amine (epinephrine) water-soluble, cell surface; amine (thyroid hormone) lipid soluble, intracellular; peptide/protein water soluble, cell surface; steroids and vitamin D lipid soluble, intracellular.",
          ar: "الجدول: الإبينفرين أمين ذائب في الماء ومستقبله على السطح. هرمون الدرقية أمين لكنه محب للدهون ومستقبله داخلي. الببتيد والبروتين ذائبان في الماء ومستقبلهما على السطح. الستيرويد وفيتامين دي محبان للدهون ومستقبلهما داخلي.",
          trick: "الأمين «منقسم»: الأدرينالين عند الباب، والدرقية في الداخل. وفيتامين دي يتصرف كستيرويد."
        },
        {
          en: "Hormone-receptor binding influences: ion channels, enzyme activity that is part of the receptor, activity of kinases, gene proteins and second messengers.",
          ar: "ارتباط الهرمون بمستقبله يؤثر في أربعة أشياء: قنوات الأيونات، ونشاط إنزيم هو جزء من المستقبل، ونشاط إنزيمات الكيناز، وبروتينات الجينات والرسل الثانية.",
          trick: "أربعة أهداف: «قناة، إنزيم، كيناز، جين»."
        },
        {
          en: "Genes could also be activated or inhibited, causing a change in the synthesis rate of proteins coded for by these genes.",
          ar: "وقد تُنشَّط الجينات أو تُثبَّط، فيتغير معدل صنع البروتينات التي تُشفّرها هذه الجينات.",
          trick: "الجين وصفة طبخ: الهرمون يقرر هل نطبخ أكثر أو أقل."
        }
      ],
      quiz: [
        {
          q: "Receptors for steroid and thyroid hormones are located:",
          options: ["On the cell surface", "Inside the cell (intracellular/nuclear)", "In the blood plasma", "On the capillary wall"],
          answer: 1,
          why: "المحب للدهن يعبر الغشاء ويدخل البيت، فمستقبله داخلي."
        },
        {
          q: "Epinephrine is an amine whose receptor is located:",
          options: ["In the nucleus", "On the cell surface", "In the mitochondria", "On the DNA"],
          answer: 1,
          why: "الأدرينالين ذائب في الماء فيقف عند الباب."
        },
        {
          q: "Nuclear receptors usually act in pairs and bind to:",
          options: ["G-proteins", "Hormone recognition elements on DNA", "Calmodulin", "Adenylate cyclase"],
          answer: 1,
          why: "المستقبل النووي زوجان يقفان على عناصر التعرف على الهرمون في الحمض النووي."
        },
        {
          q: "Which hormone is an amine but acts via an intracellular receptor?",
          options: ["Epinephrine", "Norepinephrine", "Thyroid hormone", "Insulin"],
          answer: 2,
          why: "الأمين منقسم: الأدرينالين عند الباب، والدرقية في الداخل."
        }
      ]
    },
    {
      id: "t9",
      term: "Mechanism of Lipid-Soluble Hormones",
      title: "كيف تعمل الهرمونات المحبة للدهون؟",
      words: [
        { en: "Conformational change", pron: "كونفور-ميشنال تشينج" },
        { en: "Response elements", pron: "ريسبونس-إليمنتس" },
        { en: "Transcription", pron: "ترانس-كربشن" },
        { en: "Translation", pron: "ترانس-ليشن" },
        { en: "Ligand-binding domain", pron: "ليغند-بايندنغ دومين" },
        { en: "9-cis-retinoic acid", pron: "سِس-ريتينويك أسِد" }
      ],
      facts: [
        {
          en: "The lipid soluble hormone diffuses into the cell and binds to the receptor, which undergoes a conformational change; the complex binds to specific DNA sequences called response elements in the regulatory regions of genes.",
          ar: "الهرمون المحب للدهون ينتشر إلى داخل الخلية ويرتبط بمستقبله، فيتغير شكل المستقبل. ثم يرتبط معقد الهرمون والمستقبل بتسلسلات خاصة على الحمض النووي تسمى عناصر الاستجابة، في المناطق المنظِّمة للجينات.",
          trick: "يدخل البيت، ويمسك يد صاحبه، ويذهبان معاً إلى مكتبة الجينات."
        },
        {
          en: "In most cases binding stimulates transcription of mRNA, which travels to the cytoplasm and is translated into protein that participates in the response.",
          ar: "في أغلب الحالات يحفّز هذا الارتباط نسخ الحمض النووي الرسول، فيخرج إلى السيتوبلازم ويُترجم إلى بروتين جديد يشارك في استجابة الخلية.",
          trick: "نسخ ثم ترجمة ثم بروتين: وصفة تُنسخ من الكتاب، وتُطبخ في المطبخ."
        },
        {
          en: "Responses evoked by lipid soluble hormones are usually SLOW, requiring transcription/translation.",
          ar: "استجابات الهرمونات المحبة للدهون بطيئة عادة، لأنها تحتاج إلى نسخ وترجمة لصنع بروتين جديد.",
          trick: "الدهني «طبخ من الصفر» فهو بطيء، والذائب في الماء «وجبة جاهزة» فهو سريع."
        },
        {
          en: "Thyroid hormone: T4 passes into the cytoplasm and is converted to T3; receptor proteins are located in the nucleus; T3 binds to the ligand-binding domain.",
          ar: "هرمون الدرقية: يدخل رباعي اليود إلى السيتوبلازم ويتحول إلى ثلاثي اليود. ومستقبلاته في النواة، وثلاثي اليود يرتبط بمنطقة ربط الهرمون في المستقبل.",
          trick: "الرابع يدخل البيت ويخلع يوداً عند الباب فيصير ثالثاً، ثم يدخل غرفة النواة."
        },
        {
          en: "The other half-site is the vitamin A derivative 9-cis-retinoic acid; two partners bind to the DNA to activate the HRE and stimulate transcription of genes.",
          ar: "النصف الآخر من موقع الارتباط مشتق من فيتامين إيه هو حمض الريتينويك. يرتبط الشريكان معاً بالحمض النووي لتنشيط عنصر الاستجابة للهرمون وتحفيز نسخ الجينات.",
          trick: "الدرقية ترقص مع فيتامين إيه: زوجان على الحمض النووي، كما قلنا إن المستقبلات النووية تعمل أزواجاً."
        }
      ],
      quiz: [
        {
          q: "Responses evoked by lipid-soluble hormones are usually:",
          options: ["Rapid, via second messengers", "Slow, requiring transcription and translation", "Instant, via ion channels", "Absent without cAMP"],
          answer: 1,
          why: "الدهني طبخ من الصفر: نسخ ثم ترجمة، فهو بطيء."
        },
        {
          q: "Inside the target cell, T4 is converted to:",
          options: ["T3", "Calcitonin", "Retinoic acid", "cAMP"],
          answer: 0,
          why: "الرابع يخلع يوداً فيصير ثالثاً."
        },
        {
          q: "The partner of the thyroid hormone receptor on the DNA is a derivative of:",
          options: ["Vitamin D", "Vitamin A (9-cis-retinoic acid)", "Vitamin K", "Cholesterol"],
          answer: 1,
          why: "الدرقية ترقص مع مشتق فيتامين إيه، حمض الريتينويك."
        },
        {
          q: "The hormone-receptor complex of lipid-soluble hormones binds to:",
          options: ["G-proteins in the membrane", "Response elements on DNA", "Phospholipase C", "Calmodulin"],
          answer: 1,
          why: "المعقد يذهب إلى مكتبة الجينات ويرتبط بعناصر الاستجابة على الحمض النووي."
        }
      ]
    },
    {
      id: "t10",
      term: "Second Messengers: Adenylate Cyclase-cAMP",
      title: "الرسول الثاني: الأدينيليت سايكليز والأدينوسين الحلقي",
      words: [
        { en: "Adenylate cyclase", pron: "أدينيليت-سايكليز" },
        { en: "Cyclic AMP", pron: "سايكلك-إي إم بي" },
        { en: "G-protein", pron: "جي-بروتين" },
        { en: "Protein kinase", pron: "بروتين-كاينيز" },
        { en: "Phosphorylates", pron: "فوسفوري-ليتس" },
        { en: "Phosphodiesterase", pron: "فوسفو-داي-إستريز" },
        { en: "Signal transduction", pron: "سِغنال ترانز-دكشن" }
      ],
      facts: [
        {
          en: "Hormones that cannot pass through the plasma membrane (catecholamine, polypeptide and glycoprotein hormones) bind to membrane receptors; their actions are mediated by 2nd messengers (signal transduction).",
          ar: "الهرمونات التي لا تعبر غشاء الخلية، وهي الكاتيكولامينات والببتيدات والبروتينات السكرية، ترتبط بمستقبلات على الغشاء، ويتم عملها عبر رسل ثانية في داخل الخلية، وهذا يسمى نقل الإشارة.",
          trick: "الهرمون هو الرسول الأول ويبقى خارج الباب، فيرسل رسولاً ثانياً يحمل الخبر إلى الداخل."
        },
        {
          en: "The hormone binds to its receptor causing dissociation of a G-protein subunit, which binds to and activates adenylate cyclase.",
          ar: "يرتبط الهرمون بمستقبله فتنفصل وحدة فرعية من البروتين جي، وهذه الوحدة ترتبط بإنزيم الأدينيليت سايكليز وتنشّطه.",
          trick: "سلسلة الطابات: الهرمون يدفع البروتين جي، والبروتين جي يدفع الإنزيم."
        },
        {
          en: "Adenylate cyclase converts ATP to cAMP + PPi.",
          ar: "الأدينيليت سايكليز يحوّل الأدينوسين ثلاثي الفوسفات إلى الأدينوسين أحادي الفوسفات الحلقي، ومعه ثنائي الفوسفات غير العضوي.",
          trick: "«سايكليز» تعني «يجعله حلقة»: يأخذ الطاقة ويلفّها حلقة."
        },
        {
          en: "cAMP attaches to the inhibitory subunit of protein kinase; the inhibitory subunit dissociates and activates protein kinase, which phosphorylates enzymes to produce the hormone's effects.",
          ar: "يرتبط الأدينوسين الحلقي بالوحدة المثبطة لإنزيم البروتين كيناز، فتنفصل الوحدة المثبطة وينشط الكيناز، ثم يضيف الفوسفات إلى إنزيمات الخلية فيغيّر نشاطها وأيضها، فيظهر أثر الهرمون.",
          trick: "الكيناز سجين مقيّد، والرسول الثاني يفك قيده فينطلق ويوزّع الفوسفات."
        },
        {
          en: "cAMP is inactivated by phosphodiesterase, which hydrolyzes cAMP to inactive fragments.",
          ar: "يُعطَّل الأدينوسين الحلقي بإنزيم الفوسفوداي إستريز، الذي يحلله بالماء إلى قطع غير فعالة.",
          trick: "الفوسفوداي إستريز «زر الإطفاء»: ينهي الرسالة حتى لا تبقى الخلية مستنفرة."
        },
        {
          en: "Changes evoked by the actions of second messengers are usually rapid.",
          ar: "التغيرات التي تحدثها الرسل الثانية سريعة عادة.",
          trick: "الذائب في الماء وجبة جاهزة: يعدّل إنزيمات موجودة أصلاً، فلا ينتظر صنع بروتين جديد."
        }
      ],
      quiz: [
        {
          q: "Adenylate cyclase catalyzes the conversion of:",
          options: ["ATP to cAMP", "cAMP to AMP", "GTP to GDP", "PIP2 to IP3"],
          answer: 0,
          why: "الإنزيم يلفّ الأدينوسين ثلاثي الفوسفات حلقة فيصير أحادياً حلقياً."
        },
        {
          q: "cAMP activates protein kinase by:",
          options: ["Binding to its inhibitory subunit, which then dissociates", "Phosphorylating it directly", "Opening calcium channels", "Binding to DNA"],
          answer: 0,
          why: "الرسول الثاني يفك قيد الكيناز: يرتبط بالوحدة المثبطة فتنفصل."
        },
        {
          q: "cAMP is inactivated by:",
          options: ["Adenylate cyclase", "Phosphodiesterase", "Phospholipase C", "Calmodulin"],
          answer: 1,
          why: "الفوسفوداي إستريز هو زر الإطفاء."
        },
        {
          q: "Responses mediated by second messengers are usually:",
          options: ["Slow", "Rapid", "Delayed by days", "Dependent on new mRNA"],
          answer: 1,
          why: "الرسل الثانية تعدّل إنزيمات موجودة، فهي سريعة."
        }
      ]
    },
    {
      id: "t11",
      term: "Second Messengers: Phospholipase C, Calcium, cGMP",
      title: "الرسل الثانية الأخرى: الفوسفوليباز والكالسيوم والجوانوزين الحلقي",
      words: [
        { en: "Phospholipase C", pron: "فوسفو-لايبيز سي" },
        { en: "Inositol triphosphate", pron: "إينو-سيتول ترايفوسفيت" },
        { en: "Diacylglycerol", pron: "داي-أسيل-غليسرول" },
        { en: "Calmodulin", pron: "كال-موديولين" },
        { en: "Endoplasmic reticulum", pron: "إندوبلازمك-ريتيكيولم" },
        { en: "Guanylate cyclase", pron: "غوانيليت-سايكليز" },
        { en: "Alpha-adrenergic", pron: "ألفا-أدرينيرجك" }
      ],
      facts: [
        {
          en: "Binding of epinephrine to an alpha-adrenergic receptor activates a G-protein intermediate, phospholipase C, which splits a phospholipid into IP3 and DAG; both serve as 2nd messengers.",
          ar: "ارتباط الإبينفرين بمستقبل ألفا الأدريناليني ينشّط بروتيناً وسيطاً يقود إلى إنزيم الفوسفوليباز سي، وهذا يشطر دهناً فوسفورياً إلى جزيئين: ثلاثي فوسفات الإينوسيتول، وثنائي أسيل الغليسرول. وكلاهما رسول ثانٍ.",
          trick: "الفوسفوليباز «مقص» يقطع الدهن نصفين، وكل نصف رسول."
        },
        {
          en: "IP3 diffuses through the cytoplasm to the ER; binding to its receptor causes Ca2+ channels to open, and Ca2+ diffuses into the cytoplasm.",
          ar: "ينتشر ثلاثي فوسفات الإينوسيتول في السيتوبلازم إلى الشبكة الإندوبلازمية، ويرتبط بمستقبله فيها فتنفتح قنوات الكالسيوم، ويخرج الكالسيوم إلى السيتوبلازم.",
          trick: "الشبكة الإندوبلازمية «خزان الكالسيوم»، والإينوسيتول هو المفتاح الذي يفتح الخزان."
        },
        {
          en: "Ca2+ binds to calmodulin; calmodulin activates specific protein kinase enzymes, altering metabolism and producing the hormone's effects.",
          ar: "يرتبط الكالسيوم ببروتين الكالموديولين، والكالموديولين ينشّط إنزيمات كيناز معينة، فيتغير أيض الخلية ويظهر أثر الهرمون.",
          trick: "اسمه يدلك: «كال» من الكالسيوم، و«موديولين» من التعديل. هو الذي يعدّل بالكالسيوم."
        },
        {
          en: "Protein kinase C depends on diacylglycerol binding for activation, and its activity is further increased by calcium released by inositol phosphates.",
          ar: "البروتين كيناز سي يحتاج إلى ارتباط ثنائي أسيل الغليسرول لينشط، ويزداد نشاطه أكثر بالكالسيوم الذي أطلقه الإينوسيتول.",
          trick: "نصفا المقص يلتقيان مجدداً: الغليسرول يشغّل الكيناز سي، والكالسيوم الذي أطلقه الإينوسيتول يقويه."
        },
        {
          en: "Epinephrine can act through two 2nd messenger systems.",
          ar: "الإبينفرين يستطيع أن يعمل عبر نظامين من الرسل الثانية: الأدينوسين الحلقي عبر مستقبل بيتا، والكالسيوم والفوسفوليباز عبر مستقبل ألفا.",
          trick: "الأدرينالين «ذو وجهين»: بيتا للأدينوسين الحلقي، وألفا للكالسيوم."
        },
        {
          en: "Second messenger systems include adenylate cyclase (cAMP), guanylate cyclase (cyclic GMP), calcium and calmodulin, and phospholipase C (inositol phosphates and diacylglycerol); each activates a specific protein kinase.",
          ar: "أنظمة الرسل الثانية: الأدينيليت سايكليز ويصنع الأدينوسين الحلقي، والجوانيليت سايكليز ويصنع الجوانوزين الحلقي، والكالسيوم مع الكالموديولين، والفوسفوليباز سي ويصنع فوسفات الإينوسيتول وثنائي أسيل الغليسرول. وكل نظام ينشّط كينازاً خاصاً به. والأدينوسين والجوانوزين الحلقيان يسميان معاً النيوكليوتيدات الحلقية.",
          trick: "أربعة رسل: «أدينوسين، جوانوزين، كالسيوم، إينوسيتول». وكل رسول ينتهي عند كيناز."
        }
      ],
      quiz: [
        {
          q: "Phospholipase C splits membrane phospholipid into:",
          options: ["cAMP and PPi", "IP3 and DAG", "cGMP and GTP", "Calmodulin and calcium"],
          answer: 1,
          why: "المقص يقطع الدهن نصفين: ثلاثي فوسفات الإينوسيتول وثنائي أسيل الغليسرول."
        },
        {
          q: "IP3 causes Ca2+ release from the:",
          options: ["Nucleus", "Endoplasmic reticulum", "Mitochondria", "Golgi apparatus"],
          answer: 1,
          why: "الشبكة الإندوبلازمية خزان الكالسيوم، والإينوسيتول مفتاحه."
        },
        {
          q: "Protein kinase C depends for its activation on:",
          options: ["Diacylglycerol", "cAMP", "cGMP", "Retinoic acid"],
          answer: 0,
          why: "ثنائي أسيل الغليسرول يشغّل الكيناز سي، والكالسيوم يقويه."
        },
        {
          q: "Epinephrine binding to an alpha-adrenergic receptor uses which second messenger pathway?",
          options: ["Phospholipase C-Ca2+", "Nuclear receptor pathway", "Guanylate cyclase only", "Tyrosine kinase cascade"],
          answer: 0,
          why: "الأدرينالين ذو وجهين: ألفا للكالسيوم والفوسفوليباز."
        },
        {
          q: "Calcium produces its effects mainly by binding to:",
          options: ["Calmodulin", "Adenylate cyclase", "Phosphodiesterase", "Hormone recognition elements"],
          answer: 0,
          why: "«كال» في اسم الكالموديولين من الكالسيوم."
        }
      ]
    },
    {
      id: "t12",
      term: "Classification of Hormones by Mechanism of Action",
      title: "تصنيف الهرمونات حسب طريقة عملها",
      words: [
        { en: "Calcitriol", pron: "كالسي-ترايول" },
        { en: "Mineralocorticoids", pron: "مينرالو-كورتيكويدز" },
        { en: "Glucocorticoids", pron: "غلوكو-كورتيكويدز" },
        { en: "Atrial natriuretic factor", pron: "ناتري-يوريتك فاكتر" },
        { en: "Nitric oxide", pron: "نايترك-أوكسايد" },
        { en: "Erythropoietin", pron: "إريثرو-بويتين" },
        { en: "Somatostatin", pron: "سوماتو-ستاتين" }
      ],
      facts: [
        {
          en: "Group I, bind to intracellular receptors: androgens, calcitriol, estrogens, glucocorticoids, mineralocorticoids, progestins, retinoic acid, thyroid hormones (T3 and T4).",
          ar: "المجموعة الأولى ترتبط بمستقبلات داخل الخلية: الأندروجينات، والكالسيترول أي فيتامين دي الفعّال، والإستروجينات، والقشرانيات السكرية، والقشرانيات المعدنية، والبروجستينات، وحمض الريتينويك، وهرمونات الدرقية.",
          trick: "الداخليون هم «الدهنيون»: هرمونات الجنس والكظرية، ومعهم فيتامينا دي وإيه، والدرقية."
        },
        {
          en: "Group II-A, second messenger cAMP: alpha2- and beta-adrenergic catecholamines, ACTH, ADH, calcitonin, hCG, CRH, FSH, glucagon, lipotropin, LH, MSH, PTH, somatostatin, TSH.",
          ar: "المجموعة الثانية «أ» رسولها الأدينوسين الحلقي، ومنها: الكاتيكولامينات عبر مستقبلات ألفا اثنين وبيتا، والهرمون الموجّه لقشر الكظر، والهرمون المضاد لإدرار البول، والكالسيتونين، وموجهة الغدد التناسلية المشيمائية، والهرمون المطلق لموجهة القشرة، والهرمون المنبه للجريب، والجلوكاجون، والليبوتروبين، والهرمون الملوتن، والهرمون المنبه للخلايا الصباغية، وهرمون الجار درقية، والسوماتوستاتين، والهرمون المنبه للدرقية.",
          trick: "أغلب هرمونات النخامية الأمامية التي تنبّه الغدد، ومعها الجلوكاجون، تعمل بالأدينوسين الحلقي. وتذكّر: بيتا للأدينوسين."
        },
        {
          en: "Group II-B, second messenger cGMP: atrial natriuretic factor, nitric oxide.",
          ar: "المجموعة الثانية «ب» رسولها الجوانوزين الحلقي، وفيها اثنان فقط: العامل الأذيني المدر للصوديوم، وأكسيد النيتريك.",
          trick: "الجوانوزين للقلب والأوعية: هرمون من الأذين، وغاز يوسّع الأوعية."
        },
        {
          en: "Group II-C, second messenger calcium or phosphatidylinositols: acetylcholine (muscarinic), alpha1-adrenergic catecholamines, angiotensin II, ADH (vasopressin), cholecystokinin, gastrin, GnRH, oxytocin, PDGF, substance P, TRH.",
          ar: "المجموعة الثانية «ج» رسولها الكالسيوم أو فوسفات الإينوسيتول، ومنها: الأسيتيل كولين على المستقبل المسكاريني، والكاتيكولامينات عبر ألفا واحد، والأنجيوتنسين الثاني، والهرمون المضاد لإدرار البول، والكوليسيستوكينين، والجاسترين، والهرمون المطلق لموجهات الغدد التناسلية، والأوكسيتوسين، وعامل النمو المشتق من الصفائح، والمادة بي، والهرمون المطلق لموجهة الدرقية.",
          trick: "ألفا واحد للكالسيوم، وهرمونات «العصر والانقباض» هنا: الأوكسيتوسين يعصر الرحم، والجاسترين والكوليسيستوكينين يعصران المعدة والمرارة. والمضاد لإدرار البول موجود في «أ» و«ج» معاً."
        },
        {
          en: "Group II-D, second messenger is a kinase or phosphatase cascade: chorionic somatomammotropin, EGF, erythropoietin, FGF, growth hormone, insulin, IGF I and II, NGF, PDGF, prolactin.",
          ar: "المجموعة الثانية «د» رسولها سلسلة إنزيمات كيناز أو فوسفاتيز، ومنها: هرمون المشيمة المنمّي للثدي، وعوامل النمو مثل عامل نمو البشرة وعامل نمو الأرومات الليفية وعامل نمو الأعصاب وعامل النمو المشتق من الصفائح وعاملي النمو الشبيهين بالإنسولين، والإريثروبويتين، وهرمون النمو، والإنسولين، والبرولاكتين.",
          trick: "مجموعة «النمو»: كل ما فيه كلمة نمو، ومعه الإنسولين والبرولاكتين والإريثروبويتين."
        }
      ],
      quiz: [
        {
          q: "Insulin acts through which mechanism?",
          options: ["cAMP", "cGMP", "A kinase or phosphatase cascade", "Intracellular receptor"],
          answer: 2,
          why: "الإنسولين من مجموعة النمو التي تعمل بسلسلة الكيناز."
        },
        {
          q: "Atrial natriuretic factor uses which second messenger?",
          options: ["cGMP", "cAMP", "Calcium", "IP3 only"],
          answer: 0,
          why: "الجوانوزين الحلقي للقلب والأوعية: العامل الأذيني وأكسيد النيتريك."
        },
        {
          q: "Glucagon acts via:",
          options: ["Intracellular receptors", "cAMP", "cGMP", "Kinase cascade"],
          answer: 1,
          why: "الجلوكاجون من مجموعة الأدينوسين الحلقي."
        },
        {
          q: "Which hormone binds to an intracellular receptor?",
          options: ["Oxytocin", "Glucagon", "Calcitriol", "Gastrin"],
          answer: 2,
          why: "الكالسيترول فيتامين دي الفعّال، يتصرف كستيرويد ومستقبله داخلي."
        },
        {
          q: "Oxytocin and gastrin use which second messenger system?",
          options: ["Calcium or phosphatidylinositols", "cGMP", "Intracellular receptor", "Kinase cascade"],
          answer: 0,
          why: "هرمونات العصر والانقباض تعمل بالكالسيوم والإينوسيتول."
        }
      ]
    },
    {
      id: "t13",
      term: "Glands and Hormones: Pituitary, Thyroid, Parathyroid",
      title: "الغدد وهرموناتها (الجزء الأول)",
      words: [
        { en: "Adrenocorticotropic hormone", pron: "أدرينو-كورتيكو-تروبك" },
        { en: "Prolactin", pron: "برو-لاكتين" },
        { en: "Luteinizing hormone", pron: "لوتي-نايزنغ هورمون" },
        { en: "Follicle-stimulating hormone", pron: "فوليكل-ستيميوليتنغ" },
        { en: "Seminiferous tubules", pron: "سيمني-فيرس تيوبيولز" },
        { en: "Melanocyte", pron: "ميلانو-سايت" },
        { en: "Oxytocin", pron: "أوكسي-توسين" },
        { en: "Calcitonin", pron: "كالسي-تونين" }
      ],
      facts: [
        {
          en: "Anterior pituitary: growth hormone (GH) stimulates growth; thyroid stimulating hormone (TSH) stimulates secretion of thyroid hormones; adrenocorticotropic hormone (ACTH) stimulates secretion of adrenal cortex hormones.",
          ar: "النخامية الأمامية: هرمون النمو ينبّه النمو، والهرمون المنبه للدرقية ينبّه إفراز هرمونات الدرقية، والهرمون الموجّه لقشر الكظر ينبّه إفراز هرمونات قشرة الكظرية.",
          trick: "النخامية الأمامية «المدير العام»: كل هرمون اسمه يقول لمن يعطي الأوامر."
        },
        {
          en: "Prolactin (LTH) stimulates milk production; luteinizing hormone (LH) stimulates production of estrogen and progesterone by ovary or testosterone; follicle-stimulating hormone (FSH) stimulates growth of ovarian follicles or seminiferous tubules.",
          ar: "البرولاكتين ينبّه إنتاج الحليب. والهرمون الملوتن ينبّه إنتاج الإستروجين والبروجستيرون من المبيض، أو التستوستيرون. والهرمون المنبه للجريب ينبّه نمو جريبات المبيض، أو الأنابيب المنوية في الخصية.",
          trick: "«برو لاكت» تعني «من أجل الحليب». والمنبه للجريب ينمّي البيت الذي تُصنع فيه البويضة أو الحيوان المنوي، والملوتن يأمر بصنع الهرمونات الجنسية."
        },
        {
          en: "Anterior pituitary: melanocyte-stimulating hormone (MSH) stimulates production and dispersal of pigment.",
          ar: "الهرمون المنبه للخلايا الصباغية ينبّه إنتاج الصبغة وانتشارها.",
          trick: "الخلايا الصباغية تصنع الميلانين، أي لون الجلد."
        },
        {
          en: "Posterior pituitary: oxytocin stimulates contraction of uterus and secretion of milk; antidiuretic hormone (ADH) stimulates reabsorption of water.",
          ar: "النخامية الخلفية: الأوكسيتوسين ينبّه انقباض الرحم وخروج الحليب، والهرمون المضاد لإدرار البول ينبّه إعادة امتصاص الماء في الكلية.",
          trick: "الخلفية فيها اثنان فقط: «أم» هو الأوكسيتوسين للولادة والرضاعة، و«ماء» هو المضاد لإدرار البول."
        },
        {
          en: "Thyroid gland: thyroxin and triiodothyronine (T4 and T3) stimulate metabolism, growth and development; calcitonin lowers blood calcium level.",
          ar: "الغدة الدرقية: رباعي اليود وثلاثي اليود ينبّهان الأيض والنمو والتطور، والكالسيتونين يخفض الكالسيوم في الدم.",
          trick: "الكالسيتونين «يُنزل الكالسيوم إلى العظم»: «تون» مثل الطن الثقيل الذي ينزل إلى الأسفل."
        },
        {
          en: "Parathyroid gland: parathyroid hormone (PTH) increases blood calcium.",
          ar: "الغدة الجار درقية: هرمون الجار درقية يرفع الكالسيوم في الدم.",
          trick: "الجار والكالسيتونين جاران متعاكسان: الجار يرفع الكالسيوم، والكالسيتونين يخفضه."
        }
      ],
      quiz: [
        {
          q: "Which hormone stimulates reabsorption of water?",
          options: ["Oxytocin", "Antidiuretic hormone (ADH)", "Prolactin", "Calcitonin"],
          answer: 1,
          why: "النخامية الخلفية: أم وماء. المضاد لإدرار البول للماء."
        },
        {
          q: "Calcitonin:",
          options: ["Increases blood calcium", "Lowers blood calcium", "Stimulates milk production", "Stimulates growth"],
          answer: 1,
          why: "الكالسيتونين ينزل الكالسيوم، والجار درقي يرفعه."
        },
        {
          q: "FSH stimulates:",
          options: ["Growth of ovarian follicles or seminiferous tubules", "Milk production", "Pigment dispersal", "Water reabsorption"],
          answer: 0,
          why: "المنبه للجريب ينمّي جريبات المبيض أو الأنابيب المنوية."
        },
        {
          q: "Which hormone is secreted by the posterior pituitary?",
          options: ["Growth hormone", "TSH", "Oxytocin", "Prolactin"],
          answer: 2,
          why: "الخلفية فيها الأوكسيتوسين والمضاد لإدرار البول فقط."
        }
      ]
    },
    {
      id: "t14",
      term: "Glands and Hormones: Adrenal, Gonads, Pancreas, Placenta, Heart",
      title: "الغدد وهرموناتها (الجزء الثاني)",
      words: [
        { en: "Glucocorticoids", pron: "غلوكو-كورتيكويدز" },
        { en: "Aldosterone", pron: "ألدو-ستيرون" },
        { en: "Dehydroepiandrosterone", pron: "ديهايدرو-إبي-أندروستيرون" },
        { en: "Norepinephrine", pron: "نور-إبي-نِفرين" },
        { en: "Corpus luteum", pron: "كوربس-لوتيوم" },
        { en: "Gluconeogenesis", pron: "غلوكو-نيو-جينيسس" },
        { en: "Human chorionic gonadotropin", pron: "كوريونك-غونادو-تروبن" },
        { en: "Atrial natriuretic factor", pron: "ناتري-يوريتك فاكتر" }
      ],
      facts: [
        {
          en: "Adrenal cortex: glucocorticoids (cortisol) raise blood glucose level; mineralocorticoids (aldosterone) maintain sodium and phosphate balance; dehydroepiandrosterone (DHEA) stimulates sex drive and induces labor.",
          ar: "قشرة الكظرية: القشرانيات السكرية مثل الكورتيزول ترفع سكر الدم، والقشرانيات المعدنية مثل الألدوستيرون تحافظ على توازن الصوديوم والفوسفات، وثنائي هيدرو إبي أندروستيرون ينبّه الرغبة الجنسية ويحفّز الولادة.",
          trick: "اسمها يدل عليها: «سكرية» للسكر، و«معدنية» للأملاح. والقشرة طبقات: سكر، ملح، جنس."
        },
        {
          en: "Adrenal medulla: epinephrine (adrenalin) stimulates glucose release; norepinephrine constricts blood vessels and increases heart rate.",
          ar: "لب الكظرية: الإبينفرين ينبّه إطلاق السكر، والنورإبينفرين يضيّق الأوعية الدموية ويسرّع القلب.",
          trick: "اللب «غرفة الطوارئ»: سكر للطاقة، وضغط ونبض للهروب."
        },
        {
          en: "Testes: testosterone develops and maintains male sex characteristics and promotes spermatogenesis. Ovary: estrogen develops/maintains female characteristics and stimulates growth of uterine lining.",
          ar: "الخصيتان: التستوستيرون يطوّر الصفات الذكرية ويحافظ عليها، ويحفّز تكوين الحيوانات المنوية. والمبيض: الإستروجين يطوّر الصفات الأنثوية ويحافظ عليها، وينمّي بطانة الرحم.",
          trick: "كل غدة جنسية لها هرمون يبني صفات صاحبها: الذكر بالتستوستيرون، والأنثى بالإستروجين."
        },
        {
          en: "Corpus luteum: progesterone develops uterus and mammary glands and promotes fertilization.",
          ar: "الجسم الأصفر في المبيض: البروجستيرون يهيئ الرحم والغدد الثديية ويساعد على الإخصاب.",
          trick: "«برو جستيرون» تعني «من أجل الحمل»: يجهّز الرحم والثدي."
        },
        {
          en: "Pancreas: insulin lowers blood glucose concentration; glucagon raises blood glucose level and stimulates gluconeogenesis.",
          ar: "البنكرياس: الإنسولين يخفض سكر الدم، والجلوكاجون يرفع سكر الدم وينبّه تصنيع السكر من مواد غير سكرية.",
          trick: "«جلوكاجون» تعني «السكر ذهب» فيعيده: يرفع السكر. والإنسولين يدخل السكر إلى الخلايا فينخفض في الدم."
        },
        {
          en: "Placenta: human chorionic gonadotropin (HCG) stimulates release of FSH and LH. Heart: atrial natriuretic factors stimulate blood vessel dilation, lower blood pressure, inhibit ADH.",
          ar: "المشيمة: موجهة الغدد التناسلية المشيمائية البشرية تنبّه إطلاق الهرمون المنبه للجريب والهرمون الملوتن، كما في جدول المحاضرة. والقلب: العوامل الأذينية المدرة للصوديوم توسّع الأوعية، وتخفض ضغط الدم، وتثبّط الهرمون المضاد لإدرار البول.",
          trick: "القلب غدة أيضاً: إذا امتلأ الأذين بالدم أفرز هرموناً يخفف الحمل، فيوسّع الأوعية ويطرد الماء."
        }
      ],
      quiz: [
        {
          q: "Aldosterone, a mineralocorticoid, functions to:",
          options: ["Raise blood glucose", "Maintain sodium and phosphate balance", "Lower blood calcium", "Stimulate milk production"],
          answer: 1,
          why: "المعدنية للأملاح: الصوديوم والفوسفات."
        },
        {
          q: "Glucagon:",
          options: ["Lowers blood glucose", "Raises blood glucose and stimulates gluconeogenesis", "Lowers blood pressure", "Stimulates spermatogenesis"],
          answer: 1,
          why: "الجلوكاجون يعيد السكر الذي ذهب، فيرفعه."
        },
        {
          q: "Atrial natriuretic factor is secreted by the heart and:",
          options: ["Raises blood pressure", "Lowers blood pressure and inhibits ADH", "Stimulates ADH release", "Raises blood glucose"],
          answer: 1,
          why: "القلب الممتلئ يخفف الحمل: يوسّع الأوعية ويخفض الضغط ويثبّط المضاد لإدرار البول."
        },
        {
          q: "Which hormone is produced by the adrenal medulla?",
          options: ["Cortisol", "Aldosterone", "Norepinephrine", "DHEA"],
          answer: 2,
          why: "اللب غرفة الطوارئ: الإبينفرين والنورإبينفرين. والبقية من القشرة."
        },
        {
          q: "Progesterone from the corpus luteum:",
          options: ["Develops uterus and mammary glands and promotes fertilization", "Lowers blood glucose", "Stimulates pigment production", "Constricts blood vessels"],
          answer: 0,
          why: "البروجستيرون من أجل الحمل: يجهّز الرحم والثدي."
        }
      ]
    },
    {
      id: "t15",
      term: "Hormonal Measurements and Plasma Level Dynamics",
      title: "قياس الهرمونات وتغيّر مستواها في الدم",
      words: [
        { en: "Bioassay", pron: "بايو-أسّي" },
        { en: "Standard curve", pron: "ستاندرد-كيرف" },
        { en: "Chromatography", pron: "كروما-توغرافي" },
        { en: "Spectrophotometry", pron: "سبكترو-فوتو-متري" },
        { en: "Radioimmunoassay", pron: "راديو-إميونو-أسّي" },
        { en: "Episodic pulsatile", pron: "إبيسودك-بالساتايل" }
      ],
      facts: [
        {
          en: "Original bioassay systems defined the endocrine system: remove the gland and observe; inject a crude extract back and observe; add extract or purified hormone to isolated organ or cell systems and measure the response.",
          ar: "التجارب الحيوية الأولى هي التي عرّفتنا بالغدد الصماء: تُزال الغدة ويُراقب ما يحدث، ثم يُحقن مستخلص خام منها ويُراقب ما يحدث، أو يُضاف المستخلص أو الهرمون المنقّى إلى عضو أو خلايا معزولة وتُقاس الاستجابة.",
          trick: "ثلاث خطوات مثل التحقيق: «انزع، أرجِع، اختبر»."
        },
        {
          en: "Bioassay: a system standardized with known amounts of hormone, a standard curve constructed, and the unknown determined by comparison; disadvantage: cumbersome and difficult; advantage: measures biological activity, not just amount.",
          ar: "القياس الحيوي: يُعاير نظام حي، حيوان أو عضو أو نسيج أو خلية أو إنزيم، بكميات معروفة من الهرمون، ويُرسم منحنى قياسي، ثم تُعرف الكمية المجهولة بالمقارنة. عيبه أنه مرهق وصعب، وميزته أنه يقيس النشاط الحيوي وليس الكمية فقط.",
          trick: "القياس الحيوي يسأل «هل يعمل؟» وليس «كم يوجد؟». صعب لكنه صادق."
        },
        {
          en: "Chemical methods: chromatography, spectrophotometry.",
          ar: "الطرق الكيميائية: الفصل اللوني، والقياس الطيفي الضوئي.",
          trick: "كيميائياً نقيس بـ«لون وضوء»: الفصل اللوني والطيف الضوئي."
        },
        {
          en: "Radioimmunoassay: radioactive ligand and unlabeled ligand compete for the same antibody; competition is the basis for quantitation.",
          ar: "القياس المناعي الإشعاعي: هرمون موسوم بمادة مشعة وهرمون غير موسوم يتنافسان على الجسم المضاد نفسه، والتنافس هو أساس معرفة الكمية.",
          trick: "لعبة الكراسي: كلما كثر الهرمون العادي في العينة، قلّ المشع الذي يجد كرسياً على الجسم المضاد."
        },
        {
          en: "Plasma level dynamics: cortisol periodic; lutropin episodic, pulsatile; insulin event-dependent (meals).",
          ar: "تغيّر مستوى الهرمون في الدم ثلاثة أنماط: الكورتيزول دوري يتكرر كل يوم، والهرمون الملوتن نبضي على شكل دفعات، والإنسولين مرتبط بحدث هو الوجبات.",
          trick: "الكورتيزول «ساعة» تدق يومياً، والملوتن «قلب» ينبض، والإنسولين «نادل» يأتي مع الطعام."
        }
      ],
      quiz: [
        {
          q: "The main advantage of a bioassay is that it:",
          options: ["Is quick and easy", "Measures biological activity, not just amount", "Needs no standard curve", "Uses radioactive antibodies"],
          answer: 1,
          why: "القياس الحيوي يسأل هل يعمل الهرمون، لا كم يوجد. وهو صعب ومرهق."
        },
        {
          q: "The basis of quantitation in radioimmunoassay is:",
          options: ["Competition between labeled and unlabeled ligand for the same antibody", "Color change of the hormone", "Removal of the gland", "Biological response of an animal"],
          answer: 0,
          why: "لعبة الكراسي بين الموسوم وغير الموسوم على الجسم المضاد."
        },
        {
          q: "Insulin plasma levels are best described as:",
          options: ["Periodic", "Episodic, pulsatile", "Event-dependent", "Constant"],
          answer: 2,
          why: "الإنسولين نادل يأتي مع الوجبات: مرتبط بحدث."
        },
        {
          q: "Lutropin (LH) plasma levels show a pattern that is:",
          options: ["Event-dependent", "Episodic, pulsatile", "Periodic daily only", "Unchanging"],
          answer: 1,
          why: "الملوتن قلب ينبض على شكل دفعات."
        },
        {
          q: "Chromatography and spectrophotometry are:",
          options: ["Bioassays", "Chemical methods of hormone measurement", "Radioimmunoassays", "Types of receptors"],
          answer: 1,
          why: "اللون والضوء طرق كيميائية."
        }
      ]
    },
    {
      id: "t16",
      term: "Mechanisms of Endocrine Disease",
      title: "كيف تحدث أمراض الغدد الصماء؟",
      words: [
        { en: "Hormone resistance", pron: "هورمون-ريزستنس" },
        { en: "Infarction", pron: "إن-فاركشن" },
        { en: "Autoimmune", pron: "أوتو-إميون" },
        { en: "Congenital adrenal hyperplasia", pron: "كونجنيتال-هايبر-بليجيا" },
        { en: "Testicular feminization", pron: "تستيكيولر-فيمني-نايزيشن" },
        { en: "Ectopic", pron: "إك-توبك" },
        { en: "Dedifferentiation", pron: "دي-دفرنشي-إيشن" }
      ],
      facts: [
        {
          en: "Endocrine disorders result from hormone deficiency, hormone excess or hormone resistance; almost without exception hormone deficiency causes disease, one notable exception is calcitonin deficiency.",
          ar: "أمراض الغدد الصماء تنتج من ثلاثة أسباب: نقص الهرمون، أو زيادته، أو مقاومة الجسم له. ونقص أي هرمون يسبب مرضاً تقريباً بلا استثناء، والاستثناء المهم هو نقص الكالسيتونين.",
          trick: "ثلاثة أسباب: «قليل، كثير، لا يُسمع». والكالسيتونين وحده إذا غاب لم يشتق له أحد."
        },
        {
          en: "Deficiency is usually due to a destructive process at the gland: infection, infarction, physical compression by tumor growth, autoimmune attack; example: type I diabetes.",
          ar: "النقص غالباً سببه تدمير الغدة نفسها: عدوى، أو احتشاء أي موت النسيج لانقطاع الدم، أو ضغط ورم، أو هجوم مناعي ذاتي. ومثاله السكري من النوع الأول.",
          trick: "أربعة يهدمون المصنع: «عدوى، احتشاء، ورم، مناعة». والسكري الأول مناعة تهدم البنكرياس."
        },
        {
          en: "Deficiency can arise from genetic defects in hormone production: gene deletion or mutation, failure to cleave precursor, specific enzymatic defect (steroid or thyroid hormones); example: congenital adrenal hyperplasia.",
          ar: "وقد يأتي النقص من عيب وراثي في صنع الهرمون: حذف جين أو طفرته، أو فشل قص الهرمون الأولي، أو عيب في إنزيم معين لصنع الستيرويد أو الدرقية. ومثاله تضخم الكظرية الخلقي.",
          trick: "خلقي يعني وراثي: إنزيم ناقص في الكظرية فتتضخم وهي تحاول أن تعوّض."
        },
        {
          en: "Inactivating mutations of receptors can cause hormone deficiency; example: testicular feminization syndrome.",
          ar: "الطفرات التي تعطّل المستقبلات قد تسبب ما يشبه نقص الهرمون. ومثالها متلازمة التأنيث الخصوي.",
          trick: "الهرمون الذكري موجود لكن الأذن صمّاء، فيظهر الجسم أنثوياً."
        },
        {
          en: "Hormone excess usually results in disease; endocrine gland tumors produce hormone in an unregulated manner; example: Cushing's syndrome.",
          ar: "زيادة الهرمون تسبب المرض عادة. فقد تفرط الغدة نفسها في الإفراز، أو يفرزه نسيج ليس غدة. وأورام الغدد تفرز الهرمون بلا ضابط. ومثالها متلازمة كوشينغ.",
          trick: "كوشينغ تعني «كورتيزول كثير»: ورم يفرز بلا فرامل."
        },
        {
          en: "Malignant non-endocrine tissue may produce hormones ectopically; anti-receptor antibodies may stimulate the receptor instead of blocking it, as in Graves' disease (common hyperthyroidism).",
          ar: "قد يتحول نسيج غير غدّي إلى ورم خبيث فيفقد تمايزه ويفرز هرموناً في غير مكانه. وقد ترتبط أجسام مضادة بالمستقبل فتنبّهه بدل أن تغلقه، كما في مرض غريفز، وهو الشكل الشائع لفرط نشاط الدرقية.",
          trick: "غريفز «مفتاح مزوّر»: الجسم المضاد يفتح قفل الدرقية فتعمل بلا توقف."
        },
        {
          en: "Alterations in receptor number and function result in endocrine disorders; most commonly an aberrant increase in a hormone causes a decrease in available receptors; example: type II diabetes.",
          ar: "تغيّر عدد المستقبلات أو وظيفتها يسبب أمراضاً. والأشهر أن زيادة غير طبيعية في هرمون تُنقص مستقبلاته المتاحة. ومثاله السكري من النوع الثاني.",
          trick: "تذكّر التنظيم الهابط: إنسولين كثير فتسدّ الخلية أذنيها. السكري الأول بلا إنسولين، والثاني إنسولين بلا سماع."
        }
      ],
      quiz: [
        {
          q: "Which hormone deficiency is a notable exception that does NOT cause disease?",
          options: ["Insulin", "Calcitonin", "Cortisol", "Thyroxine"],
          answer: 1,
          why: "الكالسيتونين وحده إذا غاب لم يشتق له أحد."
        },
        {
          q: "Graves' disease results from:",
          options: ["Anti-receptor antibodies that stimulate the receptor", "Autoimmune destruction of the pancreas", "A tumor producing cortisol", "Inactivating receptor mutations"],
          answer: 0,
          why: "غريفز مفتاح مزوّر يفتح قفل الدرقية."
        },
        {
          q: "Testicular feminization syndrome is an example of:",
          options: ["Hormone excess", "Inactivating mutation of receptors", "Ectopic hormone production", "Destruction of the gland by infection"],
          answer: 1,
          why: "الهرمون موجود لكن المستقبل معطّل."
        },
        {
          q: "Type II diabetes is given as an example of:",
          options: ["Destruction of the gland", "Decrease in available receptors due to aberrant increase in hormone level", "Genetic failure to cleave precursor", "Ectopic production"],
          answer: 1,
          why: "إنسولين كثير فتقل المستقبلات: تنظيم هابط."
        },
        {
          q: "Cushing's syndrome is an example of:",
          options: ["Hormone deficiency", "Hormone excess from an endocrine gland tumor", "Receptor inactivation", "Calcitonin deficiency"],
          answer: 1,
          why: "كوشينغ ورم يفرز بلا فرامل: زيادة الهرمون."
        },
        {
          q: "Congenital adrenal hyperplasia is caused by:",
          options: ["Genetic defect in hormone production", "Autoimmune attack", "Anti-receptor antibodies", "Ectopic production"],
          answer: 0,
          why: "خلقي يعني وراثي: عيب في إنزيم صنع الستيرويد."
        }
      ]
    },
    {
      id: "t17",
      term: "Control of Hormone Release and Effects of Hormones",
      title: "التحكم في إفراز الهرمونات وتأثيراتها",
      words: [
        { en: "Substrate control", pron: "سبستريت-كونترول" },
        { en: "Trophic hormones", pron: "تروفك-هورمونز" },
        { en: "Anterior pituitary", pron: "أنتيريَر-بيتيوتري" },
        { en: "Cell division", pron: "سيل-ديفيجن" }
      ],
      facts: [
        {
          en: "Control of hormone release: substrate control (glucose regulating insulin release); nervous control (pituitary hormones); trophic hormones (released by the anterior pituitary).",
          ar: "يتحكم في إفراز الهرمون ثلاثة أنواع: تحكّم بالمادة نفسها مثل السكر الذي ينظّم إفراز الإنسولين، وتحكّم عصبي مثل هرمونات النخامية، وتحكّم بالهرمونات الموجِّهة التي تفرزها النخامية الأمامية.",
          trick: "ثلاثة أزرار: «مادة، عصب، موجِّه». السكر يضغط زر الإنسولين، والعصب يضغط زر النخامية، والنخامية تضغط أزرار الغدد."
        },
        {
          en: "Effects caused by hormones: changes in electrical state of the cell; enzymes made, changing metabolic abilities; turning enzymes on or off.",
          ar: "تأثيرات الهرمونات: تغيير الحالة الكهربائية للخلية، وصنع إنزيمات جديدة فتتغير قدرات الخلية الأيضية، وتشغيل إنزيمات موجودة أو إيقافها فيتغير الأيض داخل الخلية.",
          trick: "الكهرباء أولاً، ثم إنزيم جديد، ثم مفتاح تشغيل وإيقاف."
        },
        {
          en: "Hormones stimulate cell division and multiplication, and turn on certain genes.",
          ar: "وتنبّه الهرمونات انقسام الخلايا وتكاثرها، وتشغّل جينات معينة.",
          trick: "أكمل القائمة بكلمتين: «انقسام وجين». فالتأثيرات خمسة: «كهرباء، إنزيم جديد، مفتاح، انقسام، جين»."
        }
      ],
      quiz: [
        {
          q: "Glucose regulating insulin release is an example of:",
          options: ["Substrate control", "Nervous control", "Trophic hormone control", "Down-regulation"],
          answer: 0,
          why: "السكر هو المادة نفسها التي تضغط زر الإنسولين."
        },
        {
          q: "Trophic hormones are released by the:",
          options: ["Posterior pituitary", "Anterior pituitary", "Adrenal medulla", "Pancreas"],
          answer: 1,
          why: "النخامية الأمامية هي المدير العام الذي يضغط أزرار الغدد."
        },
        {
          q: "Which of the following is listed as an effect caused by hormones?",
          options: ["Turning certain genes on", "Producing antibodies", "Conducting nerve impulses along axons", "Digesting food"],
          answer: 0,
          why: "التأثيرات الخمسة: كهرباء، إنزيم جديد، مفتاح، انقسام، جين."
        }
      ]
    }
  ]
};
