/**
 * Baraka v2 — Studio Character Personas
 * Handcrafted virtual personas for the three advisory desks:
 * 1. Sheikh (الشيخ): Sharia & Halal Ethical Advisor
 * 2. Doctor (الطبيب): Medical, Dietary & Allergy Advisor
 * 3. Accountant (المحاسب): Personal Finance, Payday & Budget Advisor
 * Designed with editorial precision, distinct silhouettes, and human warmth.
 */

import { type ReactNode, useId } from 'react';
import { cn } from '../ui/cn';

export type PersonaKind = 'sheikh' | 'doctor' | 'accountant';
export type PersonaSize = 'sm' | 'md' | 'lg' | 'xl';

const sizePx: Record<PersonaSize, number> = {
  sm: 36,
  md: 44,
  lg: 64,
  xl: 96,
};

/* -------------------------------------------------------------------------- */
/* Shared portrait construction                                               */
/* All three characters share one drawing system (120×120 grid) so they read  */
/* as a family: same head, same lighting, a tool-colored backdrop each.       */
/* -------------------------------------------------------------------------- */

interface PortraitProps {
  size: PersonaSize;
  className?: string;
  label: string;
  /** Backdrop gradient: light (top) → deep (bottom). */
  bg: [string, string];
  ring: string;
  children: (uid: string) => ReactNode;
}

function Portrait({ size, className, label, bg, ring, children }: PortraitProps) {
  const uid = useId().replace(/:/g, '');
  const px = sizePx[size];
  return (
    <div
      className={cn('relative inline-flex shrink-0 select-none items-center justify-center', className)}
      style={{ width: px, height: px }}
    >
      <svg viewBox="0 0 120 120" width={px} height={px} className="h-full w-full" role="img" aria-label={label} fill="none">
        <defs>
          <radialGradient id={`${uid}bg`} cx="35%" cy="25%" r="85%">
            <stop offset="0%" stopColor={bg[0]} />
            <stop offset="100%" stopColor={bg[1]} />
          </radialGradient>
          <clipPath id={`${uid}clip`}>
            <circle cx="60" cy="60" r="58" />
          </clipPath>
          <radialGradient id={`${uid}shine`} cx="30%" cy="15%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="58" fill={`url(#${uid}bg)`} />
        <g clipPath={`url(#${uid}clip)`}>{children(uid)}</g>
        <circle cx="60" cy="60" r="58" fill={`url(#${uid}shine)`} />
        <circle cx="60" cy="60" r="57" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="59" stroke={ring} strokeWidth="2" />
      </svg>
    </div>
  );
}

interface SkinTone {
  light: string;
  shade: string;
  line: string;
}

/** Neck with jaw shadow. */
function Neck({ skin }: { skin: SkinTone }) {
  return (
    <>
      <path d="M50 68 L50 88 C50 94 70 94 70 88 L70 68 Z" fill={skin.shade} />
      <path d="M50 70 C55 78 65 78 70 70 L70 66 L50 66 Z" fill={skin.line} opacity="0.35" />
    </>
  );
}

function Ears({ skin }: { skin: SkinTone }) {
  return (
    <>
      <ellipse cx="41" cy="57" rx="4" ry="6.5" fill={skin.shade} />
      <ellipse cx="79" cy="57" rx="4" ry="6.5" fill={skin.shade} />
      <path d="M41.5 54 C40 56 40 59 41.5 61" stroke={skin.line} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M78.5 54 C80 56 80 59 78.5 61" stroke={skin.line} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </>
  );
}

/** Head, eyes, brows, nose, cheeks. Mouth is drawn by each character (beards differ). */
function Face({ uid, skin, brow }: { uid: string; skin: SkinTone; brow: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}skin`} x1="60" y1="34" x2="60" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={skin.light} />
          <stop offset="100%" stopColor={skin.shade} />
        </linearGradient>
      </defs>
      <path
        d="M42 50 C42 35 78 35 78 50 L78 59 C78 72 70 81 60 81 C50 81 42 72 42 59 Z"
        fill={`url(#${uid}skin)`}
      />
      {/* brows */}
      <path d="M47.5 50 Q52 47.2 56.5 49.4" stroke={brow} strokeWidth="2" strokeLinecap="round" />
      <path d="M63.5 49.4 Q68 47.2 72.5 50" stroke={brow} strokeWidth="2" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="52" cy="56" rx="2.3" ry="2.7" fill="#1f1611" />
      <ellipse cx="68" cy="56" rx="2.3" ry="2.7" fill="#1f1611" />
      <circle cx="52.8" cy="55" r="0.8" fill="#fff" />
      <circle cx="68.8" cy="55" r="0.8" fill="#fff" />
      {/* nose */}
      <path d="M60.5 57 Q58.4 63.5 61 64.6" stroke={skin.line} strokeWidth="1.4" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="48.5" cy="64.5" r="3.6" fill="#ef7f6b" opacity="0.22" />
      <circle cx="71.5" cy="64.5" r="3.6" fill="#ef7f6b" opacity="0.22" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. THE SHEIKH — مساعد الحلال                                                */
/* White ghutrah with folds, black double agal, full greying beard,            */
/* white thobe under a dark bisht with gold trim. Emerald backdrop + star.    */
/* -------------------------------------------------------------------------- */
const SHEIKH_SKIN: SkinTone = { light: '#E7B98F', shade: '#CF9A6D', line: '#9C6A45' };

export function SheikhAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  return (
    <Portrait size={size} className={className} label="مساعد الحلال" bg={['#2FB389', '#0B5640']} ring="#0B5640">
      {(uid) => (
        <>
          <defs>
            <linearGradient id={`${uid}cloth`} x1="60" y1="20" x2="60" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DCD7CC" />
            </linearGradient>
            <linearGradient id={`${uid}bisht`} x1="0" y1="90" x2="0" y2="124" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4A3523" />
              <stop offset="100%" stopColor="#2A1D12" />
            </linearGradient>
          </defs>

          {/* eight-point star motif */}
          <g stroke="#fff" strokeOpacity="0.16" strokeWidth="1.4">
            <rect x="34" y="8" width="52" height="52" rx="3" />
            <rect x="34" y="8" width="52" height="52" rx="3" transform="rotate(45 60 34)" />
          </g>

          {/* thobe */}
          <path d="M12 124 C16 98 36 88 60 88 C84 88 104 98 108 124 Z" fill={`url(#${uid}cloth)`} />
          {/* bisht panels with gold trim */}
          <path d="M12 124 C16 100 30 91 44 89 L52 124 Z" fill={`url(#${uid}bisht)`} />
          <path d="M108 124 C104 100 90 91 76 89 L68 124 Z" fill={`url(#${uid}bisht)`} />
          <path d="M44 89 L52 124" stroke="#E2B65C" strokeWidth="2.2" />
          <path d="M76 89 L68 124" stroke="#E2B65C" strokeWidth="2.2" />
          {/* thobe collar */}
          <path d="M52 88 C55 94 65 94 68 88" stroke="#C9C3B6" strokeWidth="1.4" />
          <circle cx="60" cy="98" r="1.2" fill="#C9C3B6" />

          <Neck skin={SHEIKH_SKIN} />
          <Face uid={uid} skin={SHEIKH_SKIN} brow="#4B4039" />

          {/* full beard with grey streaks */}
          <path
            d="M42 58 C42 77 50 88 60 88 C70 88 78 77 78 58 C76 66 72 70.5 66.5 71.5 C63.5 69.5 56.5 69.5 53.5 71.5 C48 70.5 44 66 42 58 Z"
            fill="#3D312B"
          />
          <path d="M50 76 C52 80 54 82 56 83" stroke="#8C8079" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          <path d="M64 83 C66 82 68 80 70 76" stroke="#8C8079" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          <path d="M60 79 L60 86" stroke="#8C8079" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          {/* moustache + mouth */}
          <path d="M52.5 67.5 C55.5 65 64.5 65 67.5 67.5 C64 69.2 56 69.2 52.5 67.5 Z" fill="#33281F" />
          <path d="M56.5 71.6 Q60 73.6 63.5 71.6" stroke="#B5675A" strokeWidth="1.5" strokeLinecap="round" />

          {/* ghutrah: frames the face and drapes to the shoulders */}
          <path
            d="M37 54 C35 33 46 25 60 25 C74 25 85 33 83 54 C85 70 90 88 98 106 L85 110 C80 92 78 72 78 56 C78 45 71 39 60 39 C49 39 42 45 42 56 C42 72 40 92 35 110 L22 106 C30 88 35 70 37 54 Z"
            fill={`url(#${uid}cloth)`}
          />
          <path d="M44 41 C40 52 39 72 33 96" stroke="#CFC9BD" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M76 41 C80 52 81 72 87 96" stroke="#CFC9BD" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M42 56 C42 45 49 39 60 39 C71 39 78 45 78 56" stroke="#CFC9BD" strokeWidth="1" />

          {/* double black agal */}
          <ellipse cx="60" cy="33" rx="22" ry="5" stroke="#141414" strokeWidth="3.4" />
          <ellipse cx="60" cy="29.6" rx="21" ry="4.6" stroke="#141414" strokeWidth="3" />
          <ellipse cx="60" cy="29.6" rx="21" ry="4.6" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.8" />
        </>
      )}
    </Portrait>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. THE DOCTOR — الطبيب                                                       */
/* Modern short hair, white coat over teal scrubs, stethoscope, ID badge.      */
/* Sky-teal backdrop with a soft medical cross.                                */
/* -------------------------------------------------------------------------- */
const DOCTOR_SKIN: SkinTone = { light: '#F3CFAE', shade: '#DEAD87', line: '#A87553' };

export function DoctorAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  return (
    <Portrait size={size} className={className} label="الطبيب" bg={['#4CC3E3', '#0B5E7A']} ring="#0B5E7A">
      {(uid) => (
        <>
          <defs>
            <linearGradient id={`${uid}coat`} x1="0" y1="88" x2="0" y2="124" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DCE6EE" />
            </linearGradient>
            <linearGradient id={`${uid}hair`} x1="60" y1="22" x2="60" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4A3426" />
              <stop offset="100%" stopColor="#2A1D15" />
            </linearGradient>
          </defs>

          {/* medical cross motif */}
          <path d="M88 14 h8 v10 h10 v8 h-10 v10 h-8 v-10 h-10 v-8 h10 Z" fill="#fff" opacity="0.18" />

          {/* scrubs + coat */}
          <path d="M12 124 C16 98 36 88 60 88 C84 88 104 98 108 124 Z" fill="#127C8C" />
          <path d="M12 124 C16 99 32 90 48 88.5 L55 124 Z" fill={`url(#${uid}coat)`} />
          <path d="M108 124 C104 99 88 90 72 88.5 L65 124 Z" fill={`url(#${uid}coat)`} />
          <path d="M48 88.5 L58 106 L55 124" stroke="#C5D3DE" strokeWidth="1.3" />
          <path d="M72 88.5 L62 106 L65 124" stroke="#C5D3DE" strokeWidth="1.3" />
          {/* ID badge */}
          <rect x="76" y="103" width="12" height="9" rx="1.8" fill="#E0F4FB" stroke="#9CC9DA" strokeWidth="0.8" />
          <rect x="78" y="105.5" width="5" height="1.4" rx="0.7" fill="#0B5E7A" />
          <rect x="78" y="108.2" width="8" height="1.2" rx="0.6" fill="#9CC9DA" />

          <Neck skin={DOCTOR_SKIN} />

          {/* stethoscope */}
          <path d="M49 86 C42 98 46 112 60 112 C74 112 78 98 71 86" stroke="#2F3B4A" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="60" cy="113" r="4.6" fill="#C9D3DC" stroke="#2F3B4A" strokeWidth="1.6" />
          <circle cx="60" cy="113" r="1.8" fill="#4CC3E3" />

          <Ears skin={DOCTOR_SKIN} />
          <Face uid={uid} skin={DOCTOR_SKIN} brow="#3A291E" />

          {/* friendly smile */}
          <path d="M54.5 69 Q60 74 65.5 69" stroke="#A4513F" strokeWidth="1.7" strokeLinecap="round" />

          {/* short modern hair with a soft quiff */}
          <path
            d="M40.5 54 C37 34 47 23 61 23.5 C75 24 84 33 79.5 54 C78.5 47 75.5 42.5 71 41 C66 43.5 55 43.5 49 41.5 C45 43 42 47.5 40.5 54 Z"
            fill={`url(#${uid}hair)`}
          />
          <path d="M50 30 C56 26.5 66 26.5 72 31" stroke="#6B4C39" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        </>
      )}
    </Portrait>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. THE ACCOUNTANT — المحاسب                                                  */
/* Navy tailored suit, white shirt, gold tie + pocket square, rectangular      */
/* glasses, side-parted hair and a neatly trimmed beard. Gold backdrop + chart. */
/* -------------------------------------------------------------------------- */
const ACCOUNTANT_SKIN: SkinTone = { light: '#E9BE97', shade: '#D19F76', line: '#9A6B48' };

export function AccountantAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  return (
    <Portrait size={size} className={className} label="المحاسب" bg={['#F2C766', '#9A6414']} ring="#8A5A12">
      {(uid) => (
        <>
          <defs>
            <linearGradient id={`${uid}suit`} x1="0" y1="88" x2="0" y2="124" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2A3A5E" />
              <stop offset="100%" stopColor="#16203A" />
            </linearGradient>
          </defs>

          {/* rising chart motif */}
          <g opacity="0.22">
            <rect x="14" y="40" width="7" height="16" rx="1.5" fill="#fff" />
            <rect x="24" y="32" width="7" height="24" rx="1.5" fill="#fff" />
            <rect x="34" y="22" width="7" height="34" rx="1.5" fill="#fff" />
            <path d="M88 44 L96 34 L103 38 L112 24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* suit, shirt, tie */}
          <path d="M12 124 C16 98 36 88 60 88 C84 88 104 98 108 124 Z" fill={`url(#${uid}suit)`} />
          <path d="M49 88 L60 110 L71 88 Z" fill="#F8FAFC" />
          <path d="M57 92 L63 92 L65 112 L60 118 L55 112 Z" fill="#D9A43D" />
          <path d="M57 92 L63 92 L62 96 L58 96 Z" fill="#B9862A" />
          {/* lapels */}
          <path d="M47 88 L58 112 L50 124 L38 124 C40 108 42 96 47 88 Z" fill="#22304F" />
          <path d="M73 88 L62 112 L70 124 L82 124 C80 108 78 96 73 88 Z" fill="#1D2944" />
          {/* pocket square */}
          <path d="M84 106 L94 106 L90 101 Z" fill="#E9BE5C" />

          <Neck skin={ACCOUNTANT_SKIN} />
          <Ears skin={ACCOUNTANT_SKIN} />
          <Face uid={uid} skin={ACCOUNTANT_SKIN} brow="#2E241D" />

          {/* short boxed beard (stubble-tone, lighter than the sheikh's) */}
          <path
            d="M43 62 C44.5 75 51.5 81 60 81 C68.5 81 75.5 75 77 62 C75 69 71 73 66 74 C63 72.5 57 72.5 54 74 C49 73 45 69 43 62 Z"
            fill="#4A3A2E"
            opacity="0.82"
          />
          <path d="M54 68.4 C57 67 63 67 66 68.4 C63 69.4 57 69.4 54 68.4 Z" fill="#3A2C22" />
          <path d="M56 72 Q60 74.6 64 72" stroke="#A4513F" strokeWidth="1.6" strokeLinecap="round" />

          {/* side-parted hair with grey temples */}
          <path
            d="M41 54 C38 35 47 24 61 24 C75 24 83 34 79 54 C78 47 76 43 72 41.5 C64 40 54 40.5 47 43 C44 45 42 49 41 54 Z"
            fill="#2E241D"
          />
          <path d="M53 26 C51 31 49 36 47 43" stroke="#4A3C32" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M41.5 52 C41.5 48.5 42 46 43 44" stroke="#9A918A" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M78.5 52 C78.5 48.5 78 46 77 44" stroke="#9A918A" strokeWidth="1.6" strokeLinecap="round" />

          {/* rectangular glasses */}
          <g stroke="#2A1F18" strokeWidth="1.3">
            <rect x="46" y="52" width="12.5" height="8.5" rx="2.4" fill="#fff" fillOpacity="0.14" />
            <rect x="61.5" y="52" width="12.5" height="8.5" rx="2.4" fill="#fff" fillOpacity="0.14" />
            <path d="M58.5 55.5 L61.5 55.5" />
            <path d="M46 55 L42.5 54" />
            <path d="M74 55 L77.5 54" />
          </g>
        </>
      )}
    </Portrait>
  );
}

/* -------------------------------------------------------------------------- */
/* Persona Dispatcher Component                                               */
/* -------------------------------------------------------------------------- */
export function PersonaAvatar({
  kind,
  size = 'md',
  className,
}: {
  kind: PersonaKind | 'shaykh';
  size?: PersonaSize;
  className?: string;
}) {
  if (kind === 'doctor') return <DoctorAvatar size={size} className={className} />;
  if (kind === 'accountant') return <AccountantAvatar size={size} className={className} />;
  return <SheikhAvatar size={size} className={className} />;
}

/* -------------------------------------------------------------------------- */
/* Persona Intro Banner / Header (Used inside consultation chats)            */
/* -------------------------------------------------------------------------- */
export function PersonaCard({
  kind,
  title,
  subtitle,
  actions,
}: {
  kind: PersonaKind | 'shaykh';
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const normKind: PersonaKind = kind === 'shaykh' ? 'sheikh' : kind;

  const info: Record<PersonaKind, { name: string; role: string; desc: string; tone: string }> = {
    sheikh: {
      name: 'مساعد الحلال',
      role: 'فحص الحلال والمكونات',
      desc: 'تدقيق مكونات الأغذية والأدوية ومسائل التذكية والشبهات بالاستناد إلى الضوابط الفقهية المعتمدة.',
      tone: 'text-accent border-accent/30 bg-accent-soft/40',
    },
    doctor: {
      name: 'الطبيب',
      role: 'الاستشارة الصحية والغذائية',
      desc: 'تحليل تداخلات الأدوية والحساسيات وملاءمة الجرعات وفق ملفك الصحي الشخصي.',
      tone: 'text-info border-info/30 bg-info-soft/40',
    },
    accountant: {
      name: 'المحاسب',
      role: 'إدارة الميزانية والمصاريف',
      desc: 'مراقبة المصاريف اليومية وتحديد سقف الصرف وحساب الأيام المتبقية حتى الراتب القادم.',
      tone: 'text-warn border-warn/30 bg-warn-soft/40',
    },
  };

  const curr = info[normKind];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-e1 space-y-3 mb-3">
      <div className="flex items-center gap-3.5">
        <PersonaAvatar kind={normKind} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-base font-bold text-fg">{title ?? curr.name}</h2>
            <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold border', curr.tone)}>
              {curr.role}
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-1">
            {subtitle ?? curr.desc}
          </p>
        </div>
      </div>
      {actions ? <div className="pt-2 border-t border-line/60 flex gap-2">{actions}</div> : null}
    </div>
  );
}

