import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const screenWidth = width;
export const screenHeight = height;

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function localizedName(product, locale) {
  return locale === "en" && product?.nameEn ? product.nameEn : product?.name || "";
}
