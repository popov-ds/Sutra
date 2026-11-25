import type { ClientStatus, TaskCategory, TaskStatus, TaskType } from '@/domain/types';

import type { AppLanguage } from './language';

type TaskDetail = (product: string) => string;

export type AppText = {
  today: string;
  directories: string;
  products: string;
  clientRequests: string;
  clients: string;
  settings: string;
  language: string;
  languageHint: string;
  add: string;
  back: string;
  openingDatabase: string;
  databaseFailed: string;
  loadFailed: string;
  searchClients: string;
  emptyClients: string;
  noSearchHits: string;
  deleteClient: string;
  deleteClientConfirm: (name: string) => string;
  deleteClientFailed: string;
  noTouches: string;
  overdue: (count: number) => string;
  newClient: string;
  name: string;
  phone: string;
  status: string;
  partnershipLater: string;
  saving: string;
  createClient: string;
  saveClientFailed: string;
  client: string;
  call: string;
  funnel: string;
  funnelHint: string;
  saveProfile: string;
  profileSaved: string;
  saveFailed: string;
  statusFailed: string;
  partnershipScheduled: (date: string) => string;
  purchases: string;
  recordPurchase: string;
  noPurchases: string;
  deletePurchase: string;
  deletePurchaseConfirm: (productName: string) => string;
  deletePurchaseFailed: string;
  purchasedOn: (bought: string, ends: string) => string;
  timeline: string;
  emptyTimeline: string;
  missingClient: string;
  newPurchase: string;
  clientLabel: string;
  productLabel: string;
  addClientFirst: string;
  durationDays: (days: number) => string;
  addProduct: string;
  editProduct: string;
  deleteProduct: string;
  deleteProductConfirm: (name: string) => string;
  selectProductFirst: string;
  productName: string;
  courseDays: string;
  saveProduct: string;
  saveProductFailed: string;
  deleteProductFailed: string;
  emptyProducts: string;
  chooseProduct: string;
  chooseClientRequest: string;
  clearSelection: string;
  clientRequestLabel: string;
  clientRequestName: string;
  addClientRequest: string;
  editClientRequest: string;
  deleteClientRequest: string;
  deleteClientRequestConfirm: (name: string) => string;
  selectClientRequestFirst: string;
  saveClientRequest: string;
  saveClientRequestFailed: string;
  deleteClientRequestFailed: string;
  emptyClientRequests: string;
  additionalInfo: string;
  noProductsForPurchase: string;
  purchaseDate: string;
  dateHint: string;
  willCreate: string;
  checkDate: string;
  chooseClientAndProduct: string;
  recordFailed: string;
  recording: string;
  recordPurchaseAction: string;
  touchesCreated: string;
  touchesCreatedLead: (count: number) => string;
  done: string;
  complete: string;
  notificationChannel: string;
  notificationsDisabledTitle: string;
  notificationsDisabledBody: string;
  notificationsEnable: string;
  planTitle: string;
  planFreeBadge: string;
  planProBadge: string;
  freePlanLead: (limit: number) => string;
  proPlanLead: string;
  freeFeatureAds: string;
  freeFeatureLimit: (limit: number) => string;
  freeFeatureNoSync: string;
  proFeatureNoAds: string;
  proFeatureUnlimited: string;
  proFeatureSync: string;
  upgradePro: string;
  upgradeProMonth: string;
  upgradeProYear: string;
  proPlanChooseTitle: string;
  proPlanChooseHint: string;
  proPlanPeriodMonth: string;
  proPlanPeriodYear: string;
  proPlanOfferLabel: (period: string, price: string) => string;
  promoCodeApply: string;
  promoCodePlaceholder: string;
  promoNotFound: string;
  proPurchasing: string;
  proPurchaseSuccess: string;
  proPurchaseFailed: string;
  proPurchaseCancelled: string;
  proRestoreNone: string;
  proPurchaseSoon: string;
  proPurchaseSoonPlay: string;
  freeFeatureAdsPlay: string;
  syncNow: string;
  syncing: string;
  syncDone: string;
  syncFailed: string;
  syncAccountTitle: string;
  syncAccountHint: string;
  syncEmail: string;
  syncSendCode: string;
  syncCode: string;
  syncVerify: string;
  syncSignOut: string;
  syncSignedIn: (email: string) => string;
  syncCodeSent: string;
  proCloudSyncWarning: string;
  dialogClose: string;
  supportContact: string;
  enableProDev: string;
  downgradeFreeDev: string;
  adPlaceholder: string;
  digestTitle: (date: string) => string;
  digestMore: (count: number) => string;
  statusLabel: Record<ClientStatus, string>;
  category: Record<TaskCategory, string>;
  taskStatus: Record<TaskStatus, string>;
  taskTitle: Record<TaskType, string>;
  taskDetail: Record<TaskType, TaskDetail>;
  errors: Record<string, string>;
};

const RU: AppText = {
  today: 'Сегодня',
  directories: 'Справочники',
  products: 'Продукты',
  clientRequests: 'Запросы клиента',
  clients: 'Клиенты',
  settings: 'Настройки',
  language: 'Язык',
  languageHint: 'Язык сохраняется на этом устройстве. Заголовки касаний переключаются сразу.',
  add: 'Добавить',
  back: 'Назад',
  openingDatabase: 'Открываю локальную базу',
  databaseFailed: 'Не удалось открыть базу',
  loadFailed: 'Не удалось загрузить данные',
  searchClients: 'Имя или телефон',
  emptyClients: 'Добавьте первого клиента. Покупки сами соберут календарь касаний.',
  noSearchHits: 'Никого не нашлось по этому запросу.',
  deleteClient: 'Удалить',
  deleteClientConfirm: (name) => `Удалить клиента «${name}»? История покупок и касаний тоже исчезнет.`,
  deleteClientFailed: 'Не удалось удалить клиента',
  noTouches: 'На этот день касаний нет. Они появляются сами, когда вы фиксируете покупку.',
  overdue: (count) => `Просрочено · ${count}`,
  newClient: 'Новый клиент',
  name: 'Имя',
  phone: 'Телефон',
  status: 'Статус',
  partnershipLater: 'Окно партнерства запускается позже, когда в карточке статус меняют на «Постоянный клиент».',
  saving: 'Сохраняю…',
  createClient: 'Сохранить',
  saveClientFailed: 'Не удалось сохранить клиента',
  client: 'Клиент',
  call: 'Позвонить',
  funnel: 'Воронка',
  funnelHint: 'Перевод в «Постоянный клиент» ставит задачу через 21 день.',
  saveProfile: 'Сохранить',
  profileSaved: 'Контакты сохранены',
  saveFailed: 'Не удалось сохранить',
  statusFailed: 'Не удалось сменить статус',
  partnershipScheduled: (date) => `Задача «Окно партнерства» поставлена на ${date}.`,
  purchases: 'Покупки',
  recordPurchase: 'Покупка',
  noPurchases: 'Покупок пока нет.',
  deletePurchase: 'Удалить',
  deletePurchaseConfirm: (productName) =>
    `Удалить покупку «${productName}»? Касания, созданные из этой покупки, тоже исчезнут.`,
  deletePurchaseFailed: 'Не удалось удалить покупку',
  purchasedOn: (bought, ends) => `Куплен ${bought} · период до ${ends}`,
  timeline: 'Таймлайн касаний',
  emptyTimeline: 'Автозадачи появятся после покупки или перевода в постоянного клиента.',
  missingClient: 'Не передан клиент',
  newPurchase: 'Новая покупка',
  clientLabel: 'Клиент',
  productLabel: 'Продукт',
  addClientFirst: 'Сначала добавить клиента',
  durationDays: (days) => `${days} дн.`,
  addProduct: 'Добавить',
  editProduct: 'Править',
  deleteProduct: 'Удалить',
  deleteProductConfirm: (name) => `Удалить «${name}» из каталога?`,
  selectProductFirst: 'Сначала выберите продукт в списке',
  productName: 'Название',
  courseDays: 'Срок использования, дни',
  saveProduct: 'Сохранить',
  saveProductFailed: 'Не удалось сохранить продукт',
  deleteProductFailed: 'Не удалось удалить продукт',
  emptyProducts: 'Каталог пуст. Нажмите «Добавить» вверху справа.',
  chooseProduct: 'Выберите продукт',
  chooseClientRequest: 'Выберите запрос',
  clearSelection: 'Сбросить',
  clientRequestLabel: 'Запрос клиента',
  clientRequestName: 'Название',
  addClientRequest: 'Добавить',
  editClientRequest: 'Править',
  deleteClientRequest: 'Удалить',
  deleteClientRequestConfirm: (name) => `Удалить «${name}» из справочника?`,
  selectClientRequestFirst: 'Сначала выберите запрос в списке',
  saveClientRequest: 'Сохранить',
  saveClientRequestFailed: 'Не удалось сохранить запрос',
  deleteClientRequestFailed: 'Не удалось удалить запрос',
  emptyClientRequests: 'Справочник пуст. Нажмите «Добавить» внизу.',
  additionalInfo: 'Дополнительная информация',
  noProductsForPurchase: 'Сначала добавьте продукты в справочнике.',
  purchaseDate: 'Дата покупки — день 0',
  dateHint: 'Формат дд.мм.гггг. От этой даты считаются дни 0, 3, 7 и 15.',
  willCreate: 'Будут созданы',
  checkDate: 'Проверьте дату',
  chooseClientAndProduct: 'Выберите клиента и продукт',
  recordFailed: 'Не удалось записать покупку',
  recording: 'Записываю…',
  recordPurchaseAction: 'Зафиксировать',
  touchesCreated: 'Касания созданы',
  touchesCreatedLead: (count) => `В календарь легло ${count} задач. Даты посчитаны от дня покупки.`,
  done: 'Готово',
  complete: 'Выполнено',
  notificationChannel: 'План касаний',
  notificationsDisabledTitle: 'Уведомления выключены',
  notificationsDisabledBody:
    'Без них легко пропустить касания по клиентам. Включите уведомления — каждое утро в 9:00 приложение пришлёт локальный план на день: кого позвонить и какие задачи по покупкам.',
  notificationsEnable: 'Включить уведомления',
  planTitle: 'Подписка',
  planFreeBadge: 'Бесплатно',
  planProBadge: 'Pro',
  freePlanLead: (limit) => `До ${limit} клиентов и до ${limit} позиций в каждом справочнике.`,
  proPlanLead: 'Без рекламы, без лимитов, облачная синхронизация через Supabase.',
  freeFeatureAds: 'Реклама внизу экранов',
  freeFeatureLimit: (limit) => `Не больше ${limit} клиентов и ${limit} записей в «Продуктах» и «Запросах клиента»`,
  freeFeatureNoSync: 'Нет синхронизации в облако',
  proFeatureNoAds: 'Без рекламы',
  proFeatureUnlimited: 'Без лимита клиентов и справочников',
  proFeatureSync: 'Синхронизация с Supabase (Pro)',
  upgradePro: 'Оформить Pro',
  upgradeProMonth: 'Pro — месяц',
  upgradeProYear: 'Pro — год',
  proPlanChooseTitle: 'Выберите тариф Pro',
  proPlanChooseHint: 'Месячная или годовая подписка через RuStore.',
  proPlanPeriodMonth: '1 месяц',
  proPlanPeriodYear: '1 год',
  proPlanOfferLabel: (period, price) => `${period}, ${price}`,
  promoCodeApply: 'Промокод',
  promoCodePlaceholder: 'Код',
  promoNotFound: 'Промокод не найден или недействителен.',
  proPurchasing: 'Открываю оплату…',
  proPurchaseSuccess: 'Подписка Pro активна.',
  proPurchaseFailed: 'Не удалось оформить Pro. Установите RuStore и войдите в аккаунт.',
  proPurchaseCancelled: 'Оплата отменена.',
  proRestoreNone: 'Активная подписка не найдена.',
  proPurchaseSoon: 'Покупку Pro подключим через RuStore. Пока Pro можно включить в режиме разработки.',
  proPurchaseSoonPlay: 'Покупку Pro подключим через Google Play. Пока Pro можно включить в режиме разработки.',
  freeFeatureAdsPlay: 'Реклама внизу экранов',
  syncNow: 'Синхронизировать сейчас',
  syncing: 'Синхронизация…',
  syncDone: 'Синхронизация с облаком завершена.',
  syncFailed: 'Не удалось синхронизировать',
  syncAccountTitle: 'Аккаунт облака',
  syncAccountHint: 'Один email — одна база на всех устройствах с Pro. Код придёт на почту.',
  syncEmail: 'Email',
  syncSendCode: 'Отправить код',
  syncCode: 'Код из письма',
  syncVerify: 'Войти',
  syncSignOut: 'Выйти из облака',
  syncSignedIn: (email) => `В облаке: ${email}`,
  syncCodeSent: 'Код отправлен. Проверьте почту.',
  proCloudSyncWarning:
    'Внимание! У вас активен тариф Pro, но не подключена облачная синхронизация. Получите доступ к облаку и обеспечьте сохранность данных.',
  dialogClose: 'Закрыть',
  supportContact: 'Поддержка',
  enableProDev: 'DEV: включить Pro',
  downgradeFreeDev: 'DEV: вернуть Free',
  adPlaceholder: 'Реклама РСЯ',
  digestTitle: (date) => `Касания на ${date}`,
  digestMore: (count) => `• и ещё ${count}`,
  statusLabel: {
    newbie: 'Новичок',
    regular: 'Постоянный клиент',
    candidate: 'Кандидат',
    partner: 'Партнер',
  },
  category: {
    service: 'Сервис',
    upsell: 'Допродажи',
    partnership: 'Партнерство',
  },
  taskStatus: {
    pending: 'Ожидает',
    done: 'Выполнено',
    overdue: 'Просрочено',
  },
  taskTitle: {
    service_usage: 'Сервис: Объяснить, как пользоваться продуктом и как его хранить',
    control_checkin: 'Контроль: Уточнить впечатление от продукта и ответить на вопросы',
    result_checkpoint: 'Результат: Спросить об эффекте или обратной связи',
    cross_sell: 'Кросс-селл: Предложить дополнительный продукт из вашего каталога',
    reorder_reminder: 'Напомнить о заказе, продукт скоро закончится',
    partnership_offer: 'Окно партнерства: Сделать бизнес-предложение',
  },
  taskDetail: {
    service_usage: (product) => `Продукт «${product}». Показать, как пользоваться и как хранить.`,
    control_checkin: (product) => `Продукт «${product}». Спросить, всё ли понятно и устраивает ли результат на этом этапе.`,
    result_checkpoint: (product) => `Продукт «${product}». Зафиксировать обратную связь словами клиента.`,
    cross_sell: (product) =>
      `После «${product}». Уточнить, что ещё может пригодиться, и предложить другой продукт из каталога — не повтор текущей покупки.`,
    reorder_reminder: (product) => `«${product}» скоро закончится. Напомнить о повторном заказе.`,
    partnership_offer: () => 'Статус «Постоянный клиент» запускает задачу через 21 день.',
  },
  errors: {
    'Дата должна быть в формате ГГГГ-ММ-ДД': 'Дата должна быть в формате ГГГГ-ММ-ДД',
    'Такой календарной даты нет': 'Такой календарной даты нет',
    'Укажите имя клиента': 'Укажите имя клиента',
    'Имя слишком длинное': 'Имя слишком длинное',
    'Телефон слишком длинный': 'Телефон слишком длинный',
    'Длительность курса — целое число дней от 1 до 3650': 'Срок использования — целое число дней от 1 до 3650',
    'Укажите название продукта': 'Укажите название продукта',
    'Название продукта слишком длинное': 'Название продукта слишком длинное',
    'Продукт не найден': 'Продукт не найден',
    'Покупка не найдена': 'Покупка не найдена',
    'Нельзя удалить продукт с покупками': 'Нельзя удалить продукт с покупками',
    'Укажите название запроса': 'Укажите название запроса',
    'Название запроса слишком длинное': 'Название запроса слишком длинное',
    'Запрос клиента не найден': 'Запрос клиента не найден',
    'Нельзя удалить запрос, который выбран у клиентов': 'Нельзя удалить запрос, который выбран у клиентов',
    'Дополнительная информация слишком длинная': 'Дополнительная информация слишком длинная',
    'Достигнут лимит клиентов в бесплатной версии': 'Достигнут лимит клиентов в бесплатной версии. Оформите Pro.',
    'Достигнут лимит продуктов в бесплатной версии': 'Достигнут лимит продуктов в бесплатной версии. Оформите Pro.',
    'Достигнут лимит запросов в бесплатной версии': 'Достигнут лимит запросов в бесплатной версии. Оформите Pro.',
    'Облачная синхронизация доступна в Pro': 'Облачная синхронизация доступна в Pro',
    unavailable: 'Платежи RuStore недоступны. Установите RuStore и войдите в аккаунт.',
    cancelled: 'Оплата отменена.',
    payment_failed: 'Оплата не прошла. Попробуйте снова.',
    unknown: 'Не удалось завершить оплату.',
    'RuStore billing is not integrated yet': 'Платежи RuStore ещё не подключены в этой сборке.',
    'RuStore Pay SDK is not linked in this build': 'SDK оплаты RuStore не включён в сборку.',
    'RuStore payments are unavailable (install RuStore and sign in)':
      'Платежи недоступны: установите RuStore и войдите в аккаунт.',
    'RuStore payments are unavailable': 'Платежи RuStore сейчас недоступны.',
  },
};

const EN: AppText = {
  today: 'Today',
  directories: 'Directories',
  products: 'Products',
  clientRequests: 'Client requests',
  clients: 'Clients',
  settings: 'Settings',
  language: 'Language',
  languageHint: 'The language stays on this device. Touch titles switch immediately.',
  add: 'Add',
  back: 'Back',
  openingDatabase: 'Opening the local database',
  databaseFailed: 'Could not open the database',
  loadFailed: 'Could not load the data',
  searchClients: 'Name or phone',
  emptyClients: 'Add the first client. Purchases build the touch calendar on their own.',
  noSearchHits: 'No one matches this search.',
  deleteClient: 'Delete',
  deleteClientConfirm: (name) => `Delete client “${name}”? Purchases and tasks will be removed too.`,
  deleteClientFailed: 'Could not delete the client',
  noTouches: 'No touches on this day. They appear when you record a purchase.',
  overdue: (count) => `Overdue · ${count}`,
  newClient: 'New client',
  name: 'Name',
  phone: 'Phone',
  status: 'Status',
  partnershipLater: 'The partnership window starts later, when the card status changes to Regular client.',
  saving: 'Saving…',
  createClient: 'Create client',
  saveClientFailed: 'Could not save the client',
  client: 'Client',
  call: 'Call',
  funnel: 'Funnel',
  funnelHint: 'Moving the client to Regular schedules a task 21 days later.',
  saveProfile: 'Save',
  profileSaved: 'Contact details saved',
  saveFailed: 'Could not save',
  statusFailed: 'Could not change the status',
  partnershipScheduled: (date) => `Partnership window scheduled for ${date}.`,
  purchases: 'Purchases',
  recordPurchase: 'Record a purchase',
  noPurchases: 'No purchases yet.',
  deletePurchase: 'Delete',
  deletePurchaseConfirm: (productName) =>
    `Delete purchase “${productName}”? Touch tasks from this purchase will be removed too.`,
  deletePurchaseFailed: 'Could not delete the purchase',
  purchasedOn: (bought, ends) => `Bought ${bought} · period until ${ends}`,
  timeline: 'Touch timeline',
  emptyTimeline: 'Auto tasks appear after a purchase or a move to regular client.',
  missingClient: 'Client was not provided',
  newPurchase: 'New purchase',
  clientLabel: 'Client',
  productLabel: 'Product',
  addClientFirst: 'Add a client first',
  durationDays: (days) => `${days} days`,
  addProduct: 'Add',
  editProduct: 'Edit',
  deleteProduct: 'Delete',
  deleteProductConfirm: (name) => `Remove “${name}” from the catalog?`,
  selectProductFirst: 'Select a product in the list first',
  productName: 'Name',
  courseDays: 'Usage period, days',
  saveProduct: 'Save',
  saveProductFailed: 'Could not save the product',
  deleteProductFailed: 'Could not delete the product',
  emptyProducts: 'The catalog is empty. Tap Add at the bottom.',
  chooseProduct: 'Choose a product',
  chooseClientRequest: 'Choose a request',
  clearSelection: 'Clear',
  clientRequestLabel: 'Client request',
  clientRequestName: 'Name',
  addClientRequest: 'Add',
  editClientRequest: 'Edit',
  deleteClientRequest: 'Delete',
  deleteClientRequestConfirm: (name) => `Remove “${name}” from the directory?`,
  selectClientRequestFirst: 'Select a request in the list first',
  saveClientRequest: 'Save',
  saveClientRequestFailed: 'Could not save the request',
  deleteClientRequestFailed: 'Could not delete the request',
  emptyClientRequests: 'The directory is empty. Tap Add in the top-right corner.',
  additionalInfo: 'Additional information',
  noProductsForPurchase: 'Add products in the directory first.',
  purchaseDate: 'Purchase date — day 0',
  dateHint: 'Format DD.MM.YYYY. Days 0, 3, 7, and 15 are counted from this date.',
  willCreate: 'Will be created',
  checkDate: 'Check the date',
  chooseClientAndProduct: 'Choose a client and a product',
  recordFailed: 'Could not record the purchase',
  recording: 'Saving…',
  recordPurchaseAction: 'Record purchase',
  touchesCreated: 'Touches created',
  touchesCreatedLead: (count) => `${count} tasks were added. Dates are counted from the purchase day.`,
  done: 'Done',
  complete: 'Done',
  notificationChannel: 'Touch plan',
  notificationsDisabledTitle: 'Notifications are off',
  notificationsDisabledBody:
    'You may miss client touchpoints. Turn notifications on — every morning at 9:00 the app sends a local plan for the day: who to call and which purchase follow-ups are due.',
  notificationsEnable: 'Turn on notifications',
  planTitle: 'Subscription',
  planFreeBadge: 'Free',
  planProBadge: 'Pro',
  freePlanLead: (limit) => `Up to ${limit} clients and ${limit} items per directory.`,
  proPlanLead: 'No ads, no limits, cloud sync via Supabase.',
  freeFeatureAds: 'Ads at the bottom of the screens',
  freeFeatureLimit: (limit) => `At most ${limit} clients and ${limit} entries in Products and Client requests`,
  freeFeatureNoSync: 'No cloud sync',
  proFeatureNoAds: 'No ads',
  proFeatureUnlimited: 'Unlimited clients and directories',
  proFeatureSync: 'Supabase sync (Pro)',
  upgradePro: 'Get Pro',
  upgradeProMonth: 'Pro — monthly',
  upgradeProYear: 'Pro — yearly',
  proPlanChooseTitle: 'Choose a Pro plan',
  proPlanChooseHint: 'Monthly or yearly subscription via RuStore.',
  proPlanPeriodMonth: '1 month',
  proPlanPeriodYear: '1 year',
  proPlanOfferLabel: (period, price) => `${period}, ${price}`,
  promoCodeApply: 'Promo code',
  promoCodePlaceholder: 'Code',
  promoNotFound: 'Promo code was not found or is invalid.',
  proPurchasing: 'Opening checkout…',
  proPurchaseSuccess: 'Pro subscription is active.',
  proPurchaseFailed: 'Could not upgrade to Pro. Install RuStore and sign in.',
  proPurchaseCancelled: 'Payment cancelled.',
  proRestoreNone: 'No active subscription found.',
  proPurchaseSoon: 'Pro purchase via RuStore is coming soon. Use the dev toggle for now.',
  proPurchaseSoonPlay: 'Pro purchase via Google Play is coming soon. Use the dev toggle for now.',
  freeFeatureAdsPlay: 'Ads at the bottom of the screens',
  syncNow: 'Sync now',
  syncing: 'Syncing…',
  syncDone: 'Cloud sync finished.',
  syncFailed: 'Could not sync',
  syncAccountTitle: 'Cloud account',
  syncAccountHint: 'One email — one database on all Pro devices. You will receive a code by email.',
  syncEmail: 'Email',
  syncSendCode: 'Send code',
  syncCode: 'Code from email',
  syncVerify: 'Sign in',
  syncSignOut: 'Sign out',
  syncSignedIn: (email) => `Signed in: ${email}`,
  syncCodeSent: 'Code sent. Check your inbox.',
  proCloudSyncWarning:
    'Attention! You have an active Pro plan, but cloud sync is not connected. Sign in to the cloud to keep your data safe.',
  dialogClose: 'Close',
  supportContact: 'Support',
  enableProDev: 'DEV: enable Pro',
  downgradeFreeDev: 'DEV: switch to Free',
  adPlaceholder: 'RSYA ad',
  digestTitle: (date) => `Touches on ${date}`,
  digestMore: (count) => `• and ${count} more`,
  statusLabel: {
    newbie: 'New',
    regular: 'Regular client',
    candidate: 'Candidate',
    partner: 'Partner',
  },
  category: {
    service: 'Service',
    upsell: 'Upsell',
    partnership: 'Partnership',
  },
  taskStatus: {
    pending: 'Pending',
    done: 'Done',
    overdue: 'Overdue',
  },
  taskTitle: {
    service_usage: 'Service: Explain how to use and store the product',
    control_checkin: 'Check-in: Ask how the product is working and answer questions',
    result_checkpoint: 'Result: Ask for feedback or early results',
    cross_sell: 'Cross-sell: Suggest another product from your catalog',
    reorder_reminder: 'Remind them to reorder — the product is about to run out',
    partnership_offer: 'Partnership window: Make a business offer',
  },
  taskDetail: {
    service_usage: (product) => `Product “${product}”. Show how to use and store it.`,
    control_checkin: (product) => `Product “${product}”. Ask if everything is clear and if they are happy so far.`,
    result_checkpoint: (product) => `Product “${product}”. Write down the client’s feedback in their words.`,
    cross_sell: (product) =>
      `After “${product}”. Ask what else they might need and suggest another catalog item — not a repeat of this purchase.`,
    reorder_reminder: (product) => `“${product}” is about to run out. Remind them to order again.`,
    partnership_offer: () => 'Regular client status schedules this task 21 days later.',
  },
  errors: {
    'Дата должна быть в формате ГГГГ-ММ-ДД': 'Use the date format YYYY-MM-DD',
    'Такой календарной даты нет': 'That calendar date does not exist',
    'Укажите имя клиента': 'Enter the client name',
    'Имя слишком длинное': 'The name is too long',
    'Телефон слишком длинный': 'The phone number is too long',
    'Длительность курса — целое число дней от 1 до 3650': 'Usage period must be a whole number of days from 1 to 3650',
    'Укажите название продукта': 'Enter the product name',
    'Название продукта слишком длинное': 'The product name is too long',
    'Продукт не найден': 'Product not found',
    'Покупка не найдена': 'Purchase not found',
    'Нельзя удалить продукт с покупками': 'Cannot delete a product that has purchases',
    'Укажите название запроса': 'Enter the request name',
    'Название запроса слишком длинное': 'The request name is too long',
    'Запрос клиента не найден': 'Client request not found',
    'Нельзя удалить запрос, который выбран у клиентов': 'Cannot delete a request assigned to clients',
    'Дополнительная информация слишком длинная': 'Additional information is too long',
    'Достигнут лимит клиентов в бесплатной версии': 'Free plan client limit reached. Upgrade to Pro.',
    'Достигнут лимит продуктов в бесплатной версии': 'Free plan product limit reached. Upgrade to Pro.',
    'Достигнут лимит запросов в бесплатной версии': 'Free plan request limit reached. Upgrade to Pro.',
    'Облачная синхронизация доступна в Pro': 'Cloud sync is available in Pro',
    'Облако не настроено': 'Cloud is not configured',
    'Войдите в аккаунт для синхронизации': 'Sign in to sync',
    'Укажите email': 'Enter your email',
    'Введите код из письма': 'Enter the code from email',
    'Не удалось войти': 'Could not sign in',
    unavailable: 'RuStore billing is unavailable. Install RuStore and sign in.',
    cancelled: 'Payment cancelled.',
    payment_failed: 'Payment failed. Try again.',
    unknown: 'Could not complete the purchase.',
    'RuStore billing is not integrated yet': 'RuStore billing is not linked in this build.',
    'RuStore Pay SDK is not linked in this build': 'RuStore Pay SDK is missing from this build.',
    'RuStore payments are unavailable (install RuStore and sign in)':
      'Payments unavailable: install RuStore and sign in.',
    'RuStore payments are unavailable': 'RuStore payments are unavailable.',
  },
};

export function textOf(language: AppLanguage): AppText {
  return language === 'en' ? EN : RU;
}

export function translateError(error: unknown, text: AppText, fallback: string): string {
  if (error instanceof Error) return text.errors[error.message] ?? error.message;
  return fallback;
}

export function visibleTask(
  task: { type: TaskType; productName?: string | null; details: string },
  text: AppText,
  language: AppLanguage,
): { title: string; details: string } {
  const title = text.taskTitle[task.type];
  if (language === 'ru') return { title, details: task.details };
  return { title, details: text.taskDetail[task.type](task.productName ?? '') };
}
