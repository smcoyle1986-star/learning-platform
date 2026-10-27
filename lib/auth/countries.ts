export const FALLBACK_COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "New Zealand", "Ireland", "Singapore", "South Korea", "Japan", "China", "Taiwan", "Hong Kong", "Thailand", "Vietnam", "Malaysia", "Philippines", "Indonesia", "India", "Pakistan", "Bangladesh", "Nepal", "Sri Lanka", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Turkey", "France", "Germany", "Spain", "Italy", "Portugal", "Netherlands", "Belgium", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czechia", "Austria", "Switzerland", "Greece", "Hungary", "Romania", "Bulgaria", "Ukraine", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "South Africa", "Egypt", "Morocco", "Nigeria", "Kenya",
] as const;

export function getCountryRegionOptions() {
  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

  return Array.from(new Set(FALLBACK_COUNTRIES
    .map((value) => displayNames && /^[A-Z]{2}$/.test(value) ? displayNames.of(value) || value : value)
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

export function isValidCountryRegion(value: string) {
  return getCountryRegionOptions().includes(value);
}
