# Homework #8: Test Automation — End-to-End Scenarios

> **НАПРЯМ:** НАПРЯМ 1 · UI + API (Груповий Pre-Order)  
> **АРХІТЕКТУРА:** Onion Architecture — Page Object & Component Object Model (POM/COM) + Playwright Fixtures з автоматичним Seeding & Cleanup через API

---

## 1. Напрям та Архітектурний підхід

### 1.1. Обраний напрям
Згідно з інструкцією до ДЗ-8 (*Slide 51*):
- Оскільки реалізовано і Backend (ДЗ-5 AWS Lambdas C#), і Frontend (ДЗ-6 Angular 22), обрано **НАПРЯМ 1 · UI + API (Груповий Pre-Order)**.

### 1.2. Архітектурний підхід (Onion Architecture)
Реалізовано чотиришарову архітектуру тестового фреймворку:
1. **Business Facing Layer (Тести):** Окремі специфікації для кожного рівня (`level-1`, `level-2`, `level-3`, `bonus`), написані мовою бізнес-сценаріїв.
2. **Business Layer (Pages & Components):**
   - `GroupOrderPage` — Page Object головного екрана Owner'а.
   - `ParticipantCardComponent` — Component Object для картки окремого гостя/власника.
   - `SubmitModalComponent` — Component Object модального вікна відправки.
   - `RemoveGuestModalComponent` — Component Object модального вікна видалення.
   - `GroupOrderApiClient` — API клієнт для наповнення (Seeding) та очищення (Cleanup) даних.
3. **Automation Tool Layer (Playwright Engine):**
   - Використання виключно семантичних локаторів (`getByRole`, `getByText`, `getByTestId` — *Slide 40*).
   - Вбудоване авто-очікування (Auto-waiting — *Slide 44*).
   - Повне збереження артефактів: Tracing, Video, Screenshots on failure.
4. **Application Under Test (AUT):**
   - Angular 22 Web Application + REST API.

---

## 2. Покриття рівнів завдання

| Рівень | Статус | Файл тестів | Опис покриття |
|---|---|---|---|
| 🟢 **Рівень 1** | **100% PASS** | `tests/level-1-owner-review.spec.ts` | Перегляд списку учасників, відображення страв, цін, кількостей, підсумку для кожного гостя, зведеного блоку (Consolidated Pre-Order), підсумкової суми (Grand Total), динамічних дат `now + N`, банера неоформлених замовлень, негативних кейсів (Empty state, 404 Not Found, 500 Server Error). |
| 🔵 **Рівень 2** | **100% PASS** | `tests/level-2-submit-pre-order.spec.ts` | Підтвердження pre-order ресторану: клік кнопки, підтвердження у модальному вікні, відправка консолідованого списку страв (перевірка HTTP POST), зміна статусу на `Submitted` ("Sent to Restaurant"), блокування повторного надсилання, негативні кейси (скасування у модалці через Cancel / Close X, збій сервера). |
| 🟣 **Рівень 3** | **100% PASS** | `tests/level-3-remove-guest.spec.ts` | Видалення учасника: виклик модального вікна для конкретного гостя, підтвердження видалення (HTTP DELETE), видалення з UI, автоматичний перерахунок Grand Total, оновлення зведеного замовлення, оновлення лічильника гостей у шапці, перевірка правила заборони видалення Owner'а самого себе, скасування видалення, блокування видалення після сабміту. |
| ⭐️ **Бонус** | **100% PASS** | `tests/bonus-reporting-sdlc.spec.ts` | **Reporting & SDLC:** Незалежні паралельні сесії без взаємного впливу даних (concurrency isolation), Allure Report & Report Portal метадані (епіки, фічі, атрибути), автоматичне збереження трейсів та звітів. |

---

## 3. Відповідність технічним вимогам (Rubric Checklist)

- [x] **Позитивні й негативні сценарії:** Реалізовані позитивні end-to-end потоки та негативні валідації (Empty cart, 404 reservation, 500 errors, cancel modals, forbidden self-removal).
- [x] **Дати динамічно: `now + N`:** Усі дати генеруються динамічно утилітою `createDynamicReservationInterval(daysAhead)` (файли `helpers/date-helpers.ts` та `helpers/data-factory.ts`). Жодних хардкодних дат.
- [x] **Звіт + скриншот / відео / trace:** У `playwright.config.ts` активовано:
  - `screenshot: 'only-on-failure'`
  - `video: 'retain-on-failure'`
  - `trace: 'retain-on-failure'`
  - HTML Reporter (`playwright-report`) та Allure Reporter (`allure-results`).
- [x] **Дані створюються й прибираються (Seeding & Cleanup):** Кожен тест використовує фікстуру `test.extend` з `apiClient.seedGroupOrder` перед тестом та `apiClient.cleanup()` після завершення тесту.
- [x] **Тести незалежні й паралельні:** Кожна сесія має унікальний префікс та UUID. Працює режим `fullyParallel: true`.
- [x] **CI: падіння не зупиняє пайплайн:** У `.github/workflows/e2e.yml` кроки публікації Playwright Report та Allure Results мають умову `if: always()`.
- [x] **⭐️ Бонус: Report Portal & Cloud SDLC:** Створено `reportportal.config.json` та GitHub Actions workflow.

---

## 4. Інструкція із запуску тестів

### 4.1. Встановлення залежностей
```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

### 4.2. Запуск тестів
```bash
# Запуск усіх тестів (Рівні 1, 2, 3 та Бонус)
npm test

# Запуск окремих рівнів
npm run test:level1
npm run test:level2
npm run test:level3
npm run test:bonus

# Запуск з UI інтерфейсом Playwright
npm run test:ui

# Запуск у браузері (headed)
npm run test:headed
```

### 4.3. Перегляд звітів
```bash
# Відкрити Playwright HTML Report
npm run report

# Згенерувати та відкрити Allure Report
npm run report:allure
```

---

## 5. Структура тестового проекту

```text
e2e/
├── api/
│   └── group-order-api.client.ts      # API клієнт (Seeding & Cleanup запитів)
├── fixtures/
│   └── test.fixtures.ts               # Фікстури з ізоляцією тестових даних
├── helpers/
│   ├── date-helpers.ts                # Динамічні дати now + N (ISO, mediumDate, HH:mm)
│   └── data-factory.ts                # Фабрика об'єктів страв, учасників та замовлень
├── pages/
│   ├── components/
│   │   ├── participant-card.component.ts   # Компонент картки учасника
│   │   ├── submit-modal.component.ts       # Модальне вікно підтвердження сабміту
│   │   └── remove-guest-modal.component.ts # Модальне вікно видалення гостя
│   └── group-order.page.ts            # Page Object Owner Screen
├── tests/
│   ├── level-1-owner-review.spec.ts   # Сценарії Рівня 1 (позитивні + негативні)
│   ├── level-2-submit-pre-order.spec.ts# Сценарії Рівня 2 (сабміт + API верифікація)
│   ├── level-3-remove-guest.spec.ts   # Сценарії Рівня 3 (видалення + перерахунок)
│   └── bonus-reporting-sdlc.spec.ts   # Бонус: SDLC, паралельність, Allure/RP
├── playwright.config.ts               # Конфігурація Playwright
├── reportportal.config.json           # Інтеграція з Report Portal
├── package.json                       # Скрипти та залежності
└── README.md                          # Цей документ
```
