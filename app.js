const STORAGE_KEY = 'property-tycoon-state-v1';

const AVATARS = [
  '🧑‍💼', '🧑‍🎨', '🧑‍💻', '🧑‍🔬', '🧑‍🚀', '🧑‍🍳', '👩‍🎓', '👨‍🎓', '👩‍💼', '👨‍💼', '🧑‍🏫', '🧑‍🏭', '🧑‍✈️', '🧑‍🎤', '🧑‍🌾', '🧑‍🔧'
];
const COLORS = {
  blue: '#4db6ff',
  purple: '#8a7dff',
  pink: '#ff5cc8',
  red: '#ff5a5f',
  orange: '#ff9d43',
  yellow: '#ffd166',
  green: '#36d49d',
  cyan: '#5ad9ff'
};

const TOOAST_TIMEOUT = 2200;

const formatMoney = (value) => `£${Math.round(value).toLocaleString()}`;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function createPropertyPool(count = 50) {
  const names = [
    'Ropewalk Shopping Centre', 'Coventry Cathedral', 'Queens Road Apartments', 'Nuneaton Museum', 'Regent Cinema', 'Bell Street Hotel',
    'Market Square Restaurant', 'Old Town Stadium', 'Town Hall Offices', 'Harvester Lane', 'Crown Lane Retail', 'Station Plaza',
    'Greenfield Market', 'Maple Arcade', 'Festival Arts Hub', 'Midtown Studio', 'The Avenue Tower', 'Rivergate Offices', 'St. Nicholas Pub',
    'High Street Home', 'The Reading Rooms', 'Bridgeview Residences', 'Church End Workshops', 'Sunrise Apartments', 'Millennium Grove',
    'Nuneaton Docks', 'Civic Centre', 'Northgate Complex', 'Silverstone Retail Park', 'Mile End Courtyard', 'Phoenix Hall', 'Market Yard',
    'Balmoral Lofts', 'The Lodge', 'Meridian House', 'Briar Point', 'Oakwell Apartments', 'Palladium Cinema', 'Queensway Gardens',
    'Forty Steps Offices', 'The Hub', 'Central Point', 'Leamington Court', 'Broad Street Suites', 'Riverside Market', 'Trafalgar Hotel',
    'Castle Quay', 'All Saints Apartments', 'Elm Court', 'Oak Street Retail', 'Queen’s Park', 'Lakeside Centre', 'Old Mill', 'Horizon Plaza',
    'Windsor House', 'The Arcade', 'Monsoon Hotel', 'Bromley Business Park', 'Rosemere Flats', 'Canal Walk', 'Severn Court', 'The Docks'
  ];

  const categories = ['Commercial', 'Residential', 'Landmark', 'Hospitality', 'Retail', 'Leisure'];
  const areas = ['Nuneaton', 'Coventry', 'Leicester', 'Birmingham', 'Hinckley', 'Bedworth'];
  // Monopoly-style colour groups. Green & Dark Blue are the priciest and deliberately the rarest to find.
  const tiers = [
    { tier: 1, label: 'Brown', color: '#9c6d52', base: 180, rentFactor: 1.0, rarity: 'Common' },
    { tier: 2, label: 'Light Blue', color: '#6ab6ff', base: 320, rentFactor: 1.15, rarity: 'Common' },
    { tier: 3, label: 'Pink', color: '#ff78c8', base: 520, rentFactor: 1.3, rarity: 'Uncommon' },
    { tier: 4, label: 'Orange', color: '#ff9d43', base: 780, rentFactor: 1.5, rarity: 'Uncommon' },
    { tier: 5, label: 'Red', color: '#ff5a5f', base: 1150, rentFactor: 1.75, rarity: 'Rare' },
    { tier: 6, label: 'Yellow', color: '#ffd166', base: 1600, rentFactor: 2.0, rarity: 'Rare' },
    { tier: 7, label: 'Green', color: '#1c6b3f', base: 2300, rentFactor: 2.4, rarity: 'Epic' },
    { tier: 8, label: 'Dark Blue', color: '#16307a', base: 3400, rentFactor: 2.9, rarity: 'Legendary' }
  ];

  const result = [];
  const tierCounts = [9, 9, 8, 8, 6, 5, 3, 2];
  let index = 0;

  tiers.forEach((tierDef, tierIndex) => {
    for (let i = 0; i < tierCounts[tierIndex]; i++) {
      const name = names[index % names.length] + (i > 0 ? ` ${i + 1}` : '');
      const category = categories[(index + i) % categories.length];
      const area = areas[(index + i) % areas.length];
      const distance = (Math.random() * 3.2 + 0.3).toFixed(1);
      const gameValue = Math.round((tierDef.base + Math.random() * tierDef.base * 1.8) + (Math.random() * 600));
      const purchasePrice = Math.round(gameValue * (0.85 + Math.random() * 0.2));
      const yieldValue = (Math.random() * 4.5 + 2.4).toFixed(1);
      const monthlyRent = Math.round((purchasePrice * (0.08 + (tierDef.tier - 1) * 0.02)) + (Math.random() * 180));
      const image = getPropertyBackground(tierDef.tier, category, index % 6);
      result.push({
        id: `prop-${index + 1}`,
        externalPlaceId: `place-${index + 1}`,
        name,
        category,
        area,
        distance: `${distance} km`,
        tier: tierDef.tier,
        tierLabel: tierDef.label,
        tierColor: tierDef.color,
        rarity: tierDef.rarity,
        gameValue,
        purchasePrice,
        currentValue: gameValue,
        baseRent: monthlyRent,
        yield: Number(yieldValue),
        image,
        ownerId: null,
        risk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        description: `${category} asset with strong ${area.toLowerCase()} demand and a compelling local occupancy profile.`
      });
      index += 1;
    }
  });

  return shuffleArray(result).slice(0, count);
}

// Lower weight = rarer draw. Keeps Green/Dark Blue properties feeling special even though the pool holds a few.
const TIER_DRAW_WEIGHTS = { 1: 10, 2: 9, 3: 7, 4: 6, 5: 4, 6: 3, 7: 1.4, 8: 1 };

function pickWeightedProperty(pool) {
  if (!pool.length) return null;
  const weighted = pool.map((property) => ({ property, weight: TIER_DRAW_WEIGHTS[property.tier] || 1 }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.property;
  }
  return weighted[weighted.length - 1].property;
}

const RARITY_STYLES = {
  Common: { color: '#a9bccf', label: 'Common' },
  Uncommon: { color: '#4ce392', label: 'Uncommon' },
  Rare: { color: '#4da3ff', label: 'Rare' },
  Epic: { color: '#c084fc', label: 'Epic' },
  Legendary: { color: '#ffd166', label: 'Legendary' }
};

function getPropertyBackground(tier, category, seed) {
  const gradients = [
    'linear-gradient(135deg, rgba(34,197,94,0.78), rgba(29,78,216,0.84)), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.28), transparent 30%), linear-gradient(180deg, rgba(15,23,42,0.1), rgba(15,23,42,0.5))',
    'linear-gradient(135deg, rgba(59,130,246,0.78), rgba(14,116,144,0.8)), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.22), transparent 28%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.55))',
    'linear-gradient(135deg, rgba(236,72,153,0.82), rgba(168,85,247,0.78)), radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.58))',
    'linear-gradient(135deg, rgba(249,115,22,0.86), rgba(239,68,68,0.75)), radial-gradient(circle at 70% 18%, rgba(255,255,255,0.2), transparent 28%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.6))',
    'linear-gradient(135deg, rgba(20,184,166,0.82), rgba(16,185,129,0.72)), radial-gradient(circle at 55% 12%, rgba(255,255,255,0.26), transparent 26%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.58))',
    'linear-gradient(135deg, rgba(59,130,246,0.86), rgba(37,99,235,0.72)), radial-gradient(circle at 20% 22%, rgba(255,255,255,0.24), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.63))'
  ];
  return gradients[(tier + seed) % gradients.length];
}

function createChanceDeck() {
  return [
    { id: 'chance-1', name: 'Market Boom', type: 'INSTANT', effect: 'market-bonus', description: 'All owned properties increase 5%.', value: 5 },
    { id: 'chance-2', name: 'Market Downturn', type: 'INSTANT', effect: 'market-drop', description: 'All properties drop 5%.', value: -5 },
    { id: 'chance-3', name: 'Maintenance Bill', type: 'INSTANT', effect: 'cash-out', amount: 250, description: 'Pay £250.' },
    { id: 'chance-4', name: 'Tax Refund', type: 'INSTANT', effect: 'cash-in', amount: 400, description: 'Receive £400.' },
    { id: 'chance-5', name: 'Insurance', type: 'KEEP', effect: 'insurance', description: 'Cancel one future negative property event.' },
    { id: 'chance-6', name: 'Rent Booster', type: 'PLAY', effect: 'rent-booster', description: 'Choose one property and collect 2x next month.', target: 'property' },
    { id: 'chance-7', name: 'Renovation Grant', type: 'PLAY', effect: 'renovation', description: 'Increase one property value by 10%.', target: 'property' },
    { id: 'chance-8', name: 'Freeze', type: 'KEEP', effect: 'freeze', description: 'Prevent one opponent from collecting rent from you once.' },
    { id: 'chance-9', name: 'Community Regeneration', type: 'INSTANT', effect: 'community', description: 'All commercial properties gain 8%.', value: 8 },
    { id: 'chance-10', name: 'Emergency Expense', type: 'INSTANT', effect: 'cash-out', amount: 300, description: 'Pay £300.' },
    { id: 'chance-11', name: 'Shared Growth', type: 'INSTANT', effect: 'market-bonus', value: 4, description: 'Local market sentiment improves.' },
    { id: 'chance-12', name: 'Bumper Rent', type: 'PLAY', effect: 'rent-booster', description: 'A lucky tenant pays double rent on one property.', target: 'property' }
  ];
}

function createImpulseAssets() {
  return [
    { id: 'imp-1', name: 'Limited Edition Trainers', price: 320, popularity: 14, resale: 260, emoji: '👟' },
    { id: 'imp-2', name: 'Smartphone', price: 420, popularity: 18, resale: 310, emoji: '📱' },
    { id: 'imp-3', name: 'Gaming Console', price: 540, popularity: 22, resale: 400, emoji: '🎮' },
    { id: 'imp-4', name: 'Designer Clothing', price: 280, popularity: 16, resale: 220, emoji: '👕' },
    { id: 'imp-5', name: 'Concert Tickets', price: 150, popularity: 10, resale: 120, emoji: '🎟️' },
    { id: 'imp-6', name: 'Bike', price: 380, popularity: 19, resale: 290, emoji: '🚲' },
    { id: 'imp-7', name: 'Headphones', price: 260, popularity: 12, resale: 200, emoji: '🎧' },
    { id: 'imp-8', name: 'Collectible Figurine', price: 240, popularity: 11, resale: 180, emoji: '🧩' }
  ];
}

function buildDefaultGame(profile) {
  const human = {
    id: 'player-human',
    name: profile.name || 'Zaid',
    avatarId: profile.avatarId || 'avatar-1',
    color: profile.color || 'blue',
    cash: 5000,
    happiness: 20,
    properties: [],
    impulseAssets: [],
    savedCards: [],
    isHuman: true,
    stats: { rentCollected: 0, moneySpent: 0, propertiesBought: 0, offersCompleted: 0, netWorth: 5000 }
  };

  const aiCount = 3;
  const aiColors = ['purple', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan'];
  const aiNames = ['Aisha', 'Liam', 'Noah', 'Maya', 'Kai', 'Sofia', 'Omar', 'Jules'];
  const players = [human];
  const aiNamesUsed = new Set();

  for (let i = 0; i < aiCount; i++) {
    let name = aiNames[(i + 1) % aiNames.length];
    while (aiNamesUsed.has(name)) name = aiNames[(Math.random() * aiNames.length) | 0];
    aiNamesUsed.add(name);
    players.push({
      id: `player-ai-${i + 1}`,
      name,
      avatarId: `avatar-${i + 2}`,
      color: aiColors[(i + 1) % aiColors.length],
      cash: 5000,
      happiness: 20 + (Math.random() * 10),
      properties: [],
      impulseAssets: [],
      savedCards: [],
      isHuman: false,
      difficulty: 'normal',
      stats: { rentCollected: 0, moneySpent: 0, propertiesBought: 0, offersCompleted: 0, netWorth: 5000 }
    });
  }

  const properties = createPropertyPool(50);
  const activity = [
    { id: uid('act'), text: 'Welcome to Nuneaton. The market is live.', icon: '🏙️', time: 'now', color: null },
    { id: uid('act'), text: 'Local market sentiment is warming up.', icon: '📈', time: '2m ago', color: null }
  ];

  return {
    mode: 'single',
    month: 1,
    currentPlayerIndex: 0,
    aiOpponents: 3,
    difficulty: 'normal',
    localProperties: 50,
    area: 'Nuneaton / broad local area',
    players,
    properties,
    chanceDeck: createChanceDeck(),
    activity,
    currentTurn: null,
    availableTurns: [],
    lastRoll: null,
    turnIndex: 0,
    turnCompleted: false,
    opponentsSimulated: false,
    gameStarted: true,
    settings: { difficulty: 'normal', noLocalProperties: 50 }
  };
}

function getSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Could not parse saved state', error);
    return null;
  }
}

function saveState() {
  const payload = {
    onboardingComplete: state.onboardingComplete,
    profile: state.profile,
    settings: state.settings,
    game: state.game,
    turnDeckCards: state.turnDeckCards,
    ui: state.ui
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

const state = {
  onboardingComplete: false,
  profile: {
    name: '',
    avatarId: 'avatar-1',
    color: 'blue'
  },
  settings: {
    theme: 'dark',
    sound: false,
    haptics: true,
    reduceMotion: false,
    location: true,
    difficulty: 'normal',
    localProperties: 50,
    postcode: ''
  },
  ui: {
    activeView: 'home',
    onboardingStep: 0,
    modal: null,
    passScreen: false
  },
  game: null,
  turnDeckCards: []
};

const root = document.getElementById('app');
const onboardingScreen = document.getElementById('onboarding');
const gameShell = document.getElementById('game-shell');

function hydrateState() {
  const saved = getSavedState();
  if (saved) {
    state.onboardingComplete = saved.onboardingComplete || false;
    state.profile = saved.profile || state.profile;
    state.settings = { ...state.settings, ...saved.settings };
    state.game = saved.game || null;
    state.turnDeckCards = saved.turnDeckCards || state.turnDeckCards || [];
    state.ui = { ...state.ui, ...saved.ui };
  }
}

function haptic(pattern = 'soft') {
  if (!state.settings.haptics) return;
  if (!('vibrate' in navigator)) return;
  const map = {
    tiny: 10,
    soft: 20,
    medium: 40,
    double: [20, 30, 20],
    warning: [25, 40, 25],
    celebration: [18, 50, 18, 48, 20]
  };
  navigator.vibrate(map[pattern] || 20);
}

function showToast(text) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, TOOAST_TIMEOUT);
}

// Reverse-geocodes the device's GPS position to a UK postcode using the free postcodes.io API.
function useCurrentLocationForPostcode(button) {
  const statusEl = document.getElementById('location-status');
  if (!('geolocation' in navigator)) {
    if (statusEl) statusEl.textContent = 'Location is not available on this device.';
    return;
  }
  button.disabled = true;
  button.textContent = '📍 Locating…';
  if (statusEl) statusEl.textContent = 'Finding your postcode…';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`);
        const data = await response.json();
        const postcode = data?.result?.[0]?.postcode;
        if (postcode) {
          const input = document.getElementById('postcode-input');
          if (input) input.value = postcode;
          state.settings.postcode = postcode;
          if (statusEl) statusEl.textContent = `Using ${postcode}`;
        } else {
          if (statusEl) statusEl.textContent = 'Could not match a postcode nearby. Please type one instead.';
        }
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Lookup failed. Please type your postcode instead.';
      } finally {
        button.disabled = false;
        button.textContent = '📍 Use current location';
      }
    },
    () => {
      if (statusEl) statusEl.textContent = 'Location permission denied. Please type your postcode instead.';
      button.disabled = false;
      button.textContent = '📍 Use current location';
    },
    { timeout: 10000 }
  );
}

function createOnboardingStep() {
  const steps = [
    {
      title: 'Property Tycoon',
      subtitle: 'Real places. Real decisions. Build your empire.',
      content: `
        <div class="brand-hero">
          <div class="logo-stack">
            <div class="tiny-tag">Welcome</div>
            <h1><span>PROPERTY</span><span>TYCOON</span></h1>
            <p>Real places. Real decisions. Build your empire.</p>
          </div>
          <div class="city-skyline"></div>
        </div>
        <div class="onboarding-panel">
          <button class="primary-btn" data-next="1">Get Started</button>
        </div>
      `
    },
    {
      title: "What's your name?",
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>What's your name?</h2>
          <input id="player-name-input" class="name-input" placeholder="Type your name" maxlength="18" value="${state.profile.name || ''}" />
          <div style="height:12px"></div>
          <button class="primary-btn" id="name-continue">Continue</button>
        </div>
      `
    },
    {
      title: 'Choose your avatar',
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>Choose your avatar</h2>
          <div class="avatar-grid" id="avatar-grid"></div>
          <div style="height:12px"></div>
          <button class="primary-btn" id="avatar-continue">Continue</button>
        </div>
      `
    },
    {
      title: 'Pick your colour',
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>Pick your colour</h2>
          <div class="color-grid" id="color-grid"></div>
          <div class="preview-box">
            <div class="preview-avatar" id="preview-avatar">${state.profile.avatarId ? AVATARS[0] : '🧑‍💼'}</div>
            <div class="preview-text">
              <strong id="preview-name">${(state.profile.name || 'ZAID').toUpperCase()}</strong>
              <span id="preview-color">${(state.profile.color || 'Blue').toUpperCase()}</span>
            </div>
          </div>
          <div style="height:12px"></div>
          <button class="primary-btn" id="color-continue">Continue</button>
        </div>
      `
    },
    {
      title: 'Choose your location',
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>Choose your location</h2>
          <p style="color:var(--text-soft); font-size:0.86rem; margin: -4px 0 14px;">We'll generate real nearby properties, shops and landmarks for this area.</p>
          <div class="config-row">
            <strong>Postcode</strong>
            <input id="postcode-input" class="name-input" style="margin-top:10px; padding:14px 14px;" placeholder="e.g. CV11 4LY" maxlength="10" value="${state.settings.postcode || ''}" />
            <button type="button" class="ghost-btn" id="use-location-btn" style="width:100%; margin-top:10px;">📍 Use current location</button>
            <div id="location-status" style="min-height:18px; margin-top:8px; font-size:0.78rem; color:var(--text-soft);"></div>
          </div>
          <div style="height:12px"></div>
          <button class="primary-btn" id="location-continue">Continue</button>
        </div>
      `
    },
    {
      title: 'Choose Game Mode',
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>Choose Game Mode</h2>
          <div class="config-grid">
            <div class="segmented-control" id="game-mode-options">
              <button class="active" data-mode="single">Single Player</button>
              <button data-mode="passplay">Pass & Play</button>
              <button data-mode="online">Online</button>
            </div>
            <div class="config-row">
              <strong>AI Opponents</strong>
              <div class="segmented-control" id="ai-count-options">
                <button data-count="1">1</button>
                <button class="active" data-count="2">2</button>
                <button data-count="3">3</button>
                <button data-count="4">4</button>
                <button data-count="5">5</button>
              </div>
            </div>
            <div class="config-row">
              <strong>Difficulty</strong>
              <div class="segmented-control" id="difficulty-options">
                <button data-difficulty="easy">Easy</button>
                <button class="active" data-difficulty="normal">Normal</button>
                <button data-difficulty="hard">Hard</button>
              </div>
            </div>
            <div class="config-row">
              <strong>Number of Local Properties</strong>
              <div class="segmented-control" id="property-count-options">
                <button data-props="25">25</button>
                <button class="active" data-props="50">50</button>
                <button data-props="75">75</button>
                <button data-props="100">100</button>
              </div>
            </div>
          </div>
          <div style="height:12px"></div>
          <button class="primary-btn" id="mode-continue">Continue</button>
        </div>
      `
    },
    {
      title: 'Ready Screen',
      subtitle: '',
      content: `
        <div class="onboarding-panel">
          <h2>Ready?</h2>
          <div class="preview-box" style="margin-top: 0; margin-bottom: 16px;">
            <div class="preview-avatar" style="background: ${COLORS[state.profile.color]};">${AVATARS[0]}</div>
            <div class="preview-text">
              <strong>${(state.profile.name || 'Zaid').toUpperCase()}</strong>
              <span>${state.profile.color ? state.profile.color.toUpperCase() : 'BLUE'}</span>
            </div>
          </div>
          <div class="config-row">
            <strong>Starting Cash</strong>
            <div>£5,000</div>
          </div>
          <div class="config-row">
            <strong>Opponents</strong>
            <div>3</div>
          </div>
          <div class="config-row">
            <strong>Difficulty</strong>
            <div>Normal</div>
          </div>
          <div class="config-row">
            <strong>Local Properties</strong>
            <div>50</div>
          </div>
          <div class="config-row">
            <strong>Location</strong>
            <div>${state.settings.postcode ? state.settings.postcode.toUpperCase() : 'Sample data (no postcode set)'}</div>
          </div>
          <div style="height:12px"></div>
          <button class="primary-btn" id="start-game-btn">Start Game</button>
        </div>
      `
    }
  ];

  const step = steps[state.ui.onboardingStep] || steps[0];
  onboardingScreen.innerHTML = `
    <div class="onboarding-card">
      <div class="progress-steps">
        ${steps.map((_, index) => `<div class="dot ${index <= state.ui.onboardingStep ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="onboarding-content">
        ${step.content}
      </div>
    </div>
  `;

  bindOnboardingEvents();
}

function bindOnboardingEvents() {
  const stepIndex = state.ui.onboardingStep;
  const nextButton = document.querySelector('[data-next]');
  if (nextButton) nextButton.addEventListener('click', () => goToOnboardingStep(stepIndex + 1));

  const nameContinue = document.getElementById('name-continue');
  if (nameContinue) {
    nameContinue.addEventListener('click', () => {
      const input = document.getElementById('player-name-input');
      const value = (input.value || '').trim();
      if (!value) {
        input.focus();
        showToast('Please enter your name');
        return;
      }
      state.profile.name = value;
      goToOnboardingStep(stepIndex + 1);
    });
  }

  const avatarGrid = document.getElementById('avatar-grid');
  if (avatarGrid) {
    AVATARS.forEach((emoji, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-option ${state.profile.avatarId === `avatar-${index}` ? 'selected' : ''}`;
      btn.innerHTML = `<span>${emoji}</span>`;
      btn.addEventListener('click', () => {
        state.profile.avatarId = `avatar-${index}`;
        haptic('tiny');
        createOnboardingStep();
      });
      avatarGrid.appendChild(btn);
    });
  }

  const colorGrid = document.getElementById('color-grid');
  if (colorGrid) {
    Object.entries(COLORS).forEach(([name, color]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `color-option ${state.profile.color === name ? 'selected' : ''}`;
      btn.style.background = `linear-gradient(135deg, ${color}, rgba(255,255,255,0.22))`;
      btn.setAttribute('aria-label', name);
      btn.addEventListener('click', () => {
        state.profile.color = name;
        haptic('tiny');
        createOnboardingStep();
      });
      colorGrid.appendChild(btn);
    });
  }

  const avatarContinue = document.getElementById('avatar-continue');
  if (avatarContinue) avatarContinue.addEventListener('click', () => goToOnboardingStep(stepIndex + 1));
  const colorContinue = document.getElementById('color-continue');
  if (colorContinue) colorContinue.addEventListener('click', () => goToOnboardingStep(stepIndex + 1));

  const postcodeInput = document.getElementById('postcode-input');
  if (postcodeInput) {
    postcodeInput.addEventListener('input', () => {
      state.settings.postcode = postcodeInput.value;
    });
  }
  const useLocationBtn = document.getElementById('use-location-btn');
  if (useLocationBtn) {
    useLocationBtn.addEventListener('click', () => useCurrentLocationForPostcode(useLocationBtn));
  }
  const locationContinue = document.getElementById('location-continue');
  if (locationContinue) locationContinue.addEventListener('click', () => goToOnboardingStep(stepIndex + 1));

  const modeButtons = document.querySelectorAll('#game-mode-options button');
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.toggle('active', b === button));
      document.querySelectorAll('#ai-count-options button').forEach((b) => b.classList.toggle('active', b.dataset.count === '2'));
      state.settings.difficulty = 'normal';
      state.settings.localProperties = 50;
      state.settings.gameMode = button.dataset.mode;
    });
  });

  const aiCountButtons = document.querySelectorAll('#ai-count-options button');
  aiCountButtons.forEach((button) => {
    button.addEventListener('click', () => {
      aiCountButtons.forEach((b) => b.classList.toggle('active', b === button));
      state.settings.aiOpponents = Number(button.dataset.count);
    });
  });

  const difficultyButtons = document.querySelectorAll('#difficulty-options button');
  difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      difficultyButtons.forEach((b) => b.classList.toggle('active', b === button));
      state.settings.difficulty = button.dataset.difficulty;
    });
  });

  const propertyButtons = document.querySelectorAll('#property-count-options button');
  propertyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      propertyButtons.forEach((b) => b.classList.toggle('active', b === button));
      state.settings.localProperties = Number(button.dataset.props);
    });
  });

  const modeContinue = document.getElementById('mode-continue');
  if (modeContinue) modeContinue.addEventListener('click', () => goToOnboardingStep(stepIndex + 1));

  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', async () => {
      startGameBtn.disabled = true;
      await startNewGame();
      haptic('double');
      state.onboardingComplete = true;
      saveState();
      showGameShell();
      startGameBtn.disabled = false;
    });
  }

  const nameInput = document.getElementById('player-name-input');
  if (nameInput) {
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        nameContinue.click();
      }
    });
  }

  const previewName = document.getElementById('preview-name');
  const previewColor = document.getElementById('preview-color');
  const previewAvatar = document.getElementById('preview-avatar');
  if (previewName) previewName.textContent = (state.profile.name || 'ZAID').toUpperCase();
  if (previewColor) previewColor.textContent = (state.profile.color || 'blue').toUpperCase();
  if (previewAvatar) previewAvatar.textContent = AVATARS[0];
}

function goToOnboardingStep(step) {
  if (step < 0) return;
  state.ui.onboardingStep = step;
  createOnboardingStep();
}

function showGameShell() {
  onboardingScreen.classList.add('hidden');
  gameShell.classList.remove('hidden');
  renderAll();
}

function renderAll() {
  renderHome();
  renderTurn();
  renderPortfolio();
  renderLeaderboard();
  renderSettings();
  renderNav();
}

function renderNav() {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach((button) => {
    const active = button.dataset.view === state.ui.activeView;
    button.classList.toggle('active', active);
  });
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${state.ui.activeView}`);
  });
}

function setView(name) {
  const enteringTurn = name === 'turn' && state.ui.activeView !== 'turn';
  state.ui.activeView = name;
  renderNav();
  if (enteringTurn) {
    pendingTurnBanner = true;
    renderTurn();
  }
  saveState();
}

async function startNewGame() {
  const profile = { ...state.profile };
  const configuredGame = buildDefaultGame(profile);
  configuredGame.mode = state.settings.gameMode || 'single';
  configuredGame.aiOpponents = Number(state.settings.aiOpponents || 3);
  configuredGame.difficulty = state.settings.difficulty || 'normal';
  configuredGame.localProperties = Number(state.settings.localProperties || 50);

  const postcode = (state.settings.postcode || '').trim();
  if (postcode) {
    showLoadingOverlay('Generating live images', `Finding real properties and places near ${postcode.toUpperCase()}…`);
    const generated = await tryGenerateLocations(postcode, configuredGame.localProperties);
    hideLoadingOverlay();
    configuredGame.properties = generated || createPropertyPool(configuredGame.localProperties);
  } else {
    configuredGame.properties = createPropertyPool(configuredGame.localProperties);
  }

  state.game = configuredGame;
  state.turnDeckCards = generateTurnDeck();
  state.ui.activeView = 'home';
  saveState();
}

function showLoadingOverlay(title, subtitle) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-subtitle').textContent = subtitle;
  overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
  document.getElementById('loading-overlay')?.classList.add('hidden');
}

// Calls the serverless location-image API (see /api/generate-locations.js). Falls back to the
// built-in procedural property pool if the endpoint isn't deployed/configured, times out, or errors.
async function tryGenerateLocations(postcode, count) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    const response = await fetch('/api/generate-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcode, count }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`${data?.error || `HTTP ${response.status}`}${data?.debug ? ` (${data.debug})` : ''}`);
    if (!Array.isArray(data.locations) || !data.locations.length) throw new Error('No locations returned');
    return mapGeneratedLocationsToProperties(data.locations);
  } catch (err) {
    console.warn('Falling back to sample properties:', err.message);
    showToast('Using sample properties — connect the location API for real places');
    return null;
  }
}

// Converts API-generated locations (real places + AI images) into the property shape the game uses.
function mapGeneratedLocationsToProperties(locations) {
  const tierByRarity = [
    { label: 'Brown', color: '#9c6d52', rarity: 'Common' },
    { label: 'Light Blue', color: '#6ab6ff', rarity: 'Common' },
    { label: 'Pink', color: '#ff78c8', rarity: 'Uncommon' },
    { label: 'Orange', color: '#ff9d43', rarity: 'Uncommon' },
    { label: 'Red', color: '#ff5a5f', rarity: 'Rare' },
    { label: 'Yellow', color: '#ffd166', rarity: 'Rare' },
    { label: 'Green', color: '#1c6b3f', rarity: 'Epic' },
    { label: 'Dark Blue', color: '#16307a', rarity: 'Legendary' }
  ];
  return locations.map((location, index) => {
    const importance = clamp(Number(location.importance ?? (location.isEnterprise ? 0.75 : 0.35)), 0, 1);
    const tierIndex = location.isEnterprise
      ? clamp(6 + Math.round(importance), 0, 7)
      : clamp(Math.round(importance * 5), 0, 5);
    const tierDef = tierByRarity[tierIndex];
    const gameValue = Math.round(300 + importance * 4200 + Math.random() * 400);
    const purchasePrice = Math.round(gameValue * (0.85 + Math.random() * 0.2));
    const monthlyRent = Math.round(purchasePrice * (0.08 + tierIndex * 0.02));
    return {
      id: `prop-${index + 1}`,
      externalPlaceId: location.id || `place-${index + 1}`,
      name: location.name,
      category: location.category || (location.isEnterprise ? 'Commercial' : 'Landmark'),
      area: location.area || '',
      distance: location.distance ? `${location.distance} km` : '—',
      tier: tierIndex + 1,
      tierLabel: tierDef.label,
      tierColor: tierDef.color,
      rarity: tierDef.rarity,
      gameValue,
      purchasePrice,
      currentValue: gameValue,
      baseRent: monthlyRent,
      yield: Number((2.4 + Math.random() * 4.5).toFixed(1)),
      image: location.imageUrl ? `url('${location.imageUrl}')` : getPropertyBackground(tierIndex + 1, location.category, index % 6),
      ownerId: null,
      risk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      description: location.description || `${location.category || 'Local'} location near ${location.area || 'the area'}.`,
      isEnterprise: Boolean(location.isEnterprise)
    };
  });
}

function getCurrentPlayer() {
  return state.game?.players?.[state.game.currentPlayerIndex] || state.game?.players?.[0];
}

function getPropertyById(id) {
  return state.game?.properties?.find((property) => property.id === id) || null;
}

function getOwnedPropertyIds(playerId) {
  return state.game?.properties?.filter((property) => property.ownerId === playerId).map((property) => property.id) || [];
}

function getPlayerNetWorth(player) {
  const propertyValue = (player.properties || []).reduce((total, propertyId) => {
    const property = getPropertyById(propertyId);
    return total + (property ? property.currentValue : 0);
  }, 0);
  const impulseValue = (player.impulseAssets || []).reduce((total, asset) => total + (asset.currentValue || asset.resale || asset.price), 0);
  return player.cash + propertyValue + impulseValue;
}

function generateTurnDeck() {
  if (!state.game) return [];
  const propertyPool = state.game.properties.filter((property) => property.ownerId === null);
  const cards = [];
  for (let i = 0; i < 4; i++) {
    const property = pickWeightedProperty(propertyPool);
    if (property) cards.push({ type: 'property', propertyId: property.id });
  }
  cards.push({ type: 'dice' });
  cards.push({ type: 'impulse' });
  return shuffleArray(cards);
}

function renderHome() {
  const home = document.getElementById('view-home');
  if (!state.game) {
    home.innerHTML = '<div class="empty-state">No game started yet.</div>';
    return;
  }
  const player = getCurrentPlayer();
  const props = player.properties.length;
  const rent = getPlayerRent(player);
  const happiness = Math.min(player.happiness || 20, 100);
  home.innerHTML = `
    <div class="home-top">
      <div class="player-pill">
        <div class="player-avatar" style="background:${COLORS[player.color]};">${AVATARS[0]}</div>
        <div>
          <strong>${player.name}</strong>
        </div>
      </div>
      <div class="month-badge">Month ${state.game.month}</div>
    </div>

    <div class="home-card home-dashboard">
      <div class="home-balance">
        <div>
          <div class="label">Cash</div>
          <div class="amount" data-money="${player.cash}">${formatMoney(player.cash)}</div>
        </div>
        <div class="home-balance-logo">💰</div>
      </div>

      <div class="home-stats">
        <div class="stat-card">
          <div class="kicker">Properties</div>
          <strong>${props}</strong>
        </div>
        <div class="stat-card">
          <div class="kicker">Est. monthly rent</div>
          <strong>${formatMoney(rent)}</strong>
        </div>
        <div class="stat-card">
          <div class="kicker">Happiness</div>
          <strong>${Math.round(happiness)}%</strong>
        </div>
      </div>

      <div class="happiness-wrap">
        <div class="happiness-header"><span>Happiness</span><strong>${Math.round(happiness)}%</strong></div>
        <div class="happiness-bar"><span style="width:${happiness}%"></span></div>
      </div>
    </div>

    <div class="home-card turn-status">
      <div class="turn-header">
        <h3>Month ${state.game.month}</h3>
        <div class="status-tag">${player.name.toUpperCase()}'S TURN</div>
      </div>
      <div class="turn-cta">
        <button class="take-turn-btn" data-view="turn">Take Your Turn</button>
      </div>
    </div>

    <div class="home-card" style="padding: 16px; margin-top:12px;">
      <h3 style="margin:0 0 12px;">Recent Activity</h3>
      <div class="activity-list">
        ${(state.game.activity || []).slice(0, 5).map((item) => `
          <div class="activity-item">
            <div class="activity-icon">${item.icon || '💬'}</div>
            <div>
              <strong>${item.text}</strong>
              <small>${item.time || 'now'}</small>
            </div>
            <div class="time">${item.ago || 'just now'}</div>
          </div>
        `).join('') || '<div class="empty-state">No activity yet.</div>'}
      </div>
    </div>
  `;

  const turnButton = home.querySelector('[data-view="turn"]');
  if (turnButton) turnButton.addEventListener('click', () => setView('turn'));
  animateMoneyNumbers();
}

function getPlayerRent(player) {
  return (player.properties || []).reduce((total, propertyId) => {
    const property = getPropertyById(propertyId);
    return total + (property ? property.baseRent : 0);
  }, 0);
}

function animateMoneyNumbers() {
  document.querySelectorAll('[data-money]').forEach((node) => {
    const target = Number(node.dataset.money || 0);
    const current = Number(node.dataset.display || 0);
    const start = current || 0;
    const duration = 500;
    const startTime = performance.now();
    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (target - start) * eased;
      node.textContent = formatMoney(value);
      node.dataset.display = value;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

let idleHintTimer = null;
let pendingTurnBanner = false;

function clearIdleHint() {
  if (idleHintTimer) {
    clearTimeout(idleHintTimer);
    idleHintTimer = null;
  }
  document.querySelectorAll('.swipe-hint.show-hint').forEach((hint) => hint.classList.remove('show-hint'));
}

function renderTurn() {
  const turn = document.getElementById('view-turn');
  if (!state.game) {
    turn.innerHTML = '<div class="empty-state">No turn deck ready.</div>';
    return;
  }
  const currentPlayer = getCurrentPlayer();
  const cards = state.turnDeckCards || [];
  const activeIndex = state.game.turnIndex || 0;
  const showBanner = pendingTurnBanner;
  pendingTurnBanner = false;

  if (state.game.turnCompleted) {
    renderTurnCompleteScreen(turn);
    return;
  }

  turn.innerHTML = `
    <div id="turn-card-screen">
      ${showBanner ? `
        <div class="turn-banner">
          <span class="turn-banner-icon">⚡</span>
          <span>${currentPlayer.name}'S TURN</span>
        </div>
      ` : ''}
      <div class="turn-header-bar">
        <span>Month ${state.game.month}</span>
        <span>${activeIndex + 1} / ${cards.length}</span>
      </div>
      <div class="turn-feed" id="turn-feed-root"></div>
    </div>
  `;

  const feedRoot = document.getElementById('turn-feed-root');
  if (!cards.length) {
    feedRoot.innerHTML = '<div class="empty-state">Your turn deck is empty.</div>';
    return;
  }

  // Only build the active card plus a couple of peeking cards behind it; anything already
  // swiped away is left out entirely so it can never show through/overlap the current card.
  // Stacked cards stay fully opaque (dimmed via filter only) so text never bleeds through the top card.
  const STACK_DEPTH = 2;
  cards.forEach((card, index) => {
    const offset = index - activeIndex;
    if (offset < 0 || offset > STACK_DEPTH) return;
    const cardEl = document.createElement('div');
    cardEl.className = 'turn-card';
    cardEl.dataset.index = index;
    cardEl.style.zIndex = String(100 - offset);
    cardEl.style.opacity = '1';
    cardEl.style.filter = offset === 0 ? 'none' : `brightness(${1 - offset * 0.16})`;
    cardEl.style.transform = `translateY(${offset * 22}px) scale(${1 - offset * 0.055})`;
    cardEl.innerHTML = `<div class="inner">${renderTurnCardMarkup(card, currentPlayer, index, cards.length)}</div>`;
    if (offset === 0) {
      const hint = document.createElement('div');
      hint.className = 'swipe-hint';
      hint.innerHTML = '<span class="swipe-hint-arrow">⌃</span><span>Swipe up</span>';
      cardEl.appendChild(hint);
      attachTurnCardInteractions(cardEl, card, index, cards.length);
    }
    feedRoot.appendChild(cardEl);
  });

  const progressDots = Array.from({ length: cards.length }).map((_, i) => `<span class="dot ${i === activeIndex ? 'active' : ''}"></span>`).join('');
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-steps';
  progressBar.innerHTML = progressDots;
  progressBar.style.marginTop = '10px';
  turn.appendChild(progressBar);

  clearIdleHint();
  idleHintTimer = setTimeout(() => {
    document.querySelector('#turn-feed-root .turn-card .swipe-hint')?.classList.add('show-hint');
  }, 2600);
}

function renderTurnCompleteScreen(turn) {
  const simulated = Boolean(state.game.opponentsSimulated);
  turn.innerHTML = `
    <div class="turn-complete-screen">
      <div class="complete-icon">🎉</div>
      <h2>Turn Complete!</h2>
      <p>You've been through every card for Month ${state.game.month}.</p>
      ${simulated
        ? `<button class="primary-btn" id="view-leaderboard-btn">View Updated Leaderboard</button>`
        : `<button class="primary-btn" id="simulate-btn">Simulate Opponents' Turn</button>`}
    </div>
  `;
  document.getElementById('simulate-btn')?.addEventListener('click', handleSimulateClick);
  document.getElementById('view-leaderboard-btn')?.addEventListener('click', goToLeaderboardAfterTurn);
}

function handleSimulateClick() {
  simulateOpponents();
  // Prepare next month's deck in the background; the completion screen keeps showing
  // (now with "View Updated Leaderboard") until the player is ready to move on.
  state.game.month += 1;
  state.turnDeckCards = generateTurnDeck();
  state.game.turnIndex = 0;
  saveState();
  renderTurn();
}

function goToLeaderboardAfterTurn() {
  state.game.turnCompleted = false;
  state.game.opponentsSimulated = false;
  saveState();
  setView('leaderboard');
}

// Gives each AI opponent one simple action for the round and narrates it via toasts/activity.
function simulateOpponents() {
  const opponents = state.game.players.filter((player) => !player.isHuman);
  const availableProperties = state.game.properties.filter((property) => property.ownerId === null);

  opponents.forEach((opponent) => {
    const roll = Math.random();

    if (roll < 0.45 && availableProperties.length) {
      const affordable = availableProperties.filter((property) => property.purchasePrice <= opponent.cash * 0.85);
      const choice = affordable[(Math.random() * affordable.length) | 0];
      if (choice) {
        opponent.cash -= choice.purchasePrice;
        choice.ownerId = opponent.id;
        opponent.properties.push(choice.id);
        availableProperties.splice(availableProperties.indexOf(choice), 1);
        state.game.activity.unshift({ id: uid('act'), text: `${opponent.name} bought ${choice.name}`, icon: '🏠', time: 'now', color: COLORS[opponent.color] });
        showToast(`${opponent.name.toUpperCase()} BOUGHT ${choice.name.toUpperCase()}`);
        return;
      }
    }

    if (roll < 0.8) {
      const owners = state.game.players.filter((player) => player.id !== opponent.id && (player.properties || []).length);
      const owner = owners[(Math.random() * owners.length) | 0];
      const ownedProperties = owner ? owner.properties.map((propertyId) => getPropertyById(propertyId)).filter(Boolean) : [];
      const property = ownedProperties[(Math.random() * ownedProperties.length) | 0];
      if (owner && property) {
        const rentDue = Math.round(property.baseRent * (0.9 + Math.random() * 0.3));
        opponent.cash -= rentDue;
        owner.cash += rentDue;
        state.game.activity.unshift({ id: uid('act'), text: `${opponent.name} paid ${formatMoney(rentDue)} rent to ${owner.name}`, icon: '💸', time: 'now', color: COLORS[opponent.color] });
        showToast(`${opponent.name.toUpperCase()} PAID RENT TO ${owner.name.toUpperCase()}`);
        return;
      }
    }

    const assets = createImpulseAssets();
    const asset = assets[(Math.random() * assets.length) | 0];
    if (opponent.cash >= asset.price) {
      opponent.cash -= asset.price;
      opponent.impulseAssets.push({ ...asset, currentValue: asset.resale, id: uid('impulse') });
      opponent.happiness = clamp(Number(opponent.happiness || 20) + asset.popularity, 0, 100);
      state.game.activity.unshift({ id: uid('act'), text: `${opponent.name} bought ${asset.name}`, icon: '🛍️', time: 'now', color: COLORS[opponent.color] });
      showToast(`${opponent.name.toUpperCase()} BOUGHT ${asset.name.toUpperCase()}`);
    } else {
      state.game.activity.unshift({ id: uid('act'), text: `${opponent.name} sat this month out`, icon: '💤', time: 'now', color: COLORS[opponent.color] });
      showToast(`${opponent.name.toUpperCase()} SAT THIS MONTH OUT`);
    }
  });

  state.game.opponentsSimulated = true;
  saveState();
}


function renderTurnCardMarkup(card, currentPlayer, index, total) {
  if (card.type === 'property') {
    const property = getPropertyById(card.propertyId);
    if (!property) return '<div class="empty-state">Property unavailable.</div>';
    const rarity = RARITY_STYLES[property.rarity] || RARITY_STYLES.Common;
    return `
      <div class="card-color-band" style="background:${property.tierColor};">
        <div class="type-tag"><span class="type-icon">🏠</span><span>Property · ${property.tierLabel}</span></div>
        <div class="turn-count">${index + 1}/${total}</div>
      </div>
      <div class="card-media property-art" style="background-image:${property.image};">
        <span class="rarity-ribbon" style="color:${rarity.color}; border-color:${rarity.color};">${rarity.label}</span>
        <span class="media-placeholder-icon">📷</span>
      </div>
      <h4>${property.name}</h4>
      <div class="meta"><span>${property.area}</span><span>${property.distance}</span></div>
      <div class="stats-row">
        <div class="stat-block"><span class="label">Game Value</span><strong>${formatMoney(property.gameValue)}</strong></div>
        <div class="stat-block"><span class="label">Rent</span><strong>${formatMoney(property.baseRent)}</strong></div>
        <div class="stat-block"><span class="label">Yield</span><strong>${property.yield}%</strong></div>
      </div>
      <div class="resource-badges">
        <span>${property.category}</span>
        <span>Risk ${property.risk}</span>
      </div>
      <div class="desc">${property.description}</div>
      <div class="turn-actions single-action">
        <button class="buy-btn buy-btn-large" data-action="buy-property" data-id="${property.id}">Buy ${formatMoney(property.purchasePrice)}</button>
      </div>
      <div class="skip-stamp">Skip</div>
    `;
  }

  if (card.type === 'dice') {
    return `
      <div class="card-color-band dice-band">
        <div class="type-tag"><span class="type-icon">🎲</span><span>Dice Roll</span></div>
        <div class="turn-count">${index + 1}/${total}</div>
      </div>
      <div class="dice-card" style="padding-top: 10px;">
        <div class="dice-visual">
          <div class="dice" data-value="${state.game.lastRoll || 1}">
            <div class="dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
        <button class="roll-btn" data-action="roll-dice" ${card.rolled ? 'disabled' : ''}>${card.rolled ? 'Rolled!' : 'Roll Dice'}</button>
        <div class="roll-text">${card.rolled ? 'Swipe up to continue' : 'Odd = rent due • Even = bonus option'}</div>
      </div>
    `;
  }

  if (card.type === 'impulse') {
    const asset = createImpulseAssets()[(Math.random() * 8) | 0];
    return `
      <div class="card-color-band impulse-band">
        <div class="type-tag"><span class="type-icon">🛍️</span><span>Impulse Buy</span></div>
        <div class="turn-count">${index + 1}/${total}</div>
      </div>
      <div class="card-media impulse-art">
        <span class="media-placeholder-icon big">${asset.emoji}</span>
      </div>
      <h4>${asset.name}</h4>
      <div class="meta"><span>Price</span><span>${formatMoney(asset.price)}</span></div>
      <div class="stats-row">
        <div class="stat-block"><span class="label">Hype</span><strong>+${asset.popularity}%</strong></div>
        <div class="stat-block"><span class="label">Resale</span><strong>${formatMoney(asset.resale)}</strong></div>
        <div class="stat-block"><span class="label">Trend</span><strong>Mixed</strong></div>
      </div>
      <div class="turn-actions single-action">
        <button class="buy-btn buy-btn-large" data-action="buy-impulse" data-asset="${asset.id}">Buy ${formatMoney(asset.price)}</button>
      </div>
      <div class="skip-stamp">Skip</div>
    `;
  }

  if (card.type === 'chance') {
    const chance = card.chanceCard;
    return `
      <div class="card-color-band chance-band">
        <div class="type-tag"><span class="type-icon">🎴</span><span>Chance</span></div>
        <div class="turn-count">${index + 1}/${total}</div>
      </div>
      <div class="card-media chance-scene">
        <span class="big-icon">❔</span>
      </div>
      <h4>${chance.name}</h4>
      <div class="resource-badges"><span>${chance.type === 'KEEP' ? 'Keep card' : 'Instant event'}</span></div>
      <div class="desc">${chance.description}</div>
      <div class="turn-actions">
        <button class="buy-btn" data-action="reveal-chance">Continue</button>
      </div>
    `;
  }

  return '<div class="empty-state">Card unavailable.</div>';
}

function attachTurnCardInteractions(cardEl, card, index, total) {
  const actionButtons = cardEl.querySelectorAll('[data-action]');
  actionButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      clearIdleHint();
      const action = btn.dataset.action;
      if (action === 'buy-property') flashCardBought(cardEl, () => buyPropertyFromTurn(btn.dataset.id));
      if (action === 'roll-dice' && !btn.disabled) animateDiceRoll(cardEl, card, () => resolveDiceRoll(card));
      if (action === 'buy-impulse') flashCardBought(cardEl, () => buyImpulseAsset(btn.dataset.asset));
      if (action === 'reveal-chance') resolveChanceCard(index);
      event.stopPropagation();
    });
  });

  let drag = null;
  const skipStamp = cardEl.querySelector('.skip-stamp');

  cardEl.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    // Don't hijack taps on buttons (Buy/Roll/Continue) as drag gestures.
    if (event.target.closest('button')) return;
    clearIdleHint();
    cardEl.setPointerCapture(event.pointerId);
    cardEl.classList.add('dragging');
    drag = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0, diff: 0 };
  });

  cardEl.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    drag.velocity = (event.clientY - drag.lastY) / dt;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    drag.diff = event.clientY - drag.startY;
    const rotation = drag.diff / 26;
    cardEl.style.transform = `translateY(${drag.diff}px) rotate(${rotation}deg) scale(${1 - Math.min(Math.abs(drag.diff) / 3000, 0.06)})`;
    cardEl.style.opacity = String(1 - Math.min(Math.abs(drag.diff) / 500, 0.35));
    // Reveal the "Skip" stamp the further you drag upward, like Tinder's swipe stamps.
    if (skipStamp) {
      const progress = drag.diff < 0 ? Math.min(Math.abs(drag.diff) / 140, 1) : 0;
      skipStamp.style.opacity = String(progress);
      skipStamp.style.transform = `rotate(${-8 - progress * 4}deg) scale(${0.85 + progress * 0.25})`;
    }
  });

  function endDrag(event) {
    if (!drag) return;
    cardEl.classList.remove('dragging');
    if (event?.pointerId != null && cardEl.hasPointerCapture?.(event.pointerId)) {
      cardEl.releasePointerCapture(event.pointerId);
    }
    const diff = drag.diff || 0;
    const velocity = drag.velocity || 0;
    drag = null;
    const wantsSkip = diff < -60 || velocity < -0.55;
    const wantsBack = diff > 60 || velocity > 0.55;
    if (wantsSkip) {
      if (card.type === 'dice' && !card.rolled) {
        showToast('Roll the dice first!');
        haptic('warning');
        resetCardPosition(cardEl, index);
        return;
      }
      flyCardAway(cardEl, -1, () => advanceTurnCard());
    } else if (wantsBack) {
      flyCardAway(cardEl, 1, () => previousTurnCard());
    } else {
      resetCardPosition(cardEl, index);
    }
  }

  cardEl.addEventListener('pointerup', endDrag);
  cardEl.addEventListener('pointercancel', endDrag);
}

// Briefly tints the card green so buying a property/impulse item feels confirmed before it advances.
function flashCardBought(cardEl, onDone) {
  cardEl.classList.add('card-bought-flash');
  setTimeout(onDone, 360);
}

// Cycles the dice face rapidly, easing to a stop, before revealing the real roll result.
function animateDiceRoll(cardEl, card, onComplete) {
  const diceEl = cardEl.querySelector('.dice');
  const rollBtn = cardEl.querySelector('.roll-btn');
  if (!diceEl || diceEl.classList.contains('rolling')) return;
  if (rollBtn) rollBtn.disabled = true;
  diceEl.classList.add('rolling');
  haptic('soft');
  let ticks = 0;
  const maxTicks = 9;
  const tick = () => {
    ticks += 1;
    diceEl.dataset.value = String(1 + ((Math.random() * 6) | 0));
    if (ticks >= maxTicks) {
      diceEl.classList.remove('rolling');
      diceEl.classList.add('landed');
      setTimeout(() => diceEl.classList.remove('landed'), 420);
      onComplete();
      return;
    }
    setTimeout(tick, 60 + ticks * 14);
  };
  tick();
}

function flyCardAway(el, direction, onDone) {
  el.classList.add('flying');
  el.style.transition = 'transform 260ms cubic-bezier(.2,.7,.3,1), opacity 220ms ease';
  el.style.transform = `translateY(${direction * -130}%) rotate(${direction * -14}deg)`;
  el.style.opacity = '0';
  setTimeout(onDone, 220);
}

function resetCardPosition(el, index) {
  const activeIndex = state.game.turnIndex || 0;
  const offset = index - activeIndex;
  el.style.transition = 'transform 260ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease';
  el.style.transform = `translateY(${offset * 22}px) scale(${1 - offset * 0.055})`;
  el.style.opacity = '1';
  const skipStamp = el.querySelector('.skip-stamp');
  if (skipStamp) {
    skipStamp.style.opacity = '0';
  }
}

function advanceTurnCard() {
  const turnCount = (state.turnDeckCards || []).length;
  const nextIndex = (state.game.turnIndex || 0) + 1;
  if (nextIndex >= turnCount) {
    state.game.turnCompleted = true;
    saveState();
    renderTurn();
    return;
  }
  state.game.turnIndex = nextIndex;
  renderTurn();
}

function previousTurnCard() {
  state.game.turnIndex = Math.max((state.game.turnIndex || 0) - 1, 0);
  renderTurn();
}

function buyPropertyFromTurn(propertyId) {
  const property = getPropertyById(propertyId);
  const player = getCurrentPlayer();
  if (!property) return;
  if (property.ownerId) {
    showToast('This property is already owned.');
    return;
  }
  if (player.cash < property.purchasePrice) {
    showToast('Insufficient cash for this property.');
    haptic('warning');
    return;
  }

  player.cash -= property.purchasePrice;
  property.ownerId = player.id;
  player.properties.push(property.id);
  state.game.activity.unshift({
    id: uid('act'), text: `${player.name} bought ${property.name}`, icon: '🏠', time: 'now', color: COLORS[player.color]
  });
  showToast(`PROPERTY ACQUIRED`);
  haptic('medium');
  saveState();
  renderAll();
  setTimeout(() => advanceTurnCard(), 200);
}

function buyImpulseAsset(assetId) {
  const player = getCurrentPlayer();
  const assets = createImpulseAssets();
  const asset = assets.find((entry) => entry.id === assetId) || assets[0];
  if (player.cash < asset.price) {
    showToast('Not enough cash for this impulse buy.');
    haptic('warning');
    return;
  }
  player.cash -= asset.price;
  player.impulseAssets.push({ ...asset, currentValue: asset.resale, id: uid('impulse') });
  player.happiness = clamp(Number(player.happiness || 20) + asset.popularity, 0, 100);
  state.game.activity.unshift({ id: uid('act'), text: `${player.name} bought ${asset.name}`, icon: '🛍️', time: 'now', color: COLORS[player.color] });
  showToast(`HAPPINESS +${asset.popularity}%`);
  haptic('soft');
  saveState();
  renderAll();
  setTimeout(() => advanceTurnCard(), 260);
}

function resolveDiceRoll(card) {
  const player = getCurrentPlayer();
  const roll = (Math.random() * 6 + 1) | 0;
  state.game.lastRoll = roll;
  if (card) card.rolled = true;
  haptic('medium');

  if (roll % 2 === 1) {
    const candidates = state.game.players.filter((opponent) => opponent.id !== player.id && (opponent.properties || []).length > 0);
    const owner = candidates[(Math.random() * candidates.length) | 0] || state.game.players.find((item) => item.id !== player.id);
    const ownedProperties = owner.properties.map((propertyId) => getPropertyById(propertyId)).filter(Boolean);
    const property = ownedProperties[(Math.random() * ownedProperties.length) | 0] || state.game.properties.find((item) => item.ownerId === owner.id) || null;
    if (property) {
      const rentDue = Math.round(property.baseRent * (roll > 3 ? 1.15 : 1));
      player.cash -= rentDue;
      owner.cash += rentDue;
      state.game.activity.unshift({ id: uid('act'), text: `${player.name} paid ${formatMoney(rentDue)} rent to ${owner.name}`, icon: '💸', time: 'now', color: COLORS[player.color] });
      showToast(`YOU ROLLED ${roll} • RENT!`);
    }
  } else {
    const choice = Math.random() > 0.5 ? 'chance' : 'properties';
    if (choice === 'chance') {
      showToast('EVEN NUMBER! Draw a Chance card');
      appendChanceCard();
    } else {
      showToast('EVEN NUMBER! See 2 more properties');
      appendBonusProperties();
    }
  }

  saveState();
  renderAll();
}

function applyChanceEffect(card, player) {
  if (card.effect === 'cash-in') {
    player.cash += card.amount;
    showToast(`+${formatMoney(card.amount)}`);
  }
  if (card.effect === 'cash-out') {
    player.cash -= card.amount;
    showToast(`-${formatMoney(card.amount)}`);
  }
  if (card.type === 'KEEP') {
    player.savedCards.push(card);
    showToast('SAVED CARD +1');
  }
  if (card.effect === 'market-bonus' || card.effect === 'market-drop') {
    state.game.properties.forEach((property) => {
      if (property.ownerId === player.id) property.currentValue = property.currentValue * (1 + card.value / 100);
    });
    showToast(card.effect === 'market-bonus' ? 'Market Boom' : 'Market Downturn');
  }
  if (card.effect === 'community') {
    state.game.properties.forEach((property) => {
      if (property.ownerId === player.id && property.category === 'Commercial') property.currentValue *= 1 + card.value / 100;
    });
    showToast('Community Regeneration');
  }
  state.game.activity.unshift({ id: uid('act'), text: `${player.name} drew ${card.name}`, icon: '🎴', time: 'now', color: COLORS[player.color] });
}

// Inserts a real, swipeable Chance card into the deck instead of resolving it instantly.
function appendChanceCard() {
  const deck = state.game.chanceDeck;
  if (!deck.length) {
    showToast('No chance cards left.');
    return;
  }
  const chanceCard = deck.shift();
  const insertAt = (state.game.turnIndex || 0) + 1;
  state.turnDeckCards.splice(insertAt, 0, { type: 'chance', chanceCard });
  saveState();
  renderTurn();
}

function resolveChanceCard(index) {
  const turnCard = state.turnDeckCards[index];
  if (!turnCard || !turnCard.chanceCard) return;
  const player = getCurrentPlayer();
  applyChanceEffect(turnCard.chanceCard, player);
  saveState();
  renderAll();
  setTimeout(() => advanceTurnCard(), 220);
}

function appendBonusProperties() {
  const propertyPool = state.game.properties.filter((property) => property.ownerId === null);
  for (let i = 0; i < 2; i++) {
    const property = pickWeightedProperty(propertyPool);
    if (property) {
      state.turnDeckCards.push({ type: 'property', propertyId: property.id });
    }
  }
  state.game.turnIndex = Math.min((state.game.turnIndex || 0), (state.turnDeckCards.length || 1) - 1);
  saveState();
  renderTurn();
}

function renderPortfolio() {
  const portfolio = document.getElementById('view-portfolio');
  if (!state.game) {
    portfolio.innerHTML = '<div class="empty-state">No portfolio data.</div>';
    return;
  }
  const player = getCurrentPlayer();
  const propertyCards = (player.properties || []).map((propertyId) => getPropertyById(propertyId)).filter(Boolean);
  const totalValue = propertyCards.reduce((sum, property) => sum + property.currentValue, 0);
  const monthlyRent = propertyCards.reduce((sum, property) => sum + property.baseRent, 0);

  portfolio.innerHTML = `
    <div id="portfolio-content">
      <div class="portfolio-tabs">
        <button class="active" data-tab="properties">Properties</button>
        <button data-tab="impulse">Impulse Buys</button>
        <button data-tab="saved">Saved Cards</button>
      </div>

      <div class="metric-row">
        <div class="metric-box"><div class="label">Total Value</div><strong>${formatMoney(totalValue + player.cash)}</strong></div>
        <div class="metric-box"><div class="label">Monthly Rent</div><strong>${formatMoney(monthlyRent)}</strong></div>
      </div>
      <div class="metric-row">
        <div class="metric-box"><div class="label">Properties</div><strong>${propertyCards.length}</strong></div>
        <div class="metric-box"><div class="label">Yield</div><strong>${((monthlyRent / Math.max(totalValue + player.cash, 1)) * 100).toFixed(1)}%</strong></div>
      </div>

      <div class="property-list">
        ${propertyCards.length ? propertyCards.map((property) => `
          <div class="portfolio-item">
            <div class="thumb" style="background-image:${property.image};"></div>
            <div>
              <h4>${property.name}</h4>
              <div class="sub">${property.area}</div>
              <div class="sub">${property.tierLabel}</div>
            </div>
            <div class="item-actions">
              <button class="ghost-btn" data-property-detail="${property.id}">View</button>
              <button class="pill-btn" data-sell-property="${property.id}">Sell</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state">Your empire starts here. Buy your first property during your turn.</div>'}
      </div>
    </div>
  `;

  portfolio.querySelectorAll('[data-property-detail]').forEach((button) => {
    button.addEventListener('click', () => openPropertyDetail(button.dataset.propertyDetail));
  });
  portfolio.querySelectorAll('[data-sell-property]').forEach((button) => {
    button.addEventListener('click', () => sellProperty(button.dataset.sellProperty));
  });
}

function openPropertyDetail(propertyId) {
  const property = getPropertyById(propertyId);
  if (!property) return;
  const player = getCurrentPlayer();
  const modal = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="top">
          <strong>${property.name}</strong>
          <button type="button" class="ghost-btn" data-close-modal="true">Close</button>
        </div>
        <div class="modal-body">
          <div class="property-art" style="height: 180px; background-image:${property.image}; border-radius:16px; margin-bottom: 12px;"></div>
          <div class="stats-row">
            <div class="stat-block"><span class="label">Game Value</span><strong>${formatMoney(property.gameValue)}</strong></div>
            <div class="stat-block"><span class="label">Rent</span><strong>${formatMoney(property.baseRent)}</strong></div>
            <div class="stat-block"><span class="label">Yield</span><strong>${property.yield}%</strong></div>
          </div>
          <div class="desc" style="margin-top: 12px;">${property.description}</div>
          <div class="turn-actions" style="margin-top: 14px;">
            <button class="buy-btn" data-action="property-sell" data-id="${property.id}">Sell</button>
            <button class="skip-btn" data-action="property-offer" data-id="${property.id}">Make Offer</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modal;
  const close = document.querySelector('[data-close-modal]');
  if (close) close.addEventListener('click', () => document.getElementById('modal-root').innerHTML = '');
  document.querySelector('[data-action="property-sell"]')?.addEventListener('click', () => sellProperty(property.id));
  document.querySelector('[data-action="property-offer"]')?.addEventListener('click', () => openOfferBuilder(property.id));
}

function openOfferBuilder(propertyId) {
  const property = getPropertyById(propertyId);
  const currentPlayer = getCurrentPlayer();
  const vendor = state.game.players.find((p) => p.id === property.ownerId) || state.game.players[1];
  const modal = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="top"><strong>Make Offer</strong><button type="button" class="ghost-btn" data-close-modal="true">Close</button></div>
        <div class="modal-body">
          <div class="offer-builder">
            <div class="card-top"><div class="tier-badge" style="background:${property.tierColor};">${property.tierLabel}</div></div>
            <h4>${property.name}</h4>
            <div class="meta"><span>Owner: ${vendor.name}</span><span>${property.area}</span></div>
            <div class="amount-row">
              <div>Offer amount</div>
              <div class="amount-controls">
                <button type="button" data-decrease-offer="1">−</button>
                <strong id="offer-value">£2,000</strong>
                <button type="button" data-increase-offer="1">+</button>
              </div>
            </div>
            <div class="desc">Your cash after offer: ${formatMoney(currentPlayer.cash - 2000)}</div>
            <div class="turn-actions">
              <button class="buy-btn" data-submit-offer="${property.id}">Send Offer</button>
              <button class="skip-btn" data-close-modal="true">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modal;
  document.querySelector('[data-close-modal]').addEventListener('click', () => document.getElementById('modal-root').innerHTML = '');
  document.querySelector('[data-decrease-offer]').addEventListener('click', () => {
    const value = 2000;
    document.getElementById('offer-value').textContent = formatMoney(Math.max(500, value - 500));
  });
  document.querySelector('[data-increase-offer]').addEventListener('click', () => {
    const value = 2000;
    document.getElementById('offer-value').textContent = formatMoney(value + 500);
  });
  document.querySelector('[data-submit-offer]').addEventListener('click', () => {
    showToast('Offer sent');
    document.getElementById('modal-root').innerHTML = '';
  });
}

function sellProperty(propertyId) {
  const player = getCurrentPlayer();
  const property = getPropertyById(propertyId);
  if (!property) return;
  const saleValue = Math.round(property.currentValue * 0.88);
  player.cash += saleValue;
  property.ownerId = null;
  player.properties = player.properties.filter((id) => id !== propertyId);
  state.game.activity.unshift({ id: uid('act'), text: `${player.name} sold ${property.name} for ${formatMoney(saleValue)}`, icon: '💼', time: 'now', color: COLORS[player.color] });
  showToast(`Sold ${property.name}`);
  haptic('soft');
  saveState();
  renderAll();
}

function renderLeaderboard() {
  const leaderboard = document.getElementById('view-leaderboard');
  if (!state.game) {
    leaderboard.innerHTML = '<div class="empty-state">Leaderboard unavailable.</div>';
    return;
  }
  const players = [...state.game.players].sort((a, b) => getPlayerNetWorth(b) - getPlayerNetWorth(a));

  leaderboard.innerHTML = `
    <div class="leaderboard-card" style="padding:16px;">
      <h2 style="margin:0 0 14px;">Leaderboard</h2>
      <div class="leaderboard-list">
        ${players.map((player, index) => `
          <div class="leaderboard-item">
            <div class="rank-medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</div>
            <div class="player-mini">
              <div class="avatar" style="background:${COLORS[player.color]};">${AVATARS[0]}</div>
              <div>
                <strong>${player.name}</strong>
                <div class="sub">${player.properties.length} props</div>
              </div>
            </div>
            <strong>${formatMoney(getPlayerNetWorth(player))}</strong>
            <span>${index === 0 ? '↑12%' : index === 1 ? '↑8%' : '↑4%'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSettings() {
  const settings = document.getElementById('view-settings');
  settings.innerHTML = `
    <div class="settings-card">
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="setting-row"><span>Light</span><div class="switch ${state.settings.theme === 'light' ? 'on' : ''}"></div></div>
        <div class="setting-row"><span>Dark</span><div class="switch ${state.settings.theme === 'dark' ? 'on' : ''}"></div></div>
        <div class="setting-row"><span>System</span><div class="switch ${state.settings.theme === 'system' ? 'on' : ''}"></div></div>
      </div>
      <div class="settings-section">
        <h3>Sound</h3>
        <div class="setting-row"><span>Haptic feedback</span><div class="switch ${state.settings.haptics ? 'on' : ''}" data-toggle="haptics"></div></div>
        <div class="setting-row"><span>Reduced motion</span><div class="switch ${state.settings.reduceMotion ? 'on' : ''}" data-toggle="reduceMotion"></div></div>
      </div>
      <div class="settings-section">
        <h3>Game</h3>
        <div class="setting-row"><span>Difficulty</span><strong>${state.settings.difficulty || 'normal'}</strong></div>
        <div class="setting-row"><span>Local properties</span><strong>${state.settings.localProperties || 50}</strong></div>
        <div class="setting-row"><span>Location</span><strong>${state.settings.postcode ? state.settings.postcode.toUpperCase() : 'Sample data'}</strong></div>
      </div>
      <div class="settings-section">
        <h3>Danger Zone</h3>
        <button class="ghost-btn" id="reset-game-btn" style="width:100%; color: var(--danger); border-color: rgba(255,106,92,0.35);">Reset All &amp; Start Over</button>
      </div>
    </div>
  `;
  settings.querySelectorAll('[data-toggle]').forEach((switchEl) => {
    switchEl.addEventListener('click', () => {
      const key = switchEl.dataset.toggle;
      state.settings[key] = !state.settings[key];
      saveState();
      renderSettings();
    });
  });

  document.getElementById('reset-game-btn')?.addEventListener('click', confirmResetGame);
}

// Shows a themed confirmation modal instead of the browser's native confirm() dialog.
function confirmResetGame() {
  const modal = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="top"><strong>Reset All?</strong><button type="button" class="ghost-btn" data-close-modal="true">Cancel</button></div>
        <div class="modal-body">
          <div class="desc">This clears your profile, progress, settings and location, and takes you back to onboarding. This can't be undone.</div>
          <div class="turn-actions" style="margin-top: 14px;">
            <button class="buy-btn" id="confirm-reset-btn">Reset All</button>
            <button class="skip-btn" data-close-modal="true">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modal;
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => { document.getElementById('modal-root').innerHTML = ''; });
  });
  document.getElementById('confirm-reset-btn')?.addEventListener('click', resetGame);
}

// Wipes all saved progress and restarts onboarding from scratch.
function resetGame() {
  // Without this, the beforeunload handler would re-save the stale in-memory state
  // right back into localStorage before the reload actually happens.
  window.removeEventListener('beforeunload', saveState);
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function initializeApp() {
  hydrateState();
  if (!state.onboardingComplete) {
    createOnboardingStep();
    onboardingScreen.classList.remove('hidden');
    gameShell.classList.add('hidden');
  } else {
    onboardingScreen.classList.add('hidden');
    gameShell.classList.remove('hidden');
    if (!state.game) {
      state.game = buildDefaultGame(state.profile);
      state.turnDeckCards = generateTurnDeck();
    } else if (!state.turnDeckCards || state.turnDeckCards.length === 0) {
      state.turnDeckCards = generateTurnDeck();
    }
    renderAll();
  }

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  window.addEventListener('beforeunload', saveState);
}

initializeApp();
