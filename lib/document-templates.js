// База шаблонов документов для граждан РК
// Каждый шаблон: метаданные + список полей + текст с плейсхолдерами {field_name}

export const DOCUMENT_CATEGORIES = {
  contracts: { label: 'Договоры', icon: '📜' },
  statements: { label: 'Заявления', icon: '✍️' },
  proxies: { label: 'Доверенности', icon: '🤝' },
  claims: { label: 'Претензии и иски', icon: '⚖️' },
  receipts: { label: 'Расписки', icon: '🧾' }
};

export const TEMPLATES = [
  // === РАСПИСКА ===
  {
    id: 'raspiska_zaim',
    category: 'receipts',
    title: 'Расписка о получении денег в долг',
    description: 'Простая расписка между физлицами при займе денег',
    legalNotes: 'По ст. 715-722 ГК РК. Имеет силу при сумме > 100 МРП обязательна письменная форма. Подпись составителя ОБЯЗАТЕЛЬНА.',
    fields: [
      { name: 'borrower_name', label: 'ФИО заёмщика (кто берёт)', type: 'text', required: true, placeholder: 'Иванов Иван Иванович' },
      { name: 'borrower_iin', label: 'ИИН заёмщика', type: 'text', required: true, placeholder: '880101000000' },
      { name: 'borrower_address', label: 'Адрес проживания заёмщика', type: 'text', required: true, placeholder: 'г. Алматы, ул. Абая 10, кв. 5' },
      { name: 'lender_name', label: 'ФИО займодателя (кто даёт)', type: 'text', required: true },
      { name: 'lender_iin', label: 'ИИН займодателя', type: 'text', required: true },
      { name: 'amount', label: 'Сумма займа (в тенге)', type: 'number', required: true, placeholder: '500000' },
      { name: 'amount_words', label: 'Сумма прописью', type: 'text', required: true, placeholder: 'Пятьсот тысяч' },
      { name: 'return_date', label: 'Дата возврата', type: 'date', required: true },
      { name: 'percent', label: 'Процент за пользование (% годовых, 0 если беспроцентный)', type: 'number', required: false, default: 0 },
      { name: 'city', label: 'Город составления', type: 'text', required: true, placeholder: 'Алматы' },
      { name: 'date', label: 'Дата составления', type: 'date', required: true }
    ],
    template: `РАСПИСКА

г. {city}                                                                       {date}

Я, {borrower_name}, ИИН {borrower_iin}, проживающий по адресу: {borrower_address}, получил от {lender_name}, ИИН {lender_iin}, денежные средства в размере {amount} ({amount_words}) тенге в качестве займа.

Обязуюсь вернуть указанную сумму полностью в срок до {return_date}.

{percent_clause}

Сумма получена мной лично, наличными денежными средствами, в полном объёме.

Настоящая расписка составлена мной собственноручно, в здравом уме и твёрдой памяти, без принуждения.

___________________________ /{borrower_name}/
(подпись заёмщика, расшифровка)

{date}`,
    postProcess: (fields) => {
      // Сгенерировать пункт про проценты
      const p = parseFloat(fields.percent) || 0;
      fields.percent_clause = p > 0
        ? `За пользование денежными средствами обязуюсь уплатить проценты в размере ${p}% годовых от суммы займа.`
        : 'Заём является беспроцентным.';
      return fields;
    }
  },

  // === ДОГОВОР АРЕНДЫ КВАРТИРЫ ===
  {
    id: 'arenda_kvartiry',
    category: 'contracts',
    title: 'Договор аренды (найма) квартиры',
    description: 'Стандартный договор найма жилья между физлицами',
    legalNotes: 'По ст. 540-571 ГК РК. Письменная форма. Капремонт — обязанность наймодателя, текущий — нанимателя.',
    fields: [
      { name: 'landlord_name', label: 'ФИО наймодателя (кто сдаёт)', type: 'text', required: true },
      { name: 'landlord_iin', label: 'ИИН наймодателя', type: 'text', required: true },
      { name: 'landlord_passport', label: 'Документ наймодателя (удостоверение №)', type: 'text', required: true, placeholder: '№ 000000000' },
      { name: 'tenant_name', label: 'ФИО нанимателя (кто снимает)', type: 'text', required: true },
      { name: 'tenant_iin', label: 'ИИН нанимателя', type: 'text', required: true },
      { name: 'tenant_passport', label: 'Документ нанимателя (удостоверение №)', type: 'text', required: true },
      { name: 'address', label: 'Полный адрес квартиры', type: 'text', required: true, placeholder: 'г. Алматы, ул. Абая 10, кв. 5' },
      { name: 'rooms', label: 'Количество комнат', type: 'number', required: true, default: 2 },
      { name: 'area', label: 'Площадь (м²)', type: 'number', required: true, placeholder: '55' },
      { name: 'rent_amount', label: 'Аренда в месяц (тенге)', type: 'number', required: true, placeholder: '200000' },
      { name: 'deposit', label: 'Залог (тенге, 0 если нет)', type: 'number', required: false, default: 0 },
      { name: 'term_months', label: 'Срок аренды (месяцев)', type: 'number', required: true, default: 12 },
      { name: 'start_date', label: 'Дата начала аренды', type: 'date', required: true },
      { name: 'city', label: 'Город составления', type: 'text', required: true },
      { name: 'date', label: 'Дата подписания', type: 'date', required: true }
    ],
    template: `ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ

г. {city}                                                                       {date}

{landlord_name}, ИИН {landlord_iin}, документ {landlord_passport}, именуемый в дальнейшем «Наймодатель», с одной стороны, и {tenant_name}, ИИН {tenant_iin}, документ {tenant_passport}, именуемый в дальнейшем «Наниматель», с другой стороны, заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Наймодатель передаёт, а Наниматель принимает во временное возмездное пользование жилое помещение, расположенное по адресу: {address}, общей площадью {area} м², состоящее из {rooms} комнат(ы).
1.2. Помещение передаётся для проживания.

2. СРОК ДОГОВОРА
2.1. Договор заключён сроком на {term_months} месяцев.
2.2. Срок начинается с {start_date}.

3. ПЛАТА ЗА НАЁМ
3.1. Размер ежемесячной платы — {rent_amount} тенге.
3.2. Оплата производится не позднее 5 числа каждого месяца.
3.3. Залог: {deposit} тенге, возвращается при окончании договора при отсутствии ущерба.
3.4. Коммунальные услуги оплачивает Наниматель.

4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
4.1. Наймодатель обязан:
— передать помещение в пригодном для проживания состоянии;
— производить капитальный ремонт за свой счёт;
— не входить в помещение без предварительного уведомления Нанимателя.
4.2. Наниматель обязан:
— использовать помещение только по назначению;
— содержать помещение в порядке;
— производить текущий ремонт за свой счёт;
— своевременно вносить плату;
— не передавать помещение третьим лицам без письменного согласия Наймодателя.

5. ОТВЕТСТВЕННОСТЬ СТОРОН
5.1. За просрочку платы — пеня 0,1% от суммы за каждый день просрочки.
5.2. За ущерб имуществу — возмещение в полном объёме.

6. ПРЕКРАЩЕНИЕ ДОГОВОРА
6.1. Любая сторона может расторгнуть договор с уведомлением за 30 дней.
6.2. При досрочном расторжении залог возвращается за вычетом возможного ущерба.

7. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

НАЙМОДАТЕЛЬ:                              НАНИМАТЕЛЬ:
{landlord_name}                            {tenant_name}
ИИН: {landlord_iin}                        ИИН: {tenant_iin}

___________________                        ___________________
(подпись)                                  (подпись)`
  },

  // === ДОГОВОР ОКАЗАНИЯ УСЛУГ ===
  {
    id: 'dogovor_uslug',
    category: 'contracts',
    title: 'Договор оказания услуг',
    description: 'Для фрилансеров, репетиторов, мастеров — оказание услуг физлицу',
    legalNotes: 'По ст. 683-687 ГК РК. Подходит для непроизводственных услуг (консультации, образование, репетиторство).',
    fields: [
      { name: 'executor_name', label: 'ФИО исполнителя (кто оказывает услугу)', type: 'text', required: true },
      { name: 'executor_iin', label: 'ИИН исполнителя', type: 'text', required: true },
      { name: 'customer_name', label: 'ФИО заказчика (кому)', type: 'text', required: true },
      { name: 'customer_iin', label: 'ИИН заказчика', type: 'text', required: true },
      { name: 'service_description', label: 'Описание услуги', type: 'textarea', required: true, placeholder: 'Например: репетиторство по математике, индивидуальные занятия 2 раза в неделю по 90 минут' },
      { name: 'service_period', label: 'Срок оказания (с какого по какое)', type: 'text', required: true, placeholder: 'с 1 февраля по 31 мая 2026 года' },
      { name: 'price', label: 'Стоимость услуги (тенге)', type: 'number', required: true },
      { name: 'payment_terms', label: 'Условия оплаты', type: 'text', required: true, placeholder: 'ежемесячно до 10 числа / по факту / 50% предоплата' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР ОКАЗАНИЯ УСЛУГ

г. {city}                                                                       {date}

{executor_name}, ИИН {executor_iin}, именуемый в дальнейшем «Исполнитель», и {customer_name}, ИИН {customer_iin}, именуемый в дальнейшем «Заказчик», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Заказчику следующие услуги:
{service_description}
1.2. Срок оказания услуг: {service_period}.

2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ
2.1. Общая стоимость услуг по настоящему Договору составляет {price} тенге.
2.2. Порядок оплаты: {payment_terms}.

3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
3.1. Исполнитель обязан:
— оказать услуги качественно и в срок;
— использовать профессиональные знания и навыки;
— соблюдать конфиденциальность информации Заказчика.
3.2. Заказчик обязан:
— своевременно оплачивать услуги в установленном порядке;
— предоставить Исполнителю необходимую информацию для оказания услуг.

4. ОТВЕТСТВЕННОСТЬ СТОРОН
4.1. За нарушение сроков оказания услуг Исполнитель уплачивает пеню в размере 0,1% за каждый день просрочки.
4.2. За просрочку оплаты Заказчик уплачивает пеню 0,1% за каждый день.
4.3. Стороны освобождаются от ответственности в случае обстоятельств непреодолимой силы.

5. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ
5.1. Споры разрешаются путём переговоров.
5.2. Не урегулированные споры рассматриваются в суде по месту жительства ответчика.

6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
6.1. Договор составлен в двух экземплярах, по одному для каждой стороны.
6.2. Изменения и дополнения действительны только в письменной форме, подписанные обеими сторонами.

7. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:                               ЗАКАЗЧИК:
{executor_name}                            {customer_name}
ИИН: {executor_iin}                        ИИН: {customer_iin}

___________________                        ___________________
(подпись)                                  (подпись)`
  },

  // === ЗАЯВЛЕНИЕ ОБ УВОЛЬНЕНИИ ===
  {
    id: 'zayavl_uvolnenie',
    category: 'statements',
    title: 'Заявление об увольнении по собственному желанию',
    description: 'Для подачи работодателю при уходе с работы',
    legalNotes: 'По ст. 56 ТК РК. Подаётся за 1 месяц до даты увольнения. Возможно по соглашению — раньше.',
    fields: [
      { name: 'employer_name', label: 'Полное наименование организации', type: 'text', required: true, placeholder: 'ТОО «Ромашка»' },
      { name: 'director_name', label: 'ФИО руководителя (кому пишете)', type: 'text', required: true, placeholder: 'Иванову И.И.' },
      { name: 'director_position', label: 'Должность руководителя', type: 'text', required: true, default: 'Генеральному директору' },
      { name: 'employee_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'employee_position', label: 'Ваша должность', type: 'text', required: true },
      { name: 'department', label: 'Отдел (если есть)', type: 'text', required: false },
      { name: 'last_work_date', label: 'Желаемая дата последнего рабочего дня', type: 'date', required: true },
      { name: 'reason', label: 'Причина (необязательно)', type: 'text', required: false, placeholder: 'в связи с переездом / по семейным обстоятельствам' },
      { name: 'date', label: 'Дата подачи заявления', type: 'date', required: true }
    ],
    template: `{director_position}
{employer_name}
{director_name}

от {employee_name},
{employee_position}{department_line}


ЗАЯВЛЕНИЕ

Прошу расторгнуть со мной трудовой договор по собственному желанию (на основании ст. 56 Трудового кодекса РК) с {last_work_date}.

{reason_line}

Прошу произвести окончательный расчёт и выдать трудовую книжку (при наличии) в последний рабочий день.

{date}                                                  ___________________
                                                        ({employee_name})`,
    postProcess: (fields) => {
      fields.department_line = fields.department ? `\n${fields.department}` : '';
      fields.reason_line = fields.reason ? `Причина: ${fields.reason}.\n` : '';
      return fields;
    }
  },

  // === ДОВЕРЕННОСТЬ ===
  {
    id: 'doverennost_obshchaya',
    category: 'proxies',
    title: 'Доверенность общая (в простой письменной форме)',
    description: 'Для представления интересов в госорганах, банках и т.д.',
    legalNotes: 'По ст. 162-167 ГК РК. Для некоторых действий (сделки с недвижимостью, выезд ребёнка) нужна нотариальная форма.',
    fields: [
      { name: 'principal_name', label: 'ФИО доверителя (кто даёт доверенность)', type: 'text', required: true },
      { name: 'principal_iin', label: 'ИИН доверителя', type: 'text', required: true },
      { name: 'principal_passport', label: 'Документ доверителя (удостоверение №)', type: 'text', required: true },
      { name: 'principal_address', label: 'Адрес доверителя', type: 'text', required: true },
      { name: 'agent_name', label: 'ФИО представителя (кому)', type: 'text', required: true },
      { name: 'agent_iin', label: 'ИИН представителя', type: 'text', required: true },
      { name: 'agent_passport', label: 'Документ представителя (удостоверение №)', type: 'text', required: true },
      { name: 'agent_address', label: 'Адрес представителя', type: 'text', required: true },
      { name: 'actions', label: 'Какие действия доверяю', type: 'textarea', required: true, placeholder: 'представлять мои интересы в банках, получать справки, подписывать документы' },
      { name: 'valid_until', label: 'Действительна до', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата выдачи', type: 'date', required: true }
    ],
    template: `ДОВЕРЕННОСТЬ

г. {city}                                                                       {date}

Я, {principal_name}, ИИН {principal_iin}, документ удостоверяющий личность {principal_passport}, проживающий по адресу: {principal_address}, настоящей доверенностью уполномочиваю:

{agent_name}, ИИН {agent_iin}, документ удостоверяющий личность {agent_passport}, проживающего по адресу: {agent_address},

— на следующие действия от моего имени:
{actions}

Для выполнения указанных полномочий уполномочиваю расписываться за меня, получать необходимые справки и документы, совершать иные действия, связанные с выполнением данного поручения.

Доверенность выдана сроком до {valid_until}, без права передоверия.

___________________________ /{principal_name}/
(подпись доверителя)`
  },

  // === ПРЕТЕНЗИЯ ===
  {
    id: 'pretenziya',
    category: 'claims',
    title: 'Претензия (досудебная)',
    description: 'Универсальная форма для предъявления требований до суда',
    legalNotes: 'Досудебный порядок обязателен для большинства споров. Срок ответа на претензию — 30 дней (если иное не указано в договоре).',
    fields: [
      { name: 'addressee_name', label: 'Кому (название организации или ФИО)', type: 'text', required: true, placeholder: 'ТОО «Ромашка»' },
      { name: 'addressee_address', label: 'Адрес адресата', type: 'text', required: true },
      { name: 'claimant_name', label: 'От кого (ваше ФИО)', type: 'text', required: true },
      { name: 'claimant_iin', label: 'Ваш ИИН', type: 'text', required: true },
      { name: 'claimant_address', label: 'Ваш адрес', type: 'text', required: true },
      { name: 'claimant_phone', label: 'Ваш телефон', type: 'text', required: true },
      { name: 'facts', label: 'Описание обстоятельств', type: 'textarea', required: true, placeholder: 'Опишите ситуацию: когда, что произошло, какие договорённости были нарушены' },
      { name: 'demand', label: 'Ваше требование', type: 'textarea', required: true, placeholder: 'Например: вернуть уплаченную сумму 50 000 тенге / устранить недостатки / расторгнуть договор' },
      { name: 'response_days', label: 'Срок ответа на претензию (дней)', type: 'number', required: true, default: 30 },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `Кому: {addressee_name}
Адрес: {addressee_address}

От: {claimant_name}
ИИН: {claimant_iin}
Адрес: {claimant_address}
Телефон: {claimant_phone}


ПРЕТЕНЗИЯ

{facts}

В соответствии с законодательством Республики Казахстан, считаю свои права нарушенными.

На основании изложенного, ТРЕБУЮ:
{demand}

Прошу дать письменный ответ на настоящую претензию в течение {response_days} дней с момента её получения.

В случае оставления претензии без ответа или отказа в удовлетворении требований оставляю за собой право обратиться в суд с исковым заявлением, при этом с Вас будут взысканы все понесённые мной судебные расходы, включая государственную пошлину и услуги представителя.

{date}                                            ___________________
                                                  ({claimant_name})`
  }
];

/**
 * Заполнить шаблон значениями полей.
 * Возвращает готовый текст документа.
 */
export function fillTemplate(template, fields) {
  let result = template.template;

  // Применить postProcess если есть
  let processedFields = { ...fields };
  if (template.postProcess) {
    processedFields = template.postProcess(processedFields);
  }

  // Форматирование дат
  for (const field of template.fields) {
    if (field.type === 'date' && processedFields[field.name]) {
      try {
        const d = new Date(processedFields[field.name]);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleDateString('ru-RU', { month: 'long' });
        const year = d.getFullYear();
        processedFields[field.name] = `«${day}» ${month} ${year} г.`;
      } catch {}
    }
    if (field.type === 'number' && processedFields[field.name]) {
      // Форматируем большие числа через пробелы
      const num = parseFloat(processedFields[field.name]);
      if (!isNaN(num) && num >= 1000) {
        processedFields[field.name] = num.toLocaleString('ru-RU').replace(/,/g, ' ');
      }
    }
  }

  // Замена плейсхолдеров
  for (const [key, value] of Object.entries(processedFields)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }

  // Очистить незаполненные плейсхолдеры
  result = result.replace(/\{[a-z_]+\}/g, '___');

  return result;
}

export function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory() {
  const grouped = {};
  for (const cat of Object.keys(DOCUMENT_CATEGORIES)) {
    grouped[cat] = TEMPLATES.filter(t => t.category === cat);
  }
  return grouped;
}
