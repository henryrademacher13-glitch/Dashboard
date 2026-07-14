// Stylized map of Northeastern University's Boston campus.
// Coordinates live in a 1000x760 SVG space, rotated so Huntington Ave runs
// horizontally (the classic campus-map orientation). Not to scale.

export const MAP_W = 1000
export const MAP_H = 760

export const CATEGORIES = {
  landmark: { label: 'Landmarks', color: '#c8102e' },
  academic: { label: 'Academics', color: '#4a6fa5' },
  residence: { label: 'Residences', color: '#c07f2f' },
  dining: { label: 'Dining', color: '#6f8f3a' },
  athletics: { label: 'Athletics', color: '#7e5ba6' },
  transit: { label: 'Transit', color: '#2e8b8b' },
  green: { label: 'Green spaces', color: '#4f8a4f' },
}

// Where you start: East Village, 291 St. Botolph St (corner of Gainsborough).
export const START = {
  id: 'east-village',
  name: 'East Village',
  label: 'East\nVillage',
  x: 585, y: 448, w: 52, h: 72,
  door: [611, 444],
}

// Shared route waypoints (see comment at top for the coordinate system).
const A = START.door        // East Village front door on St. Botolph St
const GB = [643, 437]       // St. Botolph & Gainsborough
const GH = [643, 222]       // Gainsborough & Huntington
const WE = [643, 354]       // east end of the main campus walkway
const WF = [286, 354]       // walkway meets Forsyth St
const QP = [490, 354]       // walkway meets the Krentzman quad path
const SP = [463, 354]       // walkway meets the Snell/Dana path
const CAM = [643, 625]      // Camden St & Columbus Ave

// Streets drawn on the map.
export const STREETS = [
  { name: 'Huntington Ave', from: [0, 222], to: [1000, 222], width: 14, labelAt: [90, 210] },
  { name: 'St. Botolph St', from: [470, 437], to: [1000, 437], width: 9, labelAt: [740, 426] },
  { name: 'Columbus Ave', from: [0, 625], to: [1000, 625], width: 12, labelAt: [80, 614] },
  { name: 'Forsyth St', from: [286, 222], to: [286, 625], width: 9, labelAt: [293, 482], vertical: true },
  { name: 'Gainsborough St', from: [643, 222], to: [643, 437], width: 8, labelAt: [649, 250], vertical: true },
  { name: 'Camden St', from: [643, 437], to: [643, 625], width: 8, labelAt: [649, 470], vertical: true },
  { name: 'Massachusetts Ave', from: [884, 60], to: [884, 760], width: 12, labelAt: [890, 90], vertical: true },
]

// Interior walkways (thin dotted paths).
export const WALKWAYS = [
  [[250, 354], [643, 354]],   // main east-west campus walkway
  [[490, 222], [490, 354]],   // through Krentzman Quad
  [[463, 354], [463, 510]],   // past Snell toward World Series Way
  [[286, 558], [460, 558]],   // World Series Way (Cabot / SquashBusters)
  [[196, 432], [286, 432]],   // Centennial Common cross path
  [[150, 470], [196, 432]],   // toward West Village
  [[150, 470], [150, 545]],
  [[214, 354], [250, 354]],
]

// Green spaces & parks (background polygons).
export const PARKS = [
  { name: 'Back Bay Fens', x: 0, y: 0, w: 1000, h: 70 },
  { name: 'Carter Playground', x: 660, y: 642, w: 140, h: 90 },
]

// Southwest Corridor Park band (Orange Line runs alongside it).
export const CORRIDOR = { x: 0, y: 578, w: 1000, h: 34 }

// Non-clickable context buildings, drawn gray for orientation.
export const CONTEXT_BUILDINGS = [
  { name: 'Churchill Hall', label: 'Churchill', x: 502, y: 302, w: 58, h: 40 },
  { name: 'Cullinane Hall', label: 'Cullinane', x: 572, y: 302, w: 56, h: 44 },
  { name: 'Dana Research Center', label: 'Dana', x: 470, y: 470, w: 56, h: 44 },
  { name: 'Gainsborough Garage', label: 'Garage', x: 655, y: 380, w: 80, h: 44 },
  { name: 'Huntington Ave YMCA', label: 'YMCA', x: 735, y: 240, w: 84, h: 44 },
  { name: 'Forsyth Building', label: 'Forsyth Bldg', x: 296, y: 306, w: 54, h: 40 },
]

// Destinations. `route` is the walking path from East Village's door,
// `minutes` an approximate walk time, `steps` turn-by-turn directions.
export const BUILDINGS = [
  {
    id: 'matthews-arena',
    name: 'Matthews Arena',
    label: 'Matthews\nArena',
    category: 'athletics',
    x: 756, y: 452, w: 108, h: 74,
    minutes: 3,
    desc: 'The world’s oldest indoor ice hockey arena (1910) and home of Husky hockey and basketball. Practically East Village’s next-door neighbor.',
    route: [A, [756, 437], [780, 452]],
    steps: [
      'Exit East Village onto St. Botolph St and turn right (east).',
      'Walk two short blocks, passing the Gainsborough Garage on your left.',
      'Matthews Arena is on your right, just before Massachusetts Ave.',
    ],
  },
  {
    id: 'mass-ave-station',
    name: 'Massachusetts Ave Station (Orange Line)',
    label: 'Mass Ave\nStation',
    category: 'transit',
    x: 856, y: 596, w: 56, h: 40,
    minutes: 5,
    desc: 'Orange Line stop on the Southwest Corridor — the quickest rapid transit from East Village for trips to Back Bay, Downtown, or Ruggles.',
    route: [A, [756, 437], [884, 437], [884, 596]],
    steps: [
      'Exit East Village onto St. Botolph St and turn right (east).',
      'Walk to Massachusetts Ave and turn right.',
      'The station entrance is one block down, where Mass Ave crosses the Southwest Corridor.',
    ],
  },
  {
    id: 'symphony-hall',
    name: 'Symphony Hall',
    label: 'Symphony\nHall',
    category: 'landmark',
    x: 780, y: 130, w: 86, h: 60,
    minutes: 6,
    desc: 'Home of the Boston Symphony Orchestra and one of the world’s great concert halls, at Huntington and Mass Ave. NU students often get discounted tickets.',
    route: [A, GB, GH, [820, 222], [822, 196]],
    steps: [
      'Exit East Village and head north on Gainsborough St toward Huntington Ave.',
      'Turn right on Huntington Ave and walk two blocks east.',
      'Symphony Hall is on your left at the corner of Massachusetts Ave.',
    ],
  },
  {
    id: 'curry',
    name: 'Curry Student Center',
    label: 'Curry\nStudent Ctr',
    category: 'landmark',
    x: 478, y: 362, w: 88, h: 56,
    minutes: 7,
    desc: 'The hub of student life: food court, game room, club offices, and the indoor quad. If you’re meeting someone “on campus,” it’s probably here.',
    route: [A, GB, WE, [535, 354], [522, 362]],
    steps: [
      'Exit East Village and cross to the west side of Gainsborough St.',
      'Head north briefly, then turn left onto the main campus walkway past Cullinane Hall.',
      'Continue west; Curry Student Center is on your left after Churchill Hall.',
    ],
  },
  {
    id: 'ell-hall',
    name: 'Ell Hall',
    label: 'Ell Hall',
    category: 'academic',
    x: 416, y: 302, w: 72, h: 44,
    minutes: 8,
    desc: 'Historic core building connected to Curry, home to Blackman Auditorium and the alumni center. The tunnels under it link much of central campus.',
    route: [A, GB, WE, [450, 354], [452, 350]],
    steps: [
      'From East Village, take the main campus walkway west past Cullinane and Churchill.',
      'Pass Curry Student Center on your left.',
      'Ell Hall is on your right, just past Curry — look for the Blackman Auditorium entrance.',
    ],
  },
  {
    id: 'krentzman-quad',
    name: 'Krentzman Quadrangle',
    label: 'Krentzman\nQuad',
    category: 'green',
    x: 444, y: 238, w: 52, h: 56,
    minutes: 8,
    desc: 'The front door of Northeastern — the granite “Northeastern University” sign here is the classic photo spot, framed by Richards and Dodge halls.',
    route: [A, GB, WE, QP, [490, 294], [470, 280]],
    steps: [
      'Take the main campus walkway west from Gainsborough St.',
      'Turn right at the quad path (between Ell and Churchill halls).',
      'Krentzman Quadrangle opens up ahead, facing Huntington Ave.',
    ],
  },
  {
    id: 'richards-hall',
    name: 'Richards Hall',
    label: 'Richards',
    category: 'academic',
    x: 372, y: 240, w: 66, h: 44,
    minutes: 9,
    desc: 'One of the original 1930s quad buildings, with classrooms and the mathematics department. Flanks Krentzman Quad on the west.',
    route: [A, GB, WE, QP, [490, 266], [441, 266]],
    steps: [
      'Take the main campus walkway west, then turn right at the quad path.',
      'Enter Krentzman Quad and bear left.',
      'Richards Hall is the building on the west side of the quad.',
    ],
  },
  {
    id: 'dodge-hall',
    name: 'Dodge Hall',
    label: 'Dodge',
    category: 'academic',
    x: 502, y: 240, w: 66, h: 44,
    minutes: 8,
    desc: 'Home base for much of the D’Amore-McKim School of Business, on the east side of Krentzman Quad.',
    route: [A, GB, WE, QP, [490, 270], [505, 262]],
    steps: [
      'Take the main campus walkway west, then turn right at the quad path.',
      'Enter Krentzman Quad.',
      'Dodge Hall is immediately on your right, on the east side of the quad.',
    ],
  },
  {
    id: 'hayden-hall',
    name: 'Hayden Hall',
    label: 'Hayden',
    category: 'academic',
    x: 358, y: 302, w: 62, h: 40,
    minutes: 9,
    desc: 'Classroom and office building just west of Ell Hall, connected into the central campus tunnel network.',
    route: [A, GB, WE, [390, 354], [390, 346]],
    steps: [
      'Take the main campus walkway west past Curry and Ell.',
      'Hayden Hall is on your right, just past Ell Hall.',
    ],
  },
  {
    id: 'snell-library',
    name: 'Snell Library',
    label: 'Snell\nLibrary',
    category: 'landmark',
    x: 356, y: 376, w: 92, h: 72,
    minutes: 9,
    desc: 'The main library and late-night study fortress, freshly renovated. Faces Snell Quad next to Curry — the center of gravity during finals.',
    route: [A, GB, WE, [420, 354], [420, 373]],
    steps: [
      'Take the main campus walkway west from Gainsborough St.',
      'Pass Curry Student Center and Ell Hall.',
      'Snell Library is on your left, facing the quad — about a 9 minute walk total.',
    ],
  },
  {
    id: 'snell-engineering',
    name: 'Snell Engineering Center',
    label: 'Snell\nEngineering',
    category: 'academic',
    x: 356, y: 464, w: 84, h: 50,
    minutes: 10,
    desc: 'Engineering classrooms and labs, directly behind (south of) Snell Library.',
    route: [A, GB, WE, SP, [463, 480], [443, 485]],
    steps: [
      'Take the main campus walkway west past Curry Student Center.',
      'Turn left on the path between Snell Library and Curry.',
      'Snell Engineering is on your right, behind the library.',
    ],
  },
  {
    id: 'neu-station',
    name: 'Northeastern Station (Green Line E)',
    label: 'Northeastern\nStation',
    category: 'transit',
    x: 442, y: 206, w: 56, h: 30,
    minutes: 8,
    desc: 'Green Line E surface stop right at Krentzman Quad on Huntington Ave — your ride toward Symphony, Copley, and downtown.',
    route: [A, GB, GH, [490, 222]],
    steps: [
      'Exit East Village and head north on Gainsborough St to Huntington Ave.',
      'Turn left and walk west along Huntington.',
      'The Northeastern stop is in the median at Krentzman Quad.',
    ],
  },
  {
    id: 'marino',
    name: 'Marino Recreation Center',
    label: 'Marino\nRec Center',
    category: 'athletics',
    x: 295, y: 240, w: 72, h: 52,
    minutes: 10,
    desc: 'The main student gym: cardio floors, weights, courts, and group fitness, at Huntington and Forsyth.',
    route: [A, GB, GH, [370, 222], [370, 252]],
    steps: [
      'Exit East Village and head north on Gainsborough St to Huntington Ave.',
      'Turn left and walk west along Huntington Ave past the quad.',
      'Marino is on your left just before Forsyth St.',
    ],
  },
  {
    id: 'speare-hall',
    name: 'Speare Hall',
    label: 'Speare',
    category: 'residence',
    x: 542, y: 120, w: 66, h: 55,
    minutes: 8,
    desc: 'First-year residence hall north of Huntington Ave, near the Fens — part of the freshman quad with the Stetson halls.',
    route: [A, GB, GH, [608, 222], [590, 180], [578, 178]],
    steps: [
      'Head north on Gainsborough St to Huntington Ave.',
      'Cross Huntington at the crosswalk and continue toward Opera Place.',
      'Speare Hall is ahead on your left, toward the Fens.',
    ],
  },
  {
    id: 'stetson-east',
    name: 'Stetson East (dining)',
    label: 'Stetson E',
    category: 'dining',
    x: 616, y: 150, w: 62, h: 52,
    minutes: 8,
    desc: 'First-year hall with one of the two main dining halls — the closest all-you-care-to-eat option to East Village.',
    route: [A, GB, GH, [647, 210], [645, 206]],
    steps: [
      'Head north on Gainsborough St to Huntington Ave.',
      'Cross Huntington Ave at the crosswalk.',
      'Stetson East is directly ahead; the dining hall entrance is on the ground floor.',
    ],
  },
  {
    id: 'stetson-west',
    name: 'Stetson West (dining)',
    label: 'Stetson W',
    category: 'dining',
    x: 468, y: 150, w: 64, h: 52,
    minutes: 9,
    desc: 'Sibling hall to Stetson East with its own popular made-to-order dining spot.',
    route: [A, GB, GH, [560, 222], [560, 206], [534, 200]],
    steps: [
      'Head north on Gainsborough St and cross Huntington Ave.',
      'Bear left past Speare Hall along Opera Place.',
      'Stetson West is on your left, behind Stetson East.',
    ],
  },
  {
    id: 'centennial-common',
    name: 'Centennial Common',
    label: 'Centennial\nCommon',
    category: 'green',
    x: 196, y: 392, w: 126, h: 84,
    minutes: 11,
    desc: 'The big lawn on west campus — hammocks, frisbee, and club fairs when the weather cooperates.',
    route: [A, GB, WE, WF, [286, 425], [275, 432]],
    steps: [
      'Take the main campus walkway west all the way to Forsyth St.',
      'Turn left (south) on Forsyth briefly.',
      'Centennial Common opens up on your right.',
    ],
  },
  {
    id: 'shillman-hall',
    name: 'Shillman Hall',
    label: 'Shillman',
    category: 'academic',
    x: 218, y: 494, w: 64, h: 46,
    minutes: 12,
    desc: 'Classroom building on Forsyth St at the south edge of Centennial Common — lots of intro lectures happen here.',
    route: [A, GB, WE, WF, [286, 505], [284, 510]],
    steps: [
      'Take the main campus walkway west to Forsyth St.',
      'Turn left (south) on Forsyth St, walking along Centennial Common.',
      'Shillman Hall is on your right after the common.',
    ],
  },
  {
    id: 'ryder-hall',
    name: 'Ryder Hall',
    label: 'Ryder',
    category: 'academic',
    x: 208, y: 296, w: 72, h: 50,
    minutes: 12,
    desc: 'Home to much of the College of Arts, Media and Design (CAMD), on west campus near Centennial.',
    route: [A, GB, WE, [286, 354], [286, 340], [283, 336]],
    steps: [
      'Take the main campus walkway west to Forsyth St.',
      'Cross Forsyth; Ryder Hall is just ahead on your right.',
    ],
  },
  {
    id: 'behrakis',
    name: 'Behrakis Health Sciences Center',
    label: 'Behrakis',
    category: 'academic',
    x: 120, y: 296, w: 74, h: 62,
    minutes: 13,
    desc: 'Bouvé College’s health sciences building — labs and classrooms for nursing, pharmacy, and PT, on the west end of campus.',
    route: [A, GB, WE, WF, [214, 354], [198, 348]],
    steps: [
      'Take the main campus walkway west across Forsyth St.',
      'Continue past Ryder Hall.',
      'Behrakis is the large building ahead on your right.',
    ],
  },
  {
    id: 'wvh',
    name: 'West Village H (Khoury College)',
    label: 'West\nVillage H',
    category: 'academic',
    x: 56, y: 470, w: 88, h: 58,
    minutes: 14,
    desc: 'Headquarters of Khoury College of Computer Sciences — CS classrooms, labs, and advising, at the far west edge of campus.',
    route: [A, GB, WE, WF, [286, 432], [196, 432], [150, 470], [147, 486]],
    steps: [
      'Take the main campus walkway west to Forsyth St, then continue to Centennial Common.',
      'Cut diagonally across/along the common heading southwest.',
      'West Village H is the tower ahead — Khoury College’s main entrance faces the plaza.',
    ],
  },
  {
    id: 'west-village',
    name: 'West Village (A–G)',
    label: 'West Village\nA–G',
    category: 'residence',
    x: 44, y: 536, w: 132, h: 52,
    minutes: 15,
    desc: 'Cluster of upperclass apartment-style residence halls surrounding West Village H.',
    route: [A, GB, WE, WF, [286, 432], [196, 432], [150, 470], [150, 540]],
    steps: [
      'Follow the route toward West Village H across Centennial Common.',
      'Continue south past WVH into the West Village complex.',
      'Halls A–G surround the interior courtyards.',
    ],
  },
  {
    id: 'cabot',
    name: 'Cabot Physical Education Center',
    label: 'Cabot',
    category: 'athletics',
    x: 306, y: 490, w: 74, h: 54,
    minutes: 11,
    desc: 'Track, courts, and the Cabot cage — varsity and club athletics facility on Forsyth St.',
    route: [A, GB, WE, WF, [286, 500], [303, 510]],
    steps: [
      'Take the main campus walkway west to Forsyth St.',
      'Turn left (south) on Forsyth St.',
      'Cabot is on your left after Centennial Common.',
    ],
  },
  {
    id: 'squashbusters',
    name: 'SquashBusters (Badger & Rosen)',
    label: 'Squash-\nBusters',
    category: 'athletics',
    x: 452, y: 540, w: 62, h: 36,
    minutes: 12,
    desc: 'Squash courts and community program center near Columbus Ave and World Series Way.',
    route: [A, GB, WE, WF, [286, 558], [448, 558], [452, 554]],
    steps: [
      'Take the main campus walkway west to Forsyth St, then head south.',
      'Turn left onto World Series Way past Cabot.',
      'SquashBusters is ahead on your left.',
    ],
  },
  {
    id: 'cy-young',
    name: 'Cy Young Statue',
    label: 'Cy Young',
    category: 'landmark',
    x: 418, y: 514, w: 16, h: 16, marker: true,
    minutes: 10,
    desc: 'Statue of Cy Young marking the site of the Huntington Avenue Grounds, where the first World Series was played in 1903 — the pitcher’s mound was right here.',
    route: [A, GB, WE, SP, [463, 510], [434, 520]],
    steps: [
      'Take the main campus walkway west past Curry Student Center.',
      'Turn left on the path between Curry and Snell Library and continue south.',
      'The statue stands near World Series Way, behind Churchill Hall.',
    ],
  },
  {
    id: 'isec',
    name: 'ISEC',
    label: 'ISEC',
    category: 'academic',
    x: 470, y: 652, w: 92, h: 58,
    minutes: 10,
    desc: 'The Interdisciplinary Science & Engineering Complex — the striking louvered research building on Columbus Ave, linked to main campus by the pedestrian bridge.',
    route: [A, GB, CAM, [540, 640], [516, 652]],
    steps: [
      'Exit East Village, cross St. Botolph St, and head south on Camden St.',
      'Pass Carter Playground and cross the Southwest Corridor and Columbus Ave.',
      'Turn right; ISEC is the round glass-and-steel building ahead.',
    ],
  },
  {
    id: 'exp',
    name: 'EXP',
    label: 'EXP',
    category: 'academic',
    x: 576, y: 652, w: 84, h: 58,
    minutes: 9,
    desc: 'Northeastern’s newest research and classroom complex (2023), next to ISEC — makerspaces, robotics labs, and study floors.',
    route: [A, GB, CAM, [628, 642], [618, 650]],
    steps: [
      'Exit East Village, cross St. Botolph St, and head south on Camden St.',
      'Pass Carter Playground and cross Columbus Ave.',
      'EXP is immediately on your right.',
    ],
  },
  {
    id: 'international-village',
    name: 'International Village',
    label: 'International\nVillage',
    category: 'residence',
    x: 96, y: 652, w: 118, h: 58,
    minutes: 13,
    desc: 'Residence towers with a popular dining hall (IV), on the southwest side of campus near Ruggles.',
    route: [A, GB, CAM, [220, 625], [160, 650]],
    steps: [
      'Head south on Camden St and turn right (west) on Columbus Ave.',
      'Walk west along Columbus past ISEC and Ruggles.',
      'International Village is on your left.',
    ],
  },
  {
    id: 'ruggles',
    name: 'Ruggles Station (Orange Line / Commuter Rail)',
    label: 'Ruggles\nStation',
    category: 'transit',
    x: 240, y: 598, w: 84, h: 46,
    minutes: 12,
    desc: 'Major transit hub on the Orange Line and Commuter Rail, with bus connections — the main gateway to campus from the south.',
    route: [A, GB, CAM, [334, 625], [320, 615]],
    steps: [
      'Head south on Camden St to Columbus Ave.',
      'Turn right and walk west along Columbus Ave.',
      'Ruggles Station’s main entrance is on your right.',
    ],
  },
  {
    id: 'mfa',
    name: 'Museum of Fine Arts',
    label: 'Museum of\nFine Arts',
    category: 'landmark',
    x: 45, y: 105, w: 190, h: 90,
    minutes: 16,
    desc: 'One of the world’s great art museums, right across Huntington Ave from west campus. Free for Northeastern students with a Husky ID.',
    route: [A, GB, GH, [230, 222], [190, 200]],
    steps: [
      'Head north on Gainsborough St to Huntington Ave and turn left.',
      'Walk west along Huntington past the quad and Marino.',
      'Cross Huntington Ave at the MFA crosswalk; the main entrance faces the avenue.',
    ],
  },
]

// Transit markers on the Green Line (drawn as circles on Huntington).
export const T_STOPS = [
  { name: 'Northeastern (E)', at: [490, 222] },
  { name: 'Symphony (E)', at: [800, 222] },
]

export function routeToPath(route) {
  return route.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
}

export function routeLengthMeters(building) {
  // The map is stylized, so estimate distance from walk time
  // (~80 m per minute at a casual pace) rather than path length.
  return Math.round((building.minutes * 80) / 10) * 10
}
