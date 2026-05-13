const DEFAULT_TAX_CATEGORIES = [
  { code: "general_merchandise", label: "General Merchandise" },
  { code: "groceries_unprepared_food", label: "Groceries (Unprepared Food)" },
  { code: "prepared_food_beverages", label: "Prepared Food & Beverages" },
  { code: "digital_products", label: "Digital Products" },
  { code: "other_custom", label: "Other / Custom" },
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object" && value.$numberDecimal != null) {
    return Number(value.$numberDecimal);
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

const normalizeTaxCategory = (category, index) => {
  if (!category || typeof category !== "object" || Array.isArray(category)) {
    throw new Error(`Tax category ${index + 1} is invalid`);
  }

  const code = String(category.code || "").trim();
  const label = String(category.label || "").trim();
  const rate = toNumber(category.rate);

  if (!code) {
    throw new Error(`Tax category ${index + 1} code is required`);
  }

  if (!label) {
    throw new Error(`Tax category ${index + 1} label is required`);
  }

  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error(`Tax category ${index + 1} rate must be between 0 and 100`);
  }

  return {
    code,
    label,
    rate,
  };
};

const normalizeTaxSettingsInput = (payload = {}) => {
  const enabled =
    payload.enabled !== undefined
      ? Boolean(payload.enabled)
      : true;

  const incomingCategories = Array.isArray(payload.categories)
    ? payload.categories
    : [];

  if (incomingCategories.length === 0) {
    throw new Error("At least one tax category rate is required");
  }

  const categories = incomingCategories.map((category, index) =>
    normalizeTaxCategory(category, index)
  );

  const uniqueCodes = new Set();
  for (const category of categories) {
    if (uniqueCodes.has(category.code)) {
      throw new Error(`Duplicate tax category code '${category.code}' is not allowed`);
    }
    uniqueCodes.add(category.code);
  }

  return {
    enabled,
    categories,
  };
};

const serializeTaxSettings = (businessDoc) => {
  const registeredState =
    businessDoc?.registeredState ??
    businessDoc?.address?.state ??
    null;
  const settings = businessDoc?.taxSettings || {};

  return {
    enabled: Boolean(settings.enabled),
    registeredState,
    categories:
      Array.isArray(settings.categories) && settings.categories.length > 0
        ? settings.categories.map((category) => ({
            code: category.code,
            label: category.label,
            rate: Number(category.rate || 0),
          }))
        : DEFAULT_TAX_CATEGORIES.map((category) => ({
            ...category,
            rate: 0,
          })),
    availableCategories: DEFAULT_TAX_CATEGORIES,
  };
};

const roundCurrency = (value) => {
  if (!Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(2));
};

const getResolvedTaxCategory = (productDoc) => {
  if (productDoc?.taxCategory?.code && productDoc?.taxCategory?.label) {
    return {
      code: String(productDoc.taxCategory.code),
      label: String(productDoc.taxCategory.label),
    };
  }

  return null;
};

const getTaxRateForCategory = (taxSettings, taxCategory) => {
  if (!taxSettings?.enabled || !taxCategory?.code) {
    return 0;
  }

  const match = Array.isArray(taxSettings.categories)
    ? taxSettings.categories.find(
        (category) => String(category.code) === String(taxCategory.code)
      )
    : null;

  return match ? Number(match.rate || 0) : 0;
};

const buildTaxAwareAmounts = ({ priceExclTax, salePriceExclTax, taxRate }) => {
  const normalizedTaxRate = Number.isFinite(Number(taxRate))
    ? Number(taxRate)
    : 0;
  const priceBase = toNumber(priceExclTax);
  const saleBase = toNumber(salePriceExclTax);

  const priceInclTax = Number.isFinite(priceBase)
    ? roundCurrency(priceBase * (1 + normalizedTaxRate / 100))
    : null;
  const salePriceInclTax = Number.isFinite(saleBase)
    ? roundCurrency(saleBase * (1 + normalizedTaxRate / 100))
    : null;

  return {
    taxIncluded: true,
    taxRate: normalizedTaxRate,
    priceExclTax: Number.isFinite(priceBase) ? roundCurrency(priceBase) : null,
    priceInclTax,
    salePriceExclTax: Number.isFinite(saleBase) ? roundCurrency(saleBase) : null,
    salePriceInclTax,
  };
};

const extractTaxFromInclusiveAmount = ({ inclusiveAmount, taxRate }) => {
  const inclusive = toNumber(inclusiveAmount);
  const rate = Number.isFinite(Number(taxRate)) ? Number(taxRate) : 0;

  if (!Number.isFinite(inclusive) || inclusive < 0) {
    return {
      amountExclTax: 0,
      taxAmount: 0,
      amountInclTax: 0,
    };
  }

  if (!rate) {
    return {
      amountExclTax: roundCurrency(inclusive),
      taxAmount: 0,
      amountInclTax: roundCurrency(inclusive),
    };
  }

  const amountExclTax = roundCurrency(inclusive / (1 + rate / 100));
  const taxAmount = roundCurrency(inclusive - amountExclTax);

  return {
    amountExclTax,
    taxAmount,
    amountInclTax: roundCurrency(inclusive),
  };
};

module.exports = {
  DEFAULT_TAX_CATEGORIES,
  normalizeTaxSettingsInput,
  serializeTaxSettings,
  getResolvedTaxCategory,
  getTaxRateForCategory,
  buildTaxAwareAmounts,
  extractTaxFromInclusiveAmount,
  roundCurrency,
};
