# Manual QA Report — Homework #7: EPAM IT-Marathon 2026

**User Story:** `[Draft] US11_Guest Viewing Reservation Menu`  
**Epic:** Order Management | **Role:** Guest  
**Tested Page URL:** `https://d28jftogiwtein.cloudfront.net/join/613fc98442f44b9f97e74ad0beb0a5f0`  
**Design Reference:** Figma Design (`Owner Flow.png` та бренд-асет `Logo.png`)  
**Environment:** `Web / Desktop Chrome 156 / Windows 10/11 / P_PRD (CloudFront)`

---

## 1. Аналіз вимог User Story та виявлені недоліки (Requirements Analysis)

### 1.1. Базовий текст User Story
> **[Draft] US11_Guest Viewing Reservation Menu**  
> **Epic:** Order Management  
> **US name:** Guest Reservation and Menu View  
> **Role:** Guest  
> **Description:** As a Guest, I want to see the full restaurant menu, so that I know what options are available and can decide what to choose.  
> 
> **Pre-conditions:**
> - Guest has successfully joined the session (US_G10).
> - The parent reservation or group session status is in Created/"Reserved".
> 
> **Acceptance Criteria (AC):**
> 1. The Guest can view the full restaurant menu structured logically by category (e.g., Appetizers, Main Course, Desserts).
> 2. Each menu item must clearly display name, price, serving size in grams, image and current availability status.
> 3. The Guest can add an available dish directly to their personal subcart by interacting with a clear action button (e.g., "Pre-order").
> 4. Items currently marked "On Stop" are clearly indicated as unavailable and cannot be selected or added to the cart.
> 5. The menu reflects the current data at the time the Guest opens or refreshes the screen.

---

### 1.2. Виявлені недоліки у вимогах (За критеріями якості ISO/IEEE та відповідності дизайну Figma)

| № | Критерій якості | Опис недоліку у вимогах | Невідповідність із Figma (`Owner Flow.png` / `Logo.png`) та Рекомендація |
|---|---|---|---|
| **1** | **Трасованість та повнота (Traceability & Completeness)** | **Повне ігнорування модального вікна картки страви ("Menu item full view")**.<br>В AC 3 описано лише пряме додавання страви кнопкою "Pre-order" у підкошик. | **У Figma розроблено окремий детальний екран "Menu item full view"**: при кліку на страву відкривається модалка зі списком інгредієнтів, КБЖВ (Calories, Protein, Fats, Carbs), вітамінами, вагою та кнопкою "Pre-order".<br>👉 **Рекомендація:** Додати AC для відкриття модального вікна детального перегляду страви та вибору порцій. |
| **2** | **Несуперечливість (Consistency)** | **Трирівнева термінологічна суперечність статусу недоступності страви**:<br>- У вимогах US11 AC 4: `"On Stop"`<br>- У макеті Figma (`Owner Flow.png`): бейдж рожевого кольору `"Sold Out"`<br>- У реалізованому UI (`screenshot.png`): бейдж `"Out Of Stock"`. | **Проблема:** Бізнес-аналітик, UX-дизайнер та frontend-розробник використали три різні терміни для однієї сутності.<br>👉 **Рекомендація:** Узгодити єдиний статус у Design System та вимогах: для клієнтського інтерфейсу використовувати `"Sold Out"` (або `"On Stop"`). |
| **3** | **Повнота та дизайн (Completeness)** | **Відсутність вимог до сортування страв ("Sort by: Popular First")**.<br>У вимогах US11 немає жодної згадки про сортування каталогу. | **У Figma над сіткою страв праворуч розміщено селектор сортування `Sort by: Popular First [v]`** (з опціями Popular First, Price Low-High, Price High-Low).<br>👉 **Рекомендація:** Додати в AC 1 опис функціоналу та опцій випадаючого списку сортування. |
| **4** | **Повнота (Completeness)** | **Опис сторі не покриває дію додавання страв у кошик**.<br>В описі зазначено лише: *"...so that I know what options are available and can decide what to choose"*, тоді як AC 3 та AC 4 описують наповнення персонального замовлення. | 👉 **Рекомендація:** Доповнити User Story: *"...so that I know what options are available, can decide what to choose, and add dishes to my personal pre-order cart."* |
| **5** | **Однозначність та несуперечливість (Clarity & Consistency)** | **Невизначеність статусів у Pre-conditions:** Зазначено `Created/"Reserved"`. Не зрозуміло, який саме статус є дійсним (`Created` чи `Reserved`). | У системній архітектурі та API статус бронювання — `Reserved`, а групової сесії — `Open`.<br>👉 **Рекомендація:** Зафіксувати точну комбінацію статусів: `Reservation.Status == 'Reserved'` та `GroupSession.Status == 'Open'`. |
| **6** | **Повнота (Completeness)** | **Відсутність дедлайнів замовлення (Pre-order Cut-off / Hard Lock)**.<br>В US11 не описано, що відбувається, коли гість відкриває меню незадовго до бронювання. | **У Figma передбачено цілі сценарії блокування замовлення**: `AUTOMATIC PRE-ORDER HARD LOCK (T-45 MINUTES CUT-OFF)` та `(T-30 MINUTES CUT-OFF)` з інформаційними плашками та режимом view-only.<br>👉 **Рекомендація:** Описати поведінку інтерфейсу при досягненні cut-off ліміту часу. |
| **7** | **Однозначність (Unambiguity)** | **AC 2: Не визначено відображення статусу для доступних страв**.<br>Вказано: *"clearly display ... current availability status"*, але на макеті для доступних страв бейджа немає. | 👉 **Рекомендація:** Уточнити, що доступність визначається наявністю активної кнопки замовлення та відсутністю бейджа "Sold Out". |
| **8** | **Точність та консистентність (Consistency)** | **AC 2: Не зафіксовано формат ваги та ціни**.<br>У макеті Figma вага пишеться через пробіл (`430 g`, `270 g`), а ціна подекуди `$17`, подекуди `12$`. В UI виявлено розбіжності: `200g` vs `450 g`. | 👉 **Рекомендація:** Зафіксувати точний формат у вимогах: `[value] g` (з обов'язковим пробілом) та валюту `$XX.XX` (або ціле число). |
| **9** | **Повнота (Completeness)** | **AC 3: Відсутність логіки кошика та зворотного зв'язку**.<br>Не описано, як оновлюється лічильник товарів, де розташована іконка кошика та як відкривається бічна панель ("Cart Drawer"). | **У Figma екран "Menu Page. 2 items in the cart. Header" показує кошик із бейджем `[2]` у шапці поруч з аватаром**, а клік відкриває панель "Cart" із сумою "Grand Total" та кнопкою "Submit Pre-Order".<br>👉 **Рекомендація:** Описати поведінку кошика, індикацію кількості та перехід до форми оформлення. |
| **10** | **Повнота (Completeness)** | **Відсутність нефункціональних вимог та станів помилок**.<br>Не визначено відображення скелетонів/лоадерів під час завантаження меню та поведінку при 500/мережевих збоях (кнопка "Try again"). | 👉 **Рекомендація:** Додати AC для станів `Loading`, `Empty Category` та `Network Error`. |

---

## 2. Тест-кейси (Test Cases)

Повний набір тест-кейсів експортовано у файл [`test_cases.csv`](test_cases.csv).

| ID | Title | Pre-conditions | Steps & Expected Result | Status |
|---|---|---|---|---|
| **TC 1** | Verify that full restaurant menu is displayed structured by categories when Guest joins session | 1. Guest joined session via invite link.<br>2. Reservation status: "Reserved".<br>3. Menu categories exist: Appetizers, Main Courses, Desserts. | **Steps:** Open invite link, observe page layout.<br>**Expected:** Header with branding, hero banner "Green & Tasty Restaurants / Menu", category tabs (Appetizers, Main Courses, Desserts), dishes grouped by category. | **Passed** |
| **TC 2** | Verify authentic brand logo display in Header against `Logo.png` and Figma specifications | 1. Guest on Menu page.<br>2. Official `Logo.png` approved. | **Steps:** Inspect header logo, typography, sprout placement.<br>**Expected:** Sprout forms trunk of letter 'T' in "GreenTasty", leaves rise between 'n' and 'T', subtitle "HEALTHY EATERS RESTAURANT". | ❌ **Failed** |
| **TC 3** | Verify menu item card details display (Name, Price, Serving Size, Authentic Image, Availability status) | 1. Guest on Menu page.<br>2. Available and unavailable dishes exist. | **Steps:** Check card title, photo, price, serving size, availability badge.<br>**Expected:** Authentic photo (pizza for pizza, risotto for risotto), formatted price `$XX.XX`, weight with space (e.g. `430 g`), clear status indicator. | ❌ **Failed** |
| **TC 4** | Verify adding an available dish directly to personal subcart and updating cart counter badge | 1. Guest on Menu page.<br>2. Dish is Available.<br>3. Subcart has 0 items. | **Steps:** Click [Pre-order] on card, observe cart icon.<br>**Expected:** Dish added to personal subcart without full reload, button gives visual feedback, cart icon displays counter badge `[1]`. | ❌ **Failed** |
| **TC 5** | Verify that items marked "Sold Out" / "On Stop" cannot be selected or added to cart | 1. Guest on Menu page.<br>2. Dish marked unavailable. | **Steps:** Observe card styling, attempt to click button.<br>**Expected:** Card has "Sold Out" / "On Stop" badge, dimmed opacity, button is disabled/unclickable, item cannot be added. | **Passed** |
| **TC 6** | Verify opening and displaying dish details modal ("Menu item full view" from Figma) | 1. Guest on Menu page with dishes. | **Steps:** Click on dish card (e.g. Fresh Strawberry Mint Salad).<br>**Expected:** Modal opens displaying large photo, description/ingredients, nutrition (Calories, Protein, Fats, Carbs, Vitamins), serving size/price, and [Pre-order] button. | ❌ **Failed** |
| **TC 7** | Verify filtering dishes by selecting category tabs (Appetizers, Main Courses, Desserts) | 1. Guest on Menu page with categories. | **Steps:** Click Appetizers, Main Courses, Desserts tabs.<br>**Expected:** Dishes filtered accordingly, active green indicator on tab, Desserts tab is present and displays dessert items. | ❌ **Failed** |
| **TC 8** | Verify dish sorting functionality via "Sort by" dropdown | 1. Guest on Menu page with multiple dishes. | **Steps:** Locate "Sort by:" dropdown, select "Popular First", "Price: Low to high".<br>**Expected:** Dropdown is visible and operational, items sort dynamically without reload. | ❌ **Failed** |
| **TC 9** | Verify viewing personal pre-order cart drawer, item removal, and quantity adjustment | 1. 2 dishes in personal subcart.<br>2. Guest on Menu page. | **Steps:** Click cart icon, adjust quantities `[-] [+]`, click trash icon.<br>**Expected:** Cart drawer slides from right, items listed with photo, prep time, price; total recalculates dynamically; [Submit Pre-Order] enabled. | **Passed** |
| **TC 10** | Verify menu data freshness on manual page refresh | 1. Guest on Menu page.<br>2. Dish status changed to unavailable on backend. | **Steps:** Reload page (F5), inspect dish card.<br>**Expected:** Screen reloads updated data from server, status updates to unavailable immediately. | **Passed** |
| **TC 11** | Verify header elements and session isolation for Guest on pre-order menu page | 1. Unauthenticated Guest opened `/join/:token`. | **Steps:** Inspect top header navigation links and icons.<br>**Expected:** Header shows only guest-relevant controls; customer actions ("Book a Table", "Reservations", avatar) are hidden or isolated from guest session. | ❌ **Failed** |
| **TC 12** | Verify session behavior and cut-off handling when reservation is Cancelled or past cut-off time (Hard Lock) | 1. Reservation is Cancelled OR time < T-45 min. | **Steps:** Open invite link, check controls.<br>**Expected:** Cancelled shows informatory message; past cut-off shows banner and switches menu to view-only mode. | **Passed** |

---

## 3. Результати тестування за скріншотом (Testing against Screenshot & Design)

Порівняння реалізованої сторінки (`screenshot.png`), вимог (`user_story.pdf`) та дизайну Figma (`Logo.png`, `Owner Flow.png`):

1. **Логотип бренду (Brand Integrity):** ❌ **Критична візуальна невідповідність.**
   - У `Logo.png` та Figma: слово "GreenTasty", де стебло зеленого паростка утворює вертикальну ніжку літери **'T'**, а листочки ростуть вгору між **'n'** та **'T'**. Внизу підпис: "HEALTHY EATERS RESTAURANT".
   - На скріншоті: паросток розташований окремо зліва над літерою **'G'** ("🌱 Green Tasty"), літера 'T' звичайна, типографіка та пропорції порушені.
2. **Категорії та сортування (AC 1 & Figma):** ❌ **Невідповідність.**
   - На скріншоті є лише "All dishes", "Appetizers", "Main Courses". **Категорія "Desserts" повністю відсутня!**
   - Елемент сортування **`Sort by: Popular First [v]`**, який є у Figma, на скріншоті відсутній.
3. **Фотографії та відповідність контенту (AC 2):** ❌ **Грубий дефект.**
   - Страва "Margherita Pizza" показує фотографію зеленого овочевого салату!
   - Страва "Truffle Mushroom Risotto" показує фотографію полуничного десертного салату!
   - Страва "Fresh Avocado Toast" показує фотографію салату в мисці без тосту!
4. **Статус недоступності (AC 4 vs Figma vs UI):** ❌ **Термінологічний конфлікт.**
   - На скріншоті бейдж містить напис `"Out Of Stock"`.
   - У Figma бейдж містить напис `"Sold Out"`.
   - В AC 4 статус названо `"On Stop"`.
5. **Індикація доступності (AC 2):** ⚠️ **Частково.**
   - Для страви "Margherita Pizza" немає жодного бейджа чи текстового підтвердження "Available" / "In Stock" (лише активна кнопка).
6. **Форматування ваги (AC 2):** ❌ **Неузгодженість стилів.**
   - "Fresh Avocado Toast" — `200g` (без пробілу).
   - "Truffle Mushroom Risotto" — `350g` (без пробілу).
   - "Margherita Pizza" — `450 g` (з пробілом). У Figma всі ваги мають стандартний вигляд з пробілом (`430 g`, `270 g`).
7. **Кошик та лічильник (AC 3, AC 5 & Figma):** ❌ **Невідповідність дизайну.**
   - На скріншоті іконка кошика розташована всередині зеленої плашки бронювання праворуч, без будь-якого лічильника кількості страв.
   - У Figma (екран "Menu Page. 2 items in the cart. Header") кошик розміщено у хедері поруч з профілем, і на ньому є помаранчевий круглий бейдж з цифрою кількості (`[2]`).
8. **Шапка гостьової сесії (Guest Session Security & UX):** ❌ **Архітектурний дефект.**
   - У неавторизованій гостьовій сесії (`/join/:token`) відображаються клієнтські пункти меню ("Main page", "Book a Table", "Reservations") та аватарка профілю користувача.

---

## 4. Дефект-репорти (Defect Reports)

Повний набір дефектів експортовано у файл [`defects.csv`](defects.csv) відповідно до шаблону EPAM Marathon.

### Defect 1: Brand logo in Header does not match official design (`Logo.png` / Figma)
- **Summary:** Brand logo in Header does not match official design (sprout position and typography distorted)
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** High | **Severity:** Major
- **Pre-conditions:** Guest is on the Menu page (`/join/...`). Official brand asset `Logo.png` and Figma design (`Owner Flow.png`) define logo specifications.
- **Steps:**
  1. Open the Menu page as a Guest.
  2. Inspect the brand logo in the top-left corner of the header.
  3. Compare it with `Logo.png` and Figma design.
- **Actual result:** The logo displays a sprout icon placed awkwardly on the far left above the letter 'G' ("🌱 Green Tasty"), with a plain font for letter 'T'.
- **Expected result:** The logo must strictly match the brand asset `Logo.png`: the stem of the sprout forms the vertical trunk of letter 'T' with two leaves sprouting between 'n' and 'T', and the subtitle "HEALTHY EATERS RESTAURANT" is aligned below.
- **Attachments:** `screenshot.png` (Header logo), `Logo.png` (Official brand asset).

### Defect 2: Dish images do not match dish names on Menu page (Pizza, Risotto, and Toast display salad photos)
- **Summary:** Dish images do not match dish names on Menu page (Pizza, Risotto, and Toast display salad photos)
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** High | **Severity:** Major
- **Pre-conditions:** Guest is on the Menu page. Menu contains dishes: Fresh Avocado Toast, Truffle Mushroom Risotto, Margherita Pizza.
- **Steps:**
  1. Open the Menu page as a Guest.
  2. Observe the dish cards for 'Fresh Avocado Toast', 'Truffle Mushroom Risotto', and 'Margherita Pizza'.
  3. Compare the image displayed on each card with the dish title.
- **Actual result:**
  - 'Margherita Pizza' displays a photo of a green vegetable salad.
  - 'Truffle Mushroom Risotto' displays a photo of a strawberry salad.
  - 'Fresh Avocado Toast' displays a photo of a salad bowl without toast.
- **Expected result:** Each dish card must display the authentic image corresponding to its recipe and title (e.g., Margherita Pizza displays pizza, Risotto displays risotto), matching Figma design cards.
- **Attachments:** `screenshot.png` (Dish cards grid), `Owner Flow.png` (Figma design cards).

### Defect 3: Inconsistency in unavailable dish badge: UI displays 'Out Of Stock' while Figma specifies 'Sold Out' and AC 4 specifies 'On Stop'
- **Summary:** Inconsistency in unavailable dish badge: UI displays 'Out Of Stock' while Figma specifies 'Sold Out' and AC 4 specifies 'On Stop'
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Medium | **Severity:** Medium
- **Pre-conditions:** Guest is on the Menu page. Dishes 'Fresh Avocado Toast' and 'Truffle Mushroom Risotto' are marked as unavailable in the system.
- **Steps:**
  1. Open the Menu page as a Guest.
  2. Inspect the availability badge on unavailable dish cards.
  3. Compare badge text with Figma design and US11 AC 4.
- **Actual result:** The badge displays the text 'Out Of Stock'.
- **Expected result:** Terminology must be reconciled across specifications, design, and UI. In Figma design (`Owner Flow.png`), unavailable items are labelled 'Sold Out'; in AC 4, they are referred to as 'On Stop'. The implementation should match the agreed design system standard.
- **Attachments:** `screenshot.png` (Badges on cards 1 and 2), `Owner Flow.png` (Sold Out badge on Green Asparagus Salad).

### Defect 4: 'Desserts' category tab and 'Sort by' dropdown are missing from the category navigation bar
- **Summary:** 'Desserts' category tab and 'Sort by' dropdown are missing from the category navigation bar
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Medium | **Severity:** Major
- **Pre-conditions:** Guest is on the Menu page. Restaurant menu includes dishes in Appetizers, Main Courses, and Desserts.
- **Steps:**
  1. Open the Menu page as a Guest.
  2. Inspect the category navigation bar and controls above the dish cards.
  3. Compare with AC 1 and Figma design.
- **Actual result:**
  - Only 'All dishes', 'Appetizers', and 'Main Courses' tabs are displayed. 'Desserts' category is missing.
  - 'Sort by: Popular First' dropdown present in Figma is completely missing from the UI.
- **Expected result:**
  - Category bar displays all available categories according to AC 1 and Figma (including 'Desserts').
  - Sorting controls ('Sort by' dropdown) from Figma are implemented.
- **Attachments:** `screenshot.png` (Category bar), `Owner Flow.png` (Figma category bar with Appetizers, Main Cources, Desserts and Sort by dropdown).

### Defect 5: Inconsistent spacing in dish serving weight format ('200g' vs '450 g')
- **Summary:** Inconsistent spacing in dish serving weight format ('200g' vs '450 g')
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Low | **Severity:** Minor
- **Pre-conditions:** Guest is on the Menu page.
- **Steps:**
  1. Examine serving size text on 'Fresh Avocado Toast' and 'Truffle Mushroom Risotto'.
  2. Examine serving size text on 'Margherita Pizza'.
- **Actual result:**
  - 'Fresh Avocado Toast' shows '200g' (no space).
  - 'Truffle Mushroom Risotto' shows '350g' (no space).
  - 'Margherita Pizza' shows '450 g' (with space between number and unit).
- **Expected result:** Serving size formatting must be uniform across all dish cards, following Figma design standard (e.g. '200 g', '350 g', '450 g').
- **Attachments:** `screenshot.png` (Weight labels), `Owner Flow.png` (Standard 430 g, 270 g formatting).

### Defect 6: Unauthorized Guest view displays customer account navigation items ('Book a Table', 'Reservations', profile avatar) in header
- **Summary:** Unauthorized Guest view displays customer account navigation items ('Book a Table', 'Reservations', profile avatar) in header
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Medium | **Severity:** Major
- **Pre-conditions:** User opens the guest pre-order join link without being logged into a Customer account.
- **Steps:**
  1. Open the guest invite link in an incognito browser window.
  2. Observe the top header navigation bar.
- **Actual result:** Header contains links: 'Book a Table', 'Reservations', and an active profile avatar icon, which belong to an authorized Customer flow.
- **Expected result:** For a Guest participating in a pre-order session, the header should display guest-relevant navigation or simplify to restaurant branding without exposing unrelated customer account actions.
- **Attachments:** `screenshot.png` (Top header bar), `Owner Flow.png` (Owner header vs Guest session requirements).

### Defect 7: Cart button placement contradicts Figma design and lacks selected items counter badge
- **Summary:** Cart button placement contradicts Figma design and lacks selected items counter badge
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Low | **Severity:** Minor
- **Pre-conditions:** Guest is on the Menu page. Dishes are added to personal subcart.
- **Steps:**
  1. Observe the green reservation bar and the header on the Menu page.
  2. Check the cart icon and counter badge.
  3. Compare with Figma screen 'Menu Page. 2 items in the cart. Header'.
- **Actual result:**
  - Cart icon is located inside the green reservation strip instead of header navigation.
  - Cart icon is static with no counter badge (shows 0 or nothing when dishes are added).
- **Expected result:**
  - Cart button placement conforms to design (in Figma, it is in the header next to avatar).
  - Cart icon displays an item count badge indicating quantity of dishes in personal subcart (e.g. circular badge '2').
- **Attachments:** `screenshot.png` (Green reservation strip cart icon), `Owner Flow.png` (Menu Page. 2 items in the cart. Header).

### Defect 8: Available dish cards lack explicit availability indicator required by AC 2
- **Summary:** Available dish cards lack explicit availability indicator required by AC 2
- **Environment:** `P_PRD (Web / Desktop Chrome 156 / Windows 10/11)`
- **Priority:** Low | **Severity:** Minor
- **Pre-conditions:** Guest is on the Menu page with available dishes (e.g. Margherita Pizza).
- **Steps:**
  1. Inspect the card for available dish 'Margherita Pizza'.
  2. Check for availability status indicator as required by AC 2.
- **Actual result:** There is no visual indicator or label of availability status on available dish cards (only an active Pre-Order button is shown).
- **Expected result:** According to AC 2 ('Each menu item must clearly display ... current availability status'), available dishes should have a clear availability status indicator, or AC 2 must be updated to clarify that active button implies availability.
- **Attachments:** `screenshot.png` (Margherita Pizza card).
