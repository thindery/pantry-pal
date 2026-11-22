/**
 * Region and country detection helpers for privacy and consent compliance.
 * Handles ISO-3166-1 alpha-2 country codes for EEA, UK, and Switzerland.
 */

export const EEA_UK_CH_COUNTRIES = new Set([
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czechia
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IE", // Ireland
  "IT", // Italy
  "LV", // Latvia
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "NL", // Netherlands
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
  "IS", // Iceland (EEA)
  "LI", // Liechtenstein (EEA)
  "NO", // Norway (EEA)
  "GB", // United Kingdom
  "CH", // Switzerland
]);

export function isEeaCountry(countryCode?: string | null): boolean {
  if (!countryCode) return false;
  return EEA_UK_CH_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export function getRegionFromCountry(countryCode?: string | null): "eea" | "other" {
  return isEeaCountry(countryCode) ? "eea" : "other";
}
