import ProcessDiagramSwimlane from "@/components/ProcessDiagramSwimlane";

// Демонстрационные данные для тестирования диаграммы
const demoRoles = [
  { id: "role-1", name: "Менеджер по продажам", color: "#B3E5FC" },
  { id: "role-2", name: "Руководитель отдела продаж", color: "#F8BBD9" },
  { id: "role-3", name: "Технический специалист", color: "#C8E6C9" },
  { id: "role-4", name: "Финансовый отдел", color: "#FFF9C4" },
];

const demoStages = [
  { id: "stage-1", name: "Привлечение", order: 1 },
  { id: "stage-2", name: "Квалификация", order: 2 },
  { id: "stage-3", name: "Презентация", order: 3 },
  { id: "stage-4", name: "Согласование", order: 4 },
  { id: "stage-5", name: "Закрытие", order: 5 },
];

const demoSteps = [
  {
    id: "step-1",
    stageId: "stage-1",
    roleId: "role-1",
    type: "Start" as const,
    name: "Получение входящей заявки",
    description: "Клиент оставляет заявку на сайте, по телефону или через партнёрскую сеть. Менеджер получает уведомление в CRM.",
    order: 1,
    parameters: [
      { type: "time" as const, value: "15 минут" },
      { type: "document" as const, value: "Форма заявки клиента" },
      { type: "database" as const, value: "CRM Битрикс24" },
    ],
    nextSteps: ["step-2"],
  },
  {
    id: "step-2",
    stageId: "stage-1",
    roleId: "role-1",
    type: "Action" as const,
    name: "Первичный контакт с клиентом",
    description: "Звонок клиенту для уточнения потребностей, бюджета и сроков. Заполнение карточки клиента в CRM.",
    order: 2,
    parameters: [
      { type: "time" as const, value: "30 минут" },
      { type: "document" as const, value: "Скрипт первичного звонка" },
      { type: "document" as const, value: "Чек-лист квалификации" },
      { type: "database" as const, value: "CRM Битрикс24" },
      { type: "stage" as const, value: "Привлечение → Квалификация" },
    ],
    nextSteps: ["step-3"],
  },
  {
    id: "step-3",
    stageId: "stage-2",
    roleId: "role-1",
    type: "Decision" as const,
    name: "Клиент квалифицирован?",
    description: "Проверка соответствия клиента критериям: бюджет от 500 000 ₽, сроки от 1 месяца, наличие ЛПР",
    order: 3,
    branches: [
      { condition: "Да", targetStepId: "step-4" },
      { condition: "Нет", targetStepId: "step-reject" },
    ],
  },
  {
    id: "step-reject",
    stageId: "stage-2",
    roleId: "role-1",
    type: "End" as const,
    name: "Отказ / Отложенная сделка",
    description: "Клиент не соответствует критериям. Перевод в статус 'Отложено' или 'Отказ' с указанием причины.",
    order: 4,
  },
  {
    id: "step-4",
    stageId: "stage-2",
    roleId: "role-2",
    type: "Action" as const,
    name: "Согласование с руководителем",
    description: "РОП проверяет квалификацию клиента и принимает решение о назначении технического специалиста для подготовки КП.",
    order: 5,
    parameters: [
      { type: "time" as const, value: "1 час" },
      { type: "document" as const, value: "Карточка клиента" },
      { type: "database" as const, value: "CRM Битрикс24" },
    ],
    nextSteps: ["step-5"],
  },
  {
    id: "step-5",
    stageId: "stage-3",
    roleId: "role-3",
    type: "Action" as const,
    name: "Подготовка коммерческого предложения",
    description: "Технический специалист готовит детальное КП с расчётом стоимости, сроков и технических требований.",
    order: 6,
    parameters: [
      { type: "time" as const, value: "4 часа" },
      { type: "document" as const, value: "Шаблон КП" },
      { type: "document" as const, value: "Прайс-лист услуг" },
      { type: "document" as const, value: "Техническое задание" },
      { type: "database" as const, value: "1С:Управление проектами" },
    ],
    nextSteps: ["step-6"],
  },
  {
    id: "step-6",
    stageId: "stage-3",
    roleId: "role-1",
    type: "Product" as const,
    name: "Коммерческое предложение готово",
    description: "Готовое КП с детальной сметой, сроками и условиями оплаты. Документ согласован с руководителем.",
    order: 7,
    parameters: [
      { type: "document" as const, value: "Коммерческое предложение (PDF)" },
      { type: "document" as const, value: "Смета проекта (Excel)" },
    ],
    nextSteps: ["step-7"],
  },
  {
    id: "step-7",
    stageId: "stage-3",
    roleId: "role-1",
    type: "Action" as const,
    name: "Презентация КП клиенту",
    description: "Проведение встречи или видеозвонка для презентации КП. Ответы на вопросы, обсуждение условий.",
    order: 8,
    parameters: [
      { type: "time" as const, value: "1.5 часа" },
      { type: "document" as const, value: "Презентация компании" },
      { type: "database" as const, value: "Zoom / Google Meet" },
    ],
    nextSteps: ["step-8"],
  },
  {
    id: "step-8",
    stageId: "stage-4",
    roleId: "role-1",
    type: "Decision" as const,
    name: "Клиент согласен с условиями?",
    description: "Получение обратной связи от клиента по КП. Возможны переговоры по цене и срокам.",
    order: 9,
    branches: [
      { condition: "Да", targetStepId: "step-9" },
      { condition: "Торг", targetStepId: "step-5" },
      { condition: "Нет", targetStepId: "step-reject" },
    ],
  },
  {
    id: "step-9",
    stageId: "stage-4",
    roleId: "role-4",
    type: "Action" as const,
    name: "Подготовка договора",
    description: "Юридический отдел готовит договор на основе согласованного КП. Проверка реквизитов клиента.",
    order: 10,
    parameters: [
      { type: "time" as const, value: "2 часа" },
      { type: "document" as const, value: "Шаблон договора" },
      { type: "document" as const, value: "Реквизиты клиента" },
      { type: "database" as const, value: "1С:Бухгалтерия" },
    ],
    nextSteps: ["step-10"],
  },
  {
    id: "step-10",
    stageId: "stage-5",
    roleId: "role-1",
    type: "Action" as const,
    name: "Подписание договора",
    description: "Отправка договора клиенту, получение подписанного экземпляра. Регистрация в системе документооборота.",
    order: 11,
    parameters: [
      { type: "time" as const, value: "1-3 дня" },
      { type: "document" as const, value: "Договор (2 экз.)" },
      { type: "database" as const, value: "ЭДО Контур.Диадок" },
    ],
    nextSteps: ["step-11"],
  },
  {
    id: "step-11",
    stageId: "stage-5",
    roleId: "role-4",
    type: "Action" as const,
    name: "Выставление счёта и получение оплаты",
    description: "Формирование счёта на предоплату (50%). Контроль поступления средств на расчётный счёт.",
    order: 12,
    parameters: [
      { type: "time" as const, value: "1-5 дней" },
      { type: "document" as const, value: "Счёт на оплату" },
      { type: "database" as const, value: "1С:Бухгалтерия" },
      { type: "database" as const, value: "Банк-клиент" },
    ],
    nextSteps: ["step-12"],
  },
  {
    id: "step-12",
    stageId: "stage-5",
    roleId: "role-1",
    type: "End" as const,
    name: "Сделка закрыта успешно",
    description: "Договор подписан, предоплата получена. Клиент передаётся в отдел производства для начала работ.",
    order: 13,
    parameters: [
      { type: "document" as const, value: "Акт передачи в производство" },
      { type: "stage" as const, value: "Продажа → Производство" },
    ],
  },
];

export default function DiagramDemo() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Демонстрация диаграммы бизнес-процесса</h1>
          <p className="text-muted-foreground">
            Пример процесса продаж B2B с полной детализацией блоков
          </p>
        </div>
        
        <ProcessDiagramSwimlane
          steps={demoSteps}
          roles={demoRoles}
          stages={demoStages}
          title="Процесс продаж B2B: от заявки до закрытия сделки"
          editable={false}
        />
      </div>
    </div>
  );
}
