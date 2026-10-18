/*
  data/study/medical-immunology-1.js
  ----------------------------------------------------------------
  محتوى وضع الدراسة لمحاضرة: Medical immunology، المحاضرة 1 (Overview of the Immune System).
  المصدر الوحيد: ملف الشرائح داخل files/المناعة-الطبية. لا تُضف معلومة ليست فيه.

  قواعد الكتابة (يتحقق منها tests/data_check.js):
    - en: الجملة الإنجليزية كما في المادة، وتظهر في سطر مستقل.
    - ar و trick و why: عربي فقط بلا أي حرف لاتيني، حتى لا يختلط الاتجاه على الشاشة.
    - لكل معلومة (fact) حيلة حفظ (trick).
    - words: الكلمات الصعبة مع نطقها بحروف عربية، مقسوماً بشرطة إلى جزأين (ثلاثة للكلمة الطويلة).
    - quiz: أسئلة اختيار من متعدد بالإنجليزية، وanswer رقم الخيار الصحيح بدءاً من 0.
*/
window.STUDY = window.STUDY || {};
STUDY["medical-immunology-1"] = {
  topics: [
    {
      id: "t1",
      term: "Immunity and the immune system",
      title: "ما هي المناعة؟",
      words: [
        { en: "Immunity", pron: "إميو-نيتي" },
        { en: "Immunitas", pron: "إميو-نيتاس" },
        { en: "Pathogenic", pron: "باثو-جينك" },
        { en: "Microorganisms", pron: "مايكرو-أورغنيزمز" }
      ],
      facts: [
        {
          en: "The term immunity comes from the Latin word immunitas, which referred to the protection from legal prosecution offered to Roman senators.",
          ar: "كلمة المناعة مأخوذة من كلمة لاتينية قديمة كانت تعني حماية أعضاء مجلس الشيوخ الروماني من الملاحقة القانونية أثناء فترة عملهم.",
          trick: "تخيّل سيناتوراً رومانياً يلبس درعاً يحميه من المحكمة. المناعة في الأصل «حصانة»، وكلمة الحصانة هي نفسها المناعة بالعربية."
        },
        {
          en: "Historically, immunity meant protection from disease and, more specifically, infectious disease.",
          ar: "في التاريخ كان المقصود بالمناعة الحماية من الأمراض، وبالتحديد الأمراض المعدية.",
          trick: "اربط الكلمتين: حصانة تساوي حماية من العدوى."
        },
        {
          en: "The cells and molecules responsible for immunity constitute the immune system; their collective, coordinated response to foreign substances is the immune response.",
          ar: "الجهاز المناعي هو الخلايا والجزيئات المسؤولة عن المناعة. أما ردّها المنسّق عند دخول مادة غريبة فاسمه الاستجابة المناعية.",
          trick: "الجهاز هو الفريق، والاستجابة هي المباراة التي يلعبها الفريق عندما يدخل الغريب الملعب."
        },
        {
          en: "The immune system protects animals from invading pathogenic microorganisms and cancer.",
          ar: "يحمي الجهاز المناعي الجسم من خطرين: الميكروبات الغازية المسبِّبة للمرض، والسرطان.",
          trick: "غازٍ من الخارج وخائن من الداخل: ميكروب وسرطان."
        },
        {
          en: "These cells and molecules act together in a dynamic network whose complexity rivals that of the nervous system.",
          ar: "تعمل الخلايا والجزيئات المناعية معاً في شبكة متحركة يشبه تعقيدها تعقيد الجهاز العصبي.",
          trick: "في الجسم شبكتان ذكيتان: واحدة تفكّر هي العصبي، وواحدة تحمي هي المناعي."
        }
      ],
      quiz: [
        {
          q: "The Latin word immunitas originally referred to the protection of Roman senators from:",
          options: ["Infectious disease", "Legal prosecution", "Military service", "Taxes"],
          answer: 1,
          why: "الأصل اللاتيني يعني الحماية من الملاحقة القانونية، وليس من المرض. المعنى الطبي جاء بعد ذلك."
        },
        {
          q: "The cells and molecules responsible for immunity make up the:",
          options: ["Immune response", "Immune system", "Innate barrier", "Antigen"],
          answer: 1,
          why: "هذه المجموعة هي الجهاز المناعي. أما ردّها المنسّق على مادة غريبة فهو الاستجابة المناعية."
        },
        {
          q: "The immune system protects animals from invading pathogens and from:",
          options: ["Cancer", "Starvation", "Dehydration", "Aging"],
          answer: 0,
          why: "الشرائح تذكر السرطان إلى جانب الميكروبات الغازية."
        }
      ]
    },
    {
      id: "t2",
      term: "Recognition and effector response",
      title: "التعرّف والاستجابة والذاكرة",
      words: [
        { en: "Recognition", pron: "ريكوغ-نيشن" },
        { en: "Specificity", pron: "سبيسي-فيسيتي" },
        { en: "Effector", pron: "إف-كتر" },
        { en: "Neutralize", pron: "نيوترا-لايز" }
      ],
      facts: [
        {
          en: "Functionally, an immune response can be divided into two related activities: recognition and response.",
          ar: "الاستجابة المناعية لها نشاطان مترابطان: التعرّف أولاً، ثم الرد.",
          trick: "عين ثم يد: العين تتعرّف على الهدف، واليد تتصرّف."
        },
        {
          en: "Immune recognition is remarkable for its specificity. The system can tell one pathogen from another and can discriminate between foreign molecules and the body's own cells and proteins.",
          ar: "التعرّف المناعي دقيق جداً. يلتقط الجهاز فروقاً كيميائية صغيرة بين ميكروب وآخر، ويفرّق بين مواد الجسم نفسه والمواد الغريبة.",
          trick: "الجهاز المناعي كلب بوليسي يعرف أهل البيت من الغرباء."
        },
        {
          en: "Once a foreign organism is recognized, the system recruits cells and molecules to mount an effector response to eliminate or neutralize it.",
          ar: "بعد التعرّف على الكائن الغريب يستدعي الجهاز خلايا وجزيئات مناسبة للرد. يسمى هذا الرد الاستجابة المنفِّذة، وهدفها القضاء على الميكروب أو إبطال مفعوله.",
          trick: "المنفِّذ هو الجندي الذي ينفّذ الأمر بعد أن عرفت العين الهدف."
        },
        {
          en: "Later exposure to the same organism induces a memory response: a more rapid and heightened immune reaction.",
          ar: "عند التعرض للميكروب نفسه مرة ثانية تحدث استجابة الذاكرة. تكون أسرع وأقوى، وتقضي على الميكروب وتمنع المرض.",
          trick: "المرة الثانية أسرع وأقوى، كمن يمشي طريقاً حفظه."
        }
      ],
      quiz: [
        {
          q: "The two related activities of an immune response are:",
          options: ["Recognition and response", "Digestion and absorption", "Growth and repair", "Filtration and secretion"],
          answer: 0,
          why: "التعرّف أولاً ثم الرد. هذا هو التقسيم الوظيفي الوارد في الشرائح."
        },
        {
          q: "A more rapid and heightened reaction on later exposure to the same organism is called the:",
          options: ["Primary response", "Memory response", "Effector barrier", "Variolation"],
          answer: 1,
          why: "هذه استجابة الذاكرة: أسرع وأقوى من الاستجابة الأولى."
        },
        {
          q: "Distinguishing the body's own cells from foreign molecules is part of:",
          options: ["Immune recognition", "Vaccination", "Attenuation", "Inoculation"],
          answer: 0,
          why: "التمييز بين الذات والغريب هو جزء من التعرّف المناعي."
        }
      ]
    },
    {
      id: "t3",
      term: "Early history: variolation and Jenner",
      title: "تاريخ المناعة: من ثوسيديديس إلى جينر",
      words: [
        { en: "Thucydides", pron: "ثيو-سيديدز" },
        { en: "Variolation", pron: "فيري-أوليشن" },
        { en: "Smallpox", pron: "سمول-بوكس" },
        { en: "Cowpox", pron: "كاو-بوكس" },
        { en: "Inoculating", pron: "إنوكيو-ليتنغ" }
      ],
      facts: [
        {
          en: "Thucydides, in describing a plague in Athens in 430 BC, wrote that only those who had recovered could nurse the sick because they would not contract the disease a second time.",
          ar: "أقدم إشارة مكتوبة إلى المناعة تعود إلى المؤرخ ثوسيديديس. وصف طاعون أثينا سنة 430 قبل الميلاد، وذكر أن من شُفي منه هو وحده من يستطيع تمريض المرضى لأنه لا يصاب مرة ثانية.",
          trick: "من نجا مرة صار ممرّضاً آمناً. وتاريخ الطاعون: 430 قبل الميلاد."
        },
        {
          en: "The first recorded attempts to induce immunity were by the Chinese and Turks in the fifteenth century: dried crusts from smallpox pustules were inhaled or inserted into small cuts in the skin (variolation).",
          ar: "أول محاولات مسجلة لإحداث المناعة عمداً قام بها الصينيون والأتراك في القرن الخامس عشر. كانوا يستنشقون قشور بثور الجدري المجففة، أو يدخلونها في جروح صغيرة في الجلد، وتسمى هذه الطريقة التجدير.",
          trick: "الحروف الأولى: ص للصينيين وت للأتراك، وقشور جافة، والقرن الخامس عشر."
        },
        {
          en: "In 1718, Lady Mary Wortley Montagu observed the positive effects of variolation and had it performed on her own children.",
          ar: "في سنة 1718 رأت الليدي ماري وورتلي مونتاغو فائدة هذه الطريقة عند السكان الأصليين، فأجرتها على أطفالها.",
          trick: "1718: أمٌّ سبقت الأطباء في حماية أطفالها."
        },
        {
          en: "The method was significantly improved by the English physician Edward Jenner in 1798. He noticed that milkmaids who had contracted mild cowpox were later immune to smallpox.",
          ar: "حسّن الطبيب الإنجليزي إدوارد جينر الطريقة كثيراً سنة 1798. لاحظ أن الحلّابات اللواتي أصبن بجدري البقر الخفيف لا يصبن بعد ذلك بالجدري الشديد القاتل.",
          trick: "جدري البقر الخفيف يحمي من جدري الإنسان الشديد، والحلّابات دليل جينر. وتاريخه: 1798."
        },
        {
          en: "Jenner inoculated an eight-year-old boy with fluid from a cowpox pustule and later intentionally infected him with smallpox. The child did not develop smallpox.",
          ar: "حقن جينر طفلاً عمره ثماني سنوات بسائل من بثرة جدري البقر، ثم أصابه عمداً بالجدري فلم يمرض الطفل. وانتشرت طريقته بسرعة في أوروبا.",
          trick: "ثماني سنوات وبثرة بقرة تساوي حماية من الجدري."
        }
      ],
      quiz: [
        {
          q: "Which historian described, in 430 BC, that only people who had recovered from the plague in Athens could nurse the sick?",
          options: ["Herodotus", "Thucydides", "Hippocrates", "Pasteur"],
          answer: 1,
          why: "الشرائح تنسب هذه الملاحظة إلى ثوسيديديس مؤرخ حرب البيلوبونيز."
        },
        {
          q: "Variolation involved inhaling or inserting into the skin dried crusts from:",
          options: ["Smallpox pustules", "Cowpox pustules", "Rabies lesions", "Anthrax spores"],
          answer: 0,
          why: "التجدير يستخدم قشور بثور الجدري نفسه، وليس جدري البقر. جدري البقر هو ما استعمله جينر."
        },
        {
          q: "In 1798 Edward Jenner protected against smallpox by inoculating with fluid from:",
          options: ["Smallpox pustules", "Chickenpox blisters", "Cowpox pustules", "Rabid dog saliva"],
          answer: 2,
          why: "جينر حقن سائلاً من بثرة جدري البقر الخفيف، فحمى من الجدري الشديد."
        },
        {
          q: "Who had variolation performed on her own children in 1718?",
          options: ["Lady Mary Wortley Montagu", "Louis Pasteur", "Joseph Meister", "Edward Jenner"],
          answer: 0,
          why: "هي الليدي ماري وورتلي مونتاغو سنة 1718."
        }
      ]
    },
    {
      id: "t4",
      term: "Pasteur and vaccines",
      title: "باستور واللقاحات",
      words: [
        { en: "Attenuated", pron: "أتنيو-إيتد" },
        { en: "Virulence", pron: "فيرو-لانس" },
        { en: "Vaccine", pron: "فاك-سين" },
        { en: "Anthrax", pron: "أنث-راكس" },
        { en: "Rabies", pron: "ري-بيز" }
      ],
      facts: [
        {
          en: "Pasteur injected chickens with an old culture of fowl cholera bacterium. The chickens became ill but recovered, and a fresh culture then failed to make them sick.",
          ar: "حقن باستور دجاجاً بمزرعة قديمة من جرثومة كوليرا الدجاج، فمرض الدجاج ثم شُفي. وعندما حقنه بمزرعة طازجة لم يمرض أبداً.",
          trick: "الجرثومة العجوز تُمرض قليلاً وتحمي كثيراً."
        },
        {
          en: "Aging had weakened the virulence of the pathogen, and such an attenuated strain might be given to protect against the disease.",
          ar: "استنتج باستور أن تقادم المزرعة أضعف قدرة الجرثومة على إحداث المرض. السلالة المضعَّفة هي التي تُعطى للحماية من المرض.",
          trick: "المضعَّفة جرثومة بلا مخالب: تدرّب الجسم ولا تؤذيه."
        },
        {
          en: "He called the attenuated strain a vaccine, from the Latin Vacca meaning cow, in honor of Jenner's work with cowpox.",
          ar: "سمّى باستور السلالة المضعَّفة لقاحاً. الكلمة مأخوذة من كلمة لاتينية تعني البقرة، تكريماً لعمل جينر مع جدري البقر.",
          trick: "اللقاح والبقرة صنوان، لأن أول لقاح جاء من جدري البقر."
        },
        {
          en: "In 1881 at Pouilly-le-Fort, sheep vaccinated with heat-attenuated anthrax bacillus lived after challenge, while all unvaccinated sheep died.",
          ar: "في تجربة بويي لو فور سنة 1881 لُقِّحت مجموعة من الغنم بجراثيم الجمرة الخبيثة المضعَّفة بالحرارة. ثم عُرِّضت مع غنم غير ملقحة لمزرعة شديدة، فعاشت الملقحة كلها وماتت غير الملقحة كلها. وتعدّ هذه التجربة بداية علم المناعة.",
          trick: "لُقِّح فعاش، ولم يُلقَّح فمات. وسنة الغنم 1881."
        },
        {
          en: "In 1885 Pasteur gave his first human vaccine to Joseph Meister, a boy bitten repeatedly by a rabid dog, using attenuated rabies virus.",
          ar: "في سنة 1885 أعطى باستور أول لقاح لإنسان. كان الطفل جوزيف مايستر الذي عضّه كلب مسعور مرات عدة، وأخذ سلسلة من مستحضرات فيروس السعار المضعَّف، فنجا وعمل لاحقاً حارساً في معهد باستور.",
          trick: "1881 للغنم و1885 للإنسان: الغنم أولاً ثم الطفل."
        }
      ],
      quiz: [
        {
          q: "Pasteur named the attenuated strain a vaccine from the Latin Vacca, which means:",
          options: ["Cow", "Sheep", "Chicken", "Poison"],
          answer: 0,
          why: "الكلمة من البقرة، تكريماً لجينر وجدري البقر."
        },
        {
          q: "The 1881 Pouilly-le-Fort experiment used which organism?",
          options: ["Bacillus anthracis", "Rabies virus", "Variola virus", "Fowl cholera bacterium"],
          answer: 0,
          why: "تجربة الغنم استخدمت عصية الجمرة الخبيثة المضعَّفة بالحرارة. أما الدجاج فكان مع كوليرا الدجاج."
        },
        {
          q: "Who was the first human to receive Pasteur's vaccine, in 1885?",
          options: ["Edward Jenner", "Joseph Meister", "Thucydides", "Lady Mary Montagu"],
          answer: 1,
          why: "هو الطفل جوزيف مايستر الذي عضه كلب مسعور."
        },
        {
          q: "An attenuated strain is a pathogen that has:",
          options: ["Weakened virulence", "Increased virulence", "Been completely destroyed", "Mutated into a virus"],
          answer: 0,
          why: "التضعيف يعني نقص القدرة على إحداث المرض، مع بقاء القدرة على تدريب المناعة."
        }
      ]
    },
    {
      id: "t5",
      term: "Innate and adaptive immunity",
      title: "المناعة الفطرية والمناعة المكتسبة",
      words: [
        { en: "Innate", pron: "إن-يت" },
        { en: "Adaptive", pron: "أداب-تف" },
        { en: "Antigen", pron: "أنتِ-جن" },
        { en: "Lymphocytes", pron: "ليمفو-سايتس" },
        { en: "Antibodies", pron: "أنتي-بوديز" }
      ],
      facts: [
        {
          en: "Innate immunity provides the early line of defense against microbes. Its mechanisms are in place even before infection and respond rapidly.",
          ar: "المناعة الفطرية هي خط الدفاع المبكر ضد الميكروبات. آلياتها موجودة قبل حدوث العدوى، وتستجيب بسرعة.",
          trick: "الفطرية وُلدت معك، وهي جاهزة قبل أن تحتاجها."
        },
        {
          en: "Innate mechanisms are specific for structures common to groups of related microbes and may not distinguish fine differences between microbes.",
          ar: "تتعرّف الآليات الفطرية على تراكيب مشتركة بين مجموعات من الميكروبات المتقاربة، ولا تميّز الفروق الدقيقة بين ميكروب وآخر.",
          trick: "الفطرية تعرف «العائلة» فقط، والمكتسبة تعرف «الاسم الكامل» للميكروب."
        },
        {
          en: "Adaptive immunity does not come into play until there is an antigenic challenge, and it responds with a high degree of specificity and the property of memory.",
          ar: "المناعة المكتسبة لا تبدأ إلا بعد التعرض لمستضد. وتتميز بتخصص عالٍ وبالذاكرة.",
          trick: "المكتسبة تتعلّم بعد اللقاء الأول وتتذكّر."
        },
        {
          en: "An adaptive response appears within five or six days of first exposure. A second exposure produces a response that is quicker, stronger and often more effective.",
          ar: "تظهر الاستجابة المكتسبة بعد خمسة أو ستة أيام من أول تعرض. وعند التعرض الثاني تكون أسرع وأقوى وأكثر فاعلية في الغالب.",
          trick: "الأولى بطيئة وتحتاج خمسة أيام أو ستة، والثانية سريعة وقوية."
        },
        {
          en: "The major agents of adaptive immunity are lymphocytes and the antibodies.",
          ar: "العاملان الرئيسيان في المناعة المكتسبة هما الخلايا اللمفاوية والأجسام المضادة.",
          trick: "لمفاويات وأجسام مضادة: هما قوات النخبة في المناعة المكتسبة."
        }
      ],
      quiz: [
        {
          q: "Which type of immunity is present before infection and provides the early line of defense?",
          options: ["Innate immunity", "Adaptive immunity", "Memory response", "Passive immunity"],
          answer: 0,
          why: "الفطرية موجودة قبل العدوى وتعمل أولاً."
        },
        {
          q: "Which type of immunity shows specificity and memory?",
          options: ["Innate immunity", "Adaptive immunity", "Skin barriers", "Phagocytosis"],
          answer: 1,
          why: "التخصص الدقيق والذاكرة من صفات المناعة المكتسبة."
        },
        {
          q: "A typical adaptive response against an antigen appears after:",
          options: ["A few minutes", "One to two hours", "Five or six days", "Three months"],
          answer: 2,
          why: "الاستجابة المكتسبة الأولى تحتاج نحو خمسة أيام أو ستة."
        },
        {
          q: "The major agents of adaptive immunity are:",
          options: ["Lymphocytes and antibodies", "Skin and mucus", "Sebum and keratin", "Cilia and saliva"],
          answer: 0,
          why: "العاملان الرئيسيان هما الخلايا اللمفاوية والأجسام المضادة."
        }
      ]
    },
    {
      id: "t6",
      term: "Four barriers of innate immunity",
      title: "الحواجز الأربعة في المناعة الفطرية",
      words: [
        { en: "Anatomic", pron: "أنا-تومك" },
        { en: "Physiologic", pron: "فيزي-ولوجك" },
        { en: "Phagocytic", pron: "فاغو-سيتك" },
        { en: "Inflammatory", pron: "إنفلا-ماتوري" },
        { en: "Macrophages", pron: "ماكرو-فيجز" },
        { en: "Neutrophils", pron: "نيو-تروفلز" }
      ],
      facts: [
        {
          en: "Innate immunity comprises four types of defensive barriers: anatomic, physiologic, phagocytic, and inflammatory.",
          ar: "تتكون المناعة الفطرية من أربعة أنواع من الحواجز الدفاعية: التشريحية، والفسيولوجية، والبلعمية، والالتهابية.",
          trick: "رتّبها من الخارج إلى الداخل: حاجز مادي هو الجلد، ثم حاجز وظيفي كالحموضة، ثم خلايا تأكل الغريب، ثم التهاب."
        },
        {
          en: "Phagocytic cells such as macrophages and neutrophils, barriers such as skin, and antimicrobial compounds synthesized by the host all play roles in innate immunity.",
          ar: "من مكونات المناعة الفطرية الخلايا البالعة كالبلاعم الكبيرة والعدلات، وحواجز كالجلد، ومركبات يصنعها الجسم لقتل الميكروبات.",
          trick: "البالعة تأكل، والجلد يسدّ، والمركبات تسمّم الميكروب."
        }
      ],
      quiz: [
        {
          q: "Which of the following is NOT one of the four types of innate defensive barriers?",
          options: ["Anatomic", "Physiologic", "Adaptive", "Inflammatory"],
          answer: 2,
          why: "الحواجز الأربعة هي التشريحية والفسيولوجية والبلعمية والالتهابية. المكتسبة ليست حاجزاً فطرياً."
        },
        {
          q: "Macrophages and neutrophils belong to which innate barrier?",
          options: ["Anatomic", "Physiologic", "Phagocytic", "Inflammatory"],
          answer: 2,
          why: "البلاعم الكبيرة والعدلات خلايا بالعة، فهي من الحاجز البلعمي."
        }
      ]
    },
    {
      id: "t7",
      term: "The skin as a barrier",
      title: "الجلد: الحاجز التشريحي الأول",
      words: [
        { en: "Epidermis", pron: "إبي-ديرمس" },
        { en: "Dermis", pron: "دير-مس" },
        { en: "Keratin", pron: "كيرا-تن" },
        { en: "Sebaceous", pron: "سي-بيشس" },
        { en: "Sebum", pron: "سي-بم" },
        { en: "Commensals", pron: "كو-مينسلز" },
        { en: "Bubonic", pron: "بيو-بونك" }
      ],
      facts: [
        {
          en: "The skin consists of two distinct layers: a thinner outer layer, the epidermis, and a thicker layer, the dermis.",
          ar: "يتكون الجلد من طبقتين: خارجية أرق هي البشرة، وأعمق أسمك هي الأدمة.",
          trick: "البشرة فوق، والأدمة تحتها."
        },
        {
          en: "The outer epidermal layer consists of dead cells and is filled with a waterproofing protein called keratin.",
          ar: "الطبقة الخارجية من البشرة خلايا ميتة مليئة ببروتين الكيراتين الذي يعزل الماء.",
          trick: "الكيراتين معطف المطر للجلد."
        },
        {
          en: "The dermis is connective tissue containing blood vessels, hair follicles, sebaceous glands, and sweat glands.",
          ar: "الأدمة نسيج رابط يحتوي على أوعية دموية وبصيلات شعر وغدد دهنية وغدد عرقية.",
          trick: "الأدمة مخزن فيه أربعة أشياء: دم، شعر، دهن، عرق."
        },
        {
          en: "Sebaceous glands produce sebum, which consists of lactic acid and fatty acids and keeps the pH of the skin between 3 and 5, inhibiting most microorganisms.",
          ar: "تفرز الغدد الدهنية مادة اسمها الزهم، وهي مزيج من حمض اللاكتيك والأحماض الدهنية. تُبقي حموضة الجلد بين 3 و5، فيقل نمو أغلب الميكروبات.",
          trick: "حمض ودهن ينتجان حموضة بين ثلاثة وخمسة، فالجلد يصير حامضاً على الميكروب."
        },
        {
          en: "A few bacteria that metabolize sebum live as commensals on the skin and sometimes cause a severe form of acne.",
          ar: "بعض البكتيريا تعيش على الجلد دون أذى لأنها تتغذى على الزهم، لكنها قد تسبب أحياناً حب شباب شديداً.",
          trick: "تأكل الزهم فتصنع الحبوب."
        },
        {
          en: "Breaks in the skin and insect bites are routes of infection: mosquitoes deposit the malaria protozoan, fleas spread bubonic plague, and ticks spread Lyme disease.",
          ar: "الجروح والخدوش ولدغات الحشرات طرق للعدوى. البعوض ينقل طفيلي الملاريا، والبراغيث تنقل الطاعون الدبلي، والقراد ينقل مرض لايم.",
          trick: "ب ب ق: بعوض للملاريا، براغيث للطاعون، قراد للايم."
        }
      ],
      quiz: [
        {
          q: "The outer epidermal layer is filled with which waterproofing protein?",
          options: ["Collagen", "Keratin", "Albumin", "Elastin"],
          answer: 1,
          why: "الكيراتين هو البروتين العازل للماء في الطبقة الخارجية الميتة من البشرة."
        },
        {
          q: "Sebum maintains the pH of the skin between:",
          options: ["1 and 2", "3 and 5", "6 and 7", "8 and 9"],
          answer: 1,
          why: "الحموضة بين 3 و5 تثبّط نمو أغلب الميكروبات."
        },
        {
          q: "Sebum consists of:",
          options: ["Keratin and collagen", "Lactic acid and fatty acids", "Mucus and saliva", "Sweat and water"],
          answer: 1,
          why: "الزهم مزيج من حمض اللاكتيك والأحماض الدهنية."
        },
        {
          q: "Which disease is spread by the bite of ticks?",
          options: ["Malaria", "Bubonic plague", "Lyme disease", "Influenza"],
          answer: 2,
          why: "القراد ينقل مرض لايم. الملاريا من البعوض، والطاعون الدبلي من البراغيث."
        }
      ]
    },
    {
      id: "t8",
      term: "Mucous membranes",
      title: "الأغشية المخاطية",
      words: [
        { en: "Mucous", pron: "ميو-كس" },
        { en: "Cilia", pron: "سي-ليا" },
        { en: "Conjunctivae", pron: "كون-جنك-تايفي" },
        { en: "Alimentary", pron: "ألي-مينتري" },
        { en: "Urogenital", pron: "يورو-جينتل" },
        { en: "Influenza", pron: "إنفلو-إنزا" },
        { en: "Gonorrhea", pron: "غونو-ريا" }
      ],
      facts: [
        {
          en: "The conjunctivae and the alimentary, respiratory, and urogenital tracts are lined by mucous membranes, not by dry protective skin.",
          ar: "ملتحمة العين والجهاز الهضمي والتنفسي والبولي التناسلي مبطّنة بأغشية مخاطية، وليس بالجلد الجاف الواقي.",
          trick: "كل مدخل رطب في الجسم له غشاء مخاطي: عين، هضم، تنفس، بولي تناسلي."
        },
        {
          en: "These membranes consist of an outer epithelial layer and an underlying layer of connective tissue.",
          ar: "يتكون الغشاء المخاطي من طبقة ظهارية خارجية فوق طبقة نسيج رابط.",
          trick: "ظهارة فوق ونسيج رابط تحتها، مثل ترتيب الجلد: خارجية ثم عميقة."
        },
        {
          en: "Saliva, tears, and mucous secretions wash away potential invaders and contain antibacterial or antiviral substances.",
          ar: "اللعاب والدموع والمفرزات المخاطية تغسل الغزاة بعيداً، وفيها مواد مضادة للبكتيريا والفيروسات.",
          trick: "لعاب ودمع ومخاط: غسيل مع مضاد حيوي."
        },
        {
          en: "Mucus entraps foreign microorganisms. In the lower respiratory tract, cilia propel mucus-entrapped microorganisms out with synchronous movement.",
          ar: "المخاط سائل لزج يحبس الميكروبات. وفي الجهاز التنفسي السفلي تتحرك الأهداب، وهي زوائد شعرية دقيقة، بتناسق فتدفع المخاط ومعه الميكروبات إلى الخارج.",
          trick: "المخاط شريط لاصق، والأهداب مكنسة تدفعه إلى الخارج."
        },
        {
          en: "Normal flora generally outcompete pathogens for attachment sites on the epithelial cell surface and for necessary nutrients.",
          ar: "الجراثيم الطبيعية غير الممرضة تسكن سطح الغشاء، وتنافس الجراثيم الممرضة على أماكن الالتصاق وعلى الغذاء.",
          trick: "السكان الأصليون يحجزون المقاعد قبل الضيوف المؤذين."
        },
        {
          en: "Some organisms escape these defenses: influenza virus attaches firmly to cells in mucous membranes of the respiratory tract, and the gonorrhea organism has surface projections that bind urogenital epithelial cells.",
          ar: "بعض الميكروبات تتحايل على هذه الدفاعات. فيروس الإنفلونزا يلتصق بقوة بخلايا الجهاز التنفسي فلا تكنسه الأهداب، والكائن المسبب للسيلان له نتوءات سطحية تلصقه بخلايا المجرى البولي التناسلي.",
          trick: "كل ميكروب يتمسك ببيته: الإنفلونزا بالتنفسي، والسيلان بالبولي التناسلي."
        }
      ],
      quiz: [
        {
          q: "Hairlike protrusions of epithelial cells that propel mucus in the lower respiratory tract are called:",
          options: ["Cilia", "Keratin", "Sebum", "Follicles"],
          answer: 0,
          why: "الأهداب تتحرك بتناسق وتدفع المخاط ومعه الميكروبات."
        },
        {
          q: "Normal flora help protect mucosal surfaces by:",
          options: ["Producing keratin", "Outcompeting pathogens for attachment sites and nutrients", "Raising the skin pH", "Making antibodies"],
          answer: 1,
          why: "الجراثيم الطبيعية تنافس الممرضة على أماكن الالتصاق وعلى الغذاء."
        },
        {
          q: "How does influenza virus avoid being swept out by ciliated epithelial cells?",
          options: ["It attaches firmly to respiratory mucosal cells", "It destroys the cilia with sebum", "It lowers the mucus pH", "It lives in the dermis"],
          answer: 0,
          why: "للفيروس جزيء سطحي يلصقه بقوة بخلايا الجهاز التنفسي."
        }
      ]
    }
  ]
};
