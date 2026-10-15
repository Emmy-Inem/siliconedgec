export type Region = "uk" | "europe";

export interface CityLocation {
  slug: string;
  city: string;
  country: string;
  region: Region;
  timezone: string;
  intro: string;
  sectors: string[];
  /** Only true where Silicon Edge has a real registered address. */
  hasOffice?: boolean;
}

/** Real business details. Do not invent offices for other cities. */
export const BUSINESS = {
  name: "Silicon Edge Consulting",
  street: "3rd Floor, 86-90 Paul Street",
  locality: "London",
  postalCode: "EC2A 4NE",
  country: "GB",
  phone: "+447741247592",
  email: "admin@siliconedgec.com",
  url: "https://siliconedgec.com",
};

export const LOCATIONS: CityLocation[] = [
  { slug: "london", city: "London", country: "United Kingdom", region: "uk", timezone: "GMT/BST", hasOffice: true,
    intro: "Our London base on Paul Street serves learners and teams across the capital with live, instructor-led cloud training scheduled around UK working hours.",
    sectors: ["Financial services", "Fintech", "Media", "Public sector"] },
  { slug: "manchester", city: "Manchester", country: "United Kingdom", region: "uk", timezone: "GMT/BST",
    intro: "Learners in Manchester join our live online cohorts in UK time, building hands-on Azure, AWS and DevOps skills without commuting.",
    sectors: ["Digital agencies", "Media", "Retail", "Healthcare"] },
  { slug: "birmingham", city: "Birmingham", country: "United Kingdom", region: "uk", timezone: "GMT/BST",
    intro: "Birmingham professionals can retrain or upskill in cloud engineering through live online sessions held in UK time, with project feedback from mentors.",
    sectors: ["Professional services", "Manufacturing", "Banking", "Public sector"] },
  { slug: "leeds", city: "Leeds", country: "United Kingdom", region: "uk", timezone: "GMT/BST",
    intro: "Leeds learners join live online cloud and data cohorts scheduled in UK time, finishing with portfolio projects they can show employers.",
    sectors: ["Financial services", "Healthcare", "Legal", "Digital"] },
  { slug: "glasgow", city: "Glasgow", country: "United Kingdom", region: "uk", timezone: "GMT/BST",
    intro: "Glasgow professionals take part in our live online cloud training in UK time, with recordings available for missed sessions.",
    sectors: ["Energy", "Financial services", "Engineering", "Public sector"] },
  { slug: "edinburgh", city: "Edinburgh", country: "United Kingdom", region: "uk", timezone: "GMT/BST",
    intro: "Edinburgh learners build practical cloud, DevOps and data skills through live online cohorts held in UK time.",
    sectors: ["Financial services", "Tech start-ups", "Universities", "Public sector"] },
  { slug: "dublin", city: "Dublin", country: "Ireland", region: "europe", timezone: "GMT/IST",
    intro: "Dublin shares UK time, so learners there join our live online cloud cohorts at the same hours as our UK students.",
    sectors: ["Technology", "Financial services", "Pharma", "Data centres"] },
  { slug: "amsterdam", city: "Amsterdam", country: "Netherlands", region: "europe", timezone: "CET/CEST",
    intro: "Learners in Amsterdam join our live online cloud training, with sessions one hour behind local time and recordings for every class.",
    sectors: ["Technology", "Logistics", "Fintech", "E-commerce"] },
  { slug: "berlin", city: "Berlin", country: "Germany", region: "europe", timezone: "CET/CEST",
    intro: "Berlin professionals take our English-language live online cloud and DevOps cohorts, with hands-on labs and mentor feedback.",
    sectors: ["Start-ups", "E-commerce", "Mobility", "Software"] },
  { slug: "paris", city: "Paris", country: "France", region: "europe", timezone: "CET/CEST",
    intro: "English-speaking learners in Paris join our live online cloud cohorts, building Azure, AWS and DevOps projects for their portfolio.",
    sectors: ["Banking", "Luxury and retail", "Consulting", "Software"] },
  { slug: "lisbon", city: "Lisbon", country: "Portugal", region: "europe", timezone: "WET/WEST",
    intro: "Lisbon shares UK time, so learners there attend our live online cloud training at the same hours as our UK cohorts.",
    sectors: ["Tech hubs", "Shared services", "Tourism tech", "Start-ups"] },
];

export const getLocation = (slug?: string) => LOCATIONS.find((l) => l.slug === slug);
