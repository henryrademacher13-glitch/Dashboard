import { dayKey, addDays } from './model.js';

// Seed data is generated relative to today so the app always opens on a live,
// explorable week rather than a stale fixture.
export function buildSeed(now = new Date()) {
  const HH_A = 'hh_a';
  const HH_B = 'hh_b';
  const ME = 'p_me';
  const CO = 'p_co';
  const MAYA = 'c_maya';
  const ELI = 'c_eli';

  const iso = (d, h = 9) => {
    const x = new Date(d);
    x.setHours(h, 0, 0, 0);
    return x.toISOString();
  };

  // Alternating weeks, anchored to the Sunday of the current week.
  const anchor = addDays(now, -new Date(now).getDay());
  const custodyPeriods = [];
  for (let w = -4; w < 6; w += 1) {
    const start = addDays(anchor, w * 7);
    const end = addDays(start, 6);
    const hh = w % 2 === 0 ? HH_A : HH_B;
    [MAYA, ELI].forEach((childId) => {
      custodyPeriods.push({
        id: `cp_${childId}_${w}`,
        childId,
        householdId: hh,
        startsAt: dayKey(start),
        endsAt: dayKey(end),
        source: 'pattern',
      });
    });
  }

  const handoffAt = new Date(addDays(anchor, 7));
  handoffAt.setHours(18, 0, 0, 0);

  const items = [
    ['i_cleats', 'Soccer cleats', '⚽', MAYA, 'sports', HH_A, HH_A, -4],
    ['i_shin', 'Shin guards', '🥅', MAYA, 'sports', HH_A, HH_B, -72],
    ['i_pack', 'School backpack', '🎒', MAYA, 'school', HH_A, HH_A, -2],
    ['i_poster', 'Poster board', '📐', MAYA, 'school', HH_A, HH_B, -140],
    ['i_trumpet', 'Trumpet', '🎺', ELI, 'instrument', HH_B, HH_A, -50],
    ['i_goggles', 'Swim goggles', '🥽', ELI, 'sports', HH_B, HH_B, -270],
    ['i_bottle', 'Water bottle', '💧', MAYA, 'sports', HH_A, 'car', -20],
    ['i_retainer', 'Retainer', '🦷', ELI, 'medical', HH_B, HH_B, -30],
    ['i_readinglog', 'Reading log', '📓', MAYA, 'school', HH_A, HH_A, -6],
  ].map(([id, name, emoji, ownerChildId, category, homeBase, currentLocation, hoursAgo]) => ({
    id,
    name,
    emoji,
    ownerChildId,
    category,
    homeBase,
    currentLocation,
    locationConfirmedAt: new Date(now.getTime() + hoursAgo * 3600000).toISOString(),
    locationConfirmedBy: hoursAgo < -48 ? CO : ME,
    state: 'tracked',
  }));

  const expenses = [
    {
      id: 'e1',
      createdBy: CO,
      paidByHouseholdId: HH_B,
      amountCents: 18000,
      category: 'Activities',
      description: 'Soccer registration',
      incurredOn: dayKey(addDays(now, -2)),
      childIds: [MAYA],
      splitRule: 'even',
      splitConfig: {},
      state: 'posted',
      shares: [{ householdId: HH_A, owedCents: 9000 }, { householdId: HH_B, owedCents: 9000 }],
    },
    {
      id: 'e2',
      createdBy: ME,
      paidByHouseholdId: HH_A,
      amountCents: 6499,
      category: 'Clothing',
      description: 'Winter coat — Maya',
      incurredOn: dayKey(addDays(now, -5)),
      childIds: [MAYA],
      splitRule: 'even',
      splitConfig: {},
      state: 'posted',
      shares: [{ householdId: HH_A, owedCents: 3250 }, { householdId: HH_B, owedCents: 3249 }],
    },
    {
      id: 'e3',
      createdBy: CO,
      paidByHouseholdId: HH_B,
      amountCents: 2500,
      category: 'School',
      description: 'Field trip fee',
      incurredOn: dayKey(addDays(now, -8)),
      childIds: [ELI],
      splitRule: 'even',
      splitConfig: {},
      state: 'disputed',
      disputeNote: 'Already paid this at the school office in August.',
      shares: [{ householdId: HH_A, owedCents: 1250 }, { householdId: HH_B, owedCents: 1250 }],
    },
    {
      id: 'e4',
      createdBy: CO,
      paidByHouseholdId: HH_B,
      amountCents: 24000,
      category: 'Medical',
      description: 'Orthodontist — Eli',
      incurredOn: dayKey(addDays(now, -1)),
      childIds: [ELI],
      splitRule: 'even',
      splitConfig: {},
      state: 'pending_approval',
      shares: [{ householdId: HH_A, owedCents: 12000 }, { householdId: HH_B, owedCents: 12000 }],
    },
  ];

  return {
    version: 1,
    currentUserId: ME,
    family: {
      id: 'f1',
      name: 'Our family',
      defaultSplitRule: 'even',
      approvalThresholdCents: 10000,
      currency: 'USD',
    },
    households: [
      { id: HH_A, name: "Your place", colorToken: 'a' },
      { id: HH_B, name: "Sam's", colorToken: 'b' },
    ],
    people: [
      { id: ME, displayName: 'You', role: 'parent', householdIds: [HH_A], avatarColor: 'a' },
      { id: CO, displayName: 'Sam', role: 'parent', householdIds: [HH_B], avatarColor: 'b' },
      { id: MAYA, displayName: 'Maya', role: 'child', householdIds: [HH_A, HH_B], birthYear: 2015 },
      { id: ELI, displayName: 'Eli', role: 'child', householdIds: [HH_A, HH_B], birthYear: 2018 },
    ],
    custodyPeriods,
    expenses,
    settlements: [
      {
        id: 's1',
        fromHouseholdId: HH_B,
        toHouseholdId: HH_A,
        amountCents: 4200,
        settledOn: dayKey(addDays(now, -40)),
        methodNote: 'Venmo',
        recordedBy: ME,
      },
    ],
    projects: [
      {
        id: 'pr1',
        childId: MAYA,
        title: 'Volcano model',
        subject: 'Science',
        dueOn: dayKey(addDays(now, 13)),
        state: 'active',
        milestones: [
          { id: 'm1', title: 'Choose topic', dueOn: dayKey(addDays(now, -8)), sortOrder: 0, responsibilityMode: 'fixed', responsiblePersonId: ME, state: 'done', completedAt: iso(addDays(now, -8)), completedBy: ME },
          { id: 'm2', title: 'Buy supplies', dueOn: dayKey(addDays(now, -4)), sortOrder: 1, responsibilityMode: 'fixed', responsiblePersonId: CO, state: 'done', completedAt: iso(addDays(now, -4)), completedBy: CO },
          { id: 'm3', title: 'Build model', dueOn: dayKey(addDays(now, 4)), sortOrder: 2, responsibilityMode: 'custody_derived', childId: MAYA, state: 'pending' },
          { id: 'm4', title: 'Practice presentation', dueOn: dayKey(addDays(now, 11)), sortOrder: 3, responsibilityMode: 'rotating', rotationOrder: [ME, CO], rotationCursor: 1, state: 'pending' },
          { id: 'm5', title: 'Present', dueOn: dayKey(addDays(now, 13)), sortOrder: 4, responsibilityMode: 'fixed', responsiblePersonId: null, state: 'pending' },
        ],
        supplies: [
          { id: 'sp1', label: 'Baking soda', itemId: null, acquired: true },
          { id: 'sp2', label: 'Poster board', itemId: 'i_poster', acquired: true },
          { id: 'sp3', label: 'Modelling clay', itemId: null, acquired: false },
        ],
      },
      {
        id: 'pr2',
        childId: ELI,
        title: 'Book report — Charlotte’s Web',
        subject: 'English',
        dueOn: dayKey(addDays(now, 6)),
        state: 'active',
        milestones: [
          { id: 'm6', title: 'Finish reading', dueOn: dayKey(addDays(now, -1)), sortOrder: 0, responsibilityMode: 'custody_derived', childId: ELI, state: 'done', completedAt: iso(addDays(now, -1)), completedBy: CO },
          { id: 'm7', title: 'Write draft', dueOn: dayKey(addDays(now, 2)), sortOrder: 1, responsibilityMode: 'custody_derived', childId: ELI, state: 'pending' },
          { id: 'm8', title: 'Final copy', dueOn: dayKey(addDays(now, 6)), sortOrder: 2, responsibilityMode: 'custody_derived', childId: ELI, state: 'pending' },
        ],
        supplies: [],
      },
    ],
    tasks: [
      { id: 't1', title: 'Soccer pickup', childId: MAYA, repeatRule: 'weekly', weekdays: [2, 4], responsibilityMode: 'custody_derived', active: true, anchorDate: dayKey(anchor), timeLabel: '5:30pm' },
      { id: 't2', title: 'Order team photos', childId: MAYA, repeatRule: 'none', dueOn: dayKey(now), responsibilityMode: 'fixed', responsiblePersonId: CO, active: true },
      { id: 't3', title: 'Sign permission slip', childId: ELI, repeatRule: 'none', dueOn: dayKey(now), responsibilityMode: 'fixed', responsiblePersonId: ME, active: true },
      { id: 't4', title: 'Trumpet practice run', childId: ELI, repeatRule: 'weekly', weekdays: [3], responsibilityMode: 'rotating', rotationOrder: [ME, CO], rotationCursor: 0, active: true, anchorDate: dayKey(anchor) },
      { id: 't5', title: 'Pack swim bag', childId: ELI, repeatRule: 'weekly', weekdays: [6], responsibilityMode: 'custody_derived', active: true, anchorDate: dayKey(anchor) },
      { id: 't6', title: 'Reading log signature', childId: MAYA, repeatRule: 'daily', responsibilityMode: 'custody_derived', active: true, anchorDate: dayKey(anchor) },
    ],
    occurrences: [],
    swaps: [],
    items,
    itemEvents: [],
    packLists: [
      { id: 'pl1', name: 'Saturday soccer', itemIds: ['i_cleats', 'i_shin', 'i_bottle'] },
      { id: 'pl2', name: 'Swim practice', itemIds: ['i_goggles'] },
    ],
    events: [
      { id: 'ev1', title: 'Soccer match', childIds: [MAYA], startsAt: iso(addDays(now, 3), 10), packListId: 'pl1' },
      { id: 'ev2', title: 'Swim practice', childIds: [ELI], startsAt: iso(addDays(now, 2), 16), packListId: 'pl2' },
      { id: 'ev3', title: 'Trumpet lesson', childIds: [ELI], startsAt: iso(addDays(now, 1), 15), packListId: null },
    ],
    handoffs: [
      {
        id: 'ho1',
        childIds: [MAYA, ELI],
        fromHouseholdId: HH_A,
        toHouseholdId: HH_B,
        scheduledAt: handoffAt.toISOString(),
        state: 'upcoming',
        checked: {},
      },
    ],
    comments: [],
  };
}
