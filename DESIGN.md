# بركة | Baraka — دليل التصميم (Design System)

هذا الملف هو المرجع الوحيد لهوية التطبيق البصرية. كل القيم تعيش في
`src/styles/tokens.css`، وTailwind في `tailwind.config.js` يقرأ منها فقط،
فلا توجد ألوان مكتوبة داخل المكوّنات.

## 1. الأساسيات

| العنصر | القيمة | المصدر |
| --- | --- | --- |
| شبكة المسافات | 4px (`--space-1..16`) | `tokens.css` |
| الزوايا | 8 / 12 / 16 / 22 / 28 / 34 / full | `--radius-*` |
| الظلال | 3 مستويات (`--shadow-1..3`) | يُفتَّح ويُغمَّق تلقائياً في الوضع الداكن |
| الحركة | 130 / 230 / 420 / 700ms | `--dur-fast/mid/slow/slower` |
| منحنيات | `out`, `in-out`, `spring` | `--ease-*` |
| عمود التطبيق | 480px | `--app-max` / `max-w-app` |
| شريط التنقل | 66px + safe-area | `--nav-h` |

**قاعدة صارمة:** لا تُستهلك ألوان Hex داخل المكوّنات. استعمل الأدوار الدلالية:
`bg`, `surface`, `surface2`, `line`, `fg`, `muted`, `accent`, `accent-fg`,
`accent-soft`, `ok`, `warn`, `danger`, `info`, وسلّم الخطر
`risk-green|yellow|orange|red` (+ `-soft`, `-fg`).

## 2. الخطوط (مستضافة ذاتياً عبر `@fontsource`)

| الدور | العربية | اللاتينية/الكيريلية |
| --- | --- | --- |
| العناوين | Readex Pro 600/700 | Manrope 700/800 |
| النصوص | IBM Plex Sans Arabic 400/500/600 | Inter 400/500/600 |
| الأرقام/المبالغ | — | Inter `tabular-nums` عبر الصنف `.num` |

الخطوط محزومة داخل `dist` (لا CDN)، `font-display: swap` افتراضي من
`@fontsource`، والمكدس في `--font-body` يبدأ بالعربي ثم Inter ليسقط الحرف
الكيريلي والعربي على الخط الصحيح تلقائياً.

## 3. هيكل التنقل وهوية الأدوات

**التنقل (AppShell):** خمسة عناصر ثابتة — الرئيسية · الحلال · الطبيب · المحاسب · السجل.
الحساب والإعدادات تُفتح من الصورة الرمزية (الشريط العلوي على الجوال، بطاقة المستخدم أسفل الشريط الجانبي على الحاسوب).
كل صفحة تبدأ بـ `PageHeader` (شخصية + عنوان صغير + عنوان + وصف + إجراء اختياري)، والأقسام بـ `SectionTitle`.

**هوية الأدوات:** لكل أداة لون واحد يُستعمل للأيقونات والشارات والحالة النشطة فقط، والأزرار الرئيسية تبقى بلون `--accent`.

| الأداة | المتغير | الفاتح | الداكن |
| --- | --- | --- | --- |
| الحلال | `--tool-halal` | `#0F7A5C` | `#34D399` |
| الطبيب | `--tool-doctor` | `#0E7490` | `#38BDF8` |
| المحاسب | `--tool-money` | `#B7791F` | `#F5B94A` |

**حسابي:** أربع تبويبات (ملفي · الفحص والمال · التطبيق · البيانات والحساب)، قابلة للربط المباشر: `/profile?tab=prefs`.
اكتمال الملف يُحسب في مكان واحد: `src/lib/profileCompletion.ts`.

**ألوان Tailwind:** كل الألوان متغيرات CSS ملفوفة بـ `color-mix` في `tailwind.config.js`، لذلك معدّلات الشفافية مثل `bg-surface/80` تعمل.
**شخصيات SVG:** معرّفات التدرّجات تُولَّد بـ `useId()` لأن التبويبات تبقى محمّلة معاً؛ لا تكتب `id` ثابتاً داخل SVG.

## 4. سلّم الخطر (المحاسب)

| المستوى | المتغير | الاستعمال |
| --- | --- | --- |
| آمن | `--risk-green` | شارة، حلقة، وجه المحاسب مبتسم |
| انتباه | `--risk-yellow` | حلقة صفراء، وجه هادئ |
| تحذير | `--risk-orange` | حدود، وجه قلق |
| خطر | `--risk-red` + `-soft` | حدود نابضة `ring-2`، شاشة حقائق، اهتزاز لمرة واحدة |

كل درجة تُستخدم مع `-fg` المقابل لضمان تباين النص، ولا يُستعمل اللون وحده:
يُرفق دائماً بنص/أيقونة (وصولية عمى الألوان).

## 5. المكوّنات (`src/components/ui`)

`Button` (primary/secondary/soft/ghost/danger/gold × 3 أحجام، 4 حالات),
`IconButton` (هدف 44px), `Card` (4 أنواع), `Field` (`Input`/`Textarea`/`Select`
بعنوان عائم عبر حالة React، `Checkbox`), `Sheet` (bottom sheet بـ Motion One),
`Segmented` (مؤشر منزلق), `Switch`, `Chip`, `Progress`, `ProgressRing`,
`Skeleton`, `Spinner`, `Badge` (6 ألوان), `EmptyState`, `ErrorState`,
`Disclaimer`, `PageHeader`, `AppShell`.

قواعد إلزامية: أهداف لمس ≥ 44px، `:focus-visible` واضح، `aria-*` للحالات،
خصائص منطقية فقط (`ps/pe/ms/me/start/end`) — لا `left/right`.

## 6. الحركة

- المكتبة: **Motion One** (`motion`)، ~5KB gzip، تُستدعى إمبريتيفياً
  (`animate(el, …)`) من `src/lib/motion.ts` — دون أي شجرة React إضافية.
- المسموح: `transform` و`opacity` فقط.
- المدد: 160–440ms للأحداث العادية، 550–700ms للحكم النهائي.
- `prefers-reduced-motion: reduce` يوقف كل شيء (CSS + `prefersReducedMotion()`).
- انتقال الصفحات: `PageTransition` يستعمل `element.animate` (WAAPI)، و
  `withViewTransition()` يغلّف التنقل بـ View Transitions عند توفره وينتبه للاتجاه.

## 7. RTL

`dir` يُضبط من `LOCALE_DIR` عند تغيير اللغة. الأيقونات الاتجاهية تستعمل `.flip-rtl`.
المبالغ والأرقام داخل نص عربي تُعزل بـ `.num` + `tabular-nums`، والتنسيق يتم
عبر `Intl.NumberFormat` في `shared/money.ts` (فاصلة عربية/لاتينية حسب اللغة).

## 8. كيف تضيف شخصية جديدة

1. أنشئ `src/components/characters/Xxx.tsx` بـ SVG خالص (`viewBox`, `fill="none"`),
   استعمل `var(--accent*)` لا ألواناً ثابتة، وأضف `role="img"` + `aria-label`.
2. الحركة عبر أصناف CSS الموجودة (`animate-blink`, `animate-nod`, `animate-float`)
   أو `animate()` من `motion` — مع احترام تقليل الحركة.
3. إن احتجت هوية لونية: أضف بلوك `[data-theme='xxx']` و`.dark[data-theme='xxx']`
   في `tokens.css` يعيد تعريف نفس المتغيرات الدنيا، ثم أضف القيمة إلى
   `PageTheme` في `src/lib/theme.ts`.
4. مرّر الشعار اللوني في اختبار التباين (`tests/design` الموصى به) قبل الدمج.
