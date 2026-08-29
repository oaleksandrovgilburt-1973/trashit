import type { Request, Response } from "express";
import Stripe from "stripe";
import { getSubscriptionByStripeId, updateSubscriptionStripe, cancelSubscription } from "./db";

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error("Stripe webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return res.status(500).send("Webhook not configured");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.metadata?.payment_type === "subscription") {
          const internalSubId = parseInt(session.metadata.subscription_id, 10);
          const autoRenew = session.metadata.auto_renew === "true";
          const stripeSubId = session.subscription as string;

          if (stripeSubId && internalSubId) {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
            await updateSubscriptionStripe(internalSubId, {
              stripeSubscriptionId: stripeSubId,
              currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
              status: "active",
              autoRenew,
            });

            // If client opted out of auto-renew, tell Stripe to cancel at period end
            if (!autoRenew) {
              await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
            }
            // Record partner earning, if this subscription was linked to a promo code
            if (session.metadata?.promo_code_id) {
              const { recordPartnerEarningIfApplicable } = await import("./routers");
              await recordPartnerEarningIfApplicable({
                userOpenId: session.metadata.user_open_id,
                promoCodeId: parseInt(session.metadata.promo_code_id),
                grossAmount: (session.amount_total ?? 0) / 100,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await getSubscriptionByStripeId(stripeSub.id);
        if (sub) {
          let status: "active" | "cancelled" | "expired" = "active";
          if (stripeSub.status === "canceled" || stripeSub.status === "unpaid") status = "expired";
          else if (stripeSub.status === "active" || stripeSub.status === "trialing") status = "active";
          await updateSubscriptionStripe(sub.id, {
            status,
            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await getSubscriptionByStripeId(stripeSub.id);
        if (sub) {
          await cancelSubscription(sub.id, "Отказан от Stripe (край на периода или анулиран)");
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook handler error:", err.message);
    res.status(500).send("Webhook handler failed");
  }
}