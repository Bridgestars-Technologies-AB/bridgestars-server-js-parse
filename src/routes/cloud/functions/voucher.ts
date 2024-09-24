//parse cloud function that redeems a voucher
import { addRoleAsync, hasRoleBool } from "../util";
import 'parse/node'
import subscription from './stripe/subscription'

//params: voucherId/voucherCode/code
Parse.Cloud.define("redeemVoucher", async (req) => {
    if (!req.user) throw "Must be signed in to redeem a voucher.";
    const code = req.params.voucherId ?? req.params.voucherCode ?? req.params.code;
    if (!code) throw "No voucherCode provided.";
    //check if voucher exists otherwise throw error
    let voucher = await new Parse.Query("Voucher")
        .equalTo("objectId", code)
        .first({ useMasterKey: true });
    
    if (!voucher) {
        voucher = await new Parse.Query("Voucher")
            .equalTo("customCode", code)
            .first({ useMasterKey: true });
        if (!voucher) throw "This code is not valid.";
    }
    else {
        if(voucher.get("customCode")) 
            throw new Error("This code is not valid.")
    }
    //check if voucher is enabled and not expired and has uses left
    if (!voucher.get("enabled"))
        throw "This code is not valid.";
    if (voucher.get("validUntil") < new Date(Date.now()))
        throw "This code has expired.";
    if (voucher.get("pending") && voucher.get("pending").includes(req.user.id)) {
        // if voucher is pending and user is in pending list 
        // let him redeem it anyways 
    }
    else if (voucher.get("maxUses") != 0 && voucher.get("maxUses") <= voucher.get("uses"))
        throw "This code is currently held by someone else.";

    // TODO add singleUse field to allow for more than one use per user if needed
    if (voucher.get("usedBy") && voucher.get("usedBy").includes(req.user.id))
        throw "You have already used this code.";

    //if voucher is room voucher add user to room, switch case
    switch (voucher.get("type")) {
        case 1: //room voucher
            //add user to room

            const rooms = req.user.get("rooms")
            if (rooms && rooms.includes(voucher.get("data"))) throw new Error("This voucher is for a room that you are already a member of.")

            // NO PAYMENT HERE RIGHT NOW; 
            // MAYBE I THE FUTURE DEPENDING ON THE ROOM TYPE
            await useVoucher(voucher, req.user);
            return {
                desc: voucher.get('desc'),
                type: voucher.get('type'),
                data: voucher.get('data'),
                url: ""
            }
        case 2: //course voucher
            //add user to course

            const course = await new Parse.Query("Course")
                .equalTo("objectId", voucher.get("data"))
                .first({ useMasterKey: true });
            if (!course) throw "The course does not exist.";

            const courses = req.user.get("courses")
            if (courses && courses.includes(course.id)) throw new Error("This voucher is for a course that you are already a member of.")
            // if (!await hasRoleBool("roomUser-" + course.get("room"), req.user))
            //     throw "To redeem a course code you must first me a member of the room";

            //TODO pay for room membership if not already paid 
            // check subscription class if this user has a subscription for this room
            if(course.get("free")){
                await useVoucher(voucher, req.user);
                return {
                    desc: voucher.get('desc'),
                    type: voucher.get('type'),
                    data: voucher.get('data'),
                    url: ""
                }
            }
            if (!await subscription.userHasSubscription(req.user, "education")) {
                let customer = await subscription.getCustomerId(req.user);
                if (!customer) customer = await subscription.createCustomer(req.user);

                let url = await subscription.createSubscription(customer,
                    {
                        courseId: course.id,
                        voucherId: voucher.id,
                        userId: req.user.id,
                        type: "education"
                    });
                if (!url) throw "Could not create subscription";
                await setVoucherPendingUse(voucher, req.user);
                return {
                    desc: voucher.get('desc'),
                    type: voucher.get('type'),
                    data: voucher.get('data'),
                    url: url
                };
            }
            else {
                await useVoucher(voucher, req.user);
                return {
                    desc: voucher.get('desc'),
                    type: voucher.get('type'),
                    data: voucher.get('data'),
                    url: ""
                }
            }
            break;
        default:
            throw "This code is not valid.";
    }
});

export async function setVoucherPendingUse(voucher: Parse.Object | string, user: Parse.User | string) {
    if (typeof voucher === "string") {
        const res = await new Parse.Query("Voucher").equalTo("objectId", voucher).first({ useMasterKey: true });
        if (!res) throw new Error("voucher not found");
        voucher = res;
    }
    if (typeof user !== "string") user = user.id;

    voucher.addUnique("pending", user);
    voucher.increment("uses");
    return await voucher.save(null, { useMasterKey: true, context: { noValidation: true } });
}


export async function useVoucher(voucher: Parse.Object | string, user: Parse.User | string) {
    if (typeof voucher === "string") {
        const res = await new Parse.Query("Voucher").equalTo("objectId", voucher)
            .first({ useMasterKey: true });
        if (!res) throw new Error("voucher not found");
        voucher = res;
    }
    if (typeof user === "string") {
        const res = await new Parse.Query("_User").equalTo("objectId", user)
            .first({ useMasterKey: true });
        if (!res) throw new Error("user not found");
        user = res as Parse.User;
    }
    //use voucher
    const pending = voucher.get("pending")
    if (pending && pending.includes(user.id))
        voucher.remove("pending", user.id)
    else voucher.increment("uses");

    voucher.add("usedBy", user.id);
    voucher.add("usedAt", Date.now())
    console.log(`voucher ${voucher.id} used by ${user.id} at ${new Date(Date.now())}`);
    await voucher.save(null, { useMasterKey: true });

    switch (voucher.get("type")) {
        case 1: { //room voucher
            // voucher.increment("uses") // course voucher is incremented when pending
            const room = await new Parse.Query("Room")
                .equalTo("objectId", voucher.get("data"))
                .first({ useMasterKey: true });
            if (!room) throw "Internal error: Room not found when redeeming voucher.";

            await addRoleAsync("roomUser-" + room.id, user)
            user.addUnique("rooms", room.id);
            await user.save(null, { useMasterKey: true });

            break;
        }
        case 2: { //course voucher
            const course = await new Parse.Query("Course")
                .equalTo("objectId", voucher.get("data"))
                .first({ useMasterKey: true })
            if (!course) throw "Internal error: Course not found when redeeming voucher.";

            const room = await new Parse.Query("Room")
                .equalTo("objectId", course.get("room"))
                .first({ useMasterKey: true });
            if (!room) throw "Internal error: Room not found when redeeming voucher.";

            if (!await hasRoleBool("roomUser-" + room.id, user)) {
                await addRoleAsync("roomUser-" + room.id, user)
                user.addUnique("rooms", room.id);
            }

            await addRoleAsync("courseUser-" + course.id, user)
            user.addUnique("courses", course.id);
            await user.save(null, { useMasterKey: true });
            break;
        }
        default:
            throw "This code is not valid.";
    }

    return voucher;
}


export async function expirePendingVoucherUse(voucher: Parse.Object | string, user: Parse.User | string) {
    if (typeof voucher === "string") {
        const res = await new Parse.Query("Voucher").equalTo("objectId", voucher).first({ useMasterKey: true });
        if (!res) throw new Error("voucher not found");
        voucher = res;
    }
    if (typeof user !== "string") user = user.id;

    voucher.remove("pending", user);
    voucher.decrement("uses");
    return await voucher.save(null, { useMasterKey: true, context: { noValidation: true } });
}