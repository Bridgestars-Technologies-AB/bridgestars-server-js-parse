// +─────────────────────+──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────+
// | Status              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              |
// +─────────────────────+──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────+
// | trialing            | The subscription is currently in a trial period and it’s safe to provision your product for your customer. The subscription transitions automatically to active when the first payment is made.                                                                                                                                                                                                                                                          |
// | active              | The subscription is in good standing and the most recent payment is successful. It’s safe to provision your product for your customer.                                                                                                                                                                                                                                                                                                                   |
// | incomplete          | A successful payment needs to be made within 23 hours to activate the subscription. Or the payment requires action, like customer authentication. Read more about payments that require action. Subscriptions can also be incomplete if there’s a pending payment. In that case, the invoice status would be open_payment_pending and the PaymentIntent status would be processing.                                                                      |
// | incomplete_expired  | The initial payment on the subscription failed and no successful payment was made within 23 hours of creating the subscription. These subscriptions don’t bill customers. This status exists so you can track customers that failed to activate their subscriptions.                                                                                                                                                                                     |
// | past_due            | Payment on the latest finalized invoice either failed or wasn’t attempted. The subscription continues to create invoices. Your subscription settings determine the subscription’s next state. If the invoice is still unpaid after all Smart Retries have been attempted, you can configure the subscription to move to canceled, unpaid, or leave it as past_due. To move the subscription to active, pay the most recent invoice before its due date.  |
// | canceled            | The subscription has been canceled. During cancellation, automatic collection for all unpaid invoices is disabled (auto_advance=false). This is a terminal state that can’t be updated.                                                                                                                                                                                                                                                                  |
// | unpaid              | The latest invoice hasn’t been paid but the subscription remains in place. The latest invoice remains open and invoices continue to be generated but payments aren’t attempted. You should revoke access to your product when the subscription is unpaid since payments were already attempted and retried when it was past_due. To move the subscription to active, pay the most recent invoice before its due date.                                    |
// +─────────────────────+──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────+
import Stripe from 'stripe';
import stripe from './stripeConfig';
import 'parse/node';
import { isLocalDatastoreEnabled } from 'parse/node';

async function hmm(event: Stripe.Event) {

}

async function getCustomerId(user: Parse.User|string) {
    // const customer = new Parse.Query('Customer').equalTo('user', user).first({ useMasterKey: true })
    if(typeof user !== 'string') user = user.id;
    const cus = await new Parse.Query('Customer')
        .equalTo('user', user)
        .first({ useMasterKey: true })

    if (cus) return cus.get('cus_id');
    else return null;
}

async function createCustomer(user: Parse.User) {
    const customer = new Parse.Object('Customer');
    customer.set('user', user.id);

    let name = user.get('first') + ' ' + user.get('last');
    if (name === ' ') name = user.get('dispName');

    const stripeCustomer = await stripe.customers.create({
        email: user.getEmail(),
        name: user.get('name'),
        metadata: {
            id: user.id,
        }
    })
    customer.set('cus_id', stripeCustomer.id);
    await customer.save(null, { useMasterKey: true })
    return stripeCustomer.id;
}

async function userHasSubscription(user: Parse.User, subscriptionId: string) {
    const subs = user.get("subscriptions")
    return subs && subs.includes(subscriptionId)
}

async function createSubscription(customer: string | Parse.Object, metadata: any): Promise<string | null> {
    if (typeof customer !== 'string') customer = customer.get('cus_id') as string
    if (!customer) throw new Error('No customer ID provided');
    // The price ID passed from the client
    //   const {priceId} = req.body;
    const priceId = 'price_1MQnhkDC8iBT4qcEw5Sbmgzk';
    //expire time now + 1h
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        customer: customer,
        metadata: { ...metadata },
        locale: 'auto',
        custom_text: {
            // Adds message above the "Start trial" button
            // submit: {message: 'Subscribe to ' + metadata.courseId},
        },
        subscription_data: {
            // description: 'Subscription to ' + metadata.courseId,
            metadata: { ...metadata },
            trial_period_days: 7,
        },
        expires_at: Math.round(Date.now() / 1000) + 60 * 60,
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url: 'https://bridgestars.net/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://bridgestars.net/failure',
    });
    return session.url;
    // Redirect to the URL returned on the Checkout Session.
    // With express, you can redirect with:
    //   res.redirect(303, session.url);
    //   res.redirect(303, session.url);
}

async function getSubscriptionDashboardUrl(cus_id: string) {
    const session = await stripe.billingPortal.sessions.create({
        customer: cus_id,
        return_url: 'https://bridgestars.net/back',
    });
    return session.url;
}


export default { hmm, createSubscription, getCustomerId, createCustomer, userHasSubscription, getSubscriptionDashboardUrl }