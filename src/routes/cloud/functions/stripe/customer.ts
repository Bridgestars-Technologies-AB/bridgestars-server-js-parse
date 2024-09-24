import 'parse/node';
import Stripe from 'stripe';
import constants from '../../../../constants';
import stripe from './stripeConfig';

// export default async function CreateCustomer(user : Parse.User) {
//     const priceId = 'price_1MMz7dDC8iBT4qcEZKywWFQ8';
//     // const paymentLink = await client.paymentLinks.create({
//     //     line_items: [{ price: priceId, quantity: 1 }],
//     //     subscription_data: { trial_period_days: 7, description: 'test' },
//     //     currency: 'sek',
//     //     custom_text: { submit: { message: 'test' } },
//     //     after_completion: {
//     //         type: 'hosted_confirmation',
//     //         hosted_confirmation: { custom_message: 'you can now go back to the app' }
//     //     }
//     // });
//     let name = user.get('dispName'); 
//     if(user.get('first') && user.get('last')) {
//         name = user.get('first') + ' ' + user.get('last');
//     }
//     const customer = await stripe.customers.create({
//         email: user.getEmail(),
//         name: name,
//         metadata:{id: user.id},
//     })
//     const po = new Parse.Object("Customer")
//     if(user.getUsername()?.startsWith("bs_tester")) po.set({isTestUser: true})

//     po.set({user: user.id, cus_id: customer.id});
//     await po.save({useMasterKey: true})
    
//     // create subscription for customer
//     const subscription = await stripe.subscriptions.create({
//         customer: customer.id,
//         items: [{ price: priceId }],
//         expand: ['latest_invoice.payment_intent'],
//     });
// }


