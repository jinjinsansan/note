import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export const getStripeClient = () => {
  if (cachedStripe) {
    return cachedStripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  cachedStripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });

  return cachedStripe;
};
