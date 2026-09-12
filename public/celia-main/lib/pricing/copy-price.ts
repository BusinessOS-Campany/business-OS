/**
 * Copy pricing rule: price per GB of copied data, editable by admins
 * from the copy price settings page. Used to compute `copyRecords.price`
 * from `copyRecords.sizeGB`.
 */
export const DEFAULT_COPY_PRICE_PER_GB = 30;

export function computeCopyPrice(sizeGB: number, pricePerGB: number): number {
  return sizeGB * pricePerGB;
}
