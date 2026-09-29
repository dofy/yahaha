# Emoticon Kit 字符清单

源码：[src/lib/Emoticon.ts](../src/lib/Emoticon.ts)。核对日期：2026-09-29。当前清单包含本轮字符池扩展；扩展前基线提交为 `f0b8ecd`。码位与正式名称由 Python Unicode 数据库提取；特殊文字和组合字符同时核对 Unicode 官方码表。

本清单是生成器字符池的维护参考，不是运行时数据源。修改字符池时需同步本清单。文档入口见 [docs 索引](README.md)。

共 268 个候选条目，184 个不同候选字符串，177 个不同 Unicode 码位（含空格）。所有码位均位于 BMP；候选元素可能是多个码位组成的字符串。

拼装顺序：左臂 + 左脸框 + 左眼 + 嘴巴 + 右眼 + 右脸框 + 装饰 + 右臂。左右眼共享索引，左右脸框共享索引；其他部件独立抽取。

| 部件       | 字段    | 条目数 | 出现概率 |
| ---------- | ------- | -----: | -------: |
| 左眼       | `lEye`  |     49 |     100% |
| 右眼       | `rEye`  |     49 |     100% |
| 左脸框     | `lFace` |      8 |      70% |
| 右脸框     | `rFace` |      8 |      70% |
| 嘴巴       | `mouse` |     58 |      60% |
| 左手／左臂 | `lArm`  |     33 |      50% |
| 右手／右臂 | `rArm`  |     42 |      50% |
| 表情装饰   | `plus`  |     21 |      30% |

## 2026-09-29 扩展

按外形和拼装位置补充 56 个候选条目：12 对眼睛、3 对脸框、10 种嘴巴、左右各 4 种手臂和 8 种装饰。保留旧条目的顺序与重复次数，部件出现概率不变；新增候选会改变各符号在池内的抽中概率。

- 眼睛：圆点与几何图形、叉号、平眼，以及形似眼睛的文字；例如 `◕`、`✖`、`ಠ`、`ಥ`、`눈`。
- 脸框：全角圆括号、黑方头括号与龟甲括号；例如 `（` / `）`、`【` / `】`、`〔` / `〕`。
- 嘴巴：按弧线、动物嘴形及汉字轮廓选取；例如 `ᴥ`、`益`、`ヮ`、`‿`。
- 手臂与装饰：弯曲手臂、指向手势、星形、音符、爱心和重复标点；例如 `ᕦ`、`ᕤ`、`୧`、`୨`、`✦`、`♪`、`♡`。

可拼出的例子：`(ಠ益ಠ)`、`୧(ᵔヮᵔ)୨`、`ᕦ(≖‿≖)ᕤ`、`(◕ᴥ◕)♡`、`〔눈_눈〕zz`。它们是可组合的示例，不是新增的固定模板。

此轮新增字符不含控制字符、私用区字符或变体选择符。不同系统的后备字体会改变字形；网页生成、复制和手机排版需要结合实际浏览器检查。

## 逐个候选元素

### 左眼（lEye）

| 序号 | 元素 | Unicode 码位    | Unicode 名称                                       |
| ---: | ---- | --------------- | -------------------------------------------------- |
|    1 | `￣` | U+FFE3          | FULLWIDTH MACRON                                   |
|    2 | `—`  | U+2014          | EM DASH                                            |
|    3 | `＿` | U+FF3F          | FULLWIDTH LOW LINE                                 |
|    4 | `﹁` | U+FE41          | PRESENTATION FORM FOR VERTICAL LEFT CORNER BRACKET |
|    5 | `^`  | U+005E          | CIRCUMFLEX ACCENT                                  |
|    6 | `~`  | U+007E          | TILDE                                              |
|    7 | `=`  | U+003D          | EQUALS SIGN                                        |
|    8 | `@`  | U+0040          | COMMERCIAL AT                                      |
|    9 | `·`  | U+00B7          | MIDDLE DOT                                         |
|   10 | `‵`  | U+2035          | REVERSED PRIME                                     |
|   11 | `>`  | U+003E          | GREATER-THAN SIGN                                  |
|   12 | `→`  | U+2192          | RIGHTWARDS ARROW                                   |
|   13 | `〒` | U+3012          | POSTAL MARK                                        |
|   14 | `┬`  | U+252C          | BOX DRAWINGS LIGHT DOWN AND HORIZONTAL             |
|   15 | `T`  | U+0054          | LATIN CAPITAL LETTER T                             |
|   16 | `゜` | U+309C          | KATAKANA-HIRAGANA SEMI-VOICED SOUND MARK           |
|   17 | `。` | U+3002          | IDEOGRAPHIC FULL STOP                              |
|   18 | `●`  | U+25CF          | BLACK CIRCLE                                       |
|   19 | `◎`  | U+25CE          | BULLSEYE                                           |
|   20 | `⊙`  | U+2299          | CIRCLED DOT OPERATOR                               |
|   21 | `○`  | U+25CB          | WHITE CIRCLE                                       |
|   22 | `╯`  | U+256F          | BOX DRAWINGS LIGHT ARC UP AND LEFT                 |
|   23 | `︶` | U+FE36          | PRESENTATION FORM FOR VERTICAL RIGHT PARENTHESIS   |
|   24 | `〃` | U+3003          | DITTO MARK                                         |
|   25 | `Φ`  | U+03A6          | GREEK CAPITAL LETTER PHI                           |
|   26 | `Θ`  | U+0398          | GREEK CAPITAL LETTER THETA                         |
|   27 | `+`  | U+002B          | PLUS SIGN                                          |
|   28 | `x`  | U+0078          | LATIN SMALL LETTER X                               |
|   29 | `$`  | U+0024          | DOLLAR SIGN                                        |
|   30 | `≧`  | U+2267          | GREATER-THAN OVER EQUAL TO                         |
|   31 | `ｕ` | U+FF55          | FULLWIDTH LATIN SMALL LETTER U                     |
|   32 | `Ｕ` | U+FF35          | FULLWIDTH LATIN CAPITAL LETTER U                   |
|   33 | `→`  | U+2192          | RIGHTWARDS ARROW                                   |
|   34 | `←`  | U+2190          | LEFTWARDS ARROW                                    |
|   35 | `•̀`  | U+2022 + U+0300 | BULLET + COMBINING GRAVE ACCENT                    |
|   36 | `꒪` | U+A4AA          | YI RADICAL JJUT                                    |
|   37 | `´`  | U+00B4          | ACUTE ACCENT                                       |
|   38 | `•`  | U+2022          | BULLET                                             |
|   39 | `◕`  | U+25D5          | CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK      |
|   40 | `◔`  | U+25D4          | CIRCLE WITH UPPER RIGHT QUADRANT BLACK             |
|   41 | `◉`  | U+25C9          | FISHEYE                                            |
|   42 | `✖`  | U+2716          | HEAVY MULTIPLICATION X                             |
|   43 | `¬`  | U+00AC          | NOT SIGN                                           |
|   44 | `눈` | U+B208          | HANGUL SYLLABLE NUN                                |
|   45 | `ಠ`  | U+0CA0          | KANNADA LETTER TTHA                                |
|   46 | `ಥ`  | U+0CA5          | KANNADA LETTER THA                                 |
|   47 | `◡`  | U+25E1          | LOWER HALF CIRCLE                                  |
|   48 | `ᵔ`  | U+1D54          | MODIFIER LETTER SMALL TOP HALF O                   |
|   49 | `≖`  | U+2256          | RING IN EQUAL TO                                   |

### 右眼（rEye）

| 序号 | 元素    | Unicode 码位    | Unicode 名称                                       |
| ---: | ------- | --------------- | -------------------------------------------------- |
|    1 | `￣`    | U+FFE3          | FULLWIDTH MACRON                                   |
|    2 | `—`     | U+2014          | EM DASH                                            |
|    3 | `＿`    | U+FF3F          | FULLWIDTH LOW LINE                                 |
|    4 | `﹁`    | U+FE41          | PRESENTATION FORM FOR VERTICAL LEFT CORNER BRACKET |
|    5 | `^`     | U+005E          | CIRCUMFLEX ACCENT                                  |
|    6 | `~`     | U+007E          | TILDE                                              |
|    7 | `=`     | U+003D          | EQUALS SIGN                                        |
|    8 | `@`     | U+0040          | COMMERCIAL AT                                      |
|    9 | `·`     | U+00B7          | MIDDLE DOT                                         |
|   10 | `′`     | U+2032          | PRIME                                              |
|   11 | `<`     | U+003C          | LESS-THAN SIGN                                     |
|   12 | `←`     | U+2190          | LEFTWARDS ARROW                                    |
|   13 | `〒`    | U+3012          | POSTAL MARK                                        |
|   14 | `┬`     | U+252C          | BOX DRAWINGS LIGHT DOWN AND HORIZONTAL             |
|   15 | `T`     | U+0054          | LATIN CAPITAL LETTER T                             |
|   16 | `゜`    | U+309C          | KATAKANA-HIRAGANA SEMI-VOICED SOUND MARK           |
|   17 | `。`    | U+3002          | IDEOGRAPHIC FULL STOP                              |
|   18 | `●`     | U+25CF          | BLACK CIRCLE                                       |
|   19 | `◎`     | U+25CE          | BULLSEYE                                           |
|   20 | `⊙`     | U+2299          | CIRCLED DOT OPERATOR                               |
|   21 | `○`     | U+25CB          | WHITE CIRCLE                                       |
|   22 | `╰`     | U+2570          | BOX DRAWINGS LIGHT ARC UP AND RIGHT                |
|   23 | `︶`    | U+FE36          | PRESENTATION FORM FOR VERTICAL RIGHT PARENTHESIS   |
|   24 | `〃`    | U+3003          | DITTO MARK                                         |
|   25 | `Φ`     | U+03A6          | GREEK CAPITAL LETTER PHI                           |
|   26 | `Θ`     | U+0398          | GREEK CAPITAL LETTER THETA                         |
|   27 | `+`     | U+002B          | PLUS SIGN                                          |
|   28 | `x`     | U+0078          | LATIN SMALL LETTER X                               |
|   29 | `$`     | U+0024          | DOLLAR SIGN                                        |
|   30 | `≦`     | U+2266          | LESS-THAN OVER EQUAL TO                            |
|   31 | `ｕ`    | U+FF55          | FULLWIDTH LATIN SMALL LETTER U                     |
|   32 | `Ｕ`    | U+FF35          | FULLWIDTH LATIN CAPITAL LETTER U                   |
|   33 | `→`     | U+2192          | RIGHTWARDS ARROW                                   |
|   34 | `←`     | U+2190          | LEFTWARDS ARROW                                    |
|   35 | `•́`     | U+2022 + U+0301 | BULLET + COMBINING ACUTE ACCENT                    |
|   36 | `꒪`    | U+A4AA          | YI RADICAL JJUT                                    |
|   37 | `` ` `` | U+0060          | GRAVE ACCENT                                       |
|   38 | `•`     | U+2022          | BULLET                                             |
|   39 | `◕`     | U+25D5          | CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK      |
|   40 | `◔`     | U+25D4          | CIRCLE WITH UPPER RIGHT QUADRANT BLACK             |
|   41 | `◉`     | U+25C9          | FISHEYE                                            |
|   42 | `✖`     | U+2716          | HEAVY MULTIPLICATION X                             |
|   43 | `¬`     | U+00AC          | NOT SIGN                                           |
|   44 | `눈`    | U+B208          | HANGUL SYLLABLE NUN                                |
|   45 | `ಠ`     | U+0CA0          | KANNADA LETTER TTHA                                |
|   46 | `ಥ`     | U+0CA5          | KANNADA LETTER THA                                 |
|   47 | `◡`     | U+25E1          | LOWER HALF CIRCLE                                  |
|   48 | `ᵔ`     | U+1D54          | MODIFIER LETTER SMALL TOP HALF O                   |
|   49 | `≖`     | U+2256          | RING IN EQUAL TO                                   |

### 左脸框（lFace）

| 序号 | 元素 | Unicode 码位                      | Unicode 名称                                                                                                |
| ---: | ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
|    1 | `(`  | U+0028                            | LEFT PARENTHESIS                                                                                            |
|    2 | `[`  | U+005B                            | LEFT SQUARE BRACKET                                                                                         |
|    3 | `{`  | U+007B                            | LEFT CURLY BRACKET                                                                                          |
|    4 | `\|` | U+007C                            | VERTICAL LINE                                                                                               |
|    5 | `(̵̵́`  | U+0028 + U+0335 + U+0301 + U+0335 | LEFT PARENTHESIS + COMBINING SHORT STROKE OVERLAY + COMBINING ACUTE ACCENT + COMBINING SHORT STROKE OVERLAY |
|    6 | `（` | U+FF08                            | FULLWIDTH LEFT PARENTHESIS                                                                                  |
|    7 | `【` | U+3010                            | LEFT BLACK LENTICULAR BRACKET                                                                               |
|    8 | `〔` | U+3014                            | LEFT TORTOISE SHELL BRACKET                                                                                 |

### 右脸框（rFace）

| 序号 | 元素 | Unicode 码位                      | Unicode 名称                                                                                                 |
| ---: | ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
|    1 | `)`  | U+0029                            | RIGHT PARENTHESIS                                                                                            |
|    2 | `]`  | U+005D                            | RIGHT SQUARE BRACKET                                                                                         |
|    3 | `}`  | U+007D                            | RIGHT CURLY BRACKET                                                                                          |
|    4 | `\|` | U+007C                            | VERTICAL LINE                                                                                                |
|    5 | `)̵̵̀`  | U+0029 + U+0335 + U+0300 + U+0335 | RIGHT PARENTHESIS + COMBINING SHORT STROKE OVERLAY + COMBINING GRAVE ACCENT + COMBINING SHORT STROKE OVERLAY |
|    6 | `）` | U+FF09                            | FULLWIDTH RIGHT PARENTHESIS                                                                                  |
|    7 | `】` | U+3011                            | RIGHT BLACK LENTICULAR BRACKET                                                                               |
|    8 | `〕` | U+3015                            | RIGHT TORTOISE SHELL BRACKET                                                                                 |

### 嘴巴（mouse）

| 序号 | 元素          | Unicode 码位                      | Unicode 名称                                                       |
| ---: | ------------- | --------------------------------- | ------------------------------------------------------------------ |
|    1 | 空格（SPACE） | U+0020                            | SPACE                                                              |
|    2 | `C`           | U+0043                            | LATIN CAPITAL LETTER C                                             |
|    3 | `c`           | U+0063                            | LATIN SMALL LETTER C                                               |
|    4 | `t`           | U+0074                            | LATIN SMALL LETTER T                                               |
|    5 | `(○○)`        | U+0028 + U+25CB + U+25CB + U+0029 | LEFT PARENTHESIS + WHITE CIRCLE + WHITE CIRCLE + RIGHT PARENTHESIS |
|    6 | `(工)`        | U+0028 + U+5DE5 + U+0029          | LEFT PARENTHESIS + CJK UNIFIED IDEOGRAPH-5DE5 + RIGHT PARENTHESIS  |
|    7 | `-`           | U+002D                            | HYPHEN-MINUS                                                       |
|    8 | `ゝ`          | U+309D                            | HIRAGANA ITERATION MARK                                            |
|    9 | `(··)`        | U+0028 + U+00B7 + U+00B7 + U+0029 | LEFT PARENTHESIS + MIDDLE DOT + MIDDLE DOT + RIGHT PARENTHESIS     |
|   10 | `—`           | U+2014                            | EM DASH                                                            |
|   11 | `-`           | U+002D                            | HYPHEN-MINUS                                                       |
|   12 | `_`           | U+005F                            | LOW LINE                                                           |
|   13 | `。`          | U+3002                            | IDEOGRAPHIC FULL STOP                                              |
|   14 | `，`          | U+FF0C                            | FULLWIDTH COMMA                                                    |
|   15 | `.`           | U+002E                            | FULL STOP                                                          |
|   16 | `o`           | U+006F                            | LATIN SMALL LETTER O                                               |
|   17 | `O`           | U+004F                            | LATIN CAPITAL LETTER O                                             |
|   18 | `3`           | U+0033                            | DIGIT THREE                                                        |
|   19 | `ε`           | U+03B5                            | GREEK SMALL LETTER EPSILON                                         |
|   20 | `ｪ`           | U+FF6A                            | HALFWIDTH KATAKANA LETTER SMALL E                                  |
|   21 | `v`           | U+0076                            | LATIN SMALL LETTER V                                               |
|   22 | `u`           | U+0075                            | LATIN SMALL LETTER U                                               |
|   23 | `_`           | U+005F                            | LOW LINE                                                           |
|   24 | `ω`           | U+03C9                            | GREEK SMALL LETTER OMEGA                                           |
|   25 | `Д`           | U+0414                            | CYRILLIC CAPITAL LETTER DE                                         |
|   26 | `﹏`          | U+FE4F                            | WAVY LOW LINE                                                      |
|   27 | `ヘ`          | U+30D8                            | KATAKANA LETTER HE                                                 |
|   28 | `︶`          | U+FE36                            | PRESENTATION FORM FOR VERTICAL RIGHT PARENTHESIS                   |
|   29 | `︿`          | U+FE3F                            | PRESENTATION FORM FOR VERTICAL LEFT ANGLE BRACKET                  |
|   30 | `▽`           | U+25BD                            | WHITE DOWN-POINTING TRIANGLE                                       |
|   31 | `△`           | U+25B3                            | WHITE UP-POINTING TRIANGLE                                         |
|   32 | `∀`           | U+2200                            | FOR ALL                                                            |
|   33 | `<>`          | U+003C + U+003E                   | LESS-THAN SIGN + GREATER-THAN SIGN                                 |
|   34 | `○`           | U+25CB                            | WHITE CIRCLE                                                       |
|   35 | `ロ`          | U+30ED                            | KATAKANA LETTER RO                                                 |
|   36 | `□`           | U+25A1                            | WHITE SQUARE                                                       |
|   37 | `Ｑ`          | U+FF31                            | FULLWIDTH LATIN CAPITAL LETTER Q                                   |
|   38 | `＠`          | U+FF20                            | FULLWIDTH COMMERCIAL AT                                            |
|   39 | `皿`          | U+76BF                            | CJK UNIFIED IDEOGRAPH-76BF                                         |
|   40 | `◇`           | U+25C7                            | WHITE DIAMOND                                                      |
|   41 | `︹`          | U+FE39                            | PRESENTATION FORM FOR VERTICAL LEFT TORTOISE SHELL BRACKET         |
|   42 | `＾`          | U+FF3E                            | FULLWIDTH CIRCUMFLEX ACCENT                                        |
|   43 | `﹌`          | U+FE4C                            | DOUBLE WAVY OVERLINE                                               |
|   44 | `c`           | U+0063                            | LATIN SMALL LETTER C                                               |
|   45 | `ｰ`           | U+FF70                            | HALFWIDTH KATAKANA-HIRAGANA PROLONGED SOUND MARK                   |
|   46 | `⌓`           | U+2313                            | SEGMENT                                                            |
|   47 | `.̫`           | U+002E + U+032B                   | FULL STOP + COMBINING INVERTED DOUBLE ARCH BELOW                   |
|   48 | `▿`           | U+25BF                            | WHITE DOWN-POINTING SMALL TRIANGLE                                 |
|   49 | `ᴥ`           | U+1D25                            | LATIN LETTER AIN                                                   |
|   50 | `益`          | U+76CA                            | CJK UNIFIED IDEOGRAPH-76CA                                         |
|   51 | `人`          | U+4EBA                            | CJK UNIFIED IDEOGRAPH-4EBA                                         |
|   52 | `ヮ`          | U+30EE                            | KATAKANA LETTER SMALL WA                                           |
|   53 | `口`          | U+53E3                            | CJK UNIFIED IDEOGRAPH-53E3                                         |
|   54 | `ᗜ`           | U+15DC                            | CANADIAN SYLLABICS CARRIER THU                                     |
|   55 | `⌣`           | U+2323                            | SMILE                                                              |
|   56 | `⌒`           | U+2312                            | ARC                                                                |
|   57 | `‿`           | U+203F                            | UNDERTIE                                                           |
|   58 | `∇`           | U+2207                            | NABLA                                                              |

### 左手／左臂（lArm）

| 序号 | 元素  | Unicode 码位             | Unicode 名称                                                                                |
| ---: | ----- | ------------------------ | ------------------------------------------------------------------------------------------- |
|    1 | `╭∩╮` | U+256D + U+2229 + U+256E | BOX DRAWINGS LIGHT ARC DOWN AND RIGHT + INTERSECTION + BOX DRAWINGS LIGHT ARC DOWN AND LEFT |
|    2 | `n`   | U+006E                   | LATIN SMALL LETTER N                                                                        |
|    3 | `m`   | U+006D                   | LATIN SMALL LETTER M                                                                        |
|    4 | `v`   | U+0076                   | LATIN SMALL LETTER V                                                                        |
|    5 | `y`   | U+0079                   | LATIN SMALL LETTER Y                                                                        |
|    6 | `w`   | U+0077                   | LATIN SMALL LETTER W                                                                        |
|    7 | `<`   | U+003C                   | LESS-THAN SIGN                                                                              |
|    8 | `o`   | U+006F                   | LATIN SMALL LETTER O                                                                        |
|    9 | `O`   | U+004F                   | LATIN CAPITAL LETTER O                                                                      |
|   10 | `○`   | U+25CB                   | WHITE CIRCLE                                                                                |
|   11 | `~`   | U+007E                   | TILDE                                                                                       |
|   12 | `凸`  | U+51F8                   | CJK UNIFIED IDEOGRAPH-51F8                                                                  |
|   13 | `ψ`   | U+03C8                   | GREEK SMALL LETTER PSI                                                                      |
|   14 | `=`   | U+003D                   | EQUALS SIGN                                                                                 |
|   15 | `—`   | U+2014                   | EM DASH                                                                                     |
|   16 | `～`  | U+FF5E                   | FULLWIDTH TILDE                                                                             |
|   17 | `︿`  | U+FE3F                   | PRESENTATION FORM FOR VERTICAL LEFT ANGLE BRACKET                                           |
|   18 | `b`   | U+0062                   | LATIN SMALL LETTER B                                                                        |
|   19 | `ㄟ`  | U+311F                   | BOPOMOFO LETTER EI                                                                          |
|   20 | `╰`   | U+2570                   | BOX DRAWINGS LIGHT ARC UP AND RIGHT                                                         |
|   21 | `╭`   | U+256D                   | BOX DRAWINGS LIGHT ARC DOWN AND RIGHT                                                       |
|   22 | `\`   | U+005C                   | REVERSE SOLIDUS                                                                             |
|   23 | `┌`   | U+250C                   | BOX DRAWINGS LIGHT DOWN AND RIGHT                                                           |
|   24 | `┗`   | U+2517                   | BOX DRAWINGS HEAVY UP AND RIGHT                                                             |
|   25 | `┑`   | U+2511                   | BOX DRAWINGS DOWN LIGHT AND LEFT HEAVY                                                      |
|   26 | `┍`   | U+250D                   | BOX DRAWINGS DOWN LIGHT AND RIGHT HEAVY                                                     |
|   27 | `ง`   | U+0E07                   | THAI CHARACTER NGO NGU                                                                      |
|   28 | `ヽ`  | U+30FD                   | KATAKANA ITERATION MARK                                                                     |
|   29 | `ᕙ`   | U+1559                   | CANADIAN SYLLABICS FA                                                                       |
|   30 | `ᕦ`   | U+1566                   | CANADIAN SYLLABICS THA                                                                      |
|   31 | `୧`   | U+0B67                   | ORIYA DIGIT ONE                                                                             |
|   32 | `☜`   | U+261C                   | WHITE LEFT POINTING INDEX                                                                   |
|   33 | `┏`   | U+250F                   | BOX DRAWINGS HEAVY DOWN AND RIGHT                                                           |

### 右手／右臂（rArm）

| 序号 | 元素  | Unicode 码位             | Unicode 名称                                                                                |
| ---: | ----- | ------------------------ | ------------------------------------------------------------------------------------------- |
|    1 | `╭∩╮` | U+256D + U+2229 + U+256E | BOX DRAWINGS LIGHT ARC DOWN AND RIGHT + INTERSECTION + BOX DRAWINGS LIGHT ARC DOWN AND LEFT |
|    2 | `n`   | U+006E                   | LATIN SMALL LETTER N                                                                        |
|    3 | `m`   | U+006D                   | LATIN SMALL LETTER M                                                                        |
|    4 | `v`   | U+0076                   | LATIN SMALL LETTER V                                                                        |
|    5 | `y`   | U+0079                   | LATIN SMALL LETTER Y                                                                        |
|    6 | `w`   | U+0077                   | LATIN SMALL LETTER W                                                                        |
|    7 | `>`   | U+003E                   | GREATER-THAN SIGN                                                                           |
|    8 | `o`   | U+006F                   | LATIN SMALL LETTER O                                                                        |
|    9 | `O`   | U+004F                   | LATIN CAPITAL LETTER O                                                                      |
|   10 | `○`   | U+25CB                   | WHITE CIRCLE                                                                                |
|   11 | `~`   | U+007E                   | TILDE                                                                                       |
|   12 | `凸`  | U+51F8                   | CJK UNIFIED IDEOGRAPH-51F8                                                                  |
|   13 | `ψ`   | U+03C8                   | GREEK SMALL LETTER PSI                                                                      |
|   14 | `=`   | U+003D                   | EQUALS SIGN                                                                                 |
|   15 | `—`   | U+2014                   | EM DASH                                                                                     |
|   16 | `～`  | U+FF5E                   | FULLWIDTH TILDE                                                                             |
|   17 | `︿`  | U+FE3F                   | PRESENTATION FORM FOR VERTICAL LEFT ANGLE BRACKET                                           |
|   18 | `d`   | U+0064                   | LATIN SMALL LETTER D                                                                        |
|   19 | `ㄏ`  | U+310F                   | BOPOMOFO LETTER H                                                                           |
|   20 | `╮`   | U+256E                   | BOX DRAWINGS LIGHT ARC DOWN AND LEFT                                                        |
|   21 | `╯`   | U+256F                   | BOX DRAWINGS LIGHT ARC UP AND LEFT                                                          |
|   22 | `/`   | U+002F                   | SOLIDUS                                                                                     |
|   23 | `┘`   | U+2518                   | BOX DRAWINGS LIGHT UP AND LEFT                                                              |
|   24 | `┛`   | U+251B                   | BOX DRAWINGS HEAVY UP AND LEFT                                                              |
|   25 | `┍`   | U+250D                   | BOX DRAWINGS DOWN LIGHT AND RIGHT HEAVY                                                     |
|   26 | `┑`   | U+2511                   | BOX DRAWINGS DOWN LIGHT AND LEFT HEAVY                                                      |
|   27 | `☞`   | U+261E                   | WHITE RIGHT POINTING INDEX                                                                  |
|   28 | `つ`  | U+3064                   | HIRAGANA LETTER TU                                                                          |
|   29 | `σ`   | U+03C3                   | GREEK SMALL LETTER SIGMA                                                                    |
|   30 | `ゞ`  | U+309E                   | HIRAGANA VOICED ITERATION MARK                                                              |
|   31 | `ﾉ`   | U+FF89                   | HALFWIDTH KATAKANA LETTER NO                                                                |
|   32 | `っ`  | U+3063                   | HIRAGANA LETTER SMALL TU                                                                    |
|   33 | `づ`  | U+3065                   | HIRAGANA LETTER DU                                                                          |
|   34 | `彡`  | U+5F61                   | CJK UNIFIED IDEOGRAPH-5F61                                                                  |
|   35 | `↘`   | U+2198                   | SOUTH EAST ARROW                                                                            |
|   36 | `↗`   | U+2197                   | NORTH EAST ARROW                                                                            |
|   37 | `ง`   | U+0E07                   | THAI CHARACTER NGO NGU                                                                      |
|   38 | `ᕗ`   | U+1557                   | CANADIAN SYLLABICS FO                                                                       |
|   39 | `ᕤ`   | U+1564                   | CANADIAN SYLLABICS THO                                                                      |
|   40 | `୨`   | U+0B68                   | ORIYA DIGIT TWO                                                                             |
|   41 | `☝`  | U+261D                   | WHITE UP POINTING INDEX                                                                     |
|   42 | `┓`   | U+2513                   | BOX DRAWINGS HEAVY DOWN AND LEFT                                                            |

### 表情装饰（plus）

| 序号 | 元素   | Unicode 码位    | Unicode 名称                                |
| ---: | ------ | --------------- | ------------------------------------------- |
|    1 | `''`   | U+0027 + U+0027 | APOSTROPHE + APOSTROPHE                     |
|    2 | `b`    | U+0062          | LATIN SMALL LETTER B                        |
|    3 | `\|\|` | U+007C + U+007C | VERTICAL LINE + VERTICAL LINE               |
|    4 | `#`    | U+0023          | NUMBER SIGN                                 |
|    5 | `╬`    | U+256C          | BOX DRAWINGS DOUBLE VERTICAL AND HORIZONTAL |
|    6 | `＊`   | U+FF0A          | FULLWIDTH ASTERISK                          |
|    7 | `//`   | U+002F + U+002F | SOLIDUS + SOLIDUS                           |
|    8 | `;;`   | U+003B + U+003B | SEMICOLON + SEMICOLON                       |
|    9 | `::`   | U+003A + U+003A | COLON + COLON                               |
|   10 | `メ`   | U+30E1          | KATAKANA LETTER ME                          |
|   11 | `〆`   | U+3006          | IDEOGRAPHIC CLOSING MARK                    |
|   12 | `z`    | U+007A          | LATIN SMALL LETTER Z                        |
|   13 | `✧`    | U+2727          | WHITE FOUR POINTED STAR                     |
|   14 | `✦`    | U+2726          | BLACK FOUR POINTED STAR                     |
|   15 | `☆`    | U+2606          | WHITE STAR                                  |
|   16 | `♪`    | U+266A          | EIGHTH NOTE                                 |
|   17 | `♫`    | U+266B          | BEAMED EIGHTH NOTES                         |
|   18 | `※`    | U+203B          | REFERENCE MARK                              |
|   19 | `♡`    | U+2661          | WHITE HEART SUIT                            |
|   20 | `!!`   | U+0021 + U+0021 | EXCLAMATION MARK + EXCLAMATION MARK         |
|   21 | `zz`   | U+007A + U+007A | LATIN SMALL LETTER Z + LATIN SMALL LETTER Z |

## 多码位元素

| 元素   | 码位数 | 码位                              | 说明                       |
| ------ | -----: | --------------------------------- | -------------------------- |
| `•̀`    |      2 | U+2022 + U+0300                   | 基础字符与组合附加符号叠加 |
| `•́`    |      2 | U+2022 + U+0301                   | 基础字符与组合附加符号叠加 |
| `(̵̵́`    |      4 | U+0028 + U+0335 + U+0301 + U+0335 | 基础字符与组合附加符号叠加 |
| `)̵̵̀`    |      4 | U+0029 + U+0335 + U+0300 + U+0335 | 基础字符与组合附加符号叠加 |
| `(○○)` |      4 | U+0028 + U+25CB + U+25CB + U+0029 | 多个普通字符拼接           |
| `(工)` |      3 | U+0028 + U+5DE5 + U+0029          | 多个普通字符拼接           |
| `(··)` |      4 | U+0028 + U+00B7 + U+00B7 + U+0029 | 多个普通字符拼接           |
| `<>`   |      2 | U+003C + U+003E                   | 多个普通字符拼接           |
| `.̫`    |      2 | U+002E + U+032B                   | 基础字符与组合附加符号叠加 |
| `╭∩╮`  |      3 | U+256D + U+2229 + U+256E          | 多个普通字符拼接           |
| `''`   |      2 | U+0027 + U+0027                   | 多个普通字符拼接           |
| `\|\|` |      2 | U+007C + U+007C                   | 多个普通字符拼接           |
| `//`   |      2 | U+002F + U+002F                   | 多个普通字符拼接           |
| `;;`   |      2 | U+003B + U+003B                   | 多个普通字符拼接           |
| `::`   |      2 | U+003A + U+003A                   | 多个普通字符拼接           |
| `!!`   |      2 | U+0021 + U+0021                   | 多个普通字符拼接           |
| `zz`   |      2 | U+007A + U+007A                   | 多个普通字符拼接           |

## 重复条目与权重

- 左眼: `→` × 2
- 右眼: `←` × 2
- 嘴巴（源码字段 mouse）: `c` × 2, `-` × 2, `_` × 2

同一池内按条目等概率抽取，因此重复条目会提高对应符号的出现概率。左右眼按配对索引抽取，重复单侧箭头不代表整对眼睛相同。

## 页面固定掀桌颜文字

`┻━┻︵╰(‵□′)╯︵┻━┻` 写在 [emoticon.astro](../src/pages/emoticon.astro)，不由随机字符池生成。

其中额外使用的 `┻`（U+253B）、`━`（U+2501）、`︵`（U+FE35）不在生成器字符池中。

页面底部的颜文字图片由 [Logo.astro](../src/components/Logo.astro) 显示，资源是 `public/logo-transparent.png`；它也不属于随机字符池。

## 去重后的全部 Unicode 字符

| 字符          | 码位   | Unicode 名称                                               | 类别 |
| ------------- | ------ | ---------------------------------------------------------- | ---- |
| 空格（SPACE） | U+0020 | SPACE                                                      | Zs   |
| `!`           | U+0021 | EXCLAMATION MARK                                           | Po   |
| `#`           | U+0023 | NUMBER SIGN                                                | Po   |
| `$`           | U+0024 | DOLLAR SIGN                                                | Sc   |
| `'`           | U+0027 | APOSTROPHE                                                 | Po   |
| `(`           | U+0028 | LEFT PARENTHESIS                                           | Ps   |
| `)`           | U+0029 | RIGHT PARENTHESIS                                          | Pe   |
| `+`           | U+002B | PLUS SIGN                                                  | Sm   |
| `-`           | U+002D | HYPHEN-MINUS                                               | Pd   |
| `.`           | U+002E | FULL STOP                                                  | Po   |
| `/`           | U+002F | SOLIDUS                                                    | Po   |
| `3`           | U+0033 | DIGIT THREE                                                | Nd   |
| `:`           | U+003A | COLON                                                      | Po   |
| `;`           | U+003B | SEMICOLON                                                  | Po   |
| `<`           | U+003C | LESS-THAN SIGN                                             | Sm   |
| `=`           | U+003D | EQUALS SIGN                                                | Sm   |
| `>`           | U+003E | GREATER-THAN SIGN                                          | Sm   |
| `@`           | U+0040 | COMMERCIAL AT                                              | Po   |
| `C`           | U+0043 | LATIN CAPITAL LETTER C                                     | Lu   |
| `O`           | U+004F | LATIN CAPITAL LETTER O                                     | Lu   |
| `T`           | U+0054 | LATIN CAPITAL LETTER T                                     | Lu   |
| `[`           | U+005B | LEFT SQUARE BRACKET                                        | Ps   |
| `\`           | U+005C | REVERSE SOLIDUS                                            | Po   |
| `]`           | U+005D | RIGHT SQUARE BRACKET                                       | Pe   |
| `^`           | U+005E | CIRCUMFLEX ACCENT                                          | Sk   |
| `_`           | U+005F | LOW LINE                                                   | Pc   |
| `` ` ``       | U+0060 | GRAVE ACCENT                                               | Sk   |
| `b`           | U+0062 | LATIN SMALL LETTER B                                       | Ll   |
| `c`           | U+0063 | LATIN SMALL LETTER C                                       | Ll   |
| `d`           | U+0064 | LATIN SMALL LETTER D                                       | Ll   |
| `m`           | U+006D | LATIN SMALL LETTER M                                       | Ll   |
| `n`           | U+006E | LATIN SMALL LETTER N                                       | Ll   |
| `o`           | U+006F | LATIN SMALL LETTER O                                       | Ll   |
| `t`           | U+0074 | LATIN SMALL LETTER T                                       | Ll   |
| `u`           | U+0075 | LATIN SMALL LETTER U                                       | Ll   |
| `v`           | U+0076 | LATIN SMALL LETTER V                                       | Ll   |
| `w`           | U+0077 | LATIN SMALL LETTER W                                       | Ll   |
| `x`           | U+0078 | LATIN SMALL LETTER X                                       | Ll   |
| `y`           | U+0079 | LATIN SMALL LETTER Y                                       | Ll   |
| `z`           | U+007A | LATIN SMALL LETTER Z                                       | Ll   |
| `{`           | U+007B | LEFT CURLY BRACKET                                         | Ps   |
| `\|`          | U+007C | VERTICAL LINE                                              | Sm   |
| `}`           | U+007D | RIGHT CURLY BRACKET                                        | Pe   |
| `~`           | U+007E | TILDE                                                      | Sm   |
| `¬`           | U+00AC | NOT SIGN                                                   | Sm   |
| `´`           | U+00B4 | ACUTE ACCENT                                               | Sk   |
| `·`           | U+00B7 | MIDDLE DOT                                                 | Po   |
| `̀`            | U+0300 | COMBINING GRAVE ACCENT                                     | Mn   |
| `́`            | U+0301 | COMBINING ACUTE ACCENT                                     | Mn   |
| `̫`            | U+032B | COMBINING INVERTED DOUBLE ARCH BELOW                       | Mn   |
| `̵`            | U+0335 | COMBINING SHORT STROKE OVERLAY                             | Mn   |
| `Θ`           | U+0398 | GREEK CAPITAL LETTER THETA                                 | Lu   |
| `Φ`           | U+03A6 | GREEK CAPITAL LETTER PHI                                   | Lu   |
| `ε`           | U+03B5 | GREEK SMALL LETTER EPSILON                                 | Ll   |
| `σ`           | U+03C3 | GREEK SMALL LETTER SIGMA                                   | Ll   |
| `ψ`           | U+03C8 | GREEK SMALL LETTER PSI                                     | Ll   |
| `ω`           | U+03C9 | GREEK SMALL LETTER OMEGA                                   | Ll   |
| `Д`           | U+0414 | CYRILLIC CAPITAL LETTER DE                                 | Lu   |
| `୧`           | U+0B67 | ORIYA DIGIT ONE                                            | Nd   |
| `୨`           | U+0B68 | ORIYA DIGIT TWO                                            | Nd   |
| `ಠ`           | U+0CA0 | KANNADA LETTER TTHA                                        | Lo   |
| `ಥ`           | U+0CA5 | KANNADA LETTER THA                                         | Lo   |
| `ง`           | U+0E07 | THAI CHARACTER NGO NGU                                     | Lo   |
| `ᕗ`           | U+1557 | CANADIAN SYLLABICS FO                                      | Lo   |
| `ᕙ`           | U+1559 | CANADIAN SYLLABICS FA                                      | Lo   |
| `ᕤ`           | U+1564 | CANADIAN SYLLABICS THO                                     | Lo   |
| `ᕦ`           | U+1566 | CANADIAN SYLLABICS THA                                     | Lo   |
| `ᗜ`           | U+15DC | CANADIAN SYLLABICS CARRIER THU                             | Lo   |
| `ᴥ`           | U+1D25 | LATIN LETTER AIN                                           | Ll   |
| `ᵔ`           | U+1D54 | MODIFIER LETTER SMALL TOP HALF O                           | Lm   |
| `—`           | U+2014 | EM DASH                                                    | Pd   |
| `•`           | U+2022 | BULLET                                                     | Po   |
| `′`           | U+2032 | PRIME                                                      | Po   |
| `‵`           | U+2035 | REVERSED PRIME                                             | Po   |
| `※`           | U+203B | REFERENCE MARK                                             | Po   |
| `‿`           | U+203F | UNDERTIE                                                   | Pc   |
| `←`           | U+2190 | LEFTWARDS ARROW                                            | Sm   |
| `→`           | U+2192 | RIGHTWARDS ARROW                                           | Sm   |
| `↗`           | U+2197 | NORTH EAST ARROW                                           | So   |
| `↘`           | U+2198 | SOUTH EAST ARROW                                           | So   |
| `∀`           | U+2200 | FOR ALL                                                    | Sm   |
| `∇`           | U+2207 | NABLA                                                      | Sm   |
| `∩`           | U+2229 | INTERSECTION                                               | Sm   |
| `≖`           | U+2256 | RING IN EQUAL TO                                           | Sm   |
| `≦`           | U+2266 | LESS-THAN OVER EQUAL TO                                    | Sm   |
| `≧`           | U+2267 | GREATER-THAN OVER EQUAL TO                                 | Sm   |
| `⊙`           | U+2299 | CIRCLED DOT OPERATOR                                       | Sm   |
| `⌒`           | U+2312 | ARC                                                        | So   |
| `⌓`           | U+2313 | SEGMENT                                                    | So   |
| `⌣`           | U+2323 | SMILE                                                      | So   |
| `┌`           | U+250C | BOX DRAWINGS LIGHT DOWN AND RIGHT                          | So   |
| `┍`           | U+250D | BOX DRAWINGS DOWN LIGHT AND RIGHT HEAVY                    | So   |
| `┏`           | U+250F | BOX DRAWINGS HEAVY DOWN AND RIGHT                          | So   |
| `┑`           | U+2511 | BOX DRAWINGS DOWN LIGHT AND LEFT HEAVY                     | So   |
| `┓`           | U+2513 | BOX DRAWINGS HEAVY DOWN AND LEFT                           | So   |
| `┗`           | U+2517 | BOX DRAWINGS HEAVY UP AND RIGHT                            | So   |
| `┘`           | U+2518 | BOX DRAWINGS LIGHT UP AND LEFT                             | So   |
| `┛`           | U+251B | BOX DRAWINGS HEAVY UP AND LEFT                             | So   |
| `┬`           | U+252C | BOX DRAWINGS LIGHT DOWN AND HORIZONTAL                     | So   |
| `╬`           | U+256C | BOX DRAWINGS DOUBLE VERTICAL AND HORIZONTAL                | So   |
| `╭`           | U+256D | BOX DRAWINGS LIGHT ARC DOWN AND RIGHT                      | So   |
| `╮`           | U+256E | BOX DRAWINGS LIGHT ARC DOWN AND LEFT                       | So   |
| `╯`           | U+256F | BOX DRAWINGS LIGHT ARC UP AND LEFT                         | So   |
| `╰`           | U+2570 | BOX DRAWINGS LIGHT ARC UP AND RIGHT                        | So   |
| `□`           | U+25A1 | WHITE SQUARE                                               | So   |
| `△`           | U+25B3 | WHITE UP-POINTING TRIANGLE                                 | So   |
| `▽`           | U+25BD | WHITE DOWN-POINTING TRIANGLE                               | So   |
| `▿`           | U+25BF | WHITE DOWN-POINTING SMALL TRIANGLE                         | So   |
| `◇`           | U+25C7 | WHITE DIAMOND                                              | So   |
| `◉`           | U+25C9 | FISHEYE                                                    | So   |
| `○`           | U+25CB | WHITE CIRCLE                                               | So   |
| `◎`           | U+25CE | BULLSEYE                                                   | So   |
| `●`           | U+25CF | BLACK CIRCLE                                               | So   |
| `◔`           | U+25D4 | CIRCLE WITH UPPER RIGHT QUADRANT BLACK                     | So   |
| `◕`           | U+25D5 | CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK              | So   |
| `◡`           | U+25E1 | LOWER HALF CIRCLE                                          | So   |
| `☆`           | U+2606 | WHITE STAR                                                 | So   |
| `☜`           | U+261C | WHITE LEFT POINTING INDEX                                  | So   |
| `☝`          | U+261D | WHITE UP POINTING INDEX                                    | So   |
| `☞`           | U+261E | WHITE RIGHT POINTING INDEX                                 | So   |
| `♡`           | U+2661 | WHITE HEART SUIT                                           | So   |
| `♪`           | U+266A | EIGHTH NOTE                                                | So   |
| `♫`           | U+266B | BEAMED EIGHTH NOTES                                        | So   |
| `✖`           | U+2716 | HEAVY MULTIPLICATION X                                     | So   |
| `✦`           | U+2726 | BLACK FOUR POINTED STAR                                    | So   |
| `✧`           | U+2727 | WHITE FOUR POINTED STAR                                    | So   |
| `。`          | U+3002 | IDEOGRAPHIC FULL STOP                                      | Po   |
| `〃`          | U+3003 | DITTO MARK                                                 | Po   |
| `〆`          | U+3006 | IDEOGRAPHIC CLOSING MARK                                   | Lo   |
| `【`          | U+3010 | LEFT BLACK LENTICULAR BRACKET                              | Ps   |
| `】`          | U+3011 | RIGHT BLACK LENTICULAR BRACKET                             | Pe   |
| `〒`          | U+3012 | POSTAL MARK                                                | So   |
| `〔`          | U+3014 | LEFT TORTOISE SHELL BRACKET                                | Ps   |
| `〕`          | U+3015 | RIGHT TORTOISE SHELL BRACKET                               | Pe   |
| `っ`          | U+3063 | HIRAGANA LETTER SMALL TU                                   | Lo   |
| `つ`          | U+3064 | HIRAGANA LETTER TU                                         | Lo   |
| `づ`          | U+3065 | HIRAGANA LETTER DU                                         | Lo   |
| `゜`          | U+309C | KATAKANA-HIRAGANA SEMI-VOICED SOUND MARK                   | Sk   |
| `ゝ`          | U+309D | HIRAGANA ITERATION MARK                                    | Lm   |
| `ゞ`          | U+309E | HIRAGANA VOICED ITERATION MARK                             | Lm   |
| `ヘ`          | U+30D8 | KATAKANA LETTER HE                                         | Lo   |
| `メ`          | U+30E1 | KATAKANA LETTER ME                                         | Lo   |
| `ロ`          | U+30ED | KATAKANA LETTER RO                                         | Lo   |
| `ヮ`          | U+30EE | KATAKANA LETTER SMALL WA                                   | Lo   |
| `ヽ`          | U+30FD | KATAKANA ITERATION MARK                                    | Lm   |
| `ㄏ`          | U+310F | BOPOMOFO LETTER H                                          | Lo   |
| `ㄟ`          | U+311F | BOPOMOFO LETTER EI                                         | Lo   |
| `人`          | U+4EBA | CJK UNIFIED IDEOGRAPH-4EBA                                 | Lo   |
| `凸`          | U+51F8 | CJK UNIFIED IDEOGRAPH-51F8                                 | Lo   |
| `口`          | U+53E3 | CJK UNIFIED IDEOGRAPH-53E3                                 | Lo   |
| `工`          | U+5DE5 | CJK UNIFIED IDEOGRAPH-5DE5                                 | Lo   |
| `彡`          | U+5F61 | CJK UNIFIED IDEOGRAPH-5F61                                 | Lo   |
| `皿`          | U+76BF | CJK UNIFIED IDEOGRAPH-76BF                                 | Lo   |
| `益`          | U+76CA | CJK UNIFIED IDEOGRAPH-76CA                                 | Lo   |
| `꒪`          | U+A4AA | YI RADICAL JJUT                                            | So   |
| `눈`          | U+B208 | HANGUL SYLLABLE NUN                                        | Lo   |
| `︶`          | U+FE36 | PRESENTATION FORM FOR VERTICAL RIGHT PARENTHESIS           | Pe   |
| `︹`          | U+FE39 | PRESENTATION FORM FOR VERTICAL LEFT TORTOISE SHELL BRACKET | Ps   |
| `︿`          | U+FE3F | PRESENTATION FORM FOR VERTICAL LEFT ANGLE BRACKET          | Ps   |
| `﹁`          | U+FE41 | PRESENTATION FORM FOR VERTICAL LEFT CORNER BRACKET         | Ps   |
| `﹌`          | U+FE4C | DOUBLE WAVY OVERLINE                                       | Po   |
| `﹏`          | U+FE4F | WAVY LOW LINE                                              | Pc   |
| `（`          | U+FF08 | FULLWIDTH LEFT PARENTHESIS                                 | Ps   |
| `）`          | U+FF09 | FULLWIDTH RIGHT PARENTHESIS                                | Pe   |
| `＊`          | U+FF0A | FULLWIDTH ASTERISK                                         | Po   |
| `，`          | U+FF0C | FULLWIDTH COMMA                                            | Po   |
| `＠`          | U+FF20 | FULLWIDTH COMMERCIAL AT                                    | Po   |
| `Ｑ`          | U+FF31 | FULLWIDTH LATIN CAPITAL LETTER Q                           | Lu   |
| `Ｕ`          | U+FF35 | FULLWIDTH LATIN CAPITAL LETTER U                           | Lu   |
| `＾`          | U+FF3E | FULLWIDTH CIRCUMFLEX ACCENT                                | Sk   |
| `＿`          | U+FF3F | FULLWIDTH LOW LINE                                         | Pc   |
| `ｕ`          | U+FF55 | FULLWIDTH LATIN SMALL LETTER U                             | Ll   |
| `～`          | U+FF5E | FULLWIDTH TILDE                                            | Sm   |
| `ｪ`           | U+FF6A | HALFWIDTH KATAKANA LETTER SMALL E                          | Lo   |
| `ｰ`           | U+FF70 | HALFWIDTH KATAKANA-HIRAGANA PROLONGED SOUND MARK           | Lm   |
| `ﾉ`           | U+FF89 | HALFWIDTH KATAKANA LETTER NO                               | Lo   |
| `￣`          | U+FFE3 | FULLWIDTH MACRON                                           | Sk   |

## 维护约定

- 左右眼共享索引，左右脸框也共享索引。对应数组须保持相同长度和配对顺序。
- 历史字段 `mouse` 表示嘴巴；文档沿用源码字段名。
- 重复条目影响随机权重；删除重复条目会改变输出分布。
- 保留组合附加符号的码位顺序，不对字符池做兼容归一化或替换外形相近的字符。
- 字符池变更后，更新逐项表、数量、重复项、多码位拆解及去重字符表。普通源码与构建检查仍按 [验证记录](verification.md) 执行。
- 元素使用 Markdown 行内代码展示。表格中的竖线须转义；字面反引号须使用更长的反引号定界符。避免内嵌 HTML `<code>` 标签，以兼容不解析 HTML 的预览器。

## Unicode 官方参考

- [组合附加符号](https://www.unicode.org/charts/PDF/U0300.pdf)
- [彝文部首](https://www.unicode.org/charts/PDF/UA490.pdf)
- [加拿大原住民音节文字](https://www.unicode.org/charts/PDF/U1400.pdf)
- [泰文](https://www.unicode.org/charts/PDF/U0E00.pdf)

- [卡纳达文](https://www.unicode.org/charts/PDF/U0C80.pdf)
- [奥里亚文](https://www.unicode.org/charts/PDF/U0B00.pdf)
- [音标扩展](https://www.unicode.org/charts/PDF/U1D00.pdf)
- [韩文音节](https://www.unicode.org/charts/PDF/UAC00.pdf)
