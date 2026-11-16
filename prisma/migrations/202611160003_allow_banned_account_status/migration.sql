ALTER TABLE "Account" DROP CONSTRAINT "valid_status";
ALTER TABLE "Account"
  ADD CONSTRAINT "valid_status"
  CHECK ("status" IN ('Прогрев', 'Готов', 'В работе', 'Проверка', 'Бан'));
