# Husky Navigator 🐾

An interactive guide to Northeastern University's Boston campus, built around
**East Village (291 St. Botolph St)** as the starting point.

- **Stylized campus map** (SVG) with 28 landmarks, academic buildings,
  residence halls, dining spots, athletics facilities, and T stations —
  plus green spaces like Krentzman Quad and Centennial Common.
- **Walking routes from East Village** drawn on the map for every
  destination, with an animated walker, walk-time and distance estimates,
  and turn-by-turn directions.
- **Search and category filters**, a walk-time-sorted place list,
  scroll-to-zoom / drag-to-pan on the map, and a responsive mobile layout.

The map is hand-drawn and not to scale; walk times assume a casual pace.

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Built with React + Vite.
