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

## 3. هوية كل صفحة (`data-theme`)

يُضبط على `<html>` عبر `usePageTheme('halal' | 'chats' | 'doctor' | 'accountant' | 'profile')`.
كل هوية تعيد تعريف: `--bg`, `--surface`, `--surface-2`, `--border`, `--fg`,
`--muted`, `--accent`, `--accent-fg`, `--accent-soft`, `--pattern-ink`,
`--pattern-opacity`, `--hero-grad-a/b`, `--glass` — في الوضعين الفاتح والداكن.

| الصفحة | الشخصية | الفاتح | الداكن | ملاحظة |
| --- | --- | --- | --- | --- |
| فحص الحلال | الشيخ AI | عاجي دافئ + زمردي `#0e6b52` | أخضر ليلي + ذهبي `#d8bb7d` | زخرفة هندسية بشفافية 5% |
| المحادثات | الأرشيف | رمادي رملي + بني قهوة `#6f5334` | بني داكن + رمل ذهبي | شارات القنوات `--ch-*` |
| الطبيب | د. صحتك | تيل `#0e7490` + أبيض | تيل ليلي + نعناعي | أحمر للطوارئ فقط |
| المحاسب | المحاسب الذكي | كحلي `#1e3a8a` + ذهبي | ليل + ذهبي `#e6c86e` | سلّم خطر 4 درجات |
| الملف | أنت | محايد + لون المستخدم | محايد داكن | 6 ألوان تمييز |

### ألوان التمييز (Profile)

`[data-accent]` يعيد تعريف `--accent`, `--accent-fg`, `--accent-soft`, `--ring`:
teal `#0f766e`, rose `#be123c`, violet `#6d28d9`, amber `#a16207`,
cobalt `#1d4ed8`, emerald `#047857` (وفي الداكن نسخ فاتحة بتباين AA).

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
