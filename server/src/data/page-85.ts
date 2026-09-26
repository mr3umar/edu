export const page85 = `
{
  "image": {
    "width": 934,
    "height": 1238,
    "coordinate_system": "origin_top_left",
    "coordinate_order": "left_to_right",
    "language": "ar",
    "reading_direction": "rtl",
    "notes": "تم التقاط الصيغ الرياضية بترتيب القراءة من اليمين إلى اليسار عند ظهورها ضمن سياق عربي."
  },
  "parts": [
    {
      "seq_id": 1,
      "id": "page_001",
      "parent_id": null,
      "type": "page",
      "label": "صفحة كاملة",
      "content": "",
      "coordinates": {
        "x_min": 0,
        "y_min": 0,
        "x_max": 934,
        "y_max": 1238
      }
    },
    {
      "seq_id": 2,
      "id": "header_001",
      "parent_id": "page_001",
      "type": "section_title",
      "label": "عنوان علوي",
      "content": "تدرب على اختبار",
      "coordinates": {
        "x_min": 593,
        "y_min": 47,
        "x_max": 863,
        "y_max": 95
      }
    },
    {
      "seq_id": 3,
      "id": "panel_001",
      "parent_id": "page_001",
      "type": "container",
      "label": "صندوق تدريبات الاختبار",
      "content": "",
      "coordinates": {
        "x_min": 55,
        "y_min": 61,
        "x_max": 841,
        "y_max": 525
      }
    },
    {
      "seq_id": 4,
      "id": "divider_001",
      "parent_id": "panel_001",
      "type": "divider",
      "label": "فاصل عمودي",
      "content": "",
      "coordinates": {
        "x_min": 462,
        "y_min": 119,
        "x_max": 465,
        "y_max": 505
      }
    },
    {
      "seq_id": 5,
      "id": "q22",
      "parent_id": "panel_001",
      "type": "question",
      "label": "السؤال ٢٢",
      "content": "",
      "coordinates": {
        "x_min": 487,
        "y_min": 119,
        "x_max": 818,
        "y_max": 467
      }
    },
    {
      "seq_id": 6,
      "id": "q22_number",
      "parent_id": "q22",
      "type": "question_number",
      "label": "رقم السؤال",
      "content": "٢٢",
      "coordinates": {
        "x_min": 789,
        "y_min": 118,
        "x_max": 818,
        "y_max": 147
      }
    },
    {
      "seq_id": 7,
      "id": "q22_prompt",
      "parent_id": "q22",
      "type": "prompt",
      "label": "نص السؤال ٢٢",
      "content": "يبين الجدول التالي عدد ساعات العمل التطوعي الأسبوعي لكلٍّ من سعود وبندر. أيٌّ من العبارات التالية يمكن استعمالها لإيجاد عدد ساعات العمل التطوعي لهم خلال ٦ أسابيع؟",
      "coordinates": {
        "x_min": 488,
        "y_min": 124,
        "x_max": 783,
        "y_max": 285
      }
    },
    {
      "seq_id": 8,
      "id": "q22_lesson",
      "parent_id": "q22",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ٢-٣)",
      "coordinates": {
        "x_min": 549,
        "y_min": 277,
        "x_max": 644,
        "y_max": 292
      }
    },
    {
      "seq_id": 9,
      "id": "q22_table",
      "parent_id": "q22",
      "type": "table",
      "label": "جدول ساعات العمل التطوعي",
      "content": "",
      "coordinates": {
        "x_min": 535,
        "y_min": 307,
        "x_max": 735,
        "y_max": 390
      },
      "row_count": 3,
      "column_count": 2
    },
    {
      "seq_id": 10,
      "id": "q22_table_h1",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "رأس العمود: عدد الساعات",
      "content": "عدد الساعات",
      "coordinates": {
        "x_min": 535,
        "y_min": 307,
        "x_max": 636,
        "y_max": 335
      },
      "row": 1,
      "column": 1
    },
    {
      "seq_id": 11,
      "id": "q22_table_h2",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "رأس العمود: الاسم",
      "content": "الاسم",
      "coordinates": {
        "x_min": 636,
        "y_min": 307,
        "x_max": 735,
        "y_max": 335
      },
      "row": 1,
      "column": 2
    },
    {
      "seq_id": 12,
      "id": "q22_table_r2c1",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "عدد ساعات سعود",
      "content": "٤",
      "coordinates": {
        "x_min": 535,
        "y_min": 335,
        "x_max": 636,
        "y_max": 363
      },
      "row": 2,
      "column": 1
    },
    {
      "seq_id": 13,
      "id": "q22_table_r2c2",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "الاسم: سعود",
      "content": "سعود",
      "coordinates": {
        "x_min": 636,
        "y_min": 335,
        "x_max": 735,
        "y_max": 363
      },
      "row": 2,
      "column": 2
    },
    {
      "seq_id": 14,
      "id": "q22_table_r3c1",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "عدد ساعات بندر",
      "content": "٣",
      "coordinates": {
        "x_min": 535,
        "y_min": 363,
        "x_max": 636,
        "y_max": 390
      },
      "row": 3,
      "column": 1
    },
    {
      "seq_id": 15,
      "id": "q22_table_r3c2",
      "parent_id": "q22_table",
      "type": "table_cell",
      "label": "الاسم: بندر",
      "content": "بندر",
      "coordinates": {
        "x_min": 636,
        "y_min": 363,
        "x_max": 735,
        "y_max": 390
      },
      "row": 3,
      "column": 2
    },
    {
      "seq_id": 16,
      "id": "q22_option_a",
      "parent_id": "q22",
      "type": "option",
      "label": "أ",
      "content": "(أ) ٦ × ٤ × ٣",
      "coordinates": {
        "x_min": 660,
        "y_min": 407,
        "x_max": 781,
        "y_max": 428
      }
    },
    {
      "seq_id": 17,
      "id": "q22_option_b",
      "parent_id": "q22",
      "type": "option",
      "label": "ب",
      "content": "(ب) ٦ × (٤ + ٣)",
      "coordinates": {
        "x_min": 647,
        "y_min": 449,
        "x_max": 781,
        "y_max": 467
      }
    },
    {
      "seq_id": 18,
      "id": "q22_option_c",
      "parent_id": "q22",
      "type": "option",
      "label": "ج",
      "content": "(ج) ٦ + ٢ + ١",
      "coordinates": {
        "x_min": 518,
        "y_min": 407,
        "x_max": 632,
        "y_max": 428
      }
    },
    {
      "seq_id": 19,
      "id": "q22_option_d",
      "parent_id": "q22",
      "type": "option",
      "label": "د",
      "content": "(د) ٦ × (٤ - ٣)",
      "coordinates": {
        "x_min": 497,
        "y_min": 449,
        "x_max": 632,
        "y_max": 467
      }
    },
    {
      "seq_id": 20,
      "id": "q23",
      "parent_id": "panel_001",
      "type": "question",
      "label": "السؤال ٢٣",
      "content": "",
      "coordinates": {
        "x_min": 74,
        "y_min": 118,
        "x_max": 450,
        "y_max": 491
      }
    },
    {
      "seq_id": 21,
      "id": "q23_number",
      "parent_id": "q23",
      "type": "question_number",
      "label": "رقم السؤال",
      "content": "٢٣",
      "coordinates": {
        "x_min": 420,
        "y_min": 118,
        "x_max": 449,
        "y_max": 147
      }
    },
    {
      "seq_id": 22,
      "id": "q23_prompt",
      "parent_id": "q23",
      "type": "prompt",
      "label": "نص السؤال ٢٣",
      "content": "أيُّ الجمل التالية صحيحة لناتج ضرب عددين كلٌّ منهما من مضاعفات العدد ١٠ ؟",
      "coordinates": {
        "x_min": 76,
        "y_min": 124,
        "x_max": 420,
        "y_max": 181
      }
    },
    {
      "seq_id": 23,
      "id": "q23_lesson",
      "parent_id": "q23",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ١-٣)",
      "coordinates": {
        "x_min": 105,
        "y_min": 174,
        "x_max": 199,
        "y_max": 190
      }
    },
    {
      "seq_id": 24,
      "id": "q23_option_a",
      "parent_id": "q23",
      "type": "option",
      "label": "أ",
      "content": "(أ) دائمًا عدد الأصفار يساوي مجموع عدد أصفار العددين معًا.",
      "coordinates": {
        "x_min": 89,
        "y_min": 203,
        "x_max": 405,
        "y_max": 240
      }
    },
    {
      "seq_id": 25,
      "id": "q23_option_b",
      "parent_id": "q23",
      "type": "option",
      "label": "ب",
      "content": "(ب) دائمًا يقل عدد الأصفار بمقدار صفر واحد عن مجموع عدد أصفار العددين معًا.",
      "coordinates": {
        "x_min": 77,
        "y_min": 250,
        "x_max": 410,
        "y_max": 304
      }
    },
    {
      "seq_id": 26,
      "id": "q23_option_c",
      "parent_id": "q23",
      "type": "option",
      "label": "ج",
      "content": "(ج) لا يمكن أن يتساوى عدد الأصفار مع مجموع أعداد أصفار العددين معًا.",
      "coordinates": {
        "x_min": 76,
        "y_min": 321,
        "x_max": 411,
        "y_max": 384
      }
    },
    {
      "seq_id": 27,
      "id": "q23_option_d",
      "parent_id": "q23",
      "type": "option",
      "label": "د",
      "content": "(د) دائمًا عدد الأصفار أكبر من أو يساوي مجموع أعداد أصفار العددين معًا.",
      "coordinates": {
        "x_min": 75,
        "y_min": 407,
        "x_max": 413,
        "y_max": 474
      }
    },
    {
      "seq_id": 28,
      "id": "section_review",
      "parent_id": "page_001",
      "type": "section_title",
      "label": "عنوان القسم",
      "content": "مراجعة تراكمية",
      "coordinates": {
        "x_min": 653,
        "y_min": 559,
        "x_max": 819,
        "y_max": 594
      }
    },
    {
      "seq_id": 29,
      "id": "review_instr_1",
      "parent_id": "page_001",
      "type": "instruction",
      "label": "تعليمات المسائل ٢٤-٢٦",
      "content": "أوجد ناتج الضرب ذهنيًا في كلٍّ مما يأتي:",
      "coordinates": {
        "x_min": 556,
        "y_min": 621,
        "x_max": 812,
        "y_max": 645
      }
    },
    {
      "seq_id": 30,
      "id": "review_instr_1_lesson",
      "parent_id": "review_instr_1",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ١-٣)",
      "coordinates": {
        "x_min": 433,
        "y_min": 628,
        "x_max": 553,
        "y_max": 645
      }
    },
    {
      "seq_id": 31,
      "id": "q24",
      "parent_id": "review_instr_1",
      "type": "exercise",
      "label": "٢٤",
      "content": "٤٠ × ٢٠",
      "coordinates": {
        "x_min": 727,
        "y_min": 664,
        "x_max": 837,
        "y_max": 694
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 32,
      "id": "q24_number",
      "parent_id": "q24",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٤",
      "coordinates": {
        "x_min": 809,
        "y_min": 664,
        "x_max": 837,
        "y_max": 693
      }
    },
    {
      "seq_id": 33,
      "id": "q24_expression",
      "parent_id": "q24",
      "type": "expression",
      "label": "صيغة التمرين ٢٤",
      "content": "٤٠ × ٢٠",
      "coordinates": {
        "x_min": 727,
        "y_min": 676,
        "x_max": 793,
        "y_max": 693
      }
    },
    {
      "seq_id": 34,
      "id": "q25",
      "parent_id": "review_instr_1",
      "type": "exercise",
      "label": "٢٥",
      "content": "٧ × ٣٠٠٠",
      "coordinates": {
        "x_min": 488,
        "y_min": 664,
        "x_max": 609,
        "y_max": 694
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 35,
      "id": "q25_number",
      "parent_id": "q25",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٥",
      "coordinates": {
        "x_min": 580,
        "y_min": 664,
        "x_max": 609,
        "y_max": 693
      }
    },
    {
      "seq_id": 36,
      "id": "q25_expression",
      "parent_id": "q25",
      "type": "expression",
      "label": "صيغة التمرين ٢٥",
      "content": "٧ × ٣٠٠٠",
      "coordinates": {
        "x_min": 488,
        "y_min": 676,
        "x_max": 558,
        "y_max": 693
      }
    },
    {
      "seq_id": 37,
      "id": "q26",
      "parent_id": "review_instr_1",
      "type": "exercise",
      "label": "٢٦",
      "content": "١٥٠٠ × ١٠",
      "coordinates": {
        "x_min": 249,
        "y_min": 664,
        "x_max": 380,
        "y_max": 694
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 38,
      "id": "q26_number",
      "parent_id": "q26",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٦",
      "coordinates": {
        "x_min": 351,
        "y_min": 664,
        "x_max": 380,
        "y_max": 693
      }
    },
    {
      "seq_id": 39,
      "id": "q26_expression",
      "parent_id": "q26",
      "type": "expression",
      "label": "صيغة التمرين ٢٦",
      "content": "١٥٠٠ × ١٠",
      "coordinates": {
        "x_min": 249,
        "y_min": 676,
        "x_max": 332,
        "y_max": 693
      }
    },
    {
      "seq_id": 40,
      "id": "review_instr_2",
      "parent_id": "page_001",
      "type": "instruction",
      "label": "تعليمات المسائل ٢٧-٢٩",
      "content": "اجمع أو اطرح ذهنيًا مستعملًا الموازنة:",
      "coordinates": {
        "x_min": 553,
        "y_min": 738,
        "x_max": 812,
        "y_max": 761
      }
    },
    {
      "seq_id": 41,
      "id": "review_instr_2_lesson",
      "parent_id": "review_instr_2",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ٢-٦)",
      "coordinates": {
        "x_min": 426,
        "y_min": 745,
        "x_max": 552,
        "y_max": 762
      }
    },
    {
      "seq_id": 42,
      "id": "q27",
      "parent_id": "review_instr_2",
      "type": "exercise",
      "label": "٢٧",
      "content": "١٨ + ٣٧",
      "coordinates": {
        "x_min": 716,
        "y_min": 781,
        "x_max": 837,
        "y_max": 811
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 43,
      "id": "q27_number",
      "parent_id": "q27",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٧",
      "coordinates": {
        "x_min": 809,
        "y_min": 781,
        "x_max": 837,
        "y_max": 810
      }
    },
    {
      "seq_id": 44,
      "id": "q27_expression",
      "parent_id": "q27",
      "type": "expression",
      "label": "صيغة التمرين ٢٧",
      "content": "١٨ + ٣٧",
      "coordinates": {
        "x_min": 716,
        "y_min": 793,
        "x_max": 781,
        "y_max": 810
      }
    },
    {
      "seq_id": 45,
      "id": "q28",
      "parent_id": "review_instr_2",
      "type": "exercise",
      "label": "٢٨",
      "content": "٧،٩ + ٥،٥",
      "coordinates": {
        "x_min": 499,
        "y_min": 781,
        "x_max": 609,
        "y_max": 811
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 46,
      "id": "q28_number",
      "parent_id": "q28",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٨",
      "coordinates": {
        "x_min": 580,
        "y_min": 781,
        "x_max": 609,
        "y_max": 810
      }
    },
    {
      "seq_id": 47,
      "id": "q28_expression",
      "parent_id": "q28",
      "type": "expression",
      "label": "صيغة التمرين ٢٨",
      "content": "٧،٩ + ٥،٥",
      "coordinates": {
        "x_min": 499,
        "y_min": 793,
        "x_max": 558,
        "y_max": 810
      }
    },
    {
      "seq_id": 48,
      "id": "q29",
      "parent_id": "review_instr_2",
      "type": "exercise",
      "label": "٢٩",
      "content": "٢٠٤ - ٩٧",
      "coordinates": {
        "x_min": 249,
        "y_min": 781,
        "x_max": 380,
        "y_max": 811
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 49,
      "id": "q29_number",
      "parent_id": "q29",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٢٩",
      "coordinates": {
        "x_min": 351,
        "y_min": 781,
        "x_max": 380,
        "y_max": 810
      }
    },
    {
      "seq_id": 50,
      "id": "q29_expression",
      "parent_id": "q29",
      "type": "expression",
      "label": "صيغة التمرين ٢٩",
      "content": "٢٠٤ - ٩٧",
      "coordinates": {
        "x_min": 249,
        "y_min": 793,
        "x_max": 329,
        "y_max": 810
      }
    },
    {
      "seq_id": 51,
      "id": "review_instr_3",
      "parent_id": "page_001",
      "type": "instruction",
      "label": "تعليمات المسائل ٣٠-٣٣",
      "content": "قدّر ناتج الجمع أو الطرح مستعملًا التقريب في كلٍّ مما يأتي:",
      "coordinates": {
        "x_min": 419,
        "y_min": 853,
        "x_max": 813,
        "y_max": 878
      }
    },
    {
      "seq_id": 52,
      "id": "review_instr_3_lesson",
      "parent_id": "review_instr_3",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ٢-٢)",
      "coordinates": {
        "x_min": 299,
        "y_min": 861,
        "x_max": 419,
        "y_max": 878
      }
    },
    {
      "seq_id": 53,
      "id": "q30",
      "parent_id": "review_instr_3",
      "type": "exercise",
      "label": "٣٠",
      "content": "٣٨ + ٤٦",
      "coordinates": {
        "x_min": 724,
        "y_min": 898,
        "x_max": 837,
        "y_max": 928
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 54,
      "id": "q30_number",
      "parent_id": "q30",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٣٠",
      "coordinates": {
        "x_min": 809,
        "y_min": 898,
        "x_max": 837,
        "y_max": 927
      }
    },
    {
      "seq_id": 55,
      "id": "q30_expression",
      "parent_id": "q30",
      "type": "expression",
      "label": "صيغة التمرين ٣٠",
      "content": "٣٨ + ٤٦",
      "coordinates": {
        "x_min": 724,
        "y_min": 910,
        "x_max": 790,
        "y_max": 927
      }
    },
    {
      "seq_id": 56,
      "id": "q31",
      "parent_id": "review_instr_3",
      "type": "exercise",
      "label": "٣١",
      "content": "٢١٤ - ١٠٥",
      "coordinates": {
        "x_min": 484,
        "y_min": 898,
        "x_max": 609,
        "y_max": 928
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 57,
      "id": "q31_number",
      "parent_id": "q31",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٣١",
      "coordinates": {
        "x_min": 580,
        "y_min": 898,
        "x_max": 609,
        "y_max": 927
      }
    },
    {
      "seq_id": 58,
      "id": "q31_expression",
      "parent_id": "q31",
      "type": "expression",
      "label": "صيغة التمرين ٣١",
      "content": "٢١٤ - ١٠٥",
      "coordinates": {
        "x_min": 484,
        "y_min": 910,
        "x_max": 560,
        "y_max": 927
      }
    },
    {
      "seq_id": 59,
      "id": "q32",
      "parent_id": "review_instr_3",
      "type": "exercise",
      "label": "٣٢",
      "content": "٩،٦ + ٨،٧",
      "coordinates": {
        "x_min": 713,
        "y_min": 948,
        "x_max": 837,
        "y_max": 978
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 60,
      "id": "q32_number",
      "parent_id": "q32",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٣٢",
      "coordinates": {
        "x_min": 809,
        "y_min": 948,
        "x_max": 837,
        "y_max": 977
      }
    },
    {
      "seq_id": 61,
      "id": "q32_expression",
      "parent_id": "q32",
      "type": "expression",
      "label": "صيغة التمرين ٣٢",
      "content": "٩،٦ + ٨،٧",
      "coordinates": {
        "x_min": 713,
        "y_min": 960,
        "x_max": 790,
        "y_max": 977
      }
    },
    {
      "seq_id": 62,
      "id": "q33",
      "parent_id": "review_instr_3",
      "type": "exercise",
      "label": "٣٣",
      "content": "٠،٩ - ٣،٤",
      "coordinates": {
        "x_min": 491,
        "y_min": 948,
        "x_max": 609,
        "y_max": 978
      },
      "rtl_formula_order_applied": true
    },
    {
      "seq_id": 63,
      "id": "q33_number",
      "parent_id": "q33",
      "type": "exercise_number",
      "label": "رقم التمرين",
      "content": "٣٣",
      "coordinates": {
        "x_min": 580,
        "y_min": 948,
        "x_max": 609,
        "y_max": 977
      }
    },
    {
      "seq_id": 64,
      "id": "q33_expression",
      "parent_id": "q33",
      "type": "expression",
      "label": "صيغة التمرين ٣٣",
      "content": "٠،٩ - ٣،٤",
      "coordinates": {
        "x_min": 491,
        "y_min": 960,
        "x_max": 559,
        "y_max": 977
      }
    },
    {
      "seq_id": 65,
      "id": "q34",
      "parent_id": "page_001",
      "type": "question",
      "label": "السؤال ٣٤",
      "content": "",
      "coordinates": {
        "x_min": 66,
        "y_min": 999,
        "x_max": 838,
        "y_max": 1147
      }
    },
    {
      "seq_id": 66,
      "id": "q34_number",
      "parent_id": "q34",
      "type": "question_number",
      "label": "رقم السؤال",
      "content": "٣٤",
      "coordinates": {
        "x_min": 809,
        "y_min": 999,
        "x_max": 837,
        "y_max": 1028
      }
    },
    {
      "seq_id": 67,
      "id": "q34_topic",
      "parent_id": "q34",
      "type": "topic_label",
      "label": "موضوع السؤال",
      "content": "القياس:",
      "coordinates": {
        "x_min": 745,
        "y_min": 1005,
        "x_max": 805,
        "y_max": 1026
      }
    },
    {
      "seq_id": 68,
      "id": "q34_prompt",
      "parent_id": "q34",
      "type": "prompt",
      "label": "نص السؤال ٣٤",
      "content": "يبين الجدول التالي درجات الحرارة السليزية في مدينة الرياض خلال أسبوع. اكتب أيام الأسبوع من الأقل إلى الأكبر درجة حرارة.",
      "coordinates": {
        "x_min": 66,
        "y_min": 1003,
        "x_max": 807,
        "y_max": 1065
      }
    },
    {
      "seq_id": 69,
      "id": "q34_lesson",
      "parent_id": "q34",
      "type": "lesson_reference",
      "label": "مرجع الدرس",
      "content": "(الدرس ١-٦)",
      "coordinates": {
        "x_min": 425,
        "y_min": 1052,
        "x_max": 545,
        "y_max": 1068
      }
    },
    {
      "seq_id": 70,
      "id": "q34_table",
      "parent_id": "q34",
      "type": "table",
      "label": "جدول درجات الحرارة",
      "content": "",
      "coordinates": {
        "x_min": 184,
        "y_min": 1087,
        "x_max": 707,
        "y_max": 1147
      },
      "row_count": 2,
      "column_count": 8
    },
    {
      "seq_id": 71,
      "id": "q34_table_r1c1",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "رأس الصف: اليوم",
      "content": "اليوم",
      "coordinates": {
        "x_min": 625,
        "y_min": 1087,
        "x_max": 707,
        "y_max": 1117
      },
      "row": 1,
      "column": 1
    },
    {
      "seq_id": 72,
      "id": "q34_table_r2c1",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "رأس الصف: درجة الحرارة",
      "content": "درجة الحرارة",
      "coordinates": {
        "x_min": 625,
        "y_min": 1117,
        "x_max": 707,
        "y_max": 1147
      },
      "row": 2,
      "column": 1
    },
    {
      "seq_id": 73,
      "id": "q34_table_r1c2",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: السبت",
      "content": "السبت",
      "coordinates": {
        "x_min": 562,
        "y_min": 1087,
        "x_max": 625,
        "y_max": 1117
      },
      "row": 1,
      "column": 2
    },
    {
      "seq_id": 74,
      "id": "q34_table_r2c2",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة السبت",
      "content": "٣٨°",
      "coordinates": {
        "x_min": 562,
        "y_min": 1117,
        "x_max": 625,
        "y_max": 1147
      },
      "row": 2,
      "column": 2
    },
    {
      "seq_id": 75,
      "id": "q34_table_r1c3",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الأحد",
      "content": "الأحد",
      "coordinates": {
        "x_min": 501,
        "y_min": 1087,
        "x_max": 562,
        "y_max": 1117
      },
      "row": 1,
      "column": 3
    },
    {
      "seq_id": 76,
      "id": "q34_table_r2c3",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الأحد",
      "content": "٣٩°",
      "coordinates": {
        "x_min": 501,
        "y_min": 1117,
        "x_max": 562,
        "y_max": 1147
      },
      "row": 2,
      "column": 3
    },
    {
      "seq_id": 77,
      "id": "q34_table_r1c4",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الإثنين",
      "content": "الإثنين",
      "coordinates": {
        "x_min": 438,
        "y_min": 1087,
        "x_max": 501,
        "y_max": 1117
      },
      "row": 1,
      "column": 4
    },
    {
      "seq_id": 78,
      "id": "q34_table_r2c4",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الإثنين",
      "content": "٤١°",
      "coordinates": {
        "x_min": 438,
        "y_min": 1117,
        "x_max": 501,
        "y_max": 1147
      },
      "row": 2,
      "column": 4
    },
    {
      "seq_id": 79,
      "id": "q34_table_r1c5",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الثلاثاء",
      "content": "الثلاثاء",
      "coordinates": {
        "x_min": 371,
        "y_min": 1087,
        "x_max": 438,
        "y_max": 1117
      },
      "row": 1,
      "column": 5
    },
    {
      "seq_id": 80,
      "id": "q34_table_r2c5",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الثلاثاء",
      "content": "٤٣°",
      "coordinates": {
        "x_min": 371,
        "y_min": 1117,
        "x_max": 438,
        "y_max": 1147
      },
      "row": 2,
      "column": 5
    },
    {
      "seq_id": 81,
      "id": "q34_table_r1c6",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الأربعاء",
      "content": "الأربعاء",
      "coordinates": {
        "x_min": 302,
        "y_min": 1087,
        "x_max": 371,
        "y_max": 1117
      },
      "row": 1,
      "column": 6
    },
    {
      "seq_id": 82,
      "id": "q34_table_r2c6",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الأربعاء",
      "content": "٤٢°",
      "coordinates": {
        "x_min": 302,
        "y_min": 1117,
        "x_max": 371,
        "y_max": 1147
      },
      "row": 2,
      "column": 6
    },
    {
      "seq_id": 83,
      "id": "q34_table_r1c7",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الخميس",
      "content": "الخميس",
      "coordinates": {
        "x_min": 239,
        "y_min": 1087,
        "x_max": 302,
        "y_max": 1117
      },
      "row": 1,
      "column": 7
    },
    {
      "seq_id": 84,
      "id": "q34_table_r2c7",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الخميس",
      "content": "٣٧°",
      "coordinates": {
        "x_min": 239,
        "y_min": 1117,
        "x_max": 302,
        "y_max": 1147
      },
      "row": 2,
      "column": 7
    },
    {
      "seq_id": 85,
      "id": "q34_table_r1c8",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "اليوم: الجمعة",
      "content": "الجمعة",
      "coordinates": {
        "x_min": 184,
        "y_min": 1087,
        "x_max": 239,
        "y_max": 1117
      },
      "row": 1,
      "column": 8
    },
    {
      "seq_id": 86,
      "id": "q34_table_r2c8",
      "parent_id": "q34_table",
      "type": "table_cell",
      "label": "درجة حرارة الجمعة",
      "content": "٣٦°",
      "coordinates": {
        "x_min": 184,
        "y_min": 1117,
        "x_max": 239,
        "y_max": 1147
      },
      "row": 2,
      "column": 8
    },
    {
      "seq_id": 87,
      "id": "footer_logo",
      "parent_id": "page_001",
      "type": "footer_logo",
      "label": "شعار وزارة التعليم",
      "content": "وزارة التعليم",
      "coordinates": {
        "x_min": 24,
        "y_min": 1115,
        "x_max": 145,
        "y_max": 1198
      }
    },
    {
      "seq_id": 88,
      "id": "footer_copyright",
      "parent_id": "page_001",
      "type": "footer_text",
      "label": "حقوق الطبع",
      "content": "خاصية التوزيع",
      "coordinates": {
        "x_min": 65,
        "y_min": 1191,
        "x_max": 177,
        "y_max": 1215
      }
    },
    {
      "seq_id": 89,
      "id": "footer_lesson",
      "parent_id": "page_001",
      "type": "footer_text",
      "label": "بيان الدرس",
      "content": "الدرس ٣-٢ : خاصية التوزيع",
      "coordinates": {
        "x_min": 178,
        "y_min": 1191,
        "x_max": 386,
        "y_max": 1218
      }
    },
    {
      "seq_id": 90,
      "id": "footer_page_number",
      "parent_id": "page_001",
      "type": "page_number",
      "label": "رقم الصفحة",
      "content": "٨٥",
      "coordinates": {
        "x_min": 43,
        "y_min": 1187,
        "x_max": 70,
        "y_max": 1216
      }
    }
  ]
}
` 