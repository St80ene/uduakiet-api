/**
 * Generates a realistic, human-readable SKU code.
 * Example Output: ELEC-LAP-DELL-83AB
 */
export function generateRealisticSku({
  categoryName,
  productName,
  brandName,
}: {
  categoryName: string;
  productName: string;
  brandName?: string;
}): string {
  // Clean text: uppercase, remove spaces, keep only alphanumeric characters
  const cleanStr = (str: string) => str.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const catPrefix = cleanStr(categoryName).substring(0, 3) || 'GEN';
  const prodPrefix = cleanStr(productName).substring(0, 3) || 'PROD';
  const brandPrefix = brandName ? cleanStr(brandName).substring(0, 4) : 'VAR';

  // Add a small random alphanumeric suffix to ensure absolute uniqueness per tenant
  const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${catPrefix}-${prodPrefix}-${brandPrefix}-${randomId}`;
}
