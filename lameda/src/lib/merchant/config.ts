/**
 * Merchant configuration system.
 *
 * Each merchant has a business_type that drives sensible defaults, and a
 * merchant_config JSONB column for per-merchant overrides. This module
 * owns the mapping from business_type → defaults and exposes helpers
 * used by the AI layer and conversation handlers.
 *
 * ADDING A NEW BUSINESS TYPE:
 *   1. Add the value to the business_type enum in migration 008.
 *   2. Add a DEFAULTS entry here.
 *   3. Update the CLASSIFIER_CONTEXT and RESPONDER_CONTEXT templates
 *      in classify.ts and respond.ts if the new type needs specific prompt guidance.
 */

export type BusinessType = 'fashion' | 'food' | 'electronics' | 'beauty' | 'services' | 'general'

export interface MerchantConfig {
  businessType: BusinessType

  // ---- Product language ----
  /** Singular label for a product ("item", "dish", "service", "device") */
  productLabel: string
  /** Plural label for a product ("items", "dishes", etc.) */
  productLabelPlural: string
  /** Label for the full catalog ("catalog", "menu", "services") */
  catalogLabel: string

  // ---- Variant behavior ----
  /** Whether products have size/color variants (false for food, services) */
  hasVariants: boolean
  /** Custom labels for the variant dimensions */
  variantLabels: { size: string; color: string }

  // ---- Order behavior ----
  /** Whether a shopping cart is used (false for appointment-only services) */
  hasCart: boolean
  /** Whether home delivery is offered */
  hasDelivery: boolean
  /** Whether customer pickup is offered */
  hasPickup: boolean
}

// ----------------------------------------------------------------
// Defaults per business type
// ----------------------------------------------------------------

const DEFAULTS: Record<BusinessType, MerchantConfig> = {
  fashion: {
    businessType: 'fashion',
    productLabel: 'item',
    productLabelPlural: 'items',
    catalogLabel: 'catalog',
    hasVariants: true,
    variantLabels: { size: 'Size', color: 'Color' },
    hasCart: true,
    hasDelivery: true,
    hasPickup: true,
  },
  food: {
    businessType: 'food',
    productLabel: 'dish',
    productLabelPlural: 'dishes',
    catalogLabel: 'menu',
    hasVariants: false,
    variantLabels: { size: 'Portion', color: 'Variant' },
    hasCart: true,
    hasDelivery: true,
    hasPickup: true,
  },
  electronics: {
    businessType: 'electronics',
    productLabel: 'device',
    productLabelPlural: 'devices',
    catalogLabel: 'catalog',
    hasVariants: false,
    variantLabels: { size: 'Storage', color: 'Color' },
    hasCart: true,
    hasDelivery: true,
    hasPickup: true,
  },
  beauty: {
    businessType: 'beauty',
    productLabel: 'product',
    productLabelPlural: 'products',
    catalogLabel: 'catalog',
    hasVariants: false,
    variantLabels: { size: 'Size', color: 'Shade' },
    hasCart: true,
    hasDelivery: true,
    hasPickup: true,
  },
  services: {
    businessType: 'services',
    productLabel: 'service',
    productLabelPlural: 'services',
    catalogLabel: 'services',
    hasVariants: false,
    variantLabels: { size: 'Option', color: 'Variant' },
    hasCart: false,
    hasDelivery: false,
    hasPickup: true,
  },
  general: {
    businessType: 'general',
    productLabel: 'item',
    productLabelPlural: 'items',
    catalogLabel: 'catalog',
    hasVariants: false,
    variantLabels: { size: 'Size', color: 'Color' },
    hasCart: true,
    hasDelivery: true,
    hasPickup: true,
  },
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Returns the resolved MerchantConfig for a merchant.
 * JSONB overrides from merchant_config are merged on top of business_type defaults.
 */
export function getMerchantConfig(
  businessType: BusinessType,
  overrides?: Partial<MerchantConfig>,
): MerchantConfig {
  return { ...DEFAULTS[businessType], ...(overrides ?? {}) }
}

/**
 * Builds a compact one-paragraph context string injected into AI system prompts.
 * Tells Claude what kind of business this is so it uses correct terminology and
 * does not suggest fashion-specific things (sizes, colors) to a food merchant.
 */
export function buildMerchantContext(config: MerchantConfig): string {
  const parts: string[] = [
    `This bot serves a ${config.businessType} business in Nigeria.`,
    `Products are called "${config.productLabelPlural}". The catalog is called the "${config.catalogLabel}".`,
  ]

  if (config.hasVariants) {
    parts.push(`Products may have ${config.variantLabels.size.toLowerCase()} and ${config.variantLabels.color.toLowerCase()} variants.`)
  } else {
    parts.push(`Products do not have size or color variants.`)
  }

  if (!config.hasCart) {
    parts.push(`This business does not use a shopping cart — customers inquire or book directly.`)
  }

  if (!config.hasDelivery) {
    parts.push(`Delivery is not available — customers collect in person.`)
  }

  return parts.join(' ')
}
