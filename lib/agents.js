// Конфигурация трёх AI-агентов
// Системные промпты живут на бэкенде в /api/chat для безопасности

export const AGENTS = {
  doctor: {
    id: 'doctor',
    name: 'Аружан',
    title: 'Медицинский ассистент',
    role: 'Доктор',
    accent: 'rose',
    gradient: 'from-rose-400 via-pink-500 to-red-500',
    softBg: 'bg-rose-50',
    softBorder: 'border-rose-200',
    textColor: 'text-rose-700',
    iconName: 'Stethoscope',
    description: 'Расшифровка анализов, советы по здоровому образу жизни, питанию и сну',
    disclaimer: 'Не заменяет консультацию врача. При серьёзных симптомах — обратитесь в клинику.',
    suggestions: [
      'Расшифруй мой анализ крови',
      'Какие нормы по гемоглобину?',
      'Как улучшить качество сна?',
      'Что есть при низком железе?'
    ]
  },
  lawyer: {
    id: 'lawyer',
    name: 'Дамир',
    title: 'Правовой ассистент',
    role: 'Юрист',
    accent: 'blue',
    gradient: 'from-blue-500 via-indigo-500 to-violet-600',
    softBg: 'bg-blue-50',
    softBorder: 'border-blue-200',
    textColor: 'text-blue-700',
    iconName: 'Scale',
    description: 'Информационные справки по законам РК, проверка документов',
    disclaimer: 'Это информационная справка, не юридическое заключение. Для важных вопросов — к юристу.',
    suggestions: [
      'Могут ли уволить за опоздание?',
      'Как открыть ИП в Казахстане?',
      'Права при покупке квартиры',
      'Что делать при ДТП?'
    ]
  },
  financier: {
    id: 'financier',
    name: 'Ержан',
    title: 'Финансовый ассистент',
    role: 'Финансист',
    accent: 'emerald',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    softBg: 'bg-emerald-50',
    softBorder: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconName: 'Wallet',
    description: 'Планирование бюджета, налоги ИП, финансовая грамотность в РК',
    disclaimer: 'Это образовательная информация, не инвестиционная рекомендация.',
    suggestions: [
      'Распиши бюджет с зарплатой 350000 ₸',
      'Налоги ИП по упрощёнке',
      'Какой депозит выгоднее в РК?',
      'Сколько копить на подушку?'
    ]
  }
};
