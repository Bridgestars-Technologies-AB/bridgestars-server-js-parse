import 'parse/node'
import DbObject, * as Requests from './dbobject'


class Customer extends DbObject {

  static instance = new Customer();

  private constructor() {
    super("Customer");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {
      //if sub_id already exists, throw error
      const cus = await new Parse.Query(this.name)
        .equalTo("cus_id", req.object.get("cus_id"))
        .first({ useMasterKey: true });
      if (cus) throw new Error("Customer already exists.")
      //add sub to user

      const user = await new Parse.Query("_User")
        .equalTo("objectId", req.object.get("user")).first({ useMasterKey: true });
      if (!user) throw new Error("User does not exist.")

      if(user.get("username").includes("bs_tester")) req.object.set("test", true)

      // user.addUnique("", req.object.get("name"))
      // await user.save(null, {useMasterKey: true, context: {noValidation: true}})
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //add this Payment to admin Subscription as well
  }
}


export default Customer.instance;
