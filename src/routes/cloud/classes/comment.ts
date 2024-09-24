import 'parse/node'
import * as Validation from '../validation';
import DbObject, * as Requests from './dbobject'

class Comment extends DbObject {

  static instance = new Comment();

  private constructor() {
    super("Comment");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    Validation.stringField(req, 'text', { minLength: 3, maxLength: 1000 })
    Validation.required(req, 'text')

    Validation.stringField(req, 'post', { length: 10 })
    Validation.required(req, 'post')
    Validation.immutable(req, 'post')

    Validation.immutable(req, 'author')
    
    Validation.numberField(req, 'upvotes', { min: 0, max: 9999, maxIncrement: 1 })
    Validation.setDefaultValue(req, 'upvotes', 0)
    Validation.maxDiff(req, 'upvotes', 1)
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> { 
    if(!req.user) throw new Error("User must be signed in to comment.")
    if(req.object.isNew()){
      req.object.set("author", req.user.id); // Set the author to the current user
      let acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      // acl.setPublicWriteAccess(false);
      acl.setRoleWriteAccess("admin", true);
      acl.setWriteAccess(req.user, true);
      req.object.setACL(acl);

      let post : Parse.Object = new Parse.Object("Post", { id: req.object.get("post") })
      post.increment("comments")
      await post.save(null, { useMasterKey: true })
    }
  }
}


export default Comment.instance;