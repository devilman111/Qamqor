// База шаблонов документов для граждан РК — полная версия

export const DOCUMENT_CATEGORIES = {
  contracts: { label: 'Договоры', icon: '📜' },
  statements: { label: 'Заявления', icon: '✍️' },
  proxies: { label: 'Доверенности', icon: '🤝' },
  claims: { label: 'Претензии и иски', icon: '⚖️' },
  receipts: { label: 'Расписки', icon: '🧾' },
  hr: { label: 'Кадровые документы', icon: '👔' },
  acts: { label: 'Акты', icon: '📋' }
};

export const TEMPLATES = [

  // ==================== РАСПИСКИ ====================
  {
    id: 'raspiska_zaim',
    category: 'receipts',
    title: 'Расписка о получении денег в долг',
    description: 'Простая расписка между физлицами при займе денег',
    legalNotes: 'По ст. 715-722 ГК РК. При сумме > 100 МРП обязательна письменная форма. Подпись заёмщика ОБЯЗАТЕЛЬНА.',
    fields: [
      { name: 'borrower_name', label: 'ФИО заёмщика (кто берёт)', type: 'text', required: true, placeholder: 'Иванов Иван Иванович' },
      { name: 'borrower_iin', label: 'ИИН заёмщика', type: 'text', required: true, placeholder: '880101000000' },
      { name: 'borrower_address', label: 'Адрес заёмщика', type: 'text', required: true, placeholder: 'г. Алматы, ул. Абая 10, кв. 5' },
      { name: 'lender_name', label: 'ФИО займодателя (кто даёт)', type: 'text', required: true },
      { name: 'lender_iin', label: 'ИИН займодателя', type: 'text', required: true },
      { name: 'amount', label: 'Сумма займа (тенге)', type: 'number', required: true, placeholder: '500000' },
      { name: 'amount_words', label: 'Сумма прописью', type: 'text', required: true, placeholder: 'Пятьсот тысяч' },
      { name: 'return_date', label: 'Дата возврата', type: 'date', required: true },
      { name: 'percent', label: 'Процент годовых (0 — беспроцентный)', type: 'number', required: false, default: 0 },
      { name: 'city', label: 'Город составления', type: 'text', required: true, placeholder: 'Алматы' },
      { name: 'date', label: 'Дата составления', type: 'date', required: true }
    ],
    template: `РАСПИСКА

г. {city}                                                                    {date}

Я, {borrower_name}, ИИН {borrower_iin}, проживающий(-ая) по адресу: {borrower_address}, получил(-а) от {lender_name}, ИИН {lender_iin}, денежные средства в размере {amount} ({amount_words}) тенге в качестве займа.

Обязуюсь вернуть указанную сумму полностью в срок до {return_date}.

{percent_clause}

Сумма получена мной лично, наличными денежными средствами, в полном объёме.

Настоящая расписка составлена мной собственноручно, в здравом уме и твёрдой памяти, без принуждения.


___________________________ / {borrower_name} /
          (подпись заёмщика)

{date}`,
    postProcess: (fields) => {
      const p = parseFloat(fields.percent) || 0;
      fields.percent_clause = p > 0
        ? `За пользование денежными средствами обязуюсь уплатить проценты в размере ${p}% годовых.`
        : 'Заём является беспроцентным.';
      return fields;
    }
  },

  {
    id: 'raspiska_imushchestvo',
    category: 'receipts',
    title: 'Расписка о получении имущества',
    description: 'Расписка при передаче ценного имущества на хранение или во временное пользование',
    legalNotes: 'По ст. 770-784 ГК РК (хранение). Фиксирует факт передачи и описание имущества.',
    fields: [
      { name: 'receiver_name', label: 'ФИО получателя', type: 'text', required: true },
      { name: 'receiver_iin', label: 'ИИН получателя', type: 'text', required: true },
      { name: 'owner_name', label: 'ФИО владельца (передаёт)', type: 'text', required: true },
      { name: 'owner_iin', label: 'ИИН владельца', type: 'text', required: true },
      { name: 'property_description', label: 'Описание имущества', type: 'textarea', required: true, placeholder: 'ноутбук Apple MacBook Pro, серийный номер XXXXX' },
      { name: 'purpose', label: 'Цель передачи', type: 'text', required: true, placeholder: 'во временное пользование / на хранение' },
      { name: 'return_date', label: 'Срок возврата', type: 'date', required: false },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `РАСПИСКА О ПОЛУЧЕНИИ ИМУЩЕСТВА

г. {city}                                                                    {date}

Я, {receiver_name}, ИИН {receiver_iin}, получил(-а) от {owner_name}, ИИН {owner_iin}, следующее имущество:

{property_description}

Цель передачи: {purpose}.
{return_clause}

Обязуюсь обеспечить сохранность указанного имущества и вернуть его в надлежащем состоянии.

___________________________ / {receiver_name} /
          (подпись получателя)

{date}`,
    postProcess: (fields) => {
      fields.return_clause = fields.return_date
        ? `Обязуюсь вернуть имущество в срок до ${fields.return_date}.`
        : '';
      return fields;
    }
  },

  // ==================== ДОГОВОРЫ ====================
  {
    id: 'arenda_kvartiry',
    category: 'contracts',
    title: 'Договор аренды (найма) квартиры',
    description: 'Стандартный договор найма жилья между физлицами',
    legalNotes: 'По ст. 540-571 ГК РК. Письменная форма. Капремонт — наймодатель, текущий — наниматель.',
    fields: [
      { name: 'landlord_name', label: 'ФИО наймодателя (сдаёт)', type: 'text', required: true },
      { name: 'landlord_iin', label: 'ИИН наймодателя', type: 'text', required: true },
      { name: 'landlord_passport', label: 'Удостоверение личности наймодателя №', type: 'text', required: true },
      { name: 'tenant_name', label: 'ФИО нанимателя (снимает)', type: 'text', required: true },
      { name: 'tenant_iin', label: 'ИИН нанимателя', type: 'text', required: true },
      { name: 'tenant_passport', label: 'Удостоверение личности нанимателя №', type: 'text', required: true },
      { name: 'address', label: 'Полный адрес квартиры', type: 'text', required: true, placeholder: 'г. Алматы, ул. Абая 10, кв. 5' },
      { name: 'rooms', label: 'Количество комнат', type: 'number', required: true, default: 2 },
      { name: 'area', label: 'Площадь (м²)', type: 'number', required: true },
      { name: 'rent_amount', label: 'Арендная плата в месяц (тенге)', type: 'number', required: true },
      { name: 'deposit', label: 'Залог (тенге, 0 если нет)', type: 'number', required: false, default: 0 },
      { name: 'term_months', label: 'Срок аренды (месяцев)', type: 'number', required: true, default: 12 },
      { name: 'start_date', label: 'Дата начала аренды', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата подписания', type: 'date', required: true }
    ],
    template: `ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ № ___

г. {city}                                                                    {date}

{landlord_name}, ИИН {landlord_iin}, удостоверение личности {landlord_passport}, именуемый(-ая) в дальнейшем «Наймодатель», с одной стороны, и {tenant_name}, ИИН {tenant_iin}, удостоверение личности {tenant_passport}, именуемый(-ая) в дальнейшем «Наниматель», с другой стороны, заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Наймодатель передаёт, а Наниматель принимает во временное возмездное пользование жилое помещение по адресу: {address}, общей площадью {area} м², состоящее из {rooms} комнат(ы).
1.2. Помещение передаётся для проживания Нанимателя и членов его семьи.
1.3. Наймодатель гарантирует, что жилое помещение не заложено, не арестовано и не обременено правами третьих лиц.

2. СРОК ДОГОВОРА
2.1. Договор заключён сроком на {term_months} месяцев с {start_date}.
2.2. По истечении срока договор считается продлённым на тех же условиях на 1 месяц, если ни одна из сторон не заявила о расторжении за 30 дней до окончания.

3. ПЛАТА ЗА НАЁМ И ПОРЯДОК РАСЧЁТОВ
3.1. Ежемесячная арендная плата — {rent_amount} тенге.
3.2. Оплата производится не позднее 5-го числа каждого месяца.
3.3. Залоговый платёж — {deposit} тенге, возвращается по окончании договора при отсутствии ущерба имуществу.
3.4. Коммунальные услуги (электроэнергия, вода, газ, интернет) оплачиваются Нанимателем самостоятельно.
3.5. Наймодатель не вправе в одностороннем порядке изменять размер арендной платы чаще одного раза в год.

4. ПРАВА И ОБЯЗАННОСТИ НАЙМОДАТЕЛЯ
4.1. Наймодатель обязан:
— передать помещение в пригодном для проживания состоянии;
— производить капитальный ремонт за свой счёт;
— не входить в помещение без предварительного согласования с Нанимателем (кроме экстренных случаев).
4.2. Наймодатель вправе проверять состояние помещения не чаще одного раза в месяц.

5. ПРАВА И ОБЯЗАННОСТИ НАНИМАТЕЛЯ
5.1. Наниматель обязан:
— использовать помещение только для проживания;
— содержать помещение в надлежащем состоянии;
— производить текущий ремонт за свой счёт;
— своевременно вносить арендную плату;
— не передавать помещение третьим лицам без письменного согласия Наймодателя;
— при обнаружении неисправностей — незамедлительно уведомить Наймодателя.

6. ОТВЕТСТВЕННОСТЬ СТОРОН
6.1. За просрочку арендной платы — пеня 0,1% от суммы долга за каждый день просрочки.
6.2. За ущерб имуществу — возмещение стоимости в полном объёме.

7. РАСТОРЖЕНИЕ ДОГОВОРА
7.1. Любая сторона вправе расторгнуть договор с письменным уведомлением за 30 дней.
7.2. Наймодатель вправе расторгнуть досрочно при задолженности по оплате более 2 месяцев или систематическом нарушении условий.

8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
8.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу — по одному каждой стороне.
8.2. Все изменения и дополнения действительны в письменной форме с подписями обеих сторон.
8.3. Споры разрешаются путём переговоров, при недостижении соглашения — в судебном порядке.

9. ПОДПИСИ СТОРОН

НАЙМОДАТЕЛЬ:                                    НАНИМАТЕЛЬ:
{landlord_name}                                 {tenant_name}
ИИН: {landlord_iin}                             ИИН: {tenant_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'arenda_nezhiloe',
    category: 'contracts',
    title: 'Договор аренды нежилого помещения',
    description: 'Аренда офиса, склада, магазина под бизнес',
    legalNotes: 'По ст. 540-571 ГК РК. Для регистрации ИП/ТОО по этому адресу требуется договор аренды.',
    fields: [
      { name: 'landlord_name', label: 'Арендодатель (ФИО или наименование)', type: 'text', required: true },
      { name: 'landlord_iin', label: 'ИИН/БИН арендодателя', type: 'text', required: true },
      { name: 'tenant_name', label: 'Арендатор (ФИО или наименование)', type: 'text', required: true },
      { name: 'tenant_iin', label: 'ИИН/БИН арендатора', type: 'text', required: true },
      { name: 'address', label: 'Адрес помещения', type: 'text', required: true },
      { name: 'area', label: 'Площадь (м²)', type: 'number', required: true },
      { name: 'purpose', label: 'Цель использования', type: 'text', required: true, placeholder: 'офис / склад / торговая точка' },
      { name: 'rent_amount', label: 'Аренда в месяц (тенге)', type: 'number', required: true },
      { name: 'term_months', label: 'Срок аренды (месяцев)', type: 'number', required: true, default: 12 },
      { name: 'start_date', label: 'Дата начала', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата договора', type: 'date', required: true }
    ],
    template: `ДОГОВОР АРЕНДЫ НЕЖИЛОГО ПОМЕЩЕНИЯ № ___

г. {city}                                                                    {date}

{landlord_name}, ИИН/БИН {landlord_iin}, именуемый(-ая) в дальнейшем «Арендодатель», и {tenant_name}, ИИН/БИН {tenant_iin}, именуемый(-ая) в дальнейшем «Арендатор», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Арендодатель передаёт Арендатору во временное возмездное пользование нежилое помещение площадью {area} м², расположенное по адресу: {address}.
1.2. Помещение используется для: {purpose}.

2. СРОК АРЕНДЫ
2.1. Договор заключён на {term_months} месяцев с {start_date}.

3. АРЕНДНАЯ ПЛАТА
3.1. Ежемесячная плата — {rent_amount} тенге (без НДС).
3.2. Оплата — не позднее 5-го числа текущего месяца.
3.3. Коммунальные платежи — согласно показаниям счётчиков, оплачивает Арендатор.

4. ОБЯЗАННОСТИ СТОРОН
4.1. Арендодатель: передать помещение в пригодном состоянии, обеспечить доступ в рабочее время.
4.2. Арендатор: использовать помещение по назначению, поддерживать порядок, не производить перепланировку без согласия Арендодателя, своевременно вносить плату.

5. РАСТОРЖЕНИЕ
5.1. Любая сторона — с уведомлением за 30 дней.
5.2. Арендодатель вправе расторгнуть досрочно при задолженности более 2 месяцев.

6. РЕКВИЗИТЫ И ПОДПИСИ

АРЕНДОДАТЕЛЬ:                                   АРЕНДАТОР:
{landlord_name}                                 {tenant_name}
ИИН/БИН: {landlord_iin}                         ИИН/БИН: {tenant_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'dogovor_uslug',
    category: 'contracts',
    title: 'Договор оказания услуг',
    description: 'Для фрилансеров, репетиторов, мастеров — оказание услуг физлицу',
    legalNotes: 'По ст. 683-687 ГК РК. Подходит для любых непроизводственных услуг.',
    fields: [
      { name: 'executor_name', label: 'ФИО исполнителя', type: 'text', required: true },
      { name: 'executor_iin', label: 'ИИН исполнителя', type: 'text', required: true },
      { name: 'customer_name', label: 'ФИО заказчика', type: 'text', required: true },
      { name: 'customer_iin', label: 'ИИН заказчика', type: 'text', required: true },
      { name: 'service_description', label: 'Описание услуги', type: 'textarea', required: true, placeholder: 'репетиторство по математике 2 раза в неделю' },
      { name: 'service_period', label: 'Срок оказания', type: 'text', required: true, placeholder: 'с 1 февраля по 31 мая 2026 года' },
      { name: 'price', label: 'Стоимость (тенге)', type: 'number', required: true },
      { name: 'payment_terms', label: 'Условия оплаты', type: 'text', required: true, placeholder: 'ежемесячно до 10 числа' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ___

г. {city}                                                                    {date}

{executor_name}, ИИН {executor_iin}, именуемый(-ая) в дальнейшем «Исполнитель», и {customer_name}, ИИН {customer_iin}, именуемый(-ая) в дальнейшем «Заказчик», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Заказчику следующие услуги:
{service_description}
1.2. Срок оказания услуг: {service_period}.

2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ
2.1. Стоимость услуг — {price} тенге.
2.2. Порядок оплаты: {payment_terms}.
2.3. Факт оказания услуг подтверждается актом приёма-передачи.

3. ОБЯЗАННОСТИ СТОРОН
3.1. Исполнитель: оказать услуги качественно и в срок, соблюдать конфиденциальность.
3.2. Заказчик: своевременно оплачивать, предоставить необходимую информацию.

4. ОТВЕТСТВЕННОСТЬ
4.1. За нарушение сроков — пеня 0,1% за каждый день просрочки.
4.2. Форс-мажор — стороны освобождаются от ответственности.

5. РАСТОРЖЕНИЕ
5.1. Заказчик вправе отказаться от услуг в любое время, оплатив фактически понесённые расходы.
5.2. Исполнитель вправе отказаться при неоплате, уведомив за 7 дней.

6. ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:                                    ЗАКАЗЧИК:
{executor_name}                                 {customer_name}
ИИН: {executor_iin}                             ИИН: {customer_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'dogovor_podryad',
    category: 'contracts',
    title: 'Договор подряда (ремонт, строительство)',
    description: 'Для строительных, ремонтных и отделочных работ',
    legalNotes: 'По ст. 616-630 ГК РК. Результат работ фиксируется актом сдачи-приёмки.',
    fields: [
      { name: 'contractor_name', label: 'ФИО/наименование подрядчика', type: 'text', required: true },
      { name: 'contractor_iin', label: 'ИИН/БИН подрядчика', type: 'text', required: true },
      { name: 'customer_name', label: 'ФИО заказчика', type: 'text', required: true },
      { name: 'customer_iin', label: 'ИИН заказчика', type: 'text', required: true },
      { name: 'work_description', label: 'Описание работ', type: 'textarea', required: true, placeholder: 'косметический ремонт квартиры: поклейка обоев, покраска потолка, укладка ламината' },
      { name: 'object_address', label: 'Адрес объекта', type: 'text', required: true },
      { name: 'start_date', label: 'Дата начала работ', type: 'date', required: true },
      { name: 'end_date', label: 'Дата окончания работ', type: 'date', required: true },
      { name: 'price', label: 'Стоимость работ (тенге)', type: 'number', required: true },
      { name: 'prepayment', label: 'Предоплата (тенге, 0 если нет)', type: 'number', required: false, default: 0 },
      { name: 'materials', label: 'Кто предоставляет материалы', type: 'text', required: true, placeholder: 'подрядчик / заказчик / совместно' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата договора', type: 'date', required: true }
    ],
    template: `ДОГОВОР ПОДРЯДА № ___

г. {city}                                                                    {date}

{contractor_name}, ИИН/БИН {contractor_iin}, именуемый(-ая) в дальнейшем «Подрядчик», и {customer_name}, ИИН {customer_iin}, именуемый(-ая) в дальнейшем «Заказчик», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Подрядчик обязуется выполнить следующие работы:
{work_description}
1.2. Адрес объекта: {object_address}.
1.3. Материалы предоставляет: {materials}.

2. СРОКИ ВЫПОЛНЕНИЯ РАБОТ
2.1. Начало работ: {start_date}.
2.2. Окончание работ: {end_date}.
2.3. При наличии обстоятельств, препятствующих выполнению работ, Подрядчик уведомляет Заказчика в течение 2 рабочих дней.

3. СТОИМОСТЬ И ОПЛАТА
3.1. Общая стоимость работ — {price} тенге.
3.2. Предоплата — {prepayment} тенге, вносится при подписании договора.
3.3. Окончательный расчёт — после подписания акта сдачи-приёмки.

4. ПРИЁМКА РАБОТ
4.1. По завершении работ Подрядчик уведомляет Заказчика.
4.2. Заказчик обязан принять работы в течение 3 рабочих дней или направить мотивированный отказ.
4.3. Гарантийный срок на работы — 12 месяцев.

5. ОТВЕТСТВЕННОСТЬ
5.1. За просрочку выполнения работ Подрядчик уплачивает пеню 0,1% в день.
5.2. За просрочку оплаты Заказчик уплачивает пеню 0,1% в день.
5.3. При наличии дефектов — Подрядчик устраняет за свой счёт в течение 10 рабочих дней.

6. ПОДПИСИ СТОРОН

ПОДРЯДЧИК:                                      ЗАКАЗЧИК:
{contractor_name}                               {customer_name}
ИИН/БИН: {contractor_iin}                       ИИН: {customer_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'kuplya_prodazha_avto',
    category: 'contracts',
    title: 'Договор купли-продажи автомобиля',
    description: 'Оформление сделки при покупке/продаже авто',
    legalNotes: 'По ст. 406-410 ГК РК. После подписания — перерегистрация в ЦОН в течение 10 дней.',
    fields: [
      { name: 'seller_name', label: 'ФИО продавца', type: 'text', required: true },
      { name: 'seller_iin', label: 'ИИН продавца', type: 'text', required: true },
      { name: 'seller_passport', label: 'Удостоверение личности продавца №', type: 'text', required: true },
      { name: 'seller_address', label: 'Адрес продавца', type: 'text', required: true },
      { name: 'buyer_name', label: 'ФИО покупателя', type: 'text', required: true },
      { name: 'buyer_iin', label: 'ИИН покупателя', type: 'text', required: true },
      { name: 'buyer_passport', label: 'Удостоверение личности покупателя №', type: 'text', required: true },
      { name: 'buyer_address', label: 'Адрес покупателя', type: 'text', required: true },
      { name: 'car_mark', label: 'Марка и модель автомобиля', type: 'text', required: true, placeholder: 'Toyota Camry' },
      { name: 'car_year', label: 'Год выпуска', type: 'text', required: true, placeholder: '2020' },
      { name: 'car_vin', label: 'VIN-номер', type: 'text', required: true },
      { name: 'car_reg', label: 'Гос. регистрационный номер', type: 'text', required: true, placeholder: '777 ABC 02' },
      { name: 'car_color', label: 'Цвет автомобиля', type: 'text', required: true },
      { name: 'price', label: 'Стоимость (тенге)', type: 'number', required: true },
      { name: 'price_words', label: 'Стоимость прописью', type: 'text', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР КУПЛИ-ПРОДАЖИ ТРАНСПОРТНОГО СРЕДСТВА

г. {city}                                                                    {date}

{seller_name}, ИИН {seller_iin}, удостоверение личности {seller_passport}, проживающий(-ая) по адресу: {seller_address}, именуемый(-ая) в дальнейшем «Продавец», с одной стороны, и {buyer_name}, ИИН {buyer_iin}, удостоверение личности {buyer_passport}, проживающий(-ая) по адресу: {buyer_address}, именуемый(-ая) в дальнейшем «Покупатель», с другой стороны, заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Продавец продаёт, а Покупатель покупает следующее транспортное средство:
— Марка/модель: {car_mark}
— Год выпуска: {car_year}
— VIN: {car_vin}
— Гос. номер: {car_reg}
— Цвет: {car_color}

2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ
2.1. Стоимость транспортного средства — {price} ({price_words}) тенге.
2.2. Расчёт производится в полном объёме в момент подписания настоящего Договора.
2.3. С момента передачи денежных средств расчёт считается произведённым полностью.

3. ПЕРЕДАЧА ТРАНСПОРТНОГО СРЕДСТВА
3.1. Продавец передаёт Покупателю транспортное средство одновременно с подписанием настоящего Договора.
3.2. Вместе с транспортным средством передаются: документы на ТС, комплект ключей.
3.3. Техническое состояние транспортного средства Покупателем осмотрено и претензий не имеется.

4. ГАРАНТИИ ПРОДАВЦА
4.1. Продавец гарантирует, что транспортное средство никому не продано, не заложено, под арестом и запретом не состоит, в споре не находится.

5. ПЕРЕХОД ПРАВА СОБСТВЕННОСТИ
5.1. Право собственности переходит к Покупателю с момента государственной регистрации.
5.2. Покупатель обязан произвести регистрацию в органах дорожной полиции в течение 10 дней.

6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
6.1. Договор составлен в двух экземплярах, по одному каждой стороне.

ПРОДАВЕЦ:                                       ПОКУПАТЕЛЬ:
{seller_name}                                   {buyer_name}
ИИН: {seller_iin}                               ИИН: {buyer_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'kuplya_prodazha_nedvizh',
    category: 'contracts',
    title: 'Договор купли-продажи недвижимости',
    description: 'Продажа квартиры, дома или земельного участка',
    legalNotes: 'По ст. 406, 520-524 ГК РК. Обязательна государственная регистрация в ЦОН. Нотариальное удостоверение рекомендуется.',
    fields: [
      { name: 'seller_name', label: 'ФИО продавца', type: 'text', required: true },
      { name: 'seller_iin', label: 'ИИН продавца', type: 'text', required: true },
      { name: 'seller_passport', label: 'Удостоверение личности продавца №', type: 'text', required: true },
      { name: 'buyer_name', label: 'ФИО покупателя', type: 'text', required: true },
      { name: 'buyer_iin', label: 'ИИН покупателя', type: 'text', required: true },
      { name: 'buyer_passport', label: 'Удостоверение личности покупателя №', type: 'text', required: true },
      { name: 'property_type', label: 'Вид недвижимости', type: 'text', required: true, placeholder: 'квартира / дом / земельный участок' },
      { name: 'address', label: 'Адрес объекта', type: 'text', required: true },
      { name: 'area', label: 'Площадь (м²)', type: 'number', required: true },
      { name: 'cadastral', label: 'Кадастровый номер', type: 'text', required: false },
      { name: 'price', label: 'Стоимость (тенге)', type: 'number', required: true },
      { name: 'price_words', label: 'Стоимость прописью', type: 'text', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР КУПЛИ-ПРОДАЖИ НЕДВИЖИМОГО ИМУЩЕСТВА

г. {city}                                                                    {date}

{seller_name}, ИИН {seller_iin}, удостоверение личности {seller_passport}, именуемый(-ая) «Продавец», и {buyer_name}, ИИН {buyer_iin}, удостоверение личности {buyer_passport}, именуемый(-ая) «Покупатель», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Продавец продаёт, а Покупатель покупает следующий объект недвижимости:
— Вид: {property_type}
— Адрес: {address}
— Площадь: {area} м²
— Кадастровый номер: {cadastral}

2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ
2.1. Цена объекта — {price} ({price_words}) тенге.
2.2. Оплата производится в полном объёме до государственной регистрации перехода права собственности.

3. ГАРАНТИИ ПРОДАВЦА
3.1. Продавец гарантирует, что объект не заложен, не арестован, права третьих лиц не нарушены.
3.2. Продавец обязан освободить объект в течение 30 дней с момента государственной регистрации.

4. ПЕРЕХОД ПРАВА СОБСТВЕННОСТИ
4.1. Право собственности переходит к Покупателю с момента государственной регистрации в ЦОН.
4.2. Расходы по государственной регистрации несёт Покупатель.

5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
5.1. Договор составлен в трёх экземплярах (по одному сторонам + для регистрирующего органа).

ПРОДАВЕЦ:                                       ПОКУПАТЕЛЬ:
{seller_name}                                   {buyer_name}
ИИН: {seller_iin}                               ИИН: {buyer_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`
  },

  {
    id: 'dogovor_zaym',
    category: 'contracts',
    title: 'Договор займа между физлицами',
    description: 'Полноценный договор займа (более надёжен, чем расписка)',
    legalNotes: 'По ст. 715-722 ГК РК. Рекомендуется при суммах более 500 000 тенге.',
    fields: [
      { name: 'lender_name', label: 'ФИО займодателя (кто даёт)', type: 'text', required: true },
      { name: 'lender_iin', label: 'ИИН займодателя', type: 'text', required: true },
      { name: 'borrower_name', label: 'ФИО заёмщика (кто берёт)', type: 'text', required: true },
      { name: 'borrower_iin', label: 'ИИН заёмщика', type: 'text', required: true },
      { name: 'amount', label: 'Сумма займа (тенге)', type: 'number', required: true },
      { name: 'amount_words', label: 'Сумма прописью', type: 'text', required: true },
      { name: 'percent', label: 'Процент годовых (0 — беспроцентный)', type: 'number', required: false, default: 0 },
      { name: 'return_date', label: 'Дата возврата', type: 'date', required: true },
      { name: 'purpose', label: 'Цель займа', type: 'text', required: false, placeholder: 'на личные нужды' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР ЗАЙМА № ___

г. {city}                                                                    {date}

{lender_name}, ИИН {lender_iin}, именуемый(-ая) «Займодатель», и {borrower_name}, ИИН {borrower_iin}, именуемый(-ая) «Заёмщик», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Займодатель передаёт Заёмщику денежные средства в размере {amount} ({amount_words}) тенге.
1.2. Цель займа: {purpose}.
1.3. Заём предоставляется с {date}.

2. УСЛОВИЯ ЗАЙМА
2.1. {percent_clause}
2.2. Заёмщик обязан вернуть сумму займа в срок до {return_date}.
2.3. Досрочный возврат — допускается без штрафных санкций.

3. ОТВЕТСТВЕННОСТЬ ЗАЁМЩИКА
3.1. При просрочке возврата — пени в размере 0,1% от суммы долга за каждый день просрочки.
3.2. При нарушении более 30 дней — Займодатель вправе потребовать досрочного возврата всей суммы.

4. ПОРЯДОК РАСЧЁТОВ
4.1. Передача денежных средств подтверждается распиской Заёмщика.

5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
5.1. Договор составлен в двух экземплярах.

ЗАЙМОДАТЕЛЬ:                                    ЗАЁМЩИК:
{lender_name}                                   {borrower_name}
ИИН: {lender_iin}                               ИИН: {borrower_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`,
    postProcess: (fields) => {
      const p = parseFloat(fields.percent) || 0;
      fields.percent_clause = p > 0
        ? `За пользование займом Заёмщик уплачивает проценты в размере ${p}% годовых.`
        : 'Заём является беспроцентным.';
      return fields;
    }
  },

  {
    id: 'dogovor_darenie',
    category: 'contracts',
    title: 'Договор дарения',
    description: 'Безвозмездная передача имущества (деньги, вещи, недвижимость)',
    legalNotes: 'По ст. 506-510 ГК РК. Дарение недвижимости — нотариальная форма + регистрация. Между близкими родственниками налог не взимается.',
    fields: [
      { name: 'donor_name', label: 'ФИО дарителя', type: 'text', required: true },
      { name: 'donor_iin', label: 'ИИН дарителя', type: 'text', required: true },
      { name: 'recipient_name', label: 'ФИО одаряемого', type: 'text', required: true },
      { name: 'recipient_iin', label: 'ИИН одаряемого', type: 'text', required: true },
      { name: 'relationship', label: 'Степень родства', type: 'text', required: false, placeholder: 'сын / дочь / брат / без родства' },
      { name: 'gift_description', label: 'Описание предмета дарения', type: 'textarea', required: true, placeholder: 'денежные средства в размере 500 000 тенге / квартира по адресу...' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `ДОГОВОР ДАРЕНИЯ

г. {city}                                                                    {date}

{donor_name}, ИИН {donor_iin}, именуемый(-ая) «Даритель», и {recipient_name}, ИИН {recipient_iin}, именуемый(-ая) «Одаряемый(-ая)», заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Даритель безвозмездно передаёт в собственность Одаряемому(-ой) следующее имущество:
{gift_description}
{relationship_line}

2. ПРАВА И ОБЯЗАННОСТИ СТОРОН
2.1. Одаряемый(-ая) вправе в любое время до передачи дара отказаться от него.
2.2. Даритель вправе отменить дарение, если Одаряемый совершит покушение на его жизнь или здоровье.

3. ГАРАНТИИ ДАРИТЕЛЯ
3.1. Даритель гарантирует, что он является единственным собственником передаваемого имущества.

4. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
4.1. Договор составлен в двух экземплярах.
4.2. Расходы по оформлению несёт Одаряемый(-ая).

ДАРИТЕЛЬ:                                       ОДАРЯЕМЫЙ(-АЯ):
{donor_name}                                    {recipient_name}
ИИН: {donor_iin}                                ИИН: {recipient_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)`,
    postProcess: (fields) => {
      fields.relationship_line = fields.relationship
        ? `Степень родства: ${fields.relationship}.` : '';
      return fields;
    }
  },

  {
    id: 'dogovor_alimenty',
    category: 'contracts',
    title: 'Соглашение об уплате алиментов',
    description: 'Добровольное нотариальное соглашение об алиментах на ребёнка',
    legalNotes: 'По ст. 138-142 Кодекса о браке и семье РК. Обязательно нотариальное удостоверение. Имеет силу исполнительного листа.',
    fields: [
      { name: 'payer_name', label: 'ФИО плательщика алиментов', type: 'text', required: true },
      { name: 'payer_iin', label: 'ИИН плательщика', type: 'text', required: true },
      { name: 'receiver_name', label: 'ФИО получателя (родитель, с которым живёт ребёнок)', type: 'text', required: true },
      { name: 'receiver_iin', label: 'ИИН получателя', type: 'text', required: true },
      { name: 'child_name', label: 'ФИО ребёнка', type: 'text', required: true },
      { name: 'child_birth', label: 'Дата рождения ребёнка', type: 'date', required: true },
      { name: 'amount', label: 'Размер алиментов (тенге в месяц)', type: 'number', required: true },
      { name: 'payment_day', label: 'День выплаты (число месяца)', type: 'text', required: true, default: '10' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `СОГЛАШЕНИЕ ОБ УПЛАТЕ АЛИМЕНТОВ

г. {city}                                                                    {date}

{payer_name}, ИИН {payer_iin}, именуемый(-ая) «Плательщик», и {receiver_name}, ИИН {receiver_iin}, действующий(-ая) в интересах несовершеннолетнего ребёнка, именуемый(-ая) «Получатель», заключили настоящее Соглашение:

1. ПРЕДМЕТ СОГЛАШЕНИЯ
1.1. Настоящее Соглашение регулирует уплату алиментов на содержание несовершеннолетнего ребёнка:
— ФИО ребёнка: {child_name}
— Дата рождения: {child_birth}

2. РАЗМЕР И ПОРЯДОК УПЛАТЫ АЛИМЕНТОВ
2.1. Плательщик ежемесячно уплачивает алименты в размере {amount} тенге.
2.2. Выплата производится не позднее {payment_day} числа каждого месяца.
2.3. Способ выплаты: на банковский счёт Получателя или наличными с подтверждением.

3. ИНДЕКСАЦИЯ
3.1. Размер алиментов индексируется пропорционально росту МРП в РК.

4. ПРЕКРАЩЕНИЕ СОГЛАШЕНИЯ
4.1. Соглашение действует до достижения ребёнком совершеннолетия (18 лет).
4.2. Изменение условий — только по взаимному согласию и нотариальному удостоверению.

5. ПОДПИСИ СТОРОН

ПЛАТЕЛЬЩИК:                                     ПОЛУЧАТЕЛЬ:
{payer_name}                                    {receiver_name}
ИИН: {payer_iin}                                ИИН: {receiver_iin}

___________________________                     ___________________________
        (подпись)                                       (подпись)

Настоящее соглашение подлежит нотариальному удостоверению.`
  },

  {
    id: 'dogovor_trudovoy',
    category: 'contracts',
    title: 'Трудовой договор',
    description: 'Трудовой договор между работодателем и работником',
    legalNotes: 'По ст. 28, 33 ТК РК. Заключается в письменной форме в 2 экз. Один — работнику.',
    fields: [
      { name: 'employer_name', label: 'Наименование работодателя', type: 'text', required: true, placeholder: 'ТОО «Компания»' },
      { name: 'employer_bin', label: 'БИН работодателя', type: 'text', required: true },
      { name: 'director_name', label: 'ФИО руководителя работодателя', type: 'text', required: true },
      { name: 'employee_name', label: 'ФИО работника', type: 'text', required: true },
      { name: 'employee_iin', label: 'ИИН работника', type: 'text', required: true },
      { name: 'position', label: 'Должность', type: 'text', required: true, placeholder: 'менеджер по продажам' },
      { name: 'department', label: 'Подразделение', type: 'text', required: false, placeholder: 'отдел продаж' },
      { name: 'salary', label: 'Оклад (тенге в месяц)', type: 'number', required: true },
      { name: 'work_schedule', label: 'Режим работы', type: 'text', required: true, placeholder: 'пн-пт 09:00-18:00' },
      { name: 'start_date', label: 'Дата начала работы', type: 'date', required: true },
      { name: 'term', label: 'Срок договора', type: 'text', required: true, default: 'бессрочный', placeholder: 'бессрочный / 1 год / 6 месяцев' },
      { name: 'probation', label: 'Испытательный срок', type: 'text', required: false, default: 'без испытания', placeholder: '3 месяца / без испытания' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата подписания', type: 'date', required: true }
    ],
    template: `ТРУДОВОЙ ДОГОВОР № ___

г. {city}                                                                    {date}

{employer_name}, БИН {employer_bin}, в лице {director_name}, именуемый(-ое) в дальнейшем «Работодатель», с одной стороны, и {employee_name}, ИИН {employee_iin}, именуемый(-ая) в дальнейшем «Работник», с другой стороны, заключили настоящий Трудовой договор:

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Работник принимается на должность: {position}{department_line}.
1.2. Вид договора: {term}.
1.3. Дата начала работы: {start_date}.
1.4. Испытательный срок: {probation}.

2. ПРАВА И ОБЯЗАННОСТИ РАБОТНИКА
2.1. Работник обязан: добросовестно исполнять трудовые обязанности, соблюдать трудовую дисциплину, правила охраны труда, хранить коммерческую тайну.
2.2. Работник вправе: на оплату труда, отпуск, социальные гарантии, безопасные условия труда.

3. ПРАВА И ОБЯЗАННОСТИ РАБОТОДАТЕЛЯ
3.1. Работодатель обязан: выплачивать зарплату в срок, обеспечить условия труда, предоставить отпуск, соблюдать нормы ТК РК.
3.2. Работодатель вправе: требовать исполнения обязанностей, применять дисциплинарные взыскания.

4. РЕЖИМ РАБОЧЕГО ВРЕМЕНИ
4.1. Режим работы: {work_schedule}.
4.2. Продолжительность рабочей недели — 40 часов.

5. ОПЛАТА ТРУДА
5.1. Должностной оклад — {salary} тенге в месяц.
5.2. Выплата — не реже одного раза в месяц, не позднее 10-го числа следующего месяца.
5.3. Из зарплаты удерживаются: ИПН 10%, ОПВ 10%, ОСМС 2% согласно законодательству.

6. ОТПУСК
6.1. Ежегодный оплачиваемый отпуск — не менее 24 календарных дней.

7. РАСТОРЖЕНИЕ ДОГОВОРА
7.1. Расторжение — по основаниям Трудового кодекса РК (ст. 49-58, 52).

8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
8.1. Договор составлен в двух экземплярах — по одному сторонам.

РАБОТОДАТЕЛЬ:                                   РАБОТНИК:
{employer_name}                                 {employee_name}
БИН: {employer_bin}                             ИИН: {employee_iin}
{director_name}

___________________________                     ___________________________
        (подпись, печать)                               (подпись)`,
    postProcess: (fields) => {
      fields.department_line = fields.department ? `, ${fields.department}` : '';
      return fields;
    }
  },

  // ==================== ЗАЯВЛЕНИЯ ====================
  {
    id: 'zayavl_uvolnenie',
    category: 'statements',
    title: 'Заявление об увольнении по собственному желанию',
    description: 'Подача работодателю при уходе с работы',
    legalNotes: 'По ст. 56 ТК РК. Подаётся за 1 месяц. По соглашению — раньше.',
    fields: [
      { name: 'employer_name', label: 'Наименование организации', type: 'text', required: true, placeholder: 'ТОО «Ромашка»' },
      { name: 'director_name', label: 'ФИО и должность руководителя', type: 'text', required: true, placeholder: 'Генеральному директору Иванову И.И.' },
      { name: 'employee_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'employee_position', label: 'Ваша должность', type: 'text', required: true },
      { name: 'department', label: 'Отдел (необязательно)', type: 'text', required: false },
      { name: 'last_work_date', label: 'Дата последнего рабочего дня', type: 'date', required: true },
      { name: 'reason', label: 'Причина (необязательно)', type: 'text', required: false, placeholder: 'в связи с переездом' },
      { name: 'date', label: 'Дата подачи', type: 'date', required: true }
    ],
    template: `{director_name}
{employer_name}

от {employee_name},
{employee_position}{department_line}


ЗАЯВЛЕНИЕ

Прошу расторгнуть со мной трудовой договор по собственному желанию (ст. 56 Трудового кодекса РК) с {last_work_date}.
{reason_line}
Прошу произвести окончательный расчёт и выдать необходимые документы в последний рабочий день.


{date}                                                    ___________________
                                                            ({employee_name})`,
    postProcess: (fields) => {
      fields.department_line = fields.department ? `\n${fields.department}` : '';
      fields.reason_line = fields.reason ? `\nПричина: ${fields.reason}.\n` : '\n';
      return fields;
    }
  },

  {
    id: 'zayavl_otpusk',
    category: 'statements',
    title: 'Заявление на ежегодный оплачиваемый отпуск',
    description: 'Заявление работника на предоставление трудового отпуска',
    legalNotes: 'По ст. 88 ТК РК. Подаётся за 5 рабочих дней до начала отпуска.',
    fields: [
      { name: 'employer_name', label: 'Наименование организации', type: 'text', required: true },
      { name: 'director_name', label: 'ФИО руководителя (кому)', type: 'text', required: true },
      { name: 'employee_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'position', label: 'Ваша должность', type: 'text', required: true },
      { name: 'vacation_start', label: 'Начало отпуска', type: 'date', required: true },
      { name: 'vacation_end', label: 'Конец отпуска', type: 'date', required: true },
      { name: 'days', label: 'Количество дней', type: 'number', required: true, default: 24 },
      { name: 'date', label: 'Дата подачи', type: 'date', required: true }
    ],
    template: `Руководителю {employer_name}
{director_name}

от {employee_name},
{position}


ЗАЯВЛЕНИЕ

Прошу предоставить мне ежегодный оплачиваемый трудовой отпуск продолжительностью {days} (___) календарных дней с {vacation_start} по {vacation_end} включительно.


{date}                                                    ___________________
                                                            ({employee_name})`
  },

  {
    id: 'zayavl_police',
    category: 'statements',
    title: 'Заявление в полицию',
    description: 'Заявление о преступлении или правонарушении',
    legalNotes: 'По ст. 179 УПК РК. Полиция обязана принять и зарегистрировать заявление. Потребуйте талон-уведомление.',
    fields: [
      { name: 'police_dept', label: 'Наименование органа полиции', type: 'text', required: true, placeholder: 'Начальнику ДП Алматинской области' },
      { name: 'applicant_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'applicant_iin', label: 'Ваш ИИН', type: 'text', required: true },
      { name: 'applicant_address', label: 'Ваш адрес', type: 'text', required: true },
      { name: 'applicant_phone', label: 'Ваш телефон', type: 'text', required: true },
      { name: 'crime_description', label: 'Описание происшедшего', type: 'textarea', required: true, placeholder: 'Когда, где, что произошло, кто совершил (если известно)' },
      { name: 'suspects', label: 'Данные о подозреваемом (если известно)', type: 'text', required: false },
      { name: 'witnesses', label: 'Свидетели (если есть)', type: 'text', required: false },
      { name: 'damage', label: 'Причинённый ущерб', type: 'text', required: false },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `{police_dept}

от {applicant_name},
ИИН: {applicant_iin}
Адрес: {applicant_address}
Телефон: {applicant_phone}


ЗАЯВЛЕНИЕ О ПРЕСТУПЛЕНИИ (ПРАВОНАРУШЕНИИ)

Прошу зарегистрировать данное заявление и провести проверку по следующим обстоятельствам:

{crime_description}

{suspects_line}
{witnesses_line}
{damage_line}

На основании изложенного прошу возбудить уголовное дело (дело об административном правонарушении) и привлечь виновных к ответственности.

Об уголовной ответственности за заведомо ложный донос по ст. 419 УК РК предупреждён(-а).


г. {city}                                           {date}

___________________________
({applicant_name})`,
    postProcess: (fields) => {
      fields.suspects_line = fields.suspects ? `Данные подозреваемого: ${fields.suspects}.` : '';
      fields.witnesses_line = fields.witnesses ? `Свидетели: ${fields.witnesses}.` : '';
      fields.damage_line = fields.damage ? `Причинённый ущерб: ${fields.damage}.` : '';
      return fields;
    }
  },

  {
    id: 'zayavl_spravka',
    category: 'statements',
    title: 'Заявление о выдаче справки с места работы',
    description: 'Запрос на справку для банка, суда, посольства и т.д.',
    legalNotes: 'Работодатель обязан выдать в течение 5 рабочих дней (ст. 23 ТК РК).',
    fields: [
      { name: 'employer_name', label: 'Наименование организации', type: 'text', required: true },
      { name: 'director_name', label: 'ФИО руководителя', type: 'text', required: true },
      { name: 'employee_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'position', label: 'Ваша должность', type: 'text', required: true },
      { name: 'purpose', label: 'Куда нужна справка', type: 'text', required: true, placeholder: 'в банк / в суд / в посольство / в акимат' },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `{director_name}
{employer_name}

от {employee_name},
{position}


ЗАЯВЛЕНИЕ

Прошу выдать мне справку с места работы, подтверждающую занимаемую должность и размер заработной платы, для представления в {purpose}.


{date}                                                    ___________________
                                                            ({employee_name})`
  },

  {
    id: 'zayavl_sud',
    category: 'statements',
    title: 'Исковое заявление в суд',
    description: 'Универсальная форма искового заявления по гражданским делам',
    legalNotes: 'По ст. 148-160 ГПК РК. Госпошлина 1% от суммы иска. Трудовые споры, алименты, ЗПП — без пошлины.',
    fields: [
      { name: 'court_name', label: 'Наименование суда', type: 'text', required: true, placeholder: 'Медеуский районный суд г. Алматы' },
      { name: 'plaintiff_name', label: 'Ваше ФИО (истец)', type: 'text', required: true },
      { name: 'plaintiff_iin', label: 'Ваш ИИН', type: 'text', required: true },
      { name: 'plaintiff_address', label: 'Ваш адрес', type: 'text', required: true },
      { name: 'plaintiff_phone', label: 'Ваш телефон', type: 'text', required: true },
      { name: 'defendant_name', label: 'ФИО/наименование ответчика', type: 'text', required: true },
      { name: 'defendant_address', label: 'Адрес ответчика', type: 'text', required: true },
      { name: 'claim_subject', label: 'Предмет иска (о чём)', type: 'text', required: true, placeholder: 'о взыскании долга / о расторжении договора / о возврате имущества' },
      { name: 'facts', label: 'Фактические обстоятельства', type: 'textarea', required: true },
      { name: 'legal_basis', label: 'Правовое основание', type: 'text', required: false, placeholder: 'ст. 715-722 ГК РК (заём) / ст. 96 ТК РК (зарплата)' },
      { name: 'claim_amount', label: 'Сумма иска (тенге, 0 если неимущественный)', type: 'number', required: false, default: 0 },
      { name: 'demands', label: 'Исковые требования', type: 'textarea', required: true, placeholder: 'Взыскать с ответчика сумму долга...' },
      { name: 'evidence', label: 'Перечень приложений (доказательств)', type: 'textarea', required: true, placeholder: 'Договор займа от 01.01.2025\nРасписка о получении\nПереписка' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `В {court_name}

Истец: {plaintiff_name}
ИИН: {plaintiff_iin}
Адрес: {plaintiff_address}
Телефон: {plaintiff_phone}

Ответчик: {defendant_name}
Адрес: {defendant_address}

{claim_amount_line}


ИСКОВОЕ ЗАЯВЛЕНИЕ
{claim_subject}

ОБСТОЯТЕЛЬСТВА ДЕЛА:
{facts}

ПРАВОВОЕ ОСНОВАНИЕ:
{legal_basis_line}

НА ОСНОВАНИИ ИЗЛОЖЕННОГО, ПРОШУ СУД:
{demands}

ПРИЛОЖЕНИЯ:
{evidence}


г. {city}                                           {date}

___________________________
({plaintiff_name})`,
    postProcess: (fields) => {
      const amt = parseFloat(fields.claim_amount) || 0;
      fields.claim_amount_line = amt > 0 ? `Цена иска: ${amt.toLocaleString('ru-RU')} тенге` : '';
      fields.legal_basis_line = fields.legal_basis || 'Статьи Гражданского кодекса РК, иное применимое законодательство.';
      return fields;
    }
  },

  // ==================== ДОВЕРЕННОСТИ ====================
  {
    id: 'doverennost_obshchaya',
    category: 'proxies',
    title: 'Доверенность общая',
    description: 'Для представления интересов в госорганах, банках и т.д.',
    legalNotes: 'По ст. 162-167 ГК РК. Для сделок с недвижимостью — нотариальная форма обязательна.',
    fields: [
      { name: 'principal_name', label: 'ФИО доверителя', type: 'text', required: true },
      { name: 'principal_iin', label: 'ИИН доверителя', type: 'text', required: true },
      { name: 'principal_passport', label: 'Удостоверение личности доверителя №', type: 'text', required: true },
      { name: 'principal_address', label: 'Адрес доверителя', type: 'text', required: true },
      { name: 'agent_name', label: 'ФИО представителя', type: 'text', required: true },
      { name: 'agent_iin', label: 'ИИН представителя', type: 'text', required: true },
      { name: 'agent_passport', label: 'Удостоверение личности представителя №', type: 'text', required: true },
      { name: 'agent_address', label: 'Адрес представителя', type: 'text', required: true },
      { name: 'actions', label: 'Доверяемые полномочия', type: 'textarea', required: true, placeholder: 'представлять интересы в банках, получать справки, подписывать документы' },
      { name: 'valid_until', label: 'Действительна до', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата выдачи', type: 'date', required: true }
    ],
    template: `ДОВЕРЕННОСТЬ

г. {city}                                                                    {date}

Я, {principal_name}, ИИН {principal_iin}, удостоверение личности {principal_passport}, проживающий(-ая) по адресу: {principal_address}, настоящей доверенностью уполномочиваю:

{agent_name}, ИИН {agent_iin}, удостоверение личности {agent_passport}, проживающего(-ую) по адресу: {agent_address},

на следующие действия от моего имени:
{actions}

Для выполнения указанных полномочий уполномочиваю расписываться за меня, получать необходимые справки и документы, совершать иные связанные действия.

Доверенность выдана сроком до {valid_until}, без права передоверия.


___________________________ / {principal_name} /
        (подпись доверителя)`
  },

  {
    id: 'doverennost_avto',
    category: 'proxies',
    title: 'Доверенность на управление автомобилем',
    description: 'Разрешение на управление транспортным средством',
    legalNotes: 'По ст. 162-167 ГК РК. Не требует нотариального удостоверения. Водитель обязан иметь при себе.',
    fields: [
      { name: 'owner_name', label: 'ФИО владельца ТС', type: 'text', required: true },
      { name: 'owner_iin', label: 'ИИН владельца', type: 'text', required: true },
      { name: 'owner_passport', label: 'Удостоверение личности владельца №', type: 'text', required: true },
      { name: 'driver_name', label: 'ФИО водителя', type: 'text', required: true },
      { name: 'driver_iin', label: 'ИИН водителя', type: 'text', required: true },
      { name: 'driver_passport', label: 'Удостоверение личности водителя №', type: 'text', required: true },
      { name: 'car_mark', label: 'Марка/модель автомобиля', type: 'text', required: true },
      { name: 'car_year', label: 'Год выпуска', type: 'text', required: true },
      { name: 'car_vin', label: 'VIN-номер', type: 'text', required: true },
      { name: 'car_reg', label: 'Гос. номер', type: 'text', required: true },
      { name: 'valid_until', label: 'Действительна до', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата выдачи', type: 'date', required: true }
    ],
    template: `ДОВЕРЕННОСТЬ НА УПРАВЛЕНИЕ ТРАНСПОРТНЫМ СРЕДСТВОМ

г. {city}                                                                    {date}

Я, {owner_name}, ИИН {owner_iin}, удостоверение личности {owner_passport}, настоящей доверенностью уполномочиваю:

{driver_name}, ИИН {driver_iin}, удостоверение личности {driver_passport},

управлять и пользоваться принадлежащим мне транспортным средством:
— Марка/модель: {car_mark}
— Год выпуска: {car_year}
— VIN: {car_vin}
— Гос. номер: {car_reg}

Уполномочиваю также: предъявлять документы на транспортное средство, расписываться за меня в необходимых документах, связанных с управлением данным ТС.

Доверенность выдана сроком до {valid_until}, без права передоверия.


___________________________ / {owner_name} /
        (подпись владельца)`
  },

  {
    id: 'doverennost_nedvizh',
    category: 'proxies',
    title: 'Доверенность на сделки с недвижимостью',
    description: 'Для продажи, покупки или оформления квартиры через представителя',
    legalNotes: 'По ст. 162-167 ГК РК. ОБЯЗАТЕЛЬНО нотариальное удостоверение при сделках с недвижимостью.',
    fields: [
      { name: 'principal_name', label: 'ФИО доверителя', type: 'text', required: true },
      { name: 'principal_iin', label: 'ИИН доверителя', type: 'text', required: true },
      { name: 'agent_name', label: 'ФИО представителя', type: 'text', required: true },
      { name: 'agent_iin', label: 'ИИН представителя', type: 'text', required: true },
      { name: 'property_address', label: 'Адрес объекта недвижимости', type: 'text', required: true },
      { name: 'actions', label: 'Полномочия', type: 'textarea', required: true, placeholder: 'продать квартиру / купить квартиру / оформить в собственность / сдать в аренду' },
      { name: 'valid_until', label: 'Действительна до', type: 'date', required: true },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата выдачи', type: 'date', required: true }
    ],
    template: `ДОВЕРЕННОСТЬ НА СОВЕРШЕНИЕ СДЕЛОК С НЕДВИЖИМЫМ ИМУЩЕСТВОМ

г. {city}                                                                    {date}

Я, {principal_name}, ИИН {principal_iin}, настоящей доверенностью уполномочиваю:

{agent_name}, ИИН {agent_iin},

совершать от моего имени следующие действия в отношении недвижимого имущества по адресу: {property_address}:

{actions}

С этой целью уполномочиваю: подписывать договоры, акты приёма-передачи, заявления, получать и передавать документы, зарегистрировать переход права собственности в органах юстиции, совершать иные необходимые действия.

Доверенность выдана сроком до {valid_until}, без права передоверия.

ВНИМАНИЕ: Настоящая доверенность подлежит нотариальному удостоверению.


___________________________ / {principal_name} /
        (подпись доверителя)`
  },

  // ==================== ПРЕТЕНЗИИ ====================
  {
    id: 'pretenziya',
    category: 'claims',
    title: 'Претензия досудебная (универсальная)',
    description: 'Универсальная форма для предъявления требований до суда',
    legalNotes: 'Досудебный порядок обязателен для большинства споров. Срок ответа — 30 дней.',
    fields: [
      { name: 'addressee_name', label: 'Кому (организация или ФИО)', type: 'text', required: true },
      { name: 'addressee_address', label: 'Адрес адресата', type: 'text', required: true },
      { name: 'claimant_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'claimant_iin', label: 'Ваш ИИН', type: 'text', required: true },
      { name: 'claimant_address', label: 'Ваш адрес', type: 'text', required: true },
      { name: 'claimant_phone', label: 'Ваш телефон', type: 'text', required: true },
      { name: 'facts', label: 'Описание обстоятельств', type: 'textarea', required: true },
      { name: 'demand', label: 'Ваше требование', type: 'textarea', required: true },
      { name: 'response_days', label: 'Срок ответа (дней)', type: 'number', required: true, default: 30 },
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

Прошу дать письменный ответ на настоящую претензию в течение {response_days} дней с момента получения.

В случае отказа или игнорирования настоящей претензии оставляю за собой право обратиться в суд, а также в уполномоченные контролирующие органы. С Вас будут взысканы судебные расходы, включая государственную пошлину и услуги представителя.


г. {city}                                           {date}

___________________________
({claimant_name})`
  },

  {
    id: 'pretenziya_zpp',
    category: 'claims',
    title: 'Претензия о защите прав потребителя',
    description: 'Претензия в магазин или сервис по браку/некачественной услуге',
    legalNotes: 'По Закону РК О ЗПП. Без пошлины при обращении в суд. Срок ответа продавца — 10 дней.',
    fields: [
      { name: 'seller_name', label: 'Наименование продавца/исполнителя', type: 'text', required: true },
      { name: 'seller_address', label: 'Адрес продавца', type: 'text', required: true },
      { name: 'buyer_name', label: 'Ваше ФИО', type: 'text', required: true },
      { name: 'buyer_iin', label: 'Ваш ИИН', type: 'text', required: true },
      { name: 'buyer_phone', label: 'Ваш телефон', type: 'text', required: true },
      { name: 'purchase_date', label: 'Дата покупки/заключения договора', type: 'date', required: true },
      { name: 'product', label: 'Товар/услуга', type: 'text', required: true, placeholder: 'смартфон Samsung / ремонт телефона' },
      { name: 'price', label: 'Стоимость (тенге)', type: 'number', required: true },
      { name: 'defect', label: 'Описание недостатка', type: 'textarea', required: true },
      { name: 'demand', label: 'Требование', type: 'text', required: true, placeholder: 'вернуть деньги / заменить / устранить недостаток' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата претензии', type: 'date', required: true }
    ],
    template: `Руководителю {seller_name}
Адрес: {seller_address}

От: {buyer_name}
ИИН: {buyer_iin}
Телефон: {buyer_phone}


ПРЕТЕНЗИЯ
(в порядке досудебного урегулирования)

{purchase_date} я приобрёл(-а) у Вас {product} стоимостью {price} тенге.

В процессе использования был(-а) обнаружен(-а) следующий недостаток:
{defect}

В соответствии со статьями 13-15 Закона Республики Казахстан «О защите прав потребителей», ТРЕБУЮ:
{demand}

Прошу рассмотреть настоящую претензию и дать ответ в течение 10 (десяти) дней с момента получения.

В случае оставления претензии без ответа или неудовлетворения законных требований я буду вынужден(-а) обратиться: в суд с исковым заявлением; в Комитет по защите прав потребителей; в уполномоченный орган с жалобой.


г. {city}                                           {date}

___________________________
({buyer_name})`
  },

  // ==================== КАДРОВЫЕ ДОКУМЕНТЫ ====================
  {
    id: 'prikaz_priem',
    category: 'hr',
    title: 'Приказ о приёме на работу',
    description: 'Приказ работодателя о зачислении сотрудника в штат',
    legalNotes: 'По ст. 33 ТК РК. Объявляется работнику под роспись.',
    fields: [
      { name: 'employer_name', label: 'Наименование организации', type: 'text', required: true },
      { name: 'order_number', label: 'Номер приказа', type: 'text', required: true, placeholder: '12-К' },
      { name: 'employee_name', label: 'ФИО работника', type: 'text', required: true },
      { name: 'employee_iin', label: 'ИИН работника', type: 'text', required: true },
      { name: 'position', label: 'Должность', type: 'text', required: true },
      { name: 'department', label: 'Подразделение', type: 'text', required: false },
      { name: 'salary', label: 'Оклад (тенге)', type: 'number', required: true },
      { name: 'start_date', label: 'Дата начала работы', type: 'date', required: true },
      { name: 'probation', label: 'Испытательный срок', type: 'text', required: false, placeholder: '3 месяца / без испытания' },
      { name: 'date', label: 'Дата приказа', type: 'date', required: true }
    ],
    template: `{employer_name}

ПРИКАЗ № {order_number}
О ПРИЁМЕ НА РАБОТУ

{date}

ПРИНЯТЬ:

{employee_name}, ИИН {employee_iin},
на должность: {position}{department_line}
оклад: {salary} тенге в месяц
дата начала: {start_date}
{probation_line}

Основание: трудовой договор.


Директор / Руководитель: ___________________________

С приказом ознакомлен(-а): ___________________________
                                          ({employee_name})
{date}`,
    postProcess: (fields) => {
      fields.department_line = fields.department ? `\nподразделение: ${fields.department}` : '';
      fields.probation_line = fields.probation ? `испытательный срок: ${fields.probation}` : '';
      return fields;
    }
  },

  {
    id: 'prikaz_uvolnenie',
    category: 'hr',
    title: 'Приказ об увольнении',
    description: 'Приказ о расторжении трудового договора',
    legalNotes: 'По ст. 59 ТК РК. Объявляется работнику под роспись за 3 рабочих дня.',
    fields: [
      { name: 'employer_name', label: 'Наименование организации', type: 'text', required: true },
      { name: 'order_number', label: 'Номер приказа', type: 'text', required: true },
      { name: 'employee_name', label: 'ФИО работника', type: 'text', required: true },
      { name: 'position', label: 'Должность', type: 'text', required: true },
      { name: 'termination_date', label: 'Дата увольнения', type: 'date', required: true },
      { name: 'reason', label: 'Основание увольнения', type: 'text', required: true, placeholder: 'по собственному желанию (ст. 56 ТК РК) / сокращение штата (ст. 52 п.2 ТК РК)' },
      { name: 'date', label: 'Дата приказа', type: 'date', required: true }
    ],
    template: `{employer_name}

ПРИКАЗ № {order_number}
О РАСТОРЖЕНИИ ТРУДОВОГО ДОГОВОРА

{date}

УВОЛИТЬ:

{employee_name},
должность: {position},
дата увольнения: {termination_date},
основание: {reason}.

Бухгалтерии — произвести окончательный расчёт в течение 3 рабочих дней.


Директор / Руководитель: ___________________________

С приказом ознакомлен(-а): ___________________________
                                          ({employee_name})
{date}`
  },

  // ==================== АКТЫ ====================
  {
    id: 'akt_priemki',
    category: 'acts',
    title: 'Акт приёма-передачи',
    description: 'Фиксирует передачу товара, работ, имущества или документов',
    legalNotes: 'Подтверждает выполнение обязательств. Является основанием для оплаты.',
    fields: [
      { name: 'act_number', label: 'Номер акта', type: 'text', required: false, placeholder: '1' },
      { name: 'transferor_name', label: 'Передаёт (ФИО или наименование)', type: 'text', required: true },
      { name: 'receiver_name', label: 'Принимает (ФИО или наименование)', type: 'text', required: true },
      { name: 'contract_ref', label: 'Договор/основание', type: 'text', required: false, placeholder: 'Договор оказания услуг от 01.01.2026' },
      { name: 'description', label: 'Что передаётся (перечень)', type: 'textarea', required: true, placeholder: '1. Выполненные работы по...\n2. Документация' },
      { name: 'amount', label: 'Стоимость (тенге, 0 если безвозмездно)', type: 'number', required: false, default: 0 },
      { name: 'quality', label: 'Качество и состояние', type: 'text', required: false, default: 'надлежащее, претензий не имеется' },
      { name: 'city', label: 'Город', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    template: `АКТ ПРИЁМА-ПЕРЕДАЧИ № {act_number}

г. {city}                                                                    {date}

{transferor_name} (Передающая сторона) и {receiver_name} (Принимающая сторона) составили настоящий акт о нижеследующем:
{contract_line}

Передающая сторона передала, а Принимающая сторона приняла:
{description}

{amount_line}
Качество и состояние: {quality}.

Настоящий акт составлен в двух экземплярах, имеющих равную юридическую силу.


ПЕРЕДАЛ(-А):                                    ПРИНЯЛ(-А):
{transferor_name}                               {receiver_name}

___________________________                     ___________________________
        (подпись)                                       (подпись)`,
    postProcess: (fields) => {
      fields.contract_line = fields.contract_ref
        ? `\nОснование: ${fields.contract_ref}.` : '';
      const amt = parseFloat(fields.amount) || 0;
      fields.amount_line = amt > 0
        ? `Стоимость переданного: ${amt.toLocaleString('ru-RU')} тенге.` : '';
      return fields;
    }
  }
];

/**
 * Заполнить шаблон значениями полей.
 */
export function fillTemplate(template, fields) {
  let result = template.template;
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
    if (field.type === 'number' && processedFields[field.name] !== undefined) {
      const num = parseFloat(processedFields[field.name]);
      if (!isNaN(num) && num >= 1000) {
        processedFields[field.name] = num.toLocaleString('ru-RU').replace(/,/g, ' ');
      }
    }
  }

  for (const [key, value] of Object.entries(processedFields)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }

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
