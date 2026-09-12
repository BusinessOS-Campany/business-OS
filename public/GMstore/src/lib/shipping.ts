const SHIPPING_COST = 500;

export function calculateShippingCost(_params?: { subtotal?: number; lat?: number; lng?: number; storeLat?: number; storeLng?: number }): number {
  return SHIPPING_COST;
}

export function getFreeShippingThreshold(): number | null {
  return null;
}
