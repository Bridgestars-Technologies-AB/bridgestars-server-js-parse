import { expirePendingVoucherUse, useVoucher } from "./voucher";

Parse.Cloud.define("removeAllTestObjects", async (req) => {
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");
    await Destroy("_User", { startsWith: { key: "username", val: "bs_tester" } });
    await Destroy("Match", { equalTo: { key: "startTime", val: new Date(0) } });

    await Destroy("Table", { startsWith: { key: "data", val: "BS_TABLE_TEST" } });
    await Destroy("Post", { equalTo: { key: "title", val: "BS_POST_TEST" } });
    await Destroy("Chat", { equalTo: { key: "name", val: "BS_CHAT_TEST" } });
    await Destroy("Room", { equalTo: { key: "desc", val: "BS_ROOM_TEST" } });
    await Destroy("Course", { equalTo: { key: "desc", val: "BS_COURSE_TEST" } });
    await Destroy("Chapter", {
        equalTo: { key: "desc", val: "BS_CHAPTER_TEST" },
    });
    await Destroy("Voucher", {
        equalTo: { key: "desc", val: "BS_VOUCHER_TEST" },
    });

    await Destroy("Subscription", { equalTo: { key: "test", val: true } });
    await Destroy("Customer", { equalTo: { key: "test", val: true } });
    await Destroy("Invoice", { equalTo: { key: "test", val: true } });
    // await Parse.User.destroyAll(objs)
});

async function Destroy(
    className: string,
    {
        startsWith,
        equalTo,
    }: {
        startsWith?: { key: string; val: any };
        equalTo?: { key: string; val: any };
    }
) {
    const q = new Parse.Query(className);
    if (!startsWith && !equalTo) throw new Error("No query parameters provided.");
    if (startsWith) q.startsWith(startsWith.key, startsWith.val);
    if (equalTo) q.equalTo(equalTo.key, equalTo.val);
    const objs = await q.findAll({ useMasterKey: true });
    // console.log(objs.filter())
    await Parse.Object.destroyAll(objs, { useMasterKey: true });
}

Parse.Cloud.define("testCheckoutConfirmed", async (req) => {
    if (!req.user) throw new Error("Not logged in.");
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");

    if (!req.params.user) throw new Error("Param user missing");
    if (!req.params.voucher) throw new Error("Param voucher missing");
    await useVoucher(req.params.voucher, req.params.user);
});

Parse.Cloud.define("testCheckoutExpired", async (req) => {
    if (!req.user) throw new Error("Not logged in.");
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");
    if (!req.params.voucher) throw new Error("Param voucher missing");
    if (!req.params.user) throw new Error("Param user missing");
    await expirePendingVoucherUse(req.params.voucher, req.params.user);
});

import stripe from "./stripe/stripeConfig";
import subscription from "./stripe/subscription";
//params: course, user
Parse.Cloud.define("test_assignSubscriptionToCustomer", async (req) => {
    if (!req.user) throw new Error("Not logged in.");
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");
    if (!req.params.user) throw new Error("Param user missing");
    if (!req.params.course) throw new Error("Param course missing");

    let customer = await subscription.getCustomerId(req.params.user);
    if (!customer) {
        const user = await new Parse.Query(Parse.User).get(req.params.user, {
            useMasterKey: true,
        });
        customer = await subscription.createCustomer(user);
    }

    const priceId = "price_1MQnhkDC8iBT4qcEw5Sbmgzk";
    const sub = await stripe.subscriptions.create({
        customer: customer,
        items: [{ price: priceId }],
        metadata: {
            courseId: req.params.course,
            // voucherId: voucher.id, //not needed
            userId: req.params.user,
            type: "education",
        },
        trial_period_days: 7,
    });
});

// cancel subscription
// params: user
Parse.Cloud.define("test_cancelSubscription", async (req) => {
    if (!req.user) throw new Error("Not logged in.");
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");
    if (!req.params.user) throw new Error("Param user missing");

    //get sub
    const sub = await new Parse.Query("Subscription")
        .equalTo("user", req.params.user)
        .first({ useMasterKey: true });
    if (!sub) throw new Error("No subscription found.");

    await stripe.subscriptions.cancel(sub.get("sub_id"));
});

// cancel subscription and exit all rooms and courses
// params: user
Parse.Cloud.define("test_cancelAndExitAllCourses", async (req) => {
    if (!req.user) throw new Error("Not logged in.");
    if (req.user?.getUsername() !== "admin") throw new Error("Not admin.");
    if (!req.params.user) throw new Error("Param user missing");

    //get sub
    const sub = await new Parse.Query("Subscription")
        .equalTo("user", req.params.user)
        .first({ useMasterKey: true });

    var u = await new Parse.Query("_User").get(req.params.user, {
        useMasterKey: true,
    });
    u.set("courses", []);
    u.set("rooms", []);
    await u.save(null, { useMasterKey: true });

    if (!sub)
        throw new Error(
            "No subscription found, but cleaned exited room and courses."
        );
    await stripe.subscriptions.cancel(sub.get("sub_id")).catch(() => { });
});
