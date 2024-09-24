import constants from "../../../../constants";
import Stripe from "stripe";
import stripe from "./stripeConfig"

import { sendEmail } from '../../../../mail-adapter';
import { useVoucher, expirePendingVoucherUse } from "../voucher";
import subscription from "./subscription";
// const endpointSecret = "whsec_15ae3c5b347e0a5c9f5de94397eb528643ff0b73cf4a98da5d757d8985267194"
const endpointSecret = "whsec_Mm7X1oXGUHqaXxdyUWQSkndoRzlnSRcS";

async function sendErrorEmail(event: Stripe.Event, error: string) {
    const data = {
        from: 'Backend Error Notifier <info@bridgestars.net>',
        to: 'bridgestarstechnologies@gmail.com',
        subject: 'Error in Stripe Webhook',
        text: '',
        html: error + "<br><br>Event type: " + event.type
    }
    // await sendEmail(data);
    return new Error(error);
}

export default async function StripeWebhook(req) {
    console.log("STRIPE WEBHOOK");

    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
        // console.log(req.body);
        // console.log(sig);
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err: any) {
        throw `Webhook Error: ${err.message}`;
    }

    // Handle the event
    // https://stripe.com/docs/billing/subscriptions/webhooks
    switch (event.type) {
        case 'customer.created': {
            console.log('customer.created')
            const customer = event.data.object;
            // Sent when a Customer is successfully created.
            // if customer exists on db nice, otherwise create

            const metadata = customer['metadata'];
            if (!metadata)
                await sendErrorEmail(event, 'No metadata provided');
            const userId = metadata["id"];
            if (!userId) throw await sendErrorEmail(event, 'No user ID provided');

            //query
            const cus = await new Parse.Query('Customer')
                .equalTo('cus_id', customer['id'])
                .first({ useMasterKey: true });

            if (cus) {
                console.log('Customer already exists');
                //  update something?
                return;
            }
            else {

                const cus = await subscription.getCustomerId(new Parse.User({ id: userId }))
                if (cus != customer['id']) {
                    throw await sendErrorEmail(event, 'Multiple customers created for same user');
                }
                //Create new customer on database
                await new Parse.Object('Customer')
                    .save({ cus_id: customer['id'], user: userId }, { useMasterKey: true })
            }


            // Then define and call a function to handle the event customer.created
            break;
        }
        case 'customer.subscription.created': {
            console.log('customer.subscription.created')
            const subscription = event.data.object;
            // Sent when the subscription is created. The subscription status
            // may be incomplete if customer authentication is required to
            // complete the payment or if you set payment_behavior to
            // default_incomplete. For more details, read about subscription
            // payment behavior.

            const metadata = subscription['metadata'];
            if (!metadata)
                throw await sendErrorEmail(event, 'No metadata provided');

            switch (metadata['type']) {
                case 'education':
                    const course = metadata['courseId']
                    const user = metadata['userId']
                    if (!course || !user)
                        throw await sendErrorEmail(event, 'Invalid metadata provided, missing parameters. \n' + JSON.stringify(metadata));
                    const sub = new Parse.Object("Subscription");

                    console.log('Saving subscription');

                    await sub.save({
                        user: user,
                        name: "education",
                        status: subscription['status'],
                        sub_id: subscription['id'],
                        cus_id: subscription['customer'],
                        start_date: new Date(subscription['start_date']*1e3),
                        trial_end: new Date(subscription['trial_end']*1e3),
                        current_period_end: new Date(subscription['current_period_end']*1e3),
                    }, { useMasterKey: true })
                    break;

                default:
                    throw await sendErrorEmail(event, 'Invalid subscription type: ' + metadata['type'])
                    break;
            }
            // Then define and call a function to handle the event customer.subscription.created
            break;
        }
        case 'customer.subscription.deleted': {
            console.log('customer.subscription.deleted')
            const subscription = event.data.object;
            // Sent when a customer’s subscription ends.

            const metadata = subscription['metadata'];
            if (!metadata)
                await sendErrorEmail(event, 'No metadata provided');

            const sub = await new Parse.Query('Subscription')
                .equalTo('sub_id', subscription['id'])
                .first({ useMasterKey: true });
            if (sub)
                sub.destroy({ useMasterKey: true }); //will handle side effects of this

            // Then define and call a function to handle the event customer.subscription.deleted
            break;
        }
        // case 'customer.subscription.trial_will_end': {
        //     console.log('customer.subscription.trial_will_end')
        //     const subscription = event.data.object;
        //     //  Sent three days before the trial period ends. If the trial is less than
        //     //  three days, this event is triggered.

        //     // DO NOTHING YET AT LEAST

        //     // Then define and call a function to handle the event customer.subscription.trial_will_end
        //     break;
        // }
        case 'customer.subscription.updated': {
            console.log('customer.subscription.updated')
            const subscription = event.data.object;
            // Sent when the subscription is successfully started, after the payment is
            // confirmed. Also sent whenever a subscription is changed. For example, adding
            // a coupon, applying a discount, adding an invoice item, and changing plans all
            // trigger this event.

            //UPDATE SUBSCRIPTIO           
            const metadata = subscription['metadata'];
            if (!metadata)
                throw await sendErrorEmail(event, 'No metadata provided');

            switch (metadata['type']) {
                case 'education':
                    const course = metadata['courseId']
                    const user = metadata['userId']
                    if (!course || !user)
                        throw await sendErrorEmail(event, 'Invalid metadata provided, missing parameters. \n' + JSON.stringify(metadata));
                    //try to find subscription
                    let sub = await new Parse.Query('Subscription')
                        .equalTo("sub_id", subscription['id'])
                        .first({ useMasterKey: true });

                    if(!sub) sub = new Parse.Object("Subscription");

                    console.log('Updating subscription');

                    await sub.save({
                        user: user,
                        name: "education",
                        status: subscription['status'],
                        sub_id: subscription['id'],
                        cus_id: subscription['customer'],
                        start_date: new Date(subscription['start_date']*1e3),
                        trial_end: new Date(subscription['trial_end']*1e3),
                        current_period_end: new Date(subscription['current_period_end']*1e3),
                    }, { useMasterKey: true })
                    break;

                default:
                    throw await sendErrorEmail(event, 'Invalid subscription type: ' + metadata['type'])

                    // Then define and call a function to handle the event customer.subscription.updated
                    break;
            }
            break;
        }
        case 'invoice.created': {
            console.log('invoice.created')
            const invoice = event.data.object;
            // Sent when an invoice is created for a new or renewing
            // subscription. If Stripe fails to receive a successful response to
            // invoice.created, then finalizing all invoices with automatic
            // collection is delayed for up to 72 hours. Read more about
            // finalizing invoices.

            // Respond to the notification by sending a request to the Finalize an invoice API.
            // Then define and call a function to handle the event invoice.created
            break;
        }
        case 'invoice.finalization_failed': {
            console.log('invoice.finalization_failed')
            const invoice = event.data.object;
            //  The invoice couldn’t be finalized. Learn how to handle invoice
            //  finalization failures by reading the guide. Learn more about
            //  invoice finalization in the invoices overview guide.
            sendErrorEmail(event, 'Invoice finalization failed')

            // Inspect the Invoice’s last_finalization_error to determine the cause of the error.
            // If you’re using Stripe Tax, check the Invoice object’s automatic_tax field.
            // If automatic_tax[status]=requires_location_inputs, the invoice can’t be finalized and payments can’t be collected. Notify your customer and collect the required customer location.
            // If automatic_tax[status]=failed, retry the request later.
            // Then define and call a function to handle the event invoice.finalization_failed
            break;
        }
        case 'invoice.finalized': {
            console.log('invoice.finalized')
            const invoice = event.data.object;
            // Sent when an invoice is successfully finalized and ready to be
            // paid.

            // You can send the invoice to the customer. Read more about invoice finalization.
            // Depending on your settings, Stripe automatically charges the default payment method or attempts collection. Read more about emails after finalization.
            // Then define and call a function to handle the event invoice.finalized
            break;
        }
        case 'invoice.paid': {
            console.log('invoice.paid')
            const invoice = event.data.object;
            //  Sent when the invoice is successfully paid. You can provision
            //  access to your product when you receive this event and the
            //  subscription status is active.

            await new Parse.Object('Invoice').save({
                inv_id: invoice['id'],
                cus_id: invoice['customer'],
                amount_paid: invoice['amount_paid'],
                total: invoice['total'],
                sub_id: invoice['subscription'],
            }, { useMasterKey: true });
            // Then define and call a function to handle the event invoice.paid
            break;
        }
        case 'invoice.payment_action_required': {
            console.log('invoice.payment_action_required')
            const invoice = event.data.object;
            // Sent when the invoice requires customer authentication. Learn how
            // to handle the subscription when the invoice requires action.

            sendErrorEmail(event, 'Invoice payment action required, I don\'t know what to do here.')

            // Then define and call a function to handle the event invoice.payment_action_required
            break;
        }
        case 'invoice.payment_failed': {
            console.log('invoice.payment_failed')
            const invoice = event.data.object;
            // A payment for an invoice failed. The PaymentIntent status changes
            // to requires_action. The status of the subscription continues to
            // be incomplete only for the subscription’s first invoice. If a
            // payment fails, there are several possible actions to take:


            // Notify the customer. Read about how you can configure subscription settings to enable Smart Retries and other revenue recovery features.
            // If you’re using PaymentIntents, collect new payment information and confirm the PaymentIntent.
            // Update the default payment method on the subscription.
            // Then define and call a function to handle the event invoice.payment_failed
            break;
        }
        // case 'invoice.upcoming': {
        //     console.log('invoice.upcoming')
        //     const invoice = event.data.object;
        //     // Sent a few days prior to the renewal of the subscription. The
        //     // number of days is based on the number set for Upcoming renewal
        //     // events in the Dashboard. You can still add extra invoice items,
        //     // if needed.

        //     // Then define and call a function to handle the event invoice.upcoming
        //     break;
        // }
        case 'invoice.updated': {
            console.log('invoice.updated')
            const invoice = event.data.object;
            // Sent when a payment succeeds or fails. If payment is successful
            // the paid attribute is set to true and the status is paid. If
            // payment fails, paid is set to false and the status remains open.
            // Payment failures also trigger a invoice.payment_failed event.

            // Then define and call a function to handle the event invoice.updated
            break;
        }
        // case 'payment_intent.created': {
        //     console.log('payment_intent.created')
        //     const paymentIntent = event.data.object;
        //     //  Sent when a PaymentIntent is created.

        //     // Then define and call a function to handle the event payment_intent.created
        //     break;
        // }
        // case 'payment_intent.succeeded': {
        //     console.log('payment_intent.succeeded')
        //     const paymentIntent = event.data.object;
        //     // Sent when a PaymentIntent has successfully completed payment.

        //     // Then define and call a function to handle the event payment_intent.succeeded
        //     break;
        // }

        // -----END-----
        // SUBSCRIPTION EVENTS
        // -----END-----




        // -------------
        // PORTAL EVENTS
        // -------------
        // case 'payment_method.attached': {
        //     console.log('payment_method.attached')
        //     const obj = event.data.object;
        //     // Occurs when a customer adds a payment method.
        //     break;
        // }
        // case 'payment_method.detached': {
        //     console.log('payment_method.detached')
        //     const obj = event.data.object;
        //     // Occurs when a customer removes a payment method.
        //     break;
        // }
        case 'customer.updated': {
            console.log('customer.updated')
            const obj = event.data.object;
            // Check the invoice_settings.default_payment_method attribute to find the payment method that a customer selected as the new default. If you have subscriptions that override the customer-level default payment method, customers can remove this override. Check the subscription’s default_payment_method attribute when you receive this event to see if the override was removed. Use this webhook to update any relevant information in your database. All updates must be treated as billing information changes only. Don’t use the customer billing email address as a login credential.

            break;
        }
        // case 'customer.tax_id.created': {
        //     console.log('customer.tax_id.created')
        //     const obj = event.data.object;
        //     // Occurs when customers manage their tax IDs. Stripe can validate some types of tax IDs. Learn more in the tax IDs guide.
        //     break;
        // }
        // case 'customer.tax_id.deleted': {
        //     console.log('customer.tax_id.deleted')
        //     const obj = event.data.object;
        //     // Occurs when customers manage their tax IDs. Stripe can validate some types of tax IDs. Learn more in the tax IDs guide.
        //     break;
        // }
        // case 'customer.tax_id.updated': {
        //     console.log('customer.tax_id.updated')
        //     const obj = event.data.object;
        //     // Listen to this to get validation updates about customer tax IDs. Learn more in the tax IDs guide.
        //     break;
        // }
        // case 'billing_portal.configuration.created': {
        //     console.log('billing_portal.configuration.created')
        //     const obj = event.data.object;
        //     // Occurs when a configuration is created.
        //     break;
        // }
        // case 'billing_portal.configuration.updated': {
        //     console.log('billing_portal.configuration.updated')
        //     const obj = event.data.object;
        //     // Occurs when a configuration is updated.
        //     break;
        // }
        case 'billing_portal.session.created': {
            console.log('billing_portal.session.created')
            const obj = event.data.object;
            // Occurs when a portal session is created.
            break;
        }

        // -----END-----
        // PORTAL EVENTS
        // -----END-----




        // -------------
        // CHECKOUT SESSION EVENTS
        // -------------
        case 'checkout.session.completed': {
            console.log('checkout.session.completed')
            const obj = event.data.object;
            // Occurs when a checkout session is completed successfully.

            const metadata = obj['metadata'];
            if (!metadata) return;

            const voucher = metadata['voucherId'];
            const user = metadata['userId'];
            if (voucher && user) {
                console.log('checkout session completed using voucher');
                await useVoucher(voucher, user);
            }
            if (voucher && !user) throw new Error('No user found for voucher');
            break;
        }

        case 'checkout.session.expired': {
            console.log('checkout.session.expired')
            const obj = event.data.object;
            // Occurs when a checkout session has expired. default 1h

            const metadata = obj['metadata'];
            if (!metadata) return;

            const voucher = metadata['voucherId'];
            const user = metadata['userId'];
            if (voucher && user) {
                console.log('expiring pending use of voucher');
                await expirePendingVoucherUse(voucher, user);
            }
            if (voucher && !user) throw new Error('No user found for voucher');
            break;
        }
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return


}
