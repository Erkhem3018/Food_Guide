Design a complete, production-ready mobile-first food recipe application UI/UX.

PRODUCT CONCEPT
This is a smart recipe and cooking assistant app.

The core idea is:
“Tell us what cooking tools you have and what ingredients you have, and we will show you what meals you can actually make.”

The app provides:
1. Extremely clear step-by-step cooking instructions.
2. Recipe discovery by cuisine, country, meal type, difficulty, cooking time, etc.
3. A “What Can I Cook?” feature that calculates possible meals based on the user’s available ingredients and cooking equipment.
4. International cuisine categories.
5. Personalized recommendations.
6. Saved recipes and cooking history.
7. Interactive cooking mode that guides users one step at a time.

The design must feel like a real startup product, not a generic recipe website.

TARGET USERS
Primarily young adults, students, beginners, busy people, and people who want simple cooking guidance.

DESIGN DIRECTION
Create a modern, friendly, visually exciting food-tech product.

Visual personality:
- modern
- warm
- appetizing
- playful but professional
- highly visual
- easy to understand
- minimal cognitive load
- premium startup quality

Avoid:
- generic restaurant website aesthetics
- excessive gradients
- overly complicated layouts
- too much text
- tiny typography
- cluttered cards
- boring dashboard-like interfaces

Use large food photography, strong typography, clear hierarchy, generous spacing, rounded cards, subtle shadows, beautiful icons, and intuitive interactions.

Use an appetizing warm-neutral base palette with one distinctive brand accent color.
Do not use too many colors.

Typography:
- modern highly readable sans-serif
- strong visual hierarchy
- large section headings
- clear body text
- excellent mobile readability

Create a consistent design system:
- color tokens
- typography scale
- spacing system
- border radius
- shadows
- buttons
- chips
- cards
- icons
- navigation
- input fields
- modals
- bottom sheets
- progress indicators
- empty states
- loading states
- error states

PLATFORM
Design primarily for mobile app screens.
Use approximately 390x844 mobile frame size.
Also make the design responsive enough to translate to tablet/web later.

INFORMATION ARCHITECTURE

MAIN NAVIGATION

Use a bottom navigation with:

1. Home
2. Discover
3. Cook
4. Saved
5. Profile

“Cook” should be the central/high-priority action.

--------------------------------------------------
SCREEN 01 — ONBOARDING
--------------------------------------------------

Create a short, visually engaging onboarding experience.

Screen 1:
Headline:
“Cook something amazing.”

Supporting text:
“Discover recipes based on what you already have.”

Screen 2:
“Tell us what you have”
Explain ingredient and equipment matching.

Screen 3:
“Follow every step”
Explain the guided cooking mode.

Screen 4:
“Explore the world through food”
Show cuisine categories.

Include:
- Skip
- Continue
- Progress indicator
- Get Started CTA

--------------------------------------------------
SCREEN 02 — SIGN UP / LOGIN
--------------------------------------------------

Create:
- Email login
- Google login
- Apple login
- Create account
- Continue as guest

Keep authentication visually simple.

--------------------------------------------------
SCREEN 03 — HOME
--------------------------------------------------

Home should immediately answer:
“What can I cook today?”

Top:
- greeting
- profile avatar
- notification icon

Hero section:
“What can you cook today?”
CTA:
“Find meals from my kitchen”

Quick action cards:
- What Can I Cook?
- Quick Recipes
- My Ingredients
- My Equipment

Then:
“Recommended for you”

Recipe cards showing:
- food image
- recipe name
- cuisine
- cooking time
- difficulty
- rating
- save icon

Then:
“Explore cuisines”

Cuisine cards:
- Mongolian
- Korean
- Japanese
- Chinese
- Italian
- Mexican
- Indian
- American
- Thai
- Mediterranean
- French
- Turkish

Add horizontal scrolling.

--------------------------------------------------
SCREEN 04 — WHAT CAN I COOK?
--------------------------------------------------

This is one of the most important features.

Create a highly intuitive guided flow.

Step 1:
“What ingredients do you have?”

Allow:
- search ingredients
- ingredient categories
- add ingredient
- quantity
- unit
- remove ingredient

Categories:
- Meat
- Vegetables
- Fruits
- Dairy
- Grains
- Pasta
- Eggs
- Spices
- Sauces
- Canned food
- Other

Step 2:
“What cooking equipment do you have?”

Allow selecting:
- frying pan
- pot
- oven
- microwave
- air fryer
- rice cooker
- pressure cooker
- blender
- grill
- steamer
- knife
- cutting board
- etc.

Show selected equipment visually.

Step 3:
“Anything else?”

Filters:
- cooking time
- difficulty
- cuisine
- meal type
- servings
- dietary preferences

Then CTA:
“Find What I Can Cook”

--------------------------------------------------
SCREEN 05 — MATCHING / CALCULATION STATE
--------------------------------------------------

Create a beautiful loading state while recipes are being calculated.

Example:
“Checking your kitchen…”

Show animated-style visual concept:
Ingredients → Equipment → Recipes

Then:
“23 recipes match your kitchen”

--------------------------------------------------
SCREEN 06 — RESULTS
--------------------------------------------------

Title:
“You can make these”

Show matching percentage.

Example:

92% match
Creamy Chicken Pasta

You have:
✓ Chicken
✓ Pasta
✓ Garlic
✓ Cream

Missing:
+ Parmesan

Equipment:
✓ Pan
✓ Pot

CTA:
“Start Cooking”

Use visual match indicators.

Sort/filter:
- Best Match
- Fastest
- Easiest
- Popular

--------------------------------------------------
SCREEN 07 — RECIPE DISCOVER
--------------------------------------------------

Create a dedicated recipe discovery experience.

Top search:
“Search recipes, ingredients or cuisines”

Categories:
- Breakfast
- Lunch
- Dinner
- Dessert
- Snack
- Drinks
- Quick Meals
- Healthy
- Budget

Cuisine discovery:
- Mongolia
- Korea
- Japan
- China
- Italy
- Mexico
- India
- Thailand
- France
- Turkey
- USA
- Mediterranean

Include visually rich recipe cards.

--------------------------------------------------
SCREEN 08 — SEARCH
--------------------------------------------------

Create:
- search field
- recent searches
- trending searches
- ingredient suggestions
- cuisine suggestions

Search examples:
“chicken”
“rice”
“pasta”
“Korean”
“under 20 minutes”

Search results should support filters.

--------------------------------------------------
SCREEN 09 — FILTERS
--------------------------------------------------

Create a bottom-sheet filter interface.

Filters:
- Cuisine
- Meal type
- Cooking time
- Difficulty
- Calories
- Ingredients available
- Missing ingredients
- Equipment available
- Dietary preferences
- Rating

Buttons:
“Reset”
“Show Results”

--------------------------------------------------
SCREEN 10 — RECIPE DETAILS
--------------------------------------------------

This screen must be extremely attractive.

Large hero food image.

Information:
- recipe name
- cuisine
- rating
- reviews
- cooking time
- preparation time
- total time
- difficulty
- servings

Primary CTA:
“Start Cooking”

Secondary:
“Save Recipe”

Ingredients section:
- ingredient
- quantity
- unit
- available/missing indicator

Equipment section:
show required equipment.

Nutrition:
- calories
- protein
- carbs
- fat

Description:
short and useful.

Also show:
“You already have 8/10 ingredients”

--------------------------------------------------
SCREEN 11 — INGREDIENT SUBSTITUTION
--------------------------------------------------

If an ingredient is missing:

Show:
“You’re missing 2 ingredients”

For each missing ingredient:
- required ingredient
- possible substitute
- quantity conversion

Example:
Parmesan
→ Mozzarella
→ Cheddar

CTA:
“Use Substitute”

--------------------------------------------------
SCREEN 12 — COOKING MODE
--------------------------------------------------

This is the most important UX screen.

Create an immersive step-by-step cooking mode.

Do NOT show the entire recipe as a huge wall of text.

Show ONE cooking step at a time.

Example:

STEP 3 OF 8

“Heat the pan over medium heat.”

Large visual illustration/photo.

Below:
“Heat for approximately 2 minutes.”

Controls:
← Previous
✓ Done
Next →

Also include:
- timer
- pause
- ingredient quantity reference
- equipment reminder
- voice guidance button

Progress indicator at top.

Allow users to:
- go back
- skip
- repeat
- start timer
- mark step complete

--------------------------------------------------
SCREEN 13 — COOKING TIMER
--------------------------------------------------

Create an easy timer interaction.

Example:
“Cook for 5:00”

Large countdown.

Buttons:
Start
Pause
Reset

Allow multiple timers if needed.

--------------------------------------------------
SCREEN 14 — RECIPE COMPLETION
--------------------------------------------------

After finishing:

“Dinner is ready! 🎉”

Show completed dish.

Stats:
- cooking time
- steps completed
- recipe difficulty

Actions:
- Rate recipe
- Save
- Share
- Cook Again

Then recommend:
“You might also like…”

--------------------------------------------------
SCREEN 15 — DISCOVER CUISINE
--------------------------------------------------

Cuisine detail page.

Example:
“Korean Cuisine”

Hero visual.

Sections:
- Popular Korean recipes
- Quick Korean meals
- Beginner friendly
- Popular ingredients

Cuisine cards should feel editorial and premium.

--------------------------------------------------
SCREEN 16 — SAVED
--------------------------------------------------

Saved recipes dashboard.

Tabs:
- All
- Favorites
- Recently Saved
- Cooked

Recipe cards.

Allow:
- remove
- organize
- create collection

Example collections:
“My Favorites”
“Weekend Cooking”
“Quick Meals”

--------------------------------------------------
SCREEN 17 — PROFILE
--------------------------------------------------

Profile includes:
- profile information
- favorite cuisines
- cooking skill level
- dietary preferences
- allergies/preferences
- saved recipes
- cooking history
- ingredients
- equipment

Settings:
- Notifications
- Language
- Units
- Theme
- Privacy
- Account

--------------------------------------------------
SCREEN 18 — MY KITCHEN
--------------------------------------------------

Create a dedicated kitchen inventory interface.

Sections:
“My Ingredients”

Show ingredient cards with:
- name
- quantity
- expiration date
- category

“My Equipment”

Show equipment owned.

This data should feed directly into:
“What Can I Cook?”

--------------------------------------------------
SCREEN 19 — ADD INGREDIENT
--------------------------------------------------

Create a simple add ingredient flow.

Fields:
- ingredient
- quantity
- unit
- category
- expiration date

Optional:
- barcode scan
- photo recognition

CTA:
“Add Ingredient”

--------------------------------------------------
SCREEN 20 — NOTIFICATIONS
--------------------------------------------------

Notifications such as:
- ingredient expiring soon
- new recipe recommendation
- saved recipe reminder
- cooking reminder
- new cuisine recommendations

--------------------------------------------------
SCREEN 21 — EMPTY STATES
--------------------------------------------------

Create beautiful empty states for:
- no saved recipes
- no ingredients
- no matching recipes
- no cooking history
- no search results

Every empty state should explain what to do next.

Example:
“No matching recipes yet.”
“Try adding another ingredient or removing an equipment filter.”

--------------------------------------------------
SCREEN 22 — ERROR / OFFLINE STATES
--------------------------------------------------

Create:
- network error
- server error
- failed recipe matching
- failed ingredient search
- offline mode

Use friendly human language instead of technical error messages.

--------------------------------------------------
SCREEN 23 — LOADING STATES
--------------------------------------------------

Create skeleton/loading states for:
- home
- recipe cards
- recipe details
- search
- recipe matching
- cuisine pages

--------------------------------------------------
UX LOGIC
--------------------------------------------------

The product must have coherent navigation and user flows.

PRIMARY USER FLOW:

Onboarding
→ Home
→ What Can I Cook?
→ Select Ingredients
→ Select Equipment
→ Apply Filters
→ Calculate Matches
→ Matching Results
→ Recipe Details
→ Start Cooking
→ Step-by-Step Cooking Mode
→ Completion
→ Save / Rate / Cook Again

SECONDARY FLOW:

Home
→ Discover
→ Cuisine
→ Recipe
→ Save
→ Cooking Mode

KITCHEN FLOW:

Profile/Home
→ My Kitchen
→ Ingredients
→ Add Ingredient
→ Equipment
→ Update Kitchen
→ What Can I Cook?

SEARCH FLOW:

Search
→ Search Query
→ Filters
→ Results
→ Recipe Details

IMPORTANT UX PRINCIPLES

1. Never overwhelm the user with information.
2. One primary action per screen.
3. Make food imagery the visual focus.
4. Make recipe difficulty and cooking time immediately visible.
5. Always show whether ingredients are available.
6. Always show required equipment.
7. Make the “What Can I Cook?” feature extremely easy to understand.
8. Minimize typing.
9. Prefer chips, cards, toggles and visual selection.
10. Cooking mode must be usable while the user is physically cooking.
11. Buttons must be large enough for easy tapping with wet/dirty hands.
12. Maintain clear navigation hierarchy.
13. Use consistent components throughout the app.
14. Every screen must have loading, empty and error states where appropriate.
15. Design realistic interactions, not just static screens.

ACCESSIBILITY

- High text contrast
- Minimum comfortable mobile text sizes
- Large tap targets
- Do not rely only on color to communicate status
- Clear labels
- Accessible icons
- Support dynamic text where possible

DESIGN SYSTEM

Create reusable components for:
- Recipe Card
- Cuisine Card
- Ingredient Chip
- Equipment Card
- Match Percentage
- Difficulty Badge
- Time Badge
- Rating
- Search Bar
- Filter Chip
- Primary Button
- Secondary Button
- Bottom Navigation
- Step Progress
- Timer
- Ingredient Row
- Equipment Row
- Modal
- Bottom Sheet
- Toast
- Empty State
- Skeleton Loader

COMPONENT STATES

Create states for:
- default
- hover where applicable
- pressed
- selected
- disabled
- loading
- success
- error
- empty

FINAL REQUIREMENT

Do not create only a collection of pretty screens.

Design the product as a complete, logically connected startup application.

Every screen should have a clear purpose, clear user action, realistic navigation, reusable components, and consistent visual language.

The final result should look like a polished product that could realistically be launched on the App Store / Google Play.

Prioritize UX clarity, visual appeal, food photography, strong hierarchy, and the unique “What Can I Cook with what I already have?” feature.