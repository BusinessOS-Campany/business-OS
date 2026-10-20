-- Add lat/lng to Store table for merchant location-based shipping
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10,7);
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lng" DECIMAL(10,7);
