export const eng_11 = `
{
  "document_metadata": {
    "image_width": 1110,
    "image_height": 1394,
    "coordinate_system": "origin_top_left",
    "coordinate_order": "left_to_right",
    "language": "en",
    "notes": "Coordinates are approximate bounding boxes in pixels. Reading order follows the main textbook page content."
  },
  "parts": [
    {
      "seq_id": 1,
      "id": "page_001",
      "parent_id": null,
      "type": "page",
      "label": "Main textbook page",
      "content": "",
      "coordinates": {
        "x_min": 197,
        "y_min": 0,
        "x_max": 1090,
        "y_max": 1394
      },
      "attributes": {
        "visible": true,
        "page_number_visible": "11"
      }
    },
    {
      "seq_id": 2,
      "id": "header_001",
      "parent_id": "page_001",
      "type": "section_header",
      "label": "Vocabulary",
      "content": "Vocabulary",
      "coordinates": {
        "x_min": 805,
        "y_min": 0,
        "x_max": 1110,
        "y_max": 101
      },
      "attributes": {
        "background_color": "green",
        "style": "top banner"
      }
    },
    {
      "seq_id": 3,
      "id": "mascot_001",
      "parent_id": "header_001",
      "type": "illustration",
      "label": "Sun mascot",
      "content": "smiling sun mascot",
      "coordinates": {
        "x_min": 745,
        "y_min": 35,
        "x_max": 844,
        "y_max": 128
      },
      "attributes": {
        "role": "decorative"
      }
    },
    {
      "seq_id": 4,
      "id": "activity_003",
      "parent_id": "page_001",
      "type": "activity",
      "label": "3",
      "content": "Read and complete.",
      "coordinates": {
        "x_min": 214,
        "y_min": 130,
        "x_max": 1027,
        "y_max": 838
      },
      "attributes": {
        "activity_number": "3"
      }
    },
    {
      "seq_id": 5,
      "id": "activity_003_number",
      "parent_id": "activity_003",
      "type": "number",
      "label": "3",
      "content": "3",
      "coordinates": {
        "x_min": 219,
        "y_min": 132,
        "x_max": 235,
        "y_max": 151
      },
      "attributes": {
        "color": "green"
      }
    },
    {
      "seq_id": 6,
      "id": "activity_003_instruction",
      "parent_id": "activity_003",
      "type": "instruction",
      "label": "Instruction",
      "content": "Read and complete.",
      "coordinates": {
        "x_min": 245,
        "y_min": 130,
        "x_max": 445,
        "y_max": 154
      },
      "attributes": {
        "font_weight": "bold"
      }
    },
    {
      "seq_id": 7,
      "id": "activity_003_poster",
      "parent_id": "activity_003",
      "type": "content_panel",
      "label": "Youth Center poster",
      "content": "",
      "coordinates": {
        "x_min": 221,
        "y_min": 176,
        "x_max": 1026,
        "y_max": 839
      },
      "attributes": {
        "background_colors": [
          "pink",
          "turquoise"
        ],
        "contains_text_panel": true
      }
    },
    {
      "seq_id": 8,
      "id": "activity_003_logo",
      "parent_id": "activity_003_poster",
      "type": "graphic_title",
      "label": "YOUTH CENTER",
      "content": "YOUTH CENTER",
      "coordinates": {
        "x_min": 224,
        "y_min": 177,
        "x_max": 430,
        "y_max": 358
      },
      "attributes": {
        "style": "sticker",
        "color": "blue"
      }
    },
    {
      "seq_id": 9,
      "id": "activity_003_text_panel",
      "parent_id": "activity_003_poster",
      "type": "reading_text",
      "label": "Youth Center passage",
      "content": "Join us in the <blank id="1" answer="enormous">enormous</blank> youth center for some <blank id="2" given_letter="a">a________</blank> activities! We have different events every day, and you can meet some <blank id="3" given_letter="f" x="10" y="20" width="30" height="15">f________</blank> people, too! The most <blank id="4" given_letter="p">p________</blank> activity is the horror movie night when we show <blank id="5" given_letter="f">f________</blank> movies! People also love the sports days. We usually hold competitions, so you can win a <blank id="6" given_letter="s">s________</blank> prize if you’re <blank id="7" given_letter="l">l________</blank>! On the first weekend of every month, we have a family day. This is when everyone brings their family, and the space is full of <blank id="8" given_letter="l">l________</blank> people! It can get <blank id="9" given_letter="n">n________</blank> when everyone is talking and laughing, and it’s <blank id="10" given_letter="i">i________</blank> to make sure the space is <blank id="11" given_letter="t">t________</blank> when they leave. But we have a <blank id="12" given_letter="w">w________</blank> time! On Tuesdays, you can join the book club. We always read something <blank id="13" given_letter="i">i________</blank>. But whatever day you come, you always leave with <blank id="14" given_letter="e">e________</blank> memories.",
      "coordinates": {
        "x_min": 263,
        "y_min": 210,
        "x_max": 991,
        "y_max": 799
      },
      "attributes": {
        "border_color": "purple",
        "background_color": "light lavender"
      }
    },
    {
      "seq_id": 10,
      "id": "p3_line_001",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 1",
      "content": "Join us in the 1 enormous youth center for some",
      "coordinates": {
        "x_min": 444,
        "y_min": 250,
        "x_max": 921,
        "y_max": 270
      }
    },
    {
      "seq_id": 11,
      "id": "blank_001",
      "parent_id": "p3_line_001",
      "type": "answer_blank",
      "label": "1",
      "content": "enormous",
      "coordinates": {
        "x_min": 575,
        "y_min": 250,
        "x_max": 736,
        "y_max": 270
      },
      "attributes": {
        "blank_number": "1",
        "answer_value": "enormous",
        "filled": true
      }
    },
    {
      "seq_id": 12,
      "id": "p3_line_002",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 2",
      "content": "2 a________ activities! We have different events",
      "coordinates": {
        "x_min": 444,
        "y_min": 280,
        "x_max": 934,
        "y_max": 300
      }
    },
    {
      "seq_id": 13,
      "id": "blank_002",
      "parent_id": "p3_line_002",
      "type": "answer_blank",
      "label": "2",
      "content": "a________",
      "coordinates": {
        "x_min": 458,
        "y_min": 279,
        "x_max": 607,
        "y_max": 299
      },
      "attributes": {
        "blank_number": "2",
        "given_letter": "a",
        "filled": false
      }
    },
    {
      "seq_id": 14,
      "id": "p3_line_003",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 3",
      "content": "every day, and you can meet some 3 f________",
      "coordinates": {
        "x_min": 444,
        "y_min": 310,
        "x_max": 955,
        "y_max": 330
      }
    },
    {
      "seq_id": 15,
      "id": "blank_003",
      "parent_id": "p3_line_003",
      "type": "answer_blank",
      "label": "3",
      "content": "f________",
      "coordinates": {
        "x_min": 722,
        "y_min": 310,
        "x_max": 956,
        "y_max": 330
      },
      "attributes": {
        "blank_number": "3",
        "given_letter": "f",
        "filled": false
      }
    },
    {
      "seq_id": 16,
      "id": "p3_line_004",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 4",
      "content": "people, too! The most 4 p________ activity is",
      "coordinates": {
        "x_min": 444,
        "y_min": 340,
        "x_max": 887,
        "y_max": 361
      }
    },
    {
      "seq_id": 17,
      "id": "blank_004",
      "parent_id": "p3_line_004",
      "type": "answer_blank",
      "label": "4",
      "content": "p________",
      "coordinates": {
        "x_min": 650,
        "y_min": 340,
        "x_max": 841,
        "y_max": 360
      },
      "attributes": {
        "blank_number": "4",
        "given_letter": "p",
        "filled": false
      }
    },
    {
      "seq_id": 18,
      "id": "p3_line_005",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 5",
      "content": "the horror movie night when we show 5 f________ movies!",
      "coordinates": {
        "x_min": 310,
        "y_min": 365,
        "x_max": 959,
        "y_max": 385
      }
    },
    {
      "seq_id": 19,
      "id": "blank_005",
      "parent_id": "p3_line_005",
      "type": "answer_blank",
      "label": "5",
      "content": "f________",
      "coordinates": {
        "x_min": 666,
        "y_min": 365,
        "x_max": 842,
        "y_max": 385
      },
      "attributes": {
        "blank_number": "5",
        "given_letter": "f",
        "filled": false
      }
    },
    {
      "seq_id": 20,
      "id": "p3_line_006",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 6",
      "content": "People also love the sports days. We usually hold competitions, so",
      "coordinates": {
        "x_min": 310,
        "y_min": 393,
        "x_max": 954,
        "y_max": 413
      }
    },
    {
      "seq_id": 21,
      "id": "p3_line_007",
      "parent_id": "activity_003_text_panel",
      "type": "text_line",
      "label": "Line 7",
      "content": "you can win a 6 s________ prize if you’re 7 l________!",
      "coordinates": {
        "x_min": 310,
        "y_min": 423,
        "x_max": 940,
        "y_max": 444
      }
    },
    {
      "seq_id": 22,
      "id": "blank_006",
      "parent_id": "p3_line_007",
      "type": "answer_blank",
      "label": "6",
      "content": "s________",
      "coordinates": {
        "x_min": 477,
        "y_min": 422,
        "x_max": 626,
        "y_max": 442
      },
      "attributes": {
        "blank_number": "6",
        "given_letter": "s",
        "filled": false
      }
    },
    {
      "seq_id": 23,
      "id": "blank_007",
      "parent_id": "p3_line_007",
      "type": "answer_blank",
      "label": "7",
      "content": "l________",
      "coordinates": {
        "x_min": 757,
        "y_min": 422,
        "x_max": 940,
        "y_max": 442
      },
      "attributes": {
        "blank_number": "7",
        "given_letter": "l",
        "filled": false
      }
    },
    {
      "seq_id": 24,
      "id": "p3_para_002",
      "parent_id": "activity_003_text_panel",
      "type": "paragraph",
      "label": "Paragraph 2",
      "content": "On the first weekend of every month, we have a family day. This is when everyone brings their family, and the space is full of 8 l________ people! It can get 9 n________ when everyone is talking and laughing, and it’s 10 i________ to make sure the space is 11 t________ when they leave. But we have a 12 w________ time!",
      "coordinates": {
        "x_min": 310,
        "y_min": 489,
        "x_max": 946,
        "y_max": 660
      }
    },
    {
      "seq_id": 25,
      "id": "blank_008",
      "parent_id": "p3_para_002",
      "type": "answer_blank",
      "label": "8",
      "content": "l________",
      "coordinates": {
        "x_min": 322,
        "y_min": 548,
        "x_max": 486,
        "y_max": 568
      },
      "attributes": {
        "blank_number": "8",
        "given_letter": "l",
        "filled": false
      }
    },
    {
      "seq_id": 26,
      "id": "blank_009",
      "parent_id": "p3_para_002",
      "type": "answer_blank",
      "label": "9",
      "content": "n________",
      "coordinates": {
        "x_min": 678,
        "y_min": 548,
        "x_max": 840,
        "y_max": 568
      },
      "attributes": {
        "blank_number": "9",
        "given_letter": "n",
        "filled": false
      }
    },
    {
      "seq_id": 27,
      "id": "blank_010",
      "parent_id": "p3_para_002",
      "type": "answer_blank",
      "label": "10",
      "content": "i________",
      "coordinates": {
        "x_min": 753,
        "y_min": 578,
        "x_max": 876,
        "y_max": 598
      },
      "attributes": {
        "blank_number": "10",
        "given_letter": "i",
        "filled": false
      }
    },
    {
      "seq_id": 28,
      "id": "blank_011",
      "parent_id": "p3_para_002",
      "type": "answer_blank",
      "label": "11",
      "content": "t________",
      "coordinates": {
        "x_min": 511,
        "y_min": 608,
        "x_max": 647,
        "y_max": 628
      },
      "attributes": {
        "blank_number": "11",
        "given_letter": "t",
        "filled": false
      }
    },
    {
      "seq_id": 29,
      "id": "blank_012",
      "parent_id": "p3_para_002",
      "type": "answer_blank",
      "label": "12",
      "content": "w________",
      "coordinates": {
        "x_min": 355,
        "y_min": 638,
        "x_max": 509,
        "y_max": 658
      },
      "attributes": {
        "blank_number": "12",
        "given_letter": "w",
        "filled": false
      }
    },
    {
      "seq_id": 30,
      "id": "p3_para_003",
      "parent_id": "activity_003_text_panel",
      "type": "paragraph",
      "label": "Paragraph 3",
      "content": "On Tuesdays, you can join the book club. We always read something 13 i________. But whatever day you come, you always leave with 14 e________ memories.",
      "coordinates": {
        "x_min": 310,
        "y_min": 698,
        "x_max": 936,
        "y_max": 777
      }
    },
    {
      "seq_id": 31,
      "id": "blank_013",
      "parent_id": "p3_para_003",
      "type": "answer_blank",
      "label": "13",
      "content": "i________",
      "coordinates": {
        "x_min": 490,
        "y_min": 728,
        "x_max": 655,
        "y_max": 748
      },
      "attributes": {
        "blank_number": "13",
        "given_letter": "i",
        "filled": false
      }
    },
    {
      "seq_id": 32,
      "id": "blank_014",
      "parent_id": "p3_para_003",
      "type": "answer_blank",
      "label": "14",
      "content": "e________",
      "coordinates": {
        "x_min": 513,
        "y_min": 758,
        "x_max": 674,
        "y_max": 778
      },
      "attributes": {
        "blank_number": "14",
        "given_letter": "e",
        "filled": false
      }
    },
    {
      "seq_id": 33,
      "id": "activity_004",
      "parent_id": "page_001",
      "type": "activity",
      "label": "4",
      "content": "Make a poster about your favorite interest.",
      "coordinates": {
        "x_min": 214,
        "y_min": 878,
        "x_max": 1058,
        "y_max": 1012
      },
      "attributes": {
        "activity_number": "4"
      }
    },
    {
      "seq_id": 34,
      "id": "activity_004_number",
      "parent_id": "activity_004",
      "type": "number",
      "label": "4",
      "content": "4",
      "coordinates": {
        "x_min": 214,
        "y_min": 878,
        "x_max": 232,
        "y_max": 898
      }
    },
    {
      "seq_id": 35,
      "id": "activity_004_instruction",
      "parent_id": "activity_004",
      "type": "instruction",
      "label": "Instruction",
      "content": "Make a poster about your favorite interest.",
      "coordinates": {
        "x_min": 245,
        "y_min": 878,
        "x_max": 650,
        "y_max": 902
      }
    },
    {
      "seq_id": 36,
      "id": "activity_004_bullet_001",
      "parent_id": "activity_004",
      "type": "bullet_item",
      "label": "Bullet 1",
      "content": "Draw your favorite interest.",
      "coordinates": {
        "x_min": 243,
        "y_min": 927,
        "x_max": 475,
        "y_max": 945
      }
    },
    {
      "seq_id": 37,
      "id": "activity_004_bullet_002",
      "parent_id": "activity_004",
      "type": "bullet_item",
      "label": "Bullet 2",
      "content": "Talk about why you like it.",
      "coordinates": {
        "x_min": 243,
        "y_min": 960,
        "x_max": 502,
        "y_max": 978
      }
    },
    {
      "seq_id": 38,
      "id": "activity_004_bullet_003",
      "parent_id": "activity_004",
      "type": "bullet_item",
      "label": "Bullet 3",
      "content": "Use full sentences and new words.",
      "coordinates": {
        "x_min": 243,
        "y_min": 993,
        "x_max": 592,
        "y_max": 1011
      }
    },
    {
      "seq_id": 39,
      "id": "activity_004_speech_bubble",
      "parent_id": "activity_004",
      "type": "speech_bubble",
      "label": "Example speech",
      "content": "My favorite interest is playing the guitar! You can meet friendly people and make amazing music!",
      "coordinates": {
        "x_min": 672,
        "y_min": 904,
        "x_max": 938,
        "y_max": 1007
      },
      "attributes": {
        "speaker": "boy illustration",
        "highlighted_words": [
          "friendly",
          "amazing"
        ]
      }
    },
    {
      "seq_id": 40,
      "id": "activity_004_boy_image",
      "parent_id": "activity_004",
      "type": "photo_illustration",
      "label": "Boy thinking",
      "content": "boy looking upward beside speech bubble",
      "coordinates": {
        "x_min": 929,
        "y_min": 898,
        "x_max": 1053,
        "y_max": 1039
      },
      "attributes": {
        "role": "illustrative"
      }
    },
    {
      "seq_id": 41,
      "id": "activity_005",
      "parent_id": "page_001",
      "type": "activity",
      "label": "5",
      "content": "Discuss the questions with your partner.",
      "coordinates": {
        "x_min": 214,
        "y_min": 1039,
        "x_max": 1058,
        "y_max": 1307
      },
      "attributes": {
        "activity_number": "5"
      }
    },
    {
      "seq_id": 42,
      "id": "activity_005_number",
      "parent_id": "activity_005",
      "type": "number",
      "label": "5",
      "content": "5",
      "coordinates": {
        "x_min": 214,
        "y_min": 1039,
        "x_max": 232,
        "y_max": 1059
      }
    },
    {
      "seq_id": 43,
      "id": "activity_005_instruction",
      "parent_id": "activity_005",
      "type": "instruction",
      "label": "Instruction",
      "content": "Discuss the questions with your partner.",
      "coordinates": {
        "x_min": 245,
        "y_min": 1040,
        "x_max": 660,
        "y_max": 1064
      }
    },
    {
      "seq_id": 44,
      "id": "activity_005_question_001",
      "parent_id": "activity_005",
      "type": "question",
      "label": "1",
      "content": "What activities can you do in your neighborhood? Talk about them.",
      "coordinates": {
        "x_min": 244,
        "y_min": 1088,
        "x_max": 696,
        "y_max": 1138
      },
      "attributes": {
        "question_number": "1"
      }
    },
    {
      "seq_id": 45,
      "id": "activity_005_question_002",
      "parent_id": "activity_005",
      "type": "question",
      "label": "2",
      "content": "How are your interests similar or different from your partner’s interests?",
      "coordinates": {
        "x_min": 244,
        "y_min": 1157,
        "x_max": 715,
        "y_max": 1210
      },
      "attributes": {
        "question_number": "2"
      }
    },
    {
      "seq_id": 46,
      "id": "activity_005_question_003",
      "parent_id": "activity_005",
      "type": "question",
      "label": "3",
      "content": "Do your friends have any interests you would like to try?",
      "coordinates": {
        "x_min": 244,
        "y_min": 1227,
        "x_max": 708,
        "y_max": 1278
      },
      "attributes": {
        "question_number": "3"
      }
    },
    {
      "seq_id": 47,
      "id": "activity_005_photo",
      "parent_id": "activity_005",
      "type": "photo",
      "label": "Children talking with soccer ball",
      "content": "two children sitting on steps with backpacks and a soccer ball",
      "coordinates": {
        "x_min": 729,
        "y_min": 1029,
        "x_max": 1059,
        "y_max": 1307
      },
      "attributes": {
        "role": "illustrative"
      }
    },
    {
      "seq_id": 48,
      "id": "footer_page_number",
      "parent_id": "page_001",
      "type": "page_number",
      "label": "11",
      "content": "11",
      "coordinates": {
        "x_min": 922,
        "y_min": 1323,
        "x_max": 990,
        "y_max": 1362
      },
      "attributes": {
        "style": "green rounded tab"
      }
    },
    {
      "seq_id": 49,
      "id": "footer_unit_marker",
      "parent_id": "page_001",
      "type": "unit_marker",
      "label": "1",
      "content": "1",
      "coordinates": {
        "x_min": 979,
        "y_min": 1277,
        "x_max": 1110,
        "y_max": 1394
      },
      "attributes": {
        "style": "purple circle",
        "partially_cropped": true
      }
    },
    {
      "seq_id": 50,
      "id": "adjacent_page_partial",
      "parent_id": null,
      "type": "partial_adjacent_page",
      "label": "Cropped adjacent page on left",
      "content": "Partially visible neighboring page/background with cropped photos and Ministry of Education mark.",
      "coordinates": {
        "x_min": 0,
        "y_min": 24,
        "x_max": 166,
        "y_max": 1394
      },
      "attributes": {
        "partially_visible": true,
        "not_primary_page": true
      }
    }
  ]
}
`