
import subscription from "./stripe/subscription"



Parse.Cloud.define("generateSubscriptionDashboardLink", async (req) => {

    const user = req.user;
    if (!user) throw "Not logged in";

    const customer = await subscription.getCustomerId(user);
    if (!customer) throw "This user does not have any active subscriptions";

    const url = await subscription.getSubscriptionDashboardUrl(customer); 

    if (!url) throw "Could not create subscription";
    return url;
})