/**
 * Baraka v2 — Studio Character Personas
 * Handcrafted virtual personas for the three advisory desks:
 * 1. Sheikh (الشيخ): Sharia & Halal Ethical Advisor
 * 2. Doctor (الطبيب): Medical, Dietary & Allergy Advisor
 * 3. Accountant (المحاسب): Personal Finance, Payday & Budget Advisor
 * Designed with editorial precision, distinct silhouettes, and human warmth.
 */

import { type ReactNode } from 'react';
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
/* 1. THE SHEIKH (الشيخ — المستشار الشرعي للأطعمة والمعاملات)               */
/* Dignified scholar: White draped ghutrah, neat beard, gold glasses, bisht.   */
/* -------------------------------------------------------------------------- */
export function SheikhAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  const px = sizePx[size];
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center select-none', className)}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className="w-full h-full drop-shadow-sm"
        role="img"
        aria-label="المستشار الشرعي (الشيخ)"
        fill="none"
      >
        <defs>
          <radialGradient id="sh-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2A2416" />
            <stop offset="60%" stopColor="#171510" />
            <stop offset="100%" stopColor="#0D0C09" />
          </radialGradient>
          <linearGradient id="sh-gold" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5DF9E" />
            <stop offset="50%" stopColor="#C9983E" />
            <stop offset="100%" stopColor="#8A631E" />
          </linearGradient>
          <linearGradient id="sh-cloth" x1="0" y1="20" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FAF8F5" />
            <stop offset="100%" stopColor="#D8D4CC" />
          </linearGradient>
          <linearGradient id="sh-bisht" x1="0" y1="50" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E1C1A" />
            <stop offset="100%" stopColor="#11100F" />
          </linearGradient>
          <linearGradient id="sh-skin" x1="0" y1="30" x2="0" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8BF96" />
            <stop offset="100%" stopColor="#C99B6D" />
          </linearGradient>
        </defs>

        {/* Circular portrait frame */}
        <circle cx="50" cy="50" r="48" fill="url(#sh-bg)" stroke="url(#sh-gold)" strokeWidth="1.8" />

        {/* Bisht Cloak & Golden Collar Embroidery (Qasab) */}
        <path d="M12 96 C16 72 32 64 50 64 C68 64 84 72 88 96 Z" fill="url(#sh-bisht)" />
        {/* Golden bisht trim */}
        <path d="M42 64 L42 96 L46 96 L46 64 Z" fill="url(#sh-gold)" opacity="0.9" />
        <path d="M54 64 L54 96 L58 96 L58 64 Z" fill="url(#sh-gold)" opacity="0.9" />
        <path d="M46 68 L50 74 L54 68 Z" fill="url(#sh-gold)" />

        {/* Inner White Thobe Collar */}
        <path d="M44 60 L50 70 L56 60 Z" fill="#F8F6F0" />

        {/* Neck */}
        <path d="M44 50 C44 58 56 58 56 50 Z" fill="url(#sh-skin)" />

        {/* Dignified Face Shape */}
        <path d="M37 36 C37 25 63 25 63 36 C63 53 37 53 37 36 Z" fill="url(#sh-skin)" />

        {/* Scholarly Trimmed Beard */}
        <path
          d="M37 40 C37 60 45 66 50 66 C55 66 63 60 63 40 C63 46 59 52 50 54 C41 52 37 46 37 40 Z"
          fill="#42352B"
        />
        {/* Moustache */}
        <path d="M43 47 C46 45 54 45 57 47 C55 49 45 49 43 47 Z" fill="#362B23" />

        {/* Gentle Eyes */}
        <ellipse cx="44" cy="38" rx="2" ry="1.4" fill="#29201A" />
        <ellipse cx="56" cy="38" rx="2" ry="1.4" fill="#29201A" />

        {/* Thin Gold Wireframe Spectacles */}
        <circle cx="44" cy="38" r="5" stroke="url(#sh-gold)" strokeWidth="1" fill="none" />
        <circle cx="56" cy="38" r="5" stroke="url(#sh-gold)" strokeWidth="1" fill="none" />
        <path d="M49 38 L51 38" stroke="url(#sh-gold)" strokeWidth="1" />
        <path d="M39 37 L35 36" stroke="url(#sh-gold)" strokeWidth="0.8" />
        <path d="M61 37 L65 36" stroke="url(#sh-gold)" strokeWidth="0.8" />

        {/* Pristine Draped Ghutrah (Headcloth) */}
        <path
          d="M30 26 C33 16 67 16 70 26 C73 34 76 50 78 72 C74 74 70 65 67 48 C67 30 33 30 33 48 C30 65 26 74 22 72 C24 50 27 34 30 26 Z"
          fill="url(#sh-cloth)"
        />
        {/* Subtle drape shadow under ghutrah */}
        <path d="M34 26 C42 22 58 22 66 26 C64 24 36 24 34 26 Z" fill="#C5C0B6" />

        {/* Black Agal with Gold Accent Thread */}
        <ellipse cx="50" cy="24" rx="19" ry="4.5" stroke="#161514" strokeWidth="3" fill="none" />
        <ellipse cx="50" cy="22.5" rx="18.5" ry="4" stroke="url(#sh-gold)" strokeWidth="0.8" fill="none" opacity="0.85" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. THE DOCTOR (الطبيب — المستشار الطبي والتغذوي)                           */
/* Professional physician: White lab coat, stethoscope, navy scrub, glasses.   */
/* -------------------------------------------------------------------------- */
export function DoctorAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  const px = sizePx[size];
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center select-none', className)}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className="w-full h-full drop-shadow-sm"
        role="img"
        aria-label="المستشار الطبي (الطبيب)"
        fill="none"
      >
        <defs>
          <radialGradient id="doc-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#162638" />
            <stop offset="60%" stopColor="#0F1824" />
            <stop offset="100%" stopColor="#090E17" />
          </radialGradient>
          <linearGradient id="doc-cyan" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="doc-coat" x1="0" y1="45" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="doc-scrub" x1="0" y1="55" x2="0" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#0F1E33" />
          </linearGradient>
          <linearGradient id="doc-skin" x1="0" y1="28" x2="0" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5D0B5" />
            <stop offset="100%" stopColor="#DCAB89" />
          </linearGradient>
          <linearGradient id="doc-hair" x1="0" y1="12" x2="0" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#332A24" />
            <stop offset="100%" stopColor="#1E1712" />
          </linearGradient>
        </defs>

        {/* Circular portrait frame */}
        <circle cx="50" cy="50" r="48" fill="url(#doc-bg)" stroke="url(#doc-cyan)" strokeWidth="1.8" />

        {/* Physician White Coat Shoulders */}
        <path d="M12 96 C16 70 32 62 50 62 C68 62 84 70 88 96 Z" fill="url(#doc-coat)" />

        {/* Inner Navy Medical Scrub (V-neck) */}
        <path d="M40 62 L50 82 L60 62 Z" fill="url(#doc-scrub)" />

        {/* Coat Lapels */}
        <path d="M34 62 L44 86 L36 96 L22 96 Z" fill="#F1F5F9" />
        <path d="M66 62 L56 86 L64 96 L78 96 Z" fill="#E2E8F0" />

        {/* Stethoscope Tubing and Bell */}
        <path
          d="M36 64 C36 78 44 88 50 88 C56 88 64 78 64 64"
          stroke="#475569"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Chest piece / bell */}
        <circle cx="50" cy="88" r="4" fill="#94A3B8" stroke="#334155" strokeWidth="1.2" />
        <circle cx="50" cy="88" r="1.8" fill="#38BDF8" />

        {/* Neck */}
        <path d="M43 48 C43 57 57 57 57 48 Z" fill="url(#doc-skin)" />

        {/* Head / Face */}
        <ellipse cx="50" cy="38" rx="14" ry="16" fill="url(#doc-skin)" />

        {/* Professional Hair */}
        <path
          d="M34 32 C34 18 66 18 66 32 C66 22 60 16 50 16 C40 16 34 22 34 32 Z"
          fill="url(#doc-hair)"
        />
        <path d="M34 32 C34 37 36 42 37 44 C35 40 35 34 36 32 Z" fill="url(#doc-hair)" />
        <path d="M66 32 C66 37 64 42 63 44 C65 40 65 34 64 32 Z" fill="url(#doc-hair)" />

        {/* Eyes & Warm Caring Smile */}
        <ellipse cx="44" cy="38" rx="1.8" ry="1.2" fill="#1E293B" />
        <ellipse cx="56" cy="38" rx="1.8" ry="1.2" fill="#1E293B" />
        <path d="M46 46 C48 48 52 48 54 46" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Sleek Medical Eyewear */}
        <rect x="38" y="33" width="11" height="9" rx="3" stroke="#38BDF8" strokeWidth="1.2" fill="none" opacity="0.9" />
        <rect x="51" y="33" width="11" height="9" rx="3" stroke="#38BDF8" strokeWidth="1.2" fill="none" opacity="0.9" />
        <path d="M49 37 L51 37" stroke="#38BDF8" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. THE ACCOUNTANT (المحاسب — المستشار المالي ومراقب الميزانية)             */
/* Savvy wealth advisor: Charcoal tailored vest, gold tie pin, smart glasses.   */
/* -------------------------------------------------------------------------- */
export function AccountantAvatar({ size = 'md', className }: { size?: PersonaSize; className?: string }) {
  const px = sizePx[size];
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center select-none', className)}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className="w-full h-full drop-shadow-sm"
        role="img"
        aria-label="المستشار المالي (المحاسب)"
        fill="none"
      >
        <defs>
          <radialGradient id="acc-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2D2114" />
            <stop offset="60%" stopColor="#1C140C" />
            <stop offset="100%" stopColor="#0E0905" />
          </radialGradient>
          <linearGradient id="acc-amber" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="acc-suit" x1="0" y1="50" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#26262B" />
            <stop offset="100%" stopColor="#141417" />
          </linearGradient>
          <linearGradient id="acc-skin" x1="0" y1="28" x2="0" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F3D2B8" />
            <stop offset="100%" stopColor="#D3A786" />
          </linearGradient>
          <linearGradient id="acc-tie" x1="0" y1="62" x2="0" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C9983E" />
            <stop offset="100%" stopColor="#8A631E" />
          </linearGradient>
        </defs>

        {/* Circular portrait frame */}
        <circle cx="50" cy="50" r="48" fill="url(#acc-bg)" stroke="url(#acc-amber)" strokeWidth="1.8" />

        {/* Tailored Suit Shoulders */}
        <path d="M12 96 C16 70 32 60 50 60 C68 60 84 70 88 96 Z" fill="url(#acc-suit)" />

        {/* Crisp Shirt Front */}
        <path d="M42 60 L50 82 L58 60 Z" fill="#F8FAFC" />

        {/* Refined Gold Tie */}
        <path d="M48 64 L52 64 L54 84 L50 88 L46 84 Z" fill="url(#acc-tie)" />
        {/* Tie clip */}
        <path d="M47 73 L53 73" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" />

        {/* Vest Lapels */}
        <path d="M32 60 L44 84 L38 96 L20 96 Z" fill="#1E1E22" />
        <path d="M68 60 L56 84 L62 96 L80 96 Z" fill="#1A1A1E" />

        {/* Neck */}
        <path d="M44 48 C44 56 56 56 56 48 Z" fill="url(#acc-skin)" />

        {/* Head / Face */}
        <ellipse cx="50" cy="37" rx="13.5" ry="15.5" fill="url(#acc-skin)" />

        {/* Neat Professional Haircut */}
        <path
          d="M35 30 C35 17 65 17 65 30 C65 20 58 15 50 15 C42 15 35 20 35 30 Z"
          fill="#2B241E"
        />
        <path d="M35 30 C35 36 36 40 37 42 C35 38 35 32 36 30 Z" fill="#2B241E" />

        {/* Confident Eyes & Smile */}
        <ellipse cx="44" cy="37" rx="1.8" ry="1.2" fill="#1C140C" />
        <ellipse cx="56" cy="37" rx="1.8" ry="1.2" fill="#1C140C" />
        <path d="M46 45 C48 47 52 47 54 45" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Sophisticated Architectural Glasses */}
        <rect x="38" y="32" width="11" height="8.5" rx="2" stroke="url(#acc-amber)" strokeWidth="1.1" fill="none" />
        <rect x="51" y="32" width="11" height="8.5" rx="2" stroke="url(#acc-amber)" strokeWidth="1.1" fill="none" />
        <path d="M49 36 L51 36" stroke="url(#acc-amber)" strokeWidth="1.1" />
      </svg>
    </div>
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
      name: 'المستشار الشرعي (الشيخ)',
      role: 'فحص الحلال والتوجيه الأخلاقي',
      desc: 'تدقيق مكونات الأطعمة والأدوية ومسائل الذبح والشبهات بناءً على الفقه الإسلامي المعتمد.',
      tone: 'text-accent border-accent/30 bg-accent-soft/40',
    },
    doctor: {
      name: 'المستشار الصحي (الطبيب)',
      role: 'التوجيه الغذائي والمحاذير الطبية',
      desc: 'تحليل تداخلات الأدوية والحساسيات وملاءمة الجرعات وفق ملفك الصحي الشخصي.',
      tone: 'text-info border-info/30 bg-info-soft/40',
    },
    accountant: {
      name: 'المستشار المالي (المحاسب)',
      role: 'إدارة الميزانية ودورة الراتب',
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
