export type TemplateOption = {
  id: string
  name: string
  theme: string
  domain: string
  libraryLabel?: "NEW" | "DISCOUNT" | "REDUCED"
  description: string
  audience: string
  tone: string
  priceUsd?: number
  accentA: string
  accentB: string
  surface: string
  ctaBg: string
  ctaText: string
  heroImage: string
  dishOneImage: string
  dishTwoImage: string
}

export type TemplateEditorData = {
  restaurantName: string
  subjectLine: string
  preheader: string
  headline: string
  subheadline: string
  ctaText: string
  heroImage: string
  offerTitle: string
  offerDescription: string
  dishOneTitle: string
  dishOneDescription: string
  dishTwoTitle: string
  dishTwoDescription: string
  footerNote: string
}

export const templateOptions: TemplateOption[] = [
  {
    id: "sushi-omakase-signature",
    name: "Sushi Omakase Signature",
    theme: "Sushi",
    domain: "Food & Beverage",
    libraryLabel: "NEW",
    description: "Clean Japanese editorial design with omakase storytelling, premium pairings, and reservation urgency.",
    audience: "Urban gourmets",
    tone: "Refined + calm",
    priceUsd: 29,
    accentA: "#0f172a",
    accentB: "#14b8a6",
    surface: "#ecfeff",
    ctaBg: "#0f172a",
    ctaText: "#ecfeff",
    heroImage: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "burger-street-social",
    name: "Burger Street Social",
    theme: "Burger place",
    domain: "Food & Beverage",
    libraryLabel: "DISCOUNT",
    description: "Bold conversion-focused layout with social proof, combo offer blocks, and high-energy visuals.",
    audience: "Lunch + dinner crowd",
    tone: "Bold + playful",
    priceUsd: 19,
    accentA: "#7c2d12",
    accentB: "#f97316",
    surface: "#fff7ed",
    ctaBg: "#7c2d12",
    ctaText: "#fff7ed",
    heroImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1549611016-3a70d82b5040?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "vegan-garden-journal",
    name: "Vegan Garden Journal",
    theme: "Vegan",
    domain: "Food & Beverage",
    libraryLabel: "REDUCED",
    description: "Fresh botanical aesthetic with nutrient-forward copy, colorful bowls, and wellness-centered messaging.",
    audience: "Health-focused subscribers",
    tone: "Fresh + uplifting",
    priceUsd: 24,
    accentA: "#14532d",
    accentB: "#22c55e",
    surface: "#f0fdf4",
    ctaBg: "#14532d",
    ctaText: "#f0fdf4",
    heroImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fine-cuisine-grand-soiree",
    name: "Fine Cuisine Grand Soiree",
    theme: "Fine cuisine",
    domain: "Food & Beverage",
    description: "Luxury editorial template with chef narrative, plated-course highlights, and elevated visual hierarchy.",
    audience: "VIP and special occasions",
    tone: "Elegant + exclusive",
    priceUsd: 39,
    accentA: "#1f2937",
    accentB: "#a16207",
    surface: "#fefce8",
    ctaBg: "#111827",
    ctaText: "#fefce8",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "saas-growth-launchpad",
    name: "SaaS Growth Launchpad",
    theme: "Product update",
    domain: "SaaS",
    libraryLabel: "NEW",
    description: "Feature launch template with activation copy, onboarding highlights, and conversion-first CTA blocks.",
    audience: "Trial users and admins",
    tone: "Clean + strategic",
    priceUsd: 34,
    accentA: "#0b1020",
    accentB: "#2563eb",
    surface: "#eff6ff",
    ctaBg: "#1d4ed8",
    ctaText: "#eff6ff",
    heroImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "real-estate-open-house",
    name: "Real Estate Open House",
    theme: "Listing showcase",
    domain: "Real Estate",
    description: "Property-first visual template with listing highlights, social proof, and booking slots.",
    audience: "Buyers and investors",
    tone: "Premium + trustworthy",
    priceUsd: 49,
    accentA: "#1f2937",
    accentB: "#0ea5e9",
    surface: "#f8fafc",
    ctaBg: "#111827",
    ctaText: "#f8fafc",
    heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fitness-membership-push",
    name: "Fitness Membership Push",
    theme: "Gym membership",
    domain: "Fitness",
    description: "High-energy campaign template for trials, class schedules, and member success stories.",
    audience: "Leads and active members",
    tone: "Energetic + motivating",
    priceUsd: 22,
    accentA: "#111827",
    accentB: "#ef4444",
    surface: "#fff1f2",
    ctaBg: "#b91c1c",
    ctaText: "#fff1f2",
    heroImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "travel-boutique-escape",
    name: "Travel Boutique Escape",
    theme: "Destination offer",
    domain: "Travel",
    description: "Editorial travel newsletter for curated escapes, seasonal offers, and concierge-style booking.",
    audience: "Luxury travelers",
    tone: "Aspirational + warm",
    priceUsd: 44,
    accentA: "#0f172a",
    accentB: "#0891b2",
    surface: "#ecfeff",
    ctaBg: "#155e75",
    ctaText: "#ecfeff",
    heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "clinic-care-update",
    name: "Clinic Care Update",
    theme: "Healthcare reminder",
    domain: "Healthcare",
    description: "Patient-first layout for appointment reminders, preventive care, and trust-focused messaging.",
    audience: "Patients and families",
    tone: "Clear + caring",
    accentA: "#134e4a",
    accentB: "#14b8a6",
    surface: "#f0fdfa",
    ctaBg: "#115e59",
    ctaText: "#f0fdfa",
    heroImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1580281657525-47f249e8f4df?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "course-enrollment-drive",
    name: "Course Enrollment Drive",
    theme: "Education admissions",
    domain: "Education",
    description: "Structured course newsletter with curriculum highlights, deadlines, and educator credentials.",
    audience: "Students and parents",
    tone: "Helpful + confident",
    priceUsd: 27,
    accentA: "#1e3a8a",
    accentB: "#3b82f6",
    surface: "#eff6ff",
    ctaBg: "#1d4ed8",
    ctaText: "#eff6ff",
    heroImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fashion-drop-editorial",
    name: "Fashion Drop Editorial",
    theme: "E-commerce launch",
    domain: "E-commerce",
    description: "Product drop template with lookbook feel, urgency cues, and bundle merchandising sections.",
    audience: "Shoppers and VIP list",
    tone: "Modern + bold",
    priceUsd: 31,
    accentA: "#27272a",
    accentB: "#f43f5e",
    surface: "#fff1f2",
    ctaBg: "#be123c",
    ctaText: "#fff1f2",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "wellness-spa-exclusive",
    name: "Wellness Spa Exclusive",
    theme: "Beauty and wellness",
    domain: "Wellness",
    description: "Calm spa campaign for ritual bundles, seasonal treatments, and loyalty offers.",
    audience: "Returning customers",
    tone: "Serene + premium",
    priceUsd: 26,
    accentA: "#4c1d95",
    accentB: "#c084fc",
    surface: "#faf5ff",
    ctaBg: "#6d28d9",
    ctaText: "#faf5ff",
    heroImage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80",
  },
]

function toTitleCase(input: string) {
  return input
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ")
}

export function buildEditorData(prompt: string, template: TemplateOption): TemplateEditorData {
  const cleanedPrompt = prompt ? toTitleCase(prompt.replace(/^newsletter for\s*/i, "")) : ""

  if (template.id === "sushi-omakase-signature") {
    const restaurantName = cleanedPrompt || "Sakura Omakase Atelier"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | New Omakase Experience`,
      preheader: "18-seat omakase counter, seasonal fish arrivals, and sake pairing flights.",
      headline: "Tonight's Omakase Is Now Open",
      subheadline:
        "Our chef presents a 14-course progression with line-caught fish, premium rice, and a new curated sake pairing for a limited number of guests.",
      ctaText: "Reserve Omakase Seats",
      heroImage: template.heroImage,
      offerTitle: "Seasonal tasting spotlight",
      offerDescription:
        "Reserve before Thursday and enjoy a complimentary opening course featuring toro and yuzu ponzu.",
      dishOneTitle: "Otoro Nigiri",
      dishOneDescription: "Bluefin otoro with aged soy and fresh wasabi shaved tableside.",
      dishTwoTitle: "Hokkaido Uni Bowl",
      dishTwoDescription: "Hokkaido uni, ikura pearls, and warm sushi rice with citrus zest.",
      footerNote: `You're receiving this from ${restaurantName}. Dietary requests are welcome with your booking.`,
    }
  }

  if (template.id === "burger-street-social") {
    const restaurantName = cleanedPrompt || "Flame House Burgers"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Smash Combo Week`,
      preheader: "Double smash stacks, truffle fries, and one-week-only combo pricing.",
      headline: "Big Flavor. Fast Pickup.",
      subheadline:
        "Our best-selling burger lineup is back with loaded sides, house sauces, and 20-minute pickup windows across peak dinner hours.",
      ctaText: "Claim Combo Offer",
      heroImage: template.heroImage,
      offerTitle: "Street combo spotlight",
      offerDescription:
        "Order before 8:00 PM and get a free signature milkshake on every double-smash combo.",
      dishOneTitle: "Double Smash Deluxe",
      dishOneDescription: "Two aged-beef patties, smoked cheddar, pickles, and flame sauce.",
      dishTwoTitle: "Crispy Chicken Stack",
      dishTwoDescription: "Buttermilk chicken, slaw, and chili honey on a toasted brioche bun.",
      footerNote: `You're receiving this from ${restaurantName}. Manage your preferences anytime from your account settings.`,
    }
  }

  if (template.id === "vegan-garden-journal") {
    const restaurantName = cleanedPrompt || "Verdant Table Kitchen"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Fresh Seasonal Bowls`,
      preheader: "Plant-forward seasonal plates, vibrant bowls, and chef-crafted wellness options.",
      headline: "Fresh, Colorful, Fully Plant-Based",
      subheadline:
        "This week's menu balances bold protein bowls, cold-pressed pairings, and rich sauces crafted from peak seasonal produce.",
      ctaText: "Book A Table",
      heroImage: template.heroImage,
      offerTitle: "Wellness tasting menu",
      offerDescription:
        "Reserve by Friday and enjoy a complimentary adaptogen tonic with any dinner tasting set.",
      dishOneTitle: "Green Goddess Bowl",
      dishOneDescription: "Quinoa, roasted broccoli, avocado, pistachio crunch, and herb dressing.",
      dishTwoTitle: "Smoked Carrot Tartare",
      dishTwoDescription: "Smoked carrots, capers, rye crisps, and lemon-cashew cream.",
      footerNote: `You're receiving this from ${restaurantName}. Preferences and dietary notes can be updated in your profile.`,
    }
  }

  if (template.id === "fine-cuisine-grand-soiree") {
    const restaurantName = cleanedPrompt || "Maison Ciel"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Grand Chef's Table`,
      preheader: "A five-course luxury tasting with curated wine pairing and limited reservations.",
      headline: "An Evening of Fine Culinary Craft",
      subheadline:
        "Experience our new chef's table menu featuring refined French techniques, rare ingredients, and an elegant pacing from amuse-bouche to dessert.",
      ctaText: "Request Your Table",
      heroImage: template.heroImage,
      offerTitle: "Chef's grand degustation",
      offerDescription: "Reserve your table before Sunday to receive an exclusive sommelier pairing upgrade.",
      dishOneTitle: "Truffle Celeriac Veloute",
      dishOneDescription: "Silky celeriac veloute with black truffle shavings and hazelnut oil.",
      dishTwoTitle: "Butter-Poached Lobster",
      dishTwoDescription: "Atlantic lobster with saffron beurre blanc and charred leeks.",
      footerNote: `You're receiving this from ${restaurantName}. Concierge support is available for private dining requests.`,
    }
  }

  const companyName = cleanedPrompt || `${template.domain} Studio`

  if (template.domain === "SaaS") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | Product Update`,
      preheader: "New release highlights, adoption insights, and rollout notes for your team.",
      headline: "Ship Faster With Better Visibility",
      subheadline:
        "We just launched improvements to reporting, team workflows, and automation controls so your ops can move faster with fewer blockers.",
      ctaText: "View Release Notes",
      heroImage: template.heroImage,
      offerTitle: "What's new this month",
      offerDescription: "See major features, bug fixes, and migration details designed for smoother adoption.",
      dishOneTitle: "Workflow Automations",
      dishOneDescription: "Save setup time with reusable templates and role-based controls.",
      dishTwoTitle: "Live KPI Reports",
      dishTwoDescription: "Track campaign and team metrics in one dashboard.",
      footerNote: `You're receiving this update from ${companyName}. Manage product notifications in account settings.`,
    }
  }

  if (template.domain === "Real Estate") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | Featured Property Release`,
      preheader: "New listings, private open-house slots, and market highlights.",
      headline: "A New Address Worth Touring",
      subheadline:
        "Explore premium listings, updated pricing insights, and open-house windows curated for your buying preferences.",
      ctaText: "Book A Visit",
      heroImage: template.heroImage,
      offerTitle: "Top listing spotlight",
      offerDescription: "Reserve an early viewing slot and receive a custom financing scenario preview.",
      dishOneTitle: "City Penthouse",
      dishOneDescription: "Panoramic terrace, concierge access, and premium finishes.",
      dishTwoTitle: "Family Residence",
      dishTwoDescription: "Spacious layout, garden-facing lot, and school proximity.",
      footerNote: `You're receiving this from ${companyName}. Reply to this email for a private tour request.`,
    }
  }

  if (template.domain === "Fitness") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | New Training Cycle`,
      preheader: "Class schedules, coach picks, and limited-time membership perks.",
      headline: "Train Smarter This Week",
      subheadline:
        "Join our updated strength and conditioning tracks with coach-led plans tailored to your goals and schedule.",
      ctaText: "Start Free Trial",
      heroImage: template.heroImage,
      offerTitle: "Membership boost offer",
      offerDescription: "Enroll this week and get two free performance coaching sessions.",
      dishOneTitle: "HIIT Performance Block",
      dishOneDescription: "Short, high-impact classes designed for measurable progress.",
      dishTwoTitle: "Strength Foundations",
      dishTwoDescription: "Coach-guided lifting tracks for every experience level.",
      footerNote: `You're receiving this from ${companyName}. Update workout preferences from your member profile.`,
    }
  }

  if (template.domain === "Travel") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | Curated Escape Offers`,
      preheader: "New destinations, travel windows, and concierge-level itinerary ideas.",
      headline: "Your Next Escape Is Ready",
      subheadline:
        "Discover handpicked destinations and seasonal packages designed for memorable stays and smooth planning.",
      ctaText: "Plan My Trip",
      heroImage: template.heroImage,
      offerTitle: "Seasonal destination picks",
      offerDescription: "Secure preferred rates and personalized itinerary planning this week.",
      dishOneTitle: "Coastal Retreat",
      dishOneDescription: "Boutique suites with private beach access and sunset dining.",
      dishTwoTitle: "Mountain Hideaway",
      dishTwoDescription: "Wellness-focused lodging with guided local experiences.",
      footerNote: `You're receiving this from ${companyName}. Reply for a custom travel brief.`,
    }
  }

  if (template.domain === "Healthcare") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | Care Reminder`,
      preheader: "Appointments, preventive checklists, and care updates for your household.",
      headline: "Preventive Care Made Simple",
      subheadline:
        "Review upcoming appointment availability and care reminders to keep your health plan on track.",
      ctaText: "Schedule Visit",
      heroImage: template.heroImage,
      offerTitle: "Priority booking window",
      offerDescription: "Book this week for expanded appointment slots and reduced wait times.",
      dishOneTitle: "Annual Checkups",
      dishOneDescription: "Fast scheduling for routine screenings and health plans.",
      dishTwoTitle: "Family Care Services",
      dishTwoDescription: "Integrated support for pediatrics, adults, and senior care.",
      footerNote: `You're receiving this from ${companyName}. Contact us for support updating your records.`,
    }
  }

  if (template.domain === "Education") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | Enrollment Window Open`,
      preheader: "Program highlights, intake deadlines, and scholarship opportunities.",
      headline: "Enrollment Is Now Open",
      subheadline:
        "Explore program tracks, faculty highlights, and admissions milestones so you can plan your next step confidently.",
      ctaText: "Apply Now",
      heroImage: template.heroImage,
      offerTitle: "Admissions timeline",
      offerDescription: "Submit your application this month to secure priority onboarding support.",
      dishOneTitle: "Career-Focused Tracks",
      dishOneDescription: "Job-aligned modules designed with industry mentors.",
      dishTwoTitle: "Flexible Learning Paths",
      dishTwoDescription: "Mix self-paced and guided formats around your schedule.",
      footerNote: `You're receiving this from ${companyName}. Manage admissions notifications in your profile.`,
    }
  }

  if (template.domain === "E-commerce") {
    return {
      restaurantName: companyName,
      subjectLine: `${companyName} | New Drop Live`,
      preheader: "Limited stock arrivals, curated bundles, and early access perks.",
      headline: "The New Collection Just Dropped",
      subheadline:
        "Shop the latest pieces, discover curated bundles, and secure top picks before they sell out.",
      ctaText: "Shop The Drop",
      heroImage: template.heroImage,
      offerTitle: "VIP launch access",
      offerDescription: "Claim early access pricing and free shipping on qualifying bundles.",
      dishOneTitle: "Signature Essentials",
      dishOneDescription: "High-demand staples with premium materials and finishes.",
      dishTwoTitle: "Limited Edition Picks",
      dishTwoDescription: "Exclusive seasonal items available while stock lasts.",
      footerNote: `You're receiving this from ${companyName}. Update your shopping preferences anytime.`,
    }
  }

  return {
    restaurantName: companyName,
    subjectLine: `${companyName} | Weekly Highlights`,
    preheader: "Fresh updates, featured offers, and curated recommendations.",
    headline: "Your Weekly Highlights",
    subheadline:
      "Discover what's new this week and explore curated recommendations built for your audience and growth goals.",
    ctaText: "Explore Updates",
    heroImage: template.heroImage,
    offerTitle: "Featured update",
    offerDescription: "Review curated updates and activate the next campaign action in minutes.",
    dishOneTitle: "Top Recommendation",
    dishOneDescription: "A quick-win offer designed for high engagement and conversion.",
    dishTwoTitle: "Second Highlight",
    dishTwoDescription: "Support your campaign with fresh social proof and clear CTA hierarchy.",
    footerNote: `You're receiving this from ${companyName}. Manage communication preferences from your account settings.`,
  }
}
