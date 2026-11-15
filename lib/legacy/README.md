# Исходные расчёты фарм-отдела

`farmingAnalytics.cjs` перенесён без изменения расчётов из
`trae-analytics/backend/src/services/farmingAnalytics.js`, исходная версия
`270f3b7cdd83ff1b35f3feebca6b303ea396ce47`.
Исходные восемь тестов сохранены в `tests/legacy/` (изменён только путь импорта).
Запуск: `node --test tests/legacy/farmingAnalytics.test.cjs`.

`buildMediaBuyingOverview` подключён через `lib/analytics-adapter.ts` и
`/api/analytics`: идентификатор профиля стабилен, статусы адаптируются явно,
лимиты переводятся из целых центов в доллары. Остальные функции пока не
подключены: для них требуются дополнительные исходные поля и события.
