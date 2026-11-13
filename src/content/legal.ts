/**
 * Legal templates (privacy policy + terms). These are STARTING TEMPLATES —
 * have them reviewed by a lawyer before launch (see README, incl. 152-FZ).
 */

import type { Locale } from '../../shared/types';

export interface LegalSection {
  title: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export const LEGAL: Record<Locale, { privacy: LegalDoc; terms: LegalDoc }> = {
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      updated: 'آخر تحديث: نوفمبر 2026',
      sections: [
        {
          title: '1. ما نجمعه',
          body: [
            'بيانات الحساب: بريد جوجل ومعرّف المستخدم (uid) الذي يُصدره Firebase.',
            'بيانات صحية تطوعية: العمر، الطول، الوزن، الأمراض، الأدوية، الحساسية، والحمل/الرضاعة إن أدخلتها.',
            'بيانات مالية: مصادر الدخل، المصاريف الثابتة، الرصيد، والمعاملات التي تسجّلها.',
            'الصور التي ترسلها للتحليل (مكوّنات طعام، دواء، فاتورة أو لقطة بنكية) بعد ضغطها وتصغيرها.',
          ],
        },
        {
          title: '2. لماذا نعالجها',
          body: [
            'لتقديم فحص الحلال والتحليل الطبي والمحاسبة الذكية داخل التطبيق فقط.',
            'نعالج البيانات بموجب موافقتك الصريحة التي تمنحها في شاشة البداية، ويمكنك سحبها بحذف حسابك.',
          ],
        },
        {
          title: '3. من يراها',
          body: [
            'بياناتك مرتبطة بمعرّف حسابك، وكل استعلام في قاعدة البيانات مقيّد بهذا المعرّف.',
            'عند طلب تحليل، يُرسل النص أو الصورة إلى مزوّد الذكاء الاصطناعي (بوابة Gemma) لمعالجتها وإرجاع النتيجة، دون اسمك أو بريدك.',
            'لا نبيع بياناتك ولا نشاركها مع معلنين.',
          ],
        },
        {
          title: '4. الاحتفاظ والحذف',
          body: [
            'تبقى بياناتك حتى تحذف حسابك. الحذف يزيل مستخدم Firebase وكل الصفوف والصور المرتبطة بك نهائياً.',
            'يمكنك تصدير بياناتك بصيغة JSON من صفحة الملف الشخصي في أي وقت.',
          ],
        },
        {
          title: '5. الأمان والموقع',
          body: [
            'نستخدم تشفير النقل (HTTPS)، وحدود معدل الطلبات، وعدم تسجيل البيانات الصحية أو المالية أو الصور في السجلات.',
            'تُعالج البيانات على شبكة Cloudflare. إذا كنت في روسيا فانتبه إلى متطلبات القانون الاتحادي 152-FZ بشأن توطين البيانات، وراجع مستشارك القانوني قبل الإطلاق التجاري.',
          ],
        },
        {
          title: '6. التواصل',
          body: ['لأي طلب يتعلق ببياناتك، تواصل معنا عبر البريد المذكور في صفحة «عن التطبيق».'],
        },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      updated: 'آخر تحديث: نوفمبر 2026',
      sections: [
        {
          title: '1. طبيعة الخدمة',
          body: [
            'بركة تطبيق معلوماتي: فحص حلال، معلومات صحية، وتنظيم مالي. ليس فتوى شرعية ولا تشخيصاً طبياً ولا استشارة مالية مرخّصة.',
            'القرارات التي تتخذها بناءً على التطبيق مسؤوليتك وحدك.',
          ],
        },
        {
          title: '2. الذكاء الاصطناعي',
          body: [
            'التحليلات يولّدها نموذج لغوي وقد تخطئ أو تختلق تفاصيل. تحقّق من ملصق المنتج أو النشرة الدوائية أو راجع مختصاً.',
            'في الحالات الطارئة اتصل بالرقم 112 فوراً ولا تعتمد على التطبيق.',
          ],
        },
        {
          title: '3. الاستخدام المقبول',
          body: [
            'لا تستخدم التطبيق لتحليل محتوى غير قانوني أو لمحاولة تجاوز الحدود والاشتراكات.',
            'الحساب شخصي، ويُمنع مشاركته أو أتمتة الطلبات بشكل مفرط.',
          ],
        },
        {
          title: '4. الحدود والتوفر',
          body: [
            'قد نحدّ عدد طلبات الذكاء الاصطناعي لكل مستخدم (مثلاً 30 في الساعة) للحفاظ على الخدمة.',
            'قد تتوقف الخدمة مؤقتاً للصيانة أو لأسباب خارجة عن إرادتنا، دون ضمان توفر دائم.',
          ],
        },
        {
          title: '5. الحساب والإنهاء',
          body: [
            'يمكنك حذف حسابك وبياناتك في أي وقت من صفحة الملف الشخصي.',
            'قد نوقف الحساب عند إساءة الاستخدام أو محاولة الإضرار بالخدمة أو بالآخرين.',
          ],
        },
      ],
    },
  },
  ru: {
    privacy: {
      title: 'Политика конфиденциальности',
      updated: 'Обновлено: ноябрь 2026',
      sections: [
        {
          title: '1. Какие данные мы собираем',
          body: [
            'Данные аккаунта: e-mail Google и идентификатор пользователя (uid) от Firebase.',
            'Данные о здоровье, которые вы вводите сами: возраст, рост, вес, болезни, лекарства, аллергии, беременность.',
            'Финансовые данные: источники дохода, постоянные расходы, баланс и операции, которые вы записываете.',
            'Фотографии для анализа (состав продукта, лекарство, чек, скриншот банка) после сжатия.',
          ],
        },
        {
          title: '2. Зачем мы их обрабатываем',
          body: [
            'Только для работы функций приложения: проверка халяль, медицинские пояснения и финансовый план.',
            'Правовое основание — ваше явное согласие на первом экране; вы можете отозвать его, удалив аккаунт.',
          ],
        },
        {
          title: '3. Кто их видит',
          body: [
            'Данные привязаны к вашему uid, и каждый запрос к базе фильтруется по нему.',
            'Для анализа текст или фото отправляются поставщику ИИ (шлюз Gemma) без вашего имени и e-mail.',
            'Мы не продаём данные и не передаём их рекламным сетям.',
          ],
        },
        {
          title: '4. Хранение и удаление',
          body: [
            'Данные хранятся до удаления аккаунта. Удаление стирает пользователя Firebase и все связанные записи и изображения.',
            'Экспорт в JSON доступен в любой момент в профиле.',
          ],
        },
        {
          title: '5. Безопасность и размещение',
          body: [
            'Мы используем HTTPS, ограничение частоты запросов и не пишем в логи данные о здоровье, финансах и изображения.',
            'Данные обрабатываются в сети Cloudflare. Если вы работаете в России, учитывайте требования 152-ФЗ о локализации персональных данных и проконсультируйтесь с юристом до коммерческого запуска.',
          ],
        },
        {
          title: '6. Контакты',
          body: ['По вопросам данных пишите на адрес, указанный в разделе «О приложении».'],
        },
      ],
    },
    terms: {
      title: 'Условия использования',
      updated: 'Обновлено: ноябрь 2026',
      sections: [
        {
          title: '1. Что это за сервис',
          body: [
            'Baraka — информационное приложение: проверка халяль, справочная информация о здоровье и помощь в планировании денег.',
            'Это не фетва, не медицинский диагноз и не лицензированная финансовая консультация. Решения принимаете вы.',
          ],
        },
        {
          title: '2. Искусственный интеллект',
          body: [
            'Ответы генерирует языковая модель, она может ошибаться. Всегда проверяйте состав на упаковке и инструкцию к лекарству.',
            'В экстренной ситуации звоните 112 и не полагайтесь на приложение.',
          ],
        },
        {
          title: '3. Допустимое использование',
          body: [
            'Нельзя анализировать незаконный контент и пытаться обходить лимиты.',
            'Аккаунт личный: не передавайте его другим и не автоматизируйте запросы.',
          ],
        },
        {
          title: '4. Лимиты и доступность',
          body: [
            'Мы ограничиваем число запросов к ИИ на пользователя (например, 30 в час), чтобы сервис работал для всех.',
            'Сервис может быть временно недоступен из-за обслуживания; постоянная доступность не гарантируется.',
          ],
        },
        {
          title: '5. Аккаунт',
          body: [
            'Вы можете удалить аккаунт и данные в любой момент в профиле.',
            'Мы можем заблокировать аккаунт при злоупотреблении сервисом.',
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy policy',
      updated: 'Updated: November 2026',
      sections: [
        {
          title: '1. What we collect',
          body: [
            'Account data: your Google e-mail and the Firebase user id (uid).',
            'Health data you choose to enter: age, height, weight, conditions, medicines, allergies, pregnancy/breastfeeding.',
            'Money data: income sources, fixed expenses, balance and the transactions you record.',
            'Photos you send for analysis (food label, medicine box, receipt, bank screenshot) after compression.',
          ],
        },
        {
          title: '2. Why we process it',
          body: [
            'Only to run the app features: halal checks, health explanations and the money plan.',
            'The legal basis is your explicit consent on the first screen; you can withdraw it by deleting your account.',
          ],
        },
        {
          title: '3. Who can see it',
          body: [
            'Every record is bound to your uid and each database query is filtered by it.',
            'For analysis, the text or photo is sent to the AI provider (Gemma gateway) without your name or e-mail.',
            'We never sell your data or share it with advertisers.',
          ],
        },
        {
          title: '4. Retention and deletion',
          body: [
            'Data is kept until you delete your account. Deletion removes the Firebase user plus every related row and image.',
            'You can export your data as JSON from the profile at any time.',
          ],
        },
        {
          title: '5. Security and location',
          body: [
            'We use HTTPS, per-user rate limits and never log health data, money data or images.',
            'Data is processed on the Cloudflare network. If you operate in Russia, note the 152-FZ data-localisation requirements and get legal advice before a commercial launch.',
          ],
        },
        {
          title: '6. Contact',
          body: ['For any data request, use the address listed on the About page.'],
        },
      ],
    },
    terms: {
      title: 'Terms of use',
      updated: 'Updated: November 2026',
      sections: [
        {
          title: '1. What this service is',
          body: [
            'Baraka is an information app: halal checking, health information and money planning.',
            'It is not a fatwa, not a medical diagnosis and not licensed financial advice. Decisions are yours.',
          ],
        },
        {
          title: '2. Artificial intelligence',
          body: [
            'Answers are generated by a language model and can be wrong. Always verify the label and the medicine leaflet.',
            'In an emergency call 112 and do not rely on the app.',
          ],
        },
        {
          title: '3. Acceptable use',
          body: [
            'Do not analyse unlawful content or attempt to bypass limits.',
            'The account is personal: do not share it and do not automate requests.',
          ],
        },
        {
          title: '4. Limits and availability',
          body: [
            'We limit AI requests per user (for example 30 per hour) so the service stays available for everyone.',
            'The service may be temporarily unavailable for maintenance; uptime is not guaranteed.',
          ],
        },
        {
          title: '5. Account',
          body: [
            'You can delete your account and data at any time from the profile.',
            'We may suspend an account that abuses the service.',
          ],
        },
      ],
    },
  },
};
