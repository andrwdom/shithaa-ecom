export const checkoutSessionKey = 'checkout:sessionId';

export const getCheckoutSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(checkoutSessionKey);
};

export const setCheckoutSessionId = (id: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(checkoutSessionKey, id);
};

export const clearCheckoutSessionId = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(checkoutSessionKey);
};


