/**
 * Auto-categorization utility using regex patterns
 * Based on category_patterns.json structure
 */

// Priority map for resolving conflicts when multiple categories match
const PRIORITY_MAP = {
  "Dairy": 90,
  "Poultry": 80,
  "Vegetables": 70,
  "Fruits": 70,
  "Dry Store": 100,
  "Packaging": 50,
  "Housekeeping": 40,
  "Misc": 10,
  "Unknown": 0
};

// Smart rules for common items (checked first for better accuracy)
const SMART_RULES = [
  { pattern: /\bbutter\b/i, category: "Dairy", subcategory: "Butter" },
  { pattern: /\bcheese\b/i, category: "Dairy", subcategory: "Cheese" },
  { pattern: /\bmilk\b|\bamul\b|\bnandini\b|\bgood life\b/i, category: "Dairy", subcategory: "Milk" },
  { pattern: /\bcurd\b|\bdahi\b|\byogurt\b|\byoghurt\b/i, category: "Dairy", subcategory: "Curd_Yogurt" },
  { pattern: /\bghee\b/i, category: "Dairy", subcategory: "Ghee" },
  { pattern: /\bpaneer\b/i, category: "Dairy", subcategory: "Paneer" },
  { pattern: /\btofu\b/i, category: "Dairy", subcategory: "Tofu" },
  { pattern: /\begg\b|\beggs\b|\btray\b/i, category: "Poultry", subcategory: "Eggs" },
  { pattern: /\bchicken\b|\bbreast\b|\bboneless\b|\bdrumstick\b/i, category: "Poultry", subcategory: "Chicken" },
  { pattern: /\btomato\b|\btomatoes\b/i, category: "Vegetables", subcategory: "Tomato" },
  { pattern: /\bonion\b/i, category: "Vegetables", subcategory: "Onion" },
  { pattern: /\bpotato\b/i, category: "Vegetables", subcategory: "Potato" },
  { pattern: /\bgarlic\b/i, category: "Vegetables", subcategory: "Garlic" },
  { pattern: /\bginger\b|\badrak\b/i, category: "Vegetables", subcategory: "Ginger" },
  { pattern: /\bcapsicum\b/i, category: "Vegetables", subcategory: "Capsicum" },
  { pattern: /\bmushroom\b/i, category: "Vegetables", subcategory: "Mushroom" },
  { pattern: /\blettuce\b/i, category: "Vegetables", subcategory: "Lettuce" },
  { pattern: /\bcoriander\b|\bkothmir\b/i, category: "Vegetables", subcategory: "Coriander" },
  { pattern: /\bbroccoli\b/i, category: "Vegetables", subcategory: "Broccoli" },
  { pattern: /\bcarrot\b|\bcarrots\b/i, category: "Vegetables", subcategory: "Carrot" },
  { pattern: /\bcucumber\b/i, category: "Vegetables", subcategory: "Cucumber" },
  { pattern: /\bchilli\b/i, category: "Vegetables", subcategory: "Chilli" },
  { pattern: /\bbeans\b/i, category: "Vegetables", subcategory: "Beans" },
  { pattern: /\bbanana\b|\bkela\b/i, category: "Fruits", subcategory: "Banana" },
  { pattern: /\bpapaya\b/i, category: "Fruits", subcategory: "Papaya" },
  { pattern: /\bwatermelon\b/i, category: "Fruits", subcategory: "Watermelon" },
  { pattern: /\bpineapple\b/i, category: "Fruits", subcategory: "Pineapple" },
  { pattern: /\bmango\b/i, category: "Fruits", subcategory: "Mango" },
  { pattern: /\bapple\b/i, category: "Fruits", subcategory: "Apple" },
  { pattern: /\blemon\b|\blime\b/i, category: "Fruits", subcategory: "Lemon" },
  { pattern: /\bmasala\b|\bspice\b|\bchilli powder\b|\bcoriander powder\b|\bturmeric\b|\bcumin\b|\bgaram masala\b/i, category: "Dry Store", subcategory: "Spices" },
  { pattern: /\bseasoning\b|\bpaprika\b|\boregano\b|\bherb mix\b|\bthyme\b/i, category: "Dry Store", subcategory: "Seasoning" },
  { pattern: /\brice\b|\bbasmati\b|\bbiryani\b/i, category: "Dry Store", subcategory: "Rice" },
  { pattern: /\batta\b|\bmaida\b|\bbesan\b|\bflour\b|\brava\b|\bpoha\b/i, category: "Dry Store", subcategory: "Flour" },
  { pattern: /\bdal\b|\blentil\b|\bchana\b|\brajma\b|\bmoong\b|\burad\b/i, category: "Dry Store", subcategory: "Pulses" },
  { pattern: /\boats\b/i, category: "Dry Store", subcategory: "Oats" },
  { pattern: /\bsauce\b|\bketchup\b|\bmayo\b|\bmayonnaise\b|\bsriracha\b|\bvinegar\b/i, category: "Dry Store", subcategory: "Sauces_Dressings" },
  { pattern: /\bjam\b|\bhoney\b|\bjaggery\b|\bpeanut butter\b/i, category: "Dry Store", subcategory: "Jams_Spreads" },
  { pattern: /\bpaste\b|\bginger garlic paste\b|\btomato paste\b/i, category: "Dry Store", subcategory: "Pastes" },
  { pattern: /\bsalt\b|\bsugar\b|\btamarind\b|\btea powder\b/i, category: "Dry Store", subcategory: "Essentials" },
  { pattern: /\bsoya\b/i, category: "Dry Store", subcategory: "soya" },
  { pattern: /\boil\b|\brefined oil\b|\bsunflower oil\b|\bolive oil\b/i, category: "Dry Store", subcategory: "Oils" },
  { pattern: /\bbread\b|\btortilla\b|\bbun\b|\bcake\b|\bpastry\b/i, category: "Dry Store", subcategory: "Bakery" },
  { pattern: /\bfrozen\b|\bfrench fries\b/i, category: "Dry Store", subcategory: "Frozen" },
  { pattern: /\bprawn\b|\bfish\b|\bsalmon\b|\bseafood\b/i, category: "Dry Store", subcategory: "Seafood" },
  { pattern: /\bjuice\b|\blassi\b|\bcoke\b|\bpepsi\b|\bsoda\b|\bwater bottle\b/i, category: "Dry Store", subcategory: "Beverages" },
  { pattern: /\bcashew\b|\balmond\b|\bpeanut\b|\bpistachio\b|\bwalnut\b|\braisin\b|\bdates\b/i, category: "Dry Store", subcategory: "Dry Fruits" },
  { pattern: /\bchia\b|\bsunflower seeds\b|\bflax\b|\bsesame\b/i, category: "Dry Store", subcategory: "Nuts_Seeds" },
  { pattern: /\bcontainer\b|\btray\b|\bbox\b/i, category: "Packaging", subcategory: "Containers" },
  { pattern: /\bspork\b|\bspoon\b|\bfork\b|\bknife\b|\bstraw\b/i, category: "Packaging", subcategory: "Cutlery" },
  { pattern: /\bbag\b|\bbags\b|\bpaper bag\b/i, category: "Packaging", subcategory: "Bags" },
  { pattern: /\btape\b|\bfoil\b|\bcling film\b/i, category: "Packaging", subcategory: "Tapes_Foils" },
  { pattern: /\bnapkin\b|\btissue\b|\bpaper towel\b|\bbutter paper\b/i, category: "Packaging", subcategory: "Paper_Wrapping" },
  { pattern: /\bcleaner\b|\bdetergent\b|\bdishwash\b|\bsanitizer\b|\bphenyl\b/i, category: "Housekeeping", subcategory: "Cleaners" },
  { pattern: /\bmop\b|\bbroom\b|\bbrush\b|\bscrubber\b|\bglove\b/i, category: "Housekeeping", subcategory: "Tools" },
  { pattern: /\bgarbage\b|\bdustbin\b|\btrash bag\b/i, category: "Housekeeping", subcategory: "Waste_Disposal" },
  { pattern: /\bhair net\b|\bapron\b|\bmask\b|\bcap\b/i, category: "Housekeeping", subcategory: "Personal_Protection" },
];

// Full category patterns from category_patterns.json
const CATEGORY_PATTERNS = {
  "Dairy": {
    "Paneer": /\bpaneer\b/i,
    "Milk": /\bmilk\b|\bnandini\b|\bamul\b|\bgood life\b/i,
    "Curd_Yogurt": /\bcurd\b|\bdahi\b|\byogurt\b|\byoghurt\b/i,
    "Butter": /\bbutter\b|\btable butter\b/i,
    "Cheese": /\bcheese\b|\bprocessed cheese\b/i,
    "Tofu": /\btofu\b/i,
    "Ghee": /\bghee\b/i
  },
  "Poultry": {
    "Eggs": /\begg\b|\beggs\b|\btray\b/i,
    "Chicken": /\bchicken\b|\bbreast\b|\bboneless\b|\bdrumstick\b/i
  },
  "Vegetables": {
    "Capsicum": /\bcapsicum\b|\bred capsicum\b|\byellow capsicum\b|\bgreen capsicum\b/i,
    "Tomato": /\btomato\b|\btomatoes\b/i,
    "Coriander": /\bcoriander\b|\bkothmir\b/i,
    "Lettuce": /\blettuce\b/i,
    "Mushroom": /\bmushroom\b/i,
    "Garlic": /\bgarlic\b|\bpeeled garlic\b|\bwhole garlic\b/i,
    "Ginger": /\bginger\b|\badrak\b/i,
    "Onion": /\bonion\b/i,
    "Potato": /\bpotato\b/i,
    "Broccoli": /\bbroccoli\b/i,
    "Chilli": /\bchilli\b/i,
    "Carrot": /\bcarrot\b|\bcarrots\b/i,
    "Beans": /\bbeans\b|\bgreen beans\b|\bfrench beans\b/i,
    "Cucumber": /\bcucumber\b/i,
    "Pumpkin": /\bpumpkin\b/i,
    "Beetroot": /\bbeetroot\b/i,
    "Okra": /\bokra\b|\bbhindi\b|\bladyfinger\b/i,
    "Leafy Vegs": /\bbasil\b|\bmint\b|\bpudina\b|\bparsley\b|\bdill\b|\bcelery\b|\bcurry leaves\b|\blemon grass\b|\bspinach\b/i,
    "Others": /\b(cabbage|zucchini|brinjal|eggplant|chow chow|cauliflower|lauki|bottle gourd|bitter gourd|karela|turnip|red cabbage)\b/i
  },
  "Fruits": {
    "Banana": /\bbanana\b|\bkela\b/i,
    "Papaya": /\bpapaya\b/i,
    "Watermelon": /\bwatermelon\b/i,
    "Pineapple": /\bpineapple\b/i,
    "Pomegranate": /\bpomegranate\b/i,
    "Mango": /\bmango\b/i,
    "Apple": /\bapple\b/i,
    "Kiwi": /\bkiwi\b/i,
    "Melon": /\bmusk melon\b|\bmelon\b/i,
    "Guava": /\bguava\b/i,
    "Lemon": /\blemon\b|\blime\b/i
  },
  "Dry Store": {
    "Rice": /\bbasmati\b|\bbiryani\b|\brice\b|\bwhite rice\b/i,
    "Flour": /\batta\b|\bmaida\b|\bbesan\b|\bragi flour\b|\bwheat flour\b|\bupma rava\b|\bvermicilli\b|\bpoha\b/i,
    "Pulses": /\b(chana|chickpea|kabuli|rajma|dal|lentil|moong|urad|cowpea|whitepeas|green moong dal|kandi pappu)\b/i,
    "Millets": /\b(millet|kutki|sama|ragi|bajra|jowar|barley)\b/i,
    "Oats": /\boats\b/i,
    "Spices": /\b(masala|spice|chhole|rajma masala|chilli powder|red chilli powder|coriander powder|cardamom|elachi|pepper|mdh|turmeric|cumin|garam masala|cinnamon|clove|rasam powder|sambar powder|whole jeera)\b/i,
    "Seasoning": /\b(seasoning|paprika|oregano|herb mix|dry basil|bay leaf|thyme|lemon seasoning|ajwain|Chilli Flakes)\b/i,
    "Dry Fruits": /\b(raisin|almond|cashew|peanut|pistachio|walnut|dates|apricot|fig|dry coconut|dry red chillies)\b/i,
    "Nuts_Seeds": /\b(chia|sunflower seeds|flax|sesame|melon seeds)\b/i,
    "Sauces_Dressings": /\b(barbeque|mayo|mayonnaise|sriracha|chipotle|sauce|ketchup|soya sauce|veeba|sweet onion|jalapeno|piri piri|garlic mayo|thai curry paste|vinegar|tomato sauce)\b/i,
    "Jams_Spreads": /\b(jam|fruit spread|peanut butter|choco spread|strawberry crush|honey|jaggery|brown sugar)\b/i,
    "Pastes": /\b(ginger garlic paste|tomato paste|coconut milk powder)\b/i,
    "Essentials": /\bsalt\b|\bsugar\b|\btamarind\b|\btea powder\b/i,
    "soya": /\bsoya chunks?\b|\bsoya beans\b/i,
    "Beverages": /\bjuice\b|\bfruit drink\b|\b(lassi|milkshake|flavored milk)\b|\b(coke|diet coke|pepsi|soda|cola)\b|\bwater bottle\b|\bmineral water\b/i,
    "Bakery": /\bbread\b|\bbrown bread\b|\btortilla\b|\bbun\b|\broll\b|\bcake\b|\bpastry\b|\bmuffin\b|\bsponge\b/i,
    "Seafood": /\bprawn\b|\bprawns\b|\bfish\b|\bfillet\b|\bsalmon\b|\bseabass\b/i,
    "Oils": /\boil\b|\brefined oil\b|\bcooking oil\b|\bsunflower oil\b|\bolive oil\b|\bpomace oil\b|\bpalmolein oil\b/i,
    "Frozen": /\bfrozen chicken\b|\bfrozen fish\b|\bfrozen prawn\b|\bfrozen\b|\bfrozen sweet corn\b|\bfrozen peas\b|\bfrench fries\b|\bcorn\b/i
  },
  "Packaging": {
    "Containers": /\bcontainer\b|\btray\b|\bpack of\b|\bbox\b|\b500ml rectangle\b|\b250ml round bowls\b/i,
    "Cutlery": /\b(spork|wooden spork|spoon|fork|knife|straw)\b/i,
    "Bags": /\bbag\b|\bbags\b|\bpaper bag\b/i,
    "Tapes_Foils": /\btape\b|\baluminium foil\b|\bcling film\b|\broll\b|\bfoil\b|\baluminium clovers\b/i,
    "Paper_Wrapping": /\b(kitchen paper|napkin|tissue|butter paper|wrapping paper|paper towel)\b/i
  },
  "Housekeeping": {
    "Cleaners": /\b(clean wrap|colin|cleaner|detcare|detergent|dishwash|surface|floor|toilet|bathroom|liquid soap|phenyl|sanitizer|disinfectant)\b/i,
    "Tools": /\b(mop|broom|brush|duster|cloth|kitchen cloth|scrubber|wiper|glove|hand gloves)\b/i,
    "Waste_Disposal": /\b(garbage bag|garbage cover|dustbin bag|trash bag)\b/i,
    "Personal_Protection": /\b(hair net|apron|mask|cap)\b/i,
    "Paper_Products": /\b(tissue|napkin|tissue roll|butter paper|paper towel)\b/i
  },
  "Misc": {
    "Delivery": /\b(delivery charges?|shipping|pay on delivery|freight)\b/i,
    "Other": /\b(miscellaneous|service charge)\b/i
  }
};

/**
 * Categorize an item based on its name/description
 * @param {string} itemName - The name or description of the item
 * @returns {{ category: string, subcategory: string }} - The matched category and subcategory
 */
export function categorizeItem(itemName) {
  if (!itemName || typeof itemName !== 'string') {
    return { category: 'Unknown', subcategory: 'Uncategorized' };
  }

  const desc = itemName.toLowerCase().trim();

  // First, try smart rules for common items (higher accuracy)
  for (const rule of SMART_RULES) {
    if (rule.pattern.test(desc)) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }

  // Then, try full pattern matching with priority
  const matches = [];

  for (const [category, subcats] of Object.entries(CATEGORY_PATTERNS)) {
    for (const [subcategory, regex] of Object.entries(subcats)) {
      if (regex.test(desc)) {
        matches.push({
          priority: PRIORITY_MAP[category] || 0,
          category,
          subcategory
        });
      }
    }
  }

  if (matches.length === 0) {
    return { category: 'Unknown', subcategory: 'Uncategorized' };
  }

  // Sort by priority (highest first) and return the best match
  matches.sort((a, b) => b.priority - a.priority);
  return { category: matches[0].category, subcategory: matches[0].subcategory };
}

/**
 * Get all available categories
 * @returns {string[]} - Array of category names
 */
export function getCategories() {
  return Object.keys(CATEGORY_PATTERNS);
}

/**
 * Get subcategories for a given category
 * @param {string} category - The category name
 * @returns {string[]} - Array of subcategory names
 */
export function getSubcategories(category) {
  return Object.keys(CATEGORY_PATTERNS[category] || {});
}

/**
 * Get all categories with their subcategories
 * @returns {Object} - Object with categories as keys and subcategory arrays as values
 */
export function getCategoryStructure() {
  const structure = {};
  for (const [category, subcats] of Object.entries(CATEGORY_PATTERNS)) {
    structure[category] = Object.keys(subcats);
  }
  return structure;
}

export default {
  categorizeItem,
  getCategories,
  getSubcategories,
  getCategoryStructure,
  PRIORITY_MAP
};
