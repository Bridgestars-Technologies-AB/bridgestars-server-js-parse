type BeforeSaveRequest = Parse.Cloud.BeforeSaveRequest<Parse.Object<Parse.Attributes>>;
type AfterSaveRequest = Parse.Cloud.AfterSaveRequest<Parse.Object<Parse.Attributes>>;
type BeforeDeleteRequest = Parse.Cloud.BeforeDeleteRequest<Parse.Object<Parse.Attributes>>;
type AfterDeleteRequest = Parse.Cloud.AfterDeleteRequest<Parse.Object<Parse.Attributes>>;
type BeforeFindRequest = Parse.Cloud.BeforeFindRequest<Parse.Object<Parse.Attributes>>;
type Query = Parse.Query<Parse.Object<Parse.Attributes>>;

import { immutable } from '../validation';

abstract class DbObject {
  name: any;
  abstract validate(req: BeforeSaveRequest): Promise<void> | void;
  
  beforeSave(req: BeforeSaveRequest): Promise<void> | void { };
  afterSave(req: AfterSaveRequest): Promise<void> | void { };

  beforeDelete(req: BeforeDeleteRequest): Promise<void> | void { };
  afterDelete(req: AfterDeleteRequest): Promise<void> | void { };

  async beforeFind(req : BeforeFindRequest): Promise<Query> { return req.query; };
  

  //constructor
  constructor(name : any) {
    this.name = name;
    Parse.Cloud.beforeSave(name, async (req) => {
      immutable(req, 'ACL') 
      await this.validate(req);
      return this.beforeSave(req);
    });
    Parse.Cloud.afterSave(name, async (req) => {
      return this.afterSave(req);
    });
    Parse.Cloud.beforeDelete(name, async (req) => {
      return this.beforeDelete(req);
    });
    Parse.Cloud.afterDelete(name, async (req) => {
      return this.afterDelete(req);
    });
    Parse.Cloud.beforeFind(name, async (req) => {
      return this.beforeFind(req);
    });
  }
}

export { BeforeSaveRequest, AfterSaveRequest, BeforeDeleteRequest, AfterDeleteRequest, BeforeFindRequest, Query }; 
export default DbObject;