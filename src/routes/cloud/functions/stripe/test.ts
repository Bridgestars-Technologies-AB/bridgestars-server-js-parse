import Stripe from 'stripe';
import stripe from './stripeConfig';

async function CreateSessionAndPayment() {
    // The price ID passed from the client
    //   const {priceId} = req.body;
    const priceId = '{{PRICE_ID}}';

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url: 'https://example.com/success.html?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/canceled.html',
    });

    // Redirect to the URL returned on the Checkout Session.
    // With express, you can redirect with:
    //   res.redirect(303, session.url);
    //   res.redirect(303, session.url);
}

async function Portal(){
    //this can be done form cli or dashboard
    const configuration = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: 'Cactus Practice partners with Stripe for simplified billing.',
        },
        features: {invoice_history: {enabled: true}},
      });

    //then create a session and send to the authenticated user
    const session = await stripe.billingPortal.sessions.create({
        customer: '{{CUSTOMER_ID}}',
        return_url: 'https://example.com/account',
    })
    // session.url is the url to send the user to
}