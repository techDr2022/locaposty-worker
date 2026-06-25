export interface CallToActionOption {
  value: string;
  label: string;
}

export const CALL_TO_ACTION_OPTIONS: CallToActionOption[] = [
  { value: "NONE", label: "No Button" },
  { value: "BOOK", label: "Book" },
  { value: "ORDER", label: "Order" },
  { value: "SHOP", label: "Shop" },
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "CALL_NOW", label: "Call Now" },
  { value: "GET_DIRECTIONS", label: "Get Directions" },
];

export function callToActionRequiresUrl(
  callToAction: string | null | undefined,
): boolean {
  return Boolean(
    callToAction && callToAction !== "NONE" && callToAction !== "CALL_NOW",
  );
}

export const ACTION_TYPE_MAP: Record<string, string> = {
  LEARN_MORE: "LEARN_MORE",
  BOOK: "BOOK",
  ORDER: "ORDER",
  SHOP: "BUY",
  SIGN_UP: "SIGN_UP",
  CALL_NOW: "CALL",
  GET_DIRECTIONS: "DIRECTIONS",
};
