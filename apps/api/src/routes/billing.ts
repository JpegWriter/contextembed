/**
 * Billing Routes (Stripe Integration)
 * 
 * Handles subscription management via Stripe.
 */

import { Router, type IRouter, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { subscriptionRepository, workspaceRepository } from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ensureWorkspaceForUser, getWorkspaceEntitlements } from '../services/workspace';

export const billingRouter: IRouter = Router();

// ============================================
// Stripe Client
// ============================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Price IDs (configure in Stripe Dashboard)
const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
  agency: process.env.STRIPE_PRICE_AGENCY || 'price_agency_monthly',
};

// ============================================
// Get Billing Status
// ============================================

billingRouter.get('/status', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  // Ensure workspace exists
  const ws = await ensureWorkspaceForUser(userId);
  const entitlements = await getWorkspaceEntitlements(ws.workspaceId);
  
  const subscription = await subscriptionRepository.findByWorkspaceId(ws.workspaceId);
  
  res.json({
    workspaceId: ws.workspaceId,
    plan: entitlements.plan,
    status: entitlements.status,
    isPaid: entitlements.isPaid,
    currentPeriodEnd: entitlements.currentPeriodEnd,
    entitlements: {
      retentionHours: entitlements.retentionHours,
      maxProjects: entitlements.maxProjects,
      maxAssetsPerProject: entitlements.maxAssetsPerProject,
      webPackEnabled: entitlements.webPackEnabled,
    },
    hasStripeCustomer: Boolean(subscription?.stripeCustomerId),
  });
}));

// ============================================
// Create Checkout Session
// ============================================

const CheckoutSchema = z.object({
  plan: z.enum(['pro', 'agency']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

billingRouter.post('/checkout', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { plan, successUrl, cancelUrl } = CheckoutSchema.parse(req.body);
  
  // Ensure workspace exists
  const ws = await ensureWorkspaceForUser(userId);
  const workspaceId = ws.workspaceId;
  
  // Get or create Stripe customer
  let subscription = await subscriptionRepository.findByWorkspaceId(workspaceId);
  let customerId = subscription?.stripeCustomerId;
  
  if (!customerId) {
    // Get user email for customer creation
    const workspace = await workspaceRepository.findById(workspaceId);
    
    const customer = await stripe.customers.create({
      metadata: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    });
    
    customerId = customer.id;
    await subscriptionRepository.upsert(workspaceId, {
      stripeCustomerId: customerId,
    });
  }
  
  // Get price ID for plan
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    throw createApiError(`Invalid plan: ${plan}`, 400);
  }
  
  // Create checkout session
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${appUrl}/dashboard?billing=success`,
    cancel_url: cancelUrl || `${appUrl}/dashboard?billing=cancel`,
    metadata: {
      workspace_id: workspaceId,
      user_id: userId,
      plan,
    },
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
        user_id: userId,
        plan,
      },
    },
  });
  
  res.json({
    url: session.url,
    sessionId: session.id,
  });
}));

// ============================================
// Customer Portal
// ============================================

billingRouter.post('/portal', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  // Ensure workspace exists
  const ws = await ensureWorkspaceForUser(userId);
  const subscription = await subscriptionRepository.findByWorkspaceId(ws.workspaceId);
  
  if (!subscription?.stripeCustomerId) {
    throw createApiError('No billing account found. Subscribe first.', 400);
  }
  
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings`,
  });
  
  res.json({
    url: session.url,
  });
}));

// ============================================
// Stripe Webhook Handler
// ============================================

// Note: This route needs raw body parsing (configured in main app)
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!sig || !webhookSecret) {
    console.error('Missing Stripe webhook signature or secret');
    res.status(400).send('Webhook signature missing');
    return;
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }
  
  console.log(`[Stripe Webhook] Received event: ${event.type}`);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// ============================================
// Webhook Handlers
// ============================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspace_id;
  const plan = session.metadata?.plan as 'pro' | 'agency' | undefined;
  const subscriptionId = session.subscription as string;
  
  if (!workspaceId) {
    console.error('[Stripe] Checkout session missing workspace_id metadata');
    return;
  }
  
  // Fetch full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await subscriptionRepository.upsert(workspaceId, {
    stripeSubscriptionId: subscriptionId,
    status: mapStripeStatus(subscription.status),
    plan: plan || 'pro',
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  });
  
  console.log(`[Stripe] Checkout complete for workspace ${workspaceId}, plan: ${plan}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Try to find workspace by subscription ID first
  let dbSubscription = await subscriptionRepository.findByStripeSubscriptionId(subscription.id);
  
  // Fall back to customer ID
  if (!dbSubscription && subscription.customer) {
    dbSubscription = await subscriptionRepository.findByStripeCustomerId(
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    );
  }
  
  if (!dbSubscription) {
    console.error('[Stripe] Subscription update for unknown subscription:', subscription.id);
    return;
  }
  
  // Extract plan from metadata or price lookup
  let plan = subscription.metadata?.plan as 'pro' | 'agency' | undefined;
  if (!plan) {
    // Try to determine from price ID
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === PRICE_IDS.agency) {
      plan = 'agency';
    } else if (priceId === PRICE_IDS.pro) {
      plan = 'pro';
    }
  }
  
  await subscriptionRepository.update(dbSubscription.workspaceId, {
    stripeSubscriptionId: subscription.id,
    status: mapStripeStatus(subscription.status),
    plan: plan || dbSubscription.plan as 'free' | 'pro' | 'agency',
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  });
  
  console.log(`[Stripe] Subscription updated for workspace ${dbSubscription.workspaceId}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  let dbSubscription = await subscriptionRepository.findByStripeSubscriptionId(subscription.id);
  
  if (!dbSubscription && subscription.customer) {
    dbSubscription = await subscriptionRepository.findByStripeCustomerId(
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    );
  }
  
  if (!dbSubscription) {
    console.error('[Stripe] Subscription deleted for unknown subscription:', subscription.id);
    return;
  }
  
  // Downgrade to free
  await subscriptionRepository.update(dbSubscription.workspaceId, {
    status: 'canceled',
    plan: 'free',
    currentPeriodEnd: null,
  });
  
  console.log(`[Stripe] Subscription canceled for workspace ${dbSubscription.workspaceId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  
  if (!customerId) return;
  
  const dbSubscription = await subscriptionRepository.findByStripeCustomerId(customerId);
  
  if (!dbSubscription) {
    console.error('[Stripe] Payment failed for unknown customer:', customerId);
    return;
  }
  
  await subscriptionRepository.update(dbSubscription.workspaceId, {
    status: 'past_due',
  });
  
  console.log(`[Stripe] Payment failed for workspace ${dbSubscription.workspaceId}`);
}

// ============================================
// Helpers
// ============================================

function mapStripeStatus(status: Stripe.Subscription.Status): 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'inactive';
  }
}
