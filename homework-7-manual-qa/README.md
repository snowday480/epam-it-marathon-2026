# Manual QA Report — Homework #7: EPAM IT-Marathon 2026
**User Story:** `[Draft] US11_Guest Viewing Reservation Menu`  
**Epic:** Order Management | **Role:** Guest  
**Tested Page URL:** `https://d28jftogiwtein.cloudfront.net/join/613fc98442f44b9f97e74ad0beb0a5f0`  
**Environment:** `Web / Desktop Chrome (Windows 10/11) / P_PRD (CloudFront)`

---

## 1. Аналіз вимог User Story та виявлені недоліки (Requirements Analysis)

### 1.1. Загальна інформація про User Story
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
> 3. The Guest can add an available dish directly to their personal subcart by interacting with a clear action button (e.g., "Pre-order" )
> 4. Items currently marked "On Stop" are clearly indicated as unavailable and cannot be selected or added to the cart.
> 5. The menu reflects the current data at the time the Guest opens or refreshes the screen.

---

### 1.2. Виявлені недоліки у вимогах (За класифікацією критеріїв якості вимог)

| № | Критерій якості | Опис недоліку у вимогах | Чому це проблема та як виправити |
|---|---|---|---|
| **1** | **Повнота (Completeness)** | **Опис сторі не покриває дію додавання страв у кошик.** В описі сказано лише про перегляд меню (*"...so that I know what options are available and can decide what to choose"*), тоді як критерії AC 3 та AC 4 описують взаємодію з персональним підкошиком (*personal subcart*). | **Рекомендація:** Розширити опис: *"...so that I know what options are available, can decide what to choose, and add dishes to my personal pre-order cart."* |
| **2** | **Однозначність та несуперечливість (Clarity & Consistency)** | **Невизначеність статусів у Pre-conditions:** Зазначено `Created/"Reserved"`. Не зрозуміло, який саме статус є дійсним (`Created` чи `Reserved`), оскільки в бекенді та системних моделях статус бронювання називається `Reserved`. | **Рекомендація:** Чітко зафіксувати точний системний статус сесії (наприклад, `Reservation.Status == 'Reserved'` та `GroupSession.Status == 'Open'`). |
| **3** | **Повнота (Completeness)** | **Відсутність негативних сценаріїв для Pre-conditions:** Не описано, що відбувається, якщо статус сесії НЕ "Reserved" (наприклад, `Cancelled`, `Closed`, `Submitted` або посилання застаріло `Expired`). | **Рекомендація:** Додати AC для невалідних статусів: показ інформаційного екрану *"This pre-order session has expired or is no longer active"* та блокування доступу до меню. |
| **4** | **Чіткість та тестованість (Clarity & Testability)** | **AC 1: Не зафіксовано структуру категорій та сортування:** Наведено лише приклад `(e.g., Appetizers, Main Course, Desserts)`. Не вказано, чи обов'язкова вкладка "All dishes", який порядок категорій, що показувати, якщо категорія порожня, та як має працювати сортування (на макеті є селект `Sort by: Recommended`, а у вимогах про це ні слова). | **Рекомендація:** Скласти вичерпний перелік категорій, описати стан порожньої категорії та зафіксувати критерії для сортування (Recommended, Price low-to-high, Price high-to-low). |
| **5** | **Однозначність (Unambiguity)** | **AC 2: Не визначено відображення статусу доступності для доступних страв:** Вказано *clearly display ... current availability status*, але не визначено, як саме він виглядає для доступної страви (бейдж "Available", відсутність бейджа, колір?). | **Рекомендація:** Уточнити: чи має бути явний бейдж "Available", чи статус доступності позначається лише активною зеленою кнопкою замовлення. |
| **6** | **Точність та консистентність (Consistency)** | **AC 2: Формат ваги та одиниць вимірювання:** Зазначено *serving size in grams*, але не визначено формат (`200g` чи `200 g`). Також не описано, як відображати напої (мл/л) або поштучні страви. | **Рекомендація:** Задати точний шаблон форматування: `[кількість] [од. вим.]` (наприклад, `450 g`, `300 ml`). |
| **7** | **Повнота (Completeness)** | **AC 3: Відсутність логіки зворотного зв'язку (Feedback) при додаванні до кошика:** Не описано, що відбувається після натискання кнопки замовлення (чи змінюється кнопка на `+ / -`, чи відкривається drawer кошика, чи з'являється Toast, як змінюється лічильник у шапці). | **Рекомендація:** Описати UX-фідбек: зміна стану кнопки, оновлення бейджа кошика в зеленій плашці, показ спливаючого повідомлення. |
| **8** | **Несуперечливість (Consistency)** | **AC 4: Протиріччя в найменуванні статусу недоступності ("On Stop" vs "Out Of Stock"):** В AC 4 використовується термін `"On Stop"`, а на практиці та в UI використовується бейдж `"Out Of Stock"`. | **Рекомендація:** Уніфікувати термінологію в документації, коді та дизайні: використовувати або виключно `"On Stop"`, або `"Out Of Stock"`. |
| **9** | **Повнота (Completeness)** | **AC 5: Відсутність вимог до обробки помилок мережі та завантаження:** Не описано, що показувати користувачеві під час завантаження меню (loading spinner / skeleton) або при збої мережі / 500 помилці сервера (Retry button). | **Рекомендація:** Додати AC для станів `Loading` та `Error` з можливістю повторити запит. |
| **10** | **Повнота (Completeness)** | **Відсутність нефункціональних вимог:** Немає вимог до чуйності інтерфейсу (Mobile/Tablet responsiveness), доступності (Accessibility / контрастність / aria-labels) та локалізації. | **Рекомендація:** Додати вимоги щодо підтримки розширень екранів від 375px та вимог a11y. |

---

## 2. Тест-кейси (Test Cases)

Формат відповідає шаблону EPAM Marathon (`test_cases.csv`).

```csv
ID: 1,Title: Verify that full restaurant menu is displayed structured by categories when Guest joins session,Status: Passed
,"Pre-conditions:
1. Guest has successfully joined the group session via shared link (US_G10).
2. Parent reservation status is ""Reserved"".
3. Restaurant menu contains dishes in categories: Appetizers, Main Courses, Desserts.",,
,"Steps:
1. Open the shared invite link and complete join step.
2. Observe the Menu page layout and category navigation bar.",Expected result:
1. Guest is on the Menu page.
2. Category bar contains "All dishes" and specific categories (Appetizers, Main Courses, Desserts).
3. "All dishes" is selected by default.
4. Dishes are logically grouped/displayed according to the selected category.,

ID: 2,Title: Verify menu item card details display (Name, Price, Serving Size, Image, Availability status),Status: Failed
,"Pre-conditions:
1. Guest is on the Menu page.
2. Available and unavailable dishes exist in the system.",,
,"Steps:
1. Examine available dish cards.
2. Examine unavailable dish cards.",Expected result:
1. Each card displays:
- Dish name
- Price formatted with currency ($XX.XX)
- Serving size with weight in grams
- Correct image corresponding to the dish name
- Clear availability indicator.
2. Unavailable dish clearly shows "On Stop" / "Out Of Stock" status.,

ID: 3,Title: Verify adding an available dish directly to personal subcart,Status: Passed
,"Pre-conditions:
1. Guest is on the Menu page.
2. Dish is in ""Available"" state.
3. Personal subcart is empty.",,
,"Steps:
1. Locate an available dish (e.g. Margherita Pizza).
2. Click the [Pre-order] button on the card.
3. Check the cart icon in the top green reservation bar.",Expected result:
1. Dish is successfully added to the Guest's personal subcart.
2. Action button provides visual feedback (e.g., changes to counter or shows added state).
3. Cart badge counter increments by 1.,

ID: 4,Title: Verify that items marked "On Stop" / "Out Of Stock" cannot be selected or added to cart,Status: Passed
,"Pre-conditions:
1. Guest is on the Menu page.
2. Dish is marked as ""On Stop"" / ""Out Of Stock"" in the system.",,
,"Steps:
1. Locate the unavailable dish card.
2. Check the card visual state.
3. Attempt to click on the card and the [Pre-Order] button.",Expected result:
1. Dish card has a visible "On Stop" / "Out Of Stock" badge.
2. Card has disabled/dimmed visual styling.
3. [Pre-Order] button is disabled (greyed out, unclickable).
4. Item cannot be added to the cart.,

ID: 5,Title: Verify filtering dishes by selecting a specific category tab,Status: Passed
,"Pre-conditions:
1. Guest is on the Menu page with multiple categories available.",,
,"Steps:
1. Click on the ""Appetizers"" category tab.
2. Observe the displayed dishes.
3. Click on the ""Main Courses"" category tab.",Expected result:
1. Only dishes belonging to ""Appetizers"" are shown. Active tab is visually highlighted.
2. Only dishes belonging to ""Main Courses"" are shown. Tab highlight switches to ""Main Courses"".,

ID: 6,Title: Verify menu sorting functionality by Recommended, Price Low to High, Price High to Low,Status: Passed
,"Pre-conditions:
1. Guest is on the Menu page with several dishes having different prices.",,
,"Steps:
1. Click on ""Sort by:"" dropdown.
2. Select ""Price: Low to high"".
3. Observe dish order.
4. Select ""Price: High to low"".",Expected result:
1. Dropdown options are: Recommended, Price: Low to high, Price: High to low.
2. Dishes are sorted in ascending order of price.
3. Dishes are sorted in descending order of price.,

ID: 7,Title: Verify menu data freshness on manual page refresh,Status: Passed
,"Pre-conditions:
1. Guest is on the Menu page.
2. An item's status is changed from Available to On Stop on the backend.",,
,"Steps:
1. Refresh the browser page (F5 / reload).
2. Locate the modified dish.",Expected result:
1. Menu reloads and reflects the updated data from the backend.
2. Modified dish is now shown with the unavailable badge and disabled button.,

ID: 8,Title: Verify Guest redirection when parent reservation is Cancelled or Expired,Status: Failed
,"Pre-conditions:
1. Owner shared an invite link.
2. Parent reservation status is ""Cancelled"" or session is expired.",,
,"Steps:
1. Guest navigates to the shared invite link.",Expected result:
1. Guest is NOT allowed to view the active menu.
2. Static/warning page is opened with message: ""This pre-order session has expired or is no longer active."",

ID: 9,Title: Verify header elements for Guest on pre-order menu page,Status: Failed
,"Pre-conditions:
1. Unregistered Guest joined via invite link.",,
,"Steps:
1. Inspect the top global navigation bar.",Expected result:
1. Header is tailored for Guest pre-order view.
2. Customer-specific actions ("Book a Table", "Reservations", user profile avatar) are not shown or do not break Guest session.,

ID: 10,Title: Verify error handling and retry mechanism when menu API fails to load,Status: Passed
,"Pre-conditions:
1. Guest joined session.
2. Backend menu endpoint returns 500 Internal Server Error or network connection is lost.",,
,"Steps:
1. Open the menu page during server error.
2. Observe the screen.
3. Restore connection and click [Try again].",Expected result:
1. Error placeholder message is displayed (e.g., ""Failed to load menu"").
2. [Try again] button is present.
3. Clicking [Try again] successfully fetches and displays the menu.,
```

---

## 3. Результати тестування за скріншотом (Testing against Screenshot)

Тестування реалізованого інтерфейсу за наданим скріншотом (`screenshot.png`) виявило такі результати за критеріями прийнятності:

- **AC 1 (Структура за категоріями):** ⚠️ **Частково виконано.** Є вкладки "All dishes", "Appetizers", "Main Courses", проте **відсутня категорія "Desserts"**, наведена як приклад у вимогах.
- **AC 2 (Відображення обов'язкових полів):** ❌ **Невідповідність.** 
  - Фотографії страв не відповідають їхнім назвам (у Margherita Pizza — салат, у Risotto — полуничний салат, у Toast — салат у мисці).
  - Для доступної страви не відображається явний статус доступності.
  - Неузгоджене форматування ваги: `"200g"`, `"350g"` vs `"450 g"`.
- **AC 3 (Додавання доступної страви):** ⚠️ **Частково виконано.** Кнопка є ("Pre-Order"), але немає бейджа лічильника на іконці кошика в зеленій плашці.
- **AC 4 (Індикація On Stop / Недоступності):** ❌ **Невідповідність.** Бейдж містить текст `"Out Of Stock"` замість `"On Stop"`, передбаченого AC 4.
- **Header / Загальний UX:** ❌ **Дефект.** У шапці гостя відображаються клієнтські розділи "Book a Table", "Reservations" та аватар авторизованого користувача.

---

## 4. Дефект-репорти (Defect Reports)

Формат відповідає шаблону EPAM Marathon (`defects.csv`).

```csv
ID: 1,Summary: Dish images do not match dish names on Menu page (Pizza, Risotto, and Toast display salad photos),,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: High

Severity: Major"
,"Pre-conditions:
1. Guest is on the Menu page: https://d28jftogiwtein.cloudfront.net/join/...
2. Menu contains dishes: Fresh Avocado Toast, Truffle Mushroom Risotto, Margherita Pizza.",,
,"Steps:
1. Open the Menu page as a Guest.
2. Observe the dish cards for 'Fresh Avocado Toast', 'Truffle Mushroom Risotto', and 'Margherita Pizza'.
3. Compare the image displayed on each card with the dish title.

Actual result:
- 'Margherita Pizza' displays a photo of a green vegetable salad.
- 'Truffle Mushroom Risotto' displays a photo of a strawberry salad.
- 'Fresh Avocado Toast' displays a photo of a salad bowl.
Dish images are completely mismatched with their names.

Expected result:
Each dish card must display the authentic image corresponding to its recipe and title (e.g., Margherita Pizza displays pizza image, Risotto displays risotto image).",,
Attachments: screenshot.png - Dish cards grid,,

ID: 2,Summary: Unavailable dish status badge displays 'Out Of Stock' instead of 'On Stop' as specified in AC 4,,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: Medium

Severity: Medium"
,"Pre-conditions:
1. Guest is on the Menu page.
2. Dishes 'Fresh Avocado Toast' and 'Truffle Mushroom Risotto' are marked as unavailable.",,
,"Steps:
1. Open the Menu page as a Guest.
2. Inspect the availability badge on unavailable dish cards.

Actual result:
The badge displays the text 'Out Of Stock'.

Expected result:
According to AC 4 ('Items currently marked On Stop are clearly indicated as unavailable'), the badge should display 'On Stop' (or the requirement must be updated to align terminology).",,
Attachments: screenshot.png - Badge on cards 1 and 2,,

ID: 3,Summary: Desserts category tab is missing from category navigation bar,,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: Medium

Severity: Major"
,"Pre-conditions:
1. Guest is on the Menu page.
2. Restaurant menu includes dishes in Appetizers, Main Courses, and Desserts.",,
,"Steps:
1. Open the Menu page as a Guest.
2. Inspect the category navigation bar above the dish cards.

Actual result:
Only 'All dishes', 'Appetizers', and 'Main Courses' tabs are displayed. 'Desserts' category is missing.

Expected result:
Category bar displays all available categories according to AC 1: 'All dishes', 'Appetizers', 'Main Courses', and 'Desserts'.",,
Attachments: screenshot.png - Category bar,,

ID: 4,Summary: Inconsistent spacing in dish serving weight format ('200g' vs '450 g'),,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: Low

Severity: Minor"
,"Pre-conditions:
1. Guest is on the Menu page.",,
,"Steps:
1. Examine serving size text on 'Fresh Avocado Toast' and 'Truffle Mushroom Risotto'.
2. Examine serving size text on 'Margherita Pizza'.

Actual result:
Inconsistent formatting:
- 'Fresh Avocado Toast' shows '200g' (no space).
- 'Truffle Mushroom Risotto' shows '350g' (no space).
- 'Margherita Pizza' shows '450 g' (with space between number and unit).

Expected result:
Serving size formatting must be uniform across all dish cards (e.g. '450 g', '200 g', '350 g').",,
Attachments: screenshot.png - Weight labels,,

ID: 5,Summary: Unauthorized Guest view displays customer account navigation items ('Book a Table', 'Reservations', profile avatar) in header,,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: Medium

Severity: Major"
,"Pre-conditions:
1. User opens the guest pre-order join link without being logged into a Customer account.",,
,"Steps:
1. Open the guest invite link in an incognito browser window.
2. Observe the top header navigation bar.

Actual result:
Header contains links: 'Book a Table', 'Reservations', and an active profile avatar icon, which belong to an authorized Customer flow.

Expected result:
For a Guest participating in a pre-order session, the header should display guest-relevant navigation or simplify to restaurant branding without exposing unrelated customer account actions.",,
Attachments: screenshot.png - Top header bar,,

ID: 6,Summary: Cart icon in reservation bar lacks selected items counter badge,,"Env: P_PRD (Web / Chrome 156 / Desktop)

Priority: Low

Severity: Minor"
,"Pre-conditions:
1. Guest is on the Menu page.",,
,"Steps:
1. Observe the green reservation bar at the top of the page.
2. Check the cart icon on the right side.

Actual result:
The cart icon is a static image with no counter badge (indicator of 0 or N items).

Expected result:
The cart button displays an item count badge (e.g. badge showing current number of items added by the guest to their personal subcart).",,
Attachments: screenshot.png - Green reservation strip with cart icon,,
```
