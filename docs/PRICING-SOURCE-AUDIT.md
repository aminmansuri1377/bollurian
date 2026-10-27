# Source audit

Workbook: `سیستم_اتوماتیک_لیست_قیمت_بلوریان(1).xlsx`
SHA-256: `72644c9e37c00d4a9e7e2d96457279f3fa3b1485f0f8b4169f9f83b5bf804c2d`

## Workbook sheets and formulas

- Four visible sheets; no external workbook links or defined names.
- 49 master rows: 48 real products and one blank placeholder, R038.
- 98 master-price comparison formulas; 150 output formulas; 248 total.
- Quantity cells in columns C/D/E contain literal values, not extrapolation formulas.
- Output cached quantities are blank; cached group and grand totals are zero.

### Original representative formulas

**قیمت_مادر!G2**

```excel
=IF(OR(E2="",F2=""),"",E2/F2-1)
```

**قیمت_مادر!H2**

```excel
=IF(OR(E2="",F2=""),"بدون مقایسه",IF(E2>F2,"افزایش",IF(E2<F2,"کاهش","بدون تغییر")))
```

**لیست_خروجی!E6**

```excel
=IFERROR(_xlfn.XLOOKUP(B6,'تعداد_توقف'!$A:$A,INDEX('تعداد_توقف'!$C:$E,0,MATCH($B$2,'تعداد_توقف'!$C$1:$E$1,0)),""),"")
```

**لیست_خروجی!G6**

```excel
=IFERROR(_xlfn.XLOOKUP(B6,'قیمت_مادر'!$A:$A,'قیمت_مادر'!$E:$E,""),"")
```

**لیست_خروجی!H6**

```excel
=IF(OR(E6="",G6=""),"",E6*G6)
```

**لیست_خروجی!H56**

```excel
=SUMIF(C6:C54,"مکانیک",H6:H54)
```

**لیست_خروجی!H57**

```excel
=SUMIF(C6:C54,"راه‌اندازی",H6:H54)
```

**لیست_خروجی!H59**

```excel
=SUM(H6:H54)
```

## PDF inventory (visual review; no OCR)

| Invoice | Filename | Pages | Equipment rows | Package |
|---|---|---:|---:|---|
| 15530 | 15530 5توقف مکانیکال(1).pdf | 1 | 11 | mechanic |
| 15529 | 1552965 توقف راه اندازی نیمه اتومات(1).pdf | 2 | 41 | semi |
| 15528 | 155285 توقف راه اندازی تمام اتومات(1).pdf | 2 | 37 | auto |
| 15527 | 15527 5توقف تمام مکانیک وراه اندازی(1).pdf | 2 | 48 | mech-auto |
| 17784 | 177845 توقف تمام اتومات صفر تاصد(1).pdf | 2 | 57 | full-auto |
| 15533 | 15533 5 توقف نیمه صفر تاصد(1).pdf | 2 | 61 | full-semi |
| 19040 | 190405 توقف نیمه مکانیک وراه اندازی(1).pdf | 2 | 52 | mech-semi |
| 18948 | 18948_مشتری_5_توقف_اتومات_8_نفره_گیربکس(1).pdf | 3 | 57 | full-auto |

Total: **16 pages / 364 equipment rows**.

The machine-readable audit records filename hashes, page/row references, mapped equipment-family IDs and printed quantities. It deliberately does not treat those example quantities as formulas.

## Literal stop-table values

| ID | Product (original workbook wording) | Unit | 6 | 7 | 8 |
|---|---|---|---:|---:|---:|
| M001 | سیم بکسل 10 چین نواردار طلایی  /  خرده | متر | 96.0 | 108.0 | 120.0 |
| M002 | سیم بکسل 6 خودرنگ چین  /  خرده | متر | 48.0 | 54.0 | 60.0 |
| M003 | لاستیک تخت مرغوب  /  المپیک | عدد | 4.0 | 4.0 | 4.0 |
| M004 | پیچ موتور 16 (موتور)  /  7.5 سانت متر | عدد | 4.0 | 4.0 | 4.0 |
| M005 | کرپی 6 فولادی  /  طلایی | عدد | 6.0 | 6.0 | 6.0 |
| M006 | کرپی 10 فولادی  /  طلایی | عدد | 24.0 | 24.0 | 24.0 |
| M007 | گاورنر آسانبر بیهق + وزنه | عدد | 1.0 | 1.0 | 1.0 |
| M008 | فلکه هرزگرد 4 شیار آریا + شفت | عدد | 1.0 | 1.0 | 1.0 |
| M009 | سربکسل 10 پرشیا | عدد | 8.0 | 8.0 | 8.0 |
| M010 | اشکی بکسل گاورنر | عدد | 2.0 | 2.0 | 2.0 |
| M011 | وزنه گالوانیزه آسانسور 77 | قالب | 14.0 | 14.0 | 14.0 |
| R001 | استپ قارچی + جعبه  /  ماهان الکتریک | عدد | 3.0 | 3.0 | 3.0 |
| R002 | اورلود دیجیتال - ناسیس | عدد | 1.0 | 1.0 | 1.0 |
| R003 | بافر آلسن - 1500 kg | عدد | 2.0 | 2.0 | 2.0 |
| R004 | بست کمربندی 20 سانتی | بسته | 1.0 | 1.0 | 1.0 |
| R005 | بست تراول کابل - یاشار لیفت | عدد | 4.0 | 4.0 | 4.0 |
| R006 | پریز بارانی روکار - پارت الکتریک | عدد | 1.0 | 1.0 | 1.0 |
| R007 | پیچ و مهره 12 جهت نصب پایه لیمیت | عدد | 8.0 | 8.0 | 8.0 |
| R008 | پیچ و رولپلاک - 50 تایی | بسته | 2.0 | 2.0 | 2.0 |
| R009 | داکت 3 پلاستیکی - دودمان | شاخه | 15.0 | 17.0 | 19.0 |
| R010 | داکت 9 پلاستیکی - سفید - دودمان | شاخه | 2.0 | 2.0 | 2.0 |
| R011 | داکت 10 فلزی | شاخه | 1.0 | 1.0 | 1.0 |
| R012 | خرطومی فلزی | متر | 3.0 | 3.0 | 3.0 |
| R013 | خرطومی پلاستیکی | حلقه | 1.0 | 1.0 | 1.0 |
| R014 | روغن گیر ریل | عدد | 4.0 | 4.0 | 4.0 |
| R015 | روغندان طرح ترک ENP | عدد | 4.0 | 4.0 | 4.0 |
| R016 | سنسور پیشرو پلاستیکی + آهنربا 40 عدد | عدد | 1.0 | 1.0 | 1.0 |
| R017 | لیمیت سوئیچ یاشار | بسته | 1.0 | 1.0 | 1.0 |
| R018 | کلید 3 گوش - لیزری | عدد | 1.0 | 1.0 | 1.0 |
| R019 | کلید تک پل تبدیل - پارت الکتریک | عدد | 2.0 | 2.0 | 2.0 |
| R020 | درب تلسکوپی روانکار کابین فول 80 دولته | دستگاه | 1.0 | 1.0 | 1.0 |
| R021 | فن کامپیوتری | عدد | 1.0 | 1.0 | 1.0 |
| R022 | شاسی کابین 1 متری - RLift | عدد | 1.0 | 1.0 | 1.0 |
| R023 | شاسی طبقه روکار - RLift | عدد | 6.0 | 7.0 | 8.0 |
| R024 | چراغ تونلی W 16 LED  /  راینو | عدد | 8.0 | 9.0 | 10.0 |
| R025 | جعبه 3 فاز | عدد | 1.0 | 1.0 | 1.0 |
| R026 | آهنربا اضافه | عدد | 10.0 | 20.0 | 30.0 |
| R027 | فتوسل اکو ناسیس (چشمی پلاستیکی) | عدد | 1.0 | 1.0 | 1.0 |
| R028 | چسب برق دیاموند | حلقه | 8.0 | 10.0 | 12.0 |
| R029 | تراول کابل 24 رشته روکش مس بکسلدار - 3G - آسمان وایلر | متر | 31.0 | 34.0 | 38.0 |
| R030 | سیم 6 زوج | متر | 36.0 | 40.0 | 45.0 |
| R031 | سیم 75 - CC | حلقه | 5.0 | 6.0 | 8.0 |
| R032 | کابل 1*4 (جهت سیم کشی) | متر | 25.0 | 28.0 | 34.0 |
| R033 | سیم 4 - CC | حلقه | 1.0 | 1.0 | 1.0 |
| R034 | علائم استاندارد | بسته | 1.0 | 1.0 | 1.0 |
| R035 | تلفن دیواری - pashaophone | عدد | 3.0 | 3.0 | 3.0 |
| R036 | پک حفاظ  /  موتور + هرزگرد + گاورنر  /  مهتا | بسته | 1.0 | 1.0 | 1.0 |
| R037 | حفاظ کادر وزنه 84 - مهتا | عدد | 1.0 | 1.0 | 1.0 |
| R038 | بدون قیمت | --- | - | - | - |

## Interpretation limits

- Visual row-family audit of all eight uploaded PDFs. This is not a verbatim transcription of brand/model names.
- Printed quantities are observations only and are NEVER used as 6/7/8-stop quantities. PDF amounts are in rial, workbook prices in toman.
- 18948 filename says five stops and eight persons; its floor-door/button quantities are eight. Do not infer a capacity multiplier or a new stop count from this conflict.
- Workbook units/models may differ from PDF models (notably M011). ProductId means corresponding equipment family, not a certified interchangeable model.

See `PRICING-RULES.md` for every explicit extension, correction and unresolved input. No original attachment has been modified.
