# FitFlow Hebrew

Build a complete, production-ready Web App for personal fitness and nutrition management, fully in Hebrew with strict RTL layout, optimized for mobile (Mobile-First) and desktop, with support for Dark and Light modes.

Key Features & Requirements:

1. Dashboard Screen: Personalized greeting, date selector (today, yesterday, history), quick cards for steps and daily calories, central caloric balance (consumed/remaining) and macronutrients breakdown (protein, carbs, fats), weekly weight trend graph, and next meal display with a quick shortcut button.

2. Daily Log Screen: List of 4 dynamic daily meals with interactive detail views (add, edit, delete items), and a dedicated water tracker with a daily goal and quick-add buttons (250ml, 500ml, custom input).

3. Progress Screen: Summary of current metrics (weight, body measurements, steps, calories), dynamic weight progress graph with time-range filters (week, month, 3 months), and history/edit sections.

4. AI Advisor Screen (Gemini integration simulation): Chat interface supporting text and voice input (using browser Web Speech API), image/barcode scanning simulation that triggers an interactive dialog to review nutritional values before adding to the log.

5. Settings Screen: Daily targets configuration (calories, steps, water, macros in grams and calories), Dark/Light mode toggle, and data export/backup options.

6. Food Search & History: Global and private food database search, manual entry, quick access to the last 20 used/favorite products, and AI scan.

7. Floating Action Button ("+"): Quick modal menu to add a meal/product, weight entry, or body measurement.

Technical Specs & State Management:

- Use a clean component structure with Tailwind CSS and Lucide React icons.

- Ensure all forms have proper validation (mandatory fields, no negative numbers).

- Real-time updates: any change in the daily food log immediately updates the main dashboard calories and macros balance.

- State persistence using local database/storage solutions suitable for a single user setup.

- Professional, minimalist, modern design tailored for fitness tracking.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://halev-tov-yomi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bbfaaa73-b267-45d0-82f5-e515967f588e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
