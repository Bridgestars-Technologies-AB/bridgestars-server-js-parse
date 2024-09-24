// import { MongoClient, MongoClientOptions } from 'mongodb'
// import Typesense from 'typesense'
// import constants from '../constants'

// async function listDatabases(client:any) {
//   const databasesList = await client.db().admin().listDatabases()

//   console.log('Databases:')
//   databasesList.databases.forEach((db:any) => console.log(` - ${db.name}`))
// }

// function closeChangeStream(timeInMs = 60000, changeStream:any) {
//   // return new Promise();
//   return new Promise(resolve => {
//     setTimeout(() => {
//       console.log('Not Closing the change stream')
//       // changeStream.close()
//       return closeChangeStream(timeInMs, changeStream)
//       // resolve()
//     }, timeInMs)
//   })
// }

// async function index(next:any, typesense:any) {
//   console.log("Performing " + next.operationType)
//   if (next.operationType == 'delete') {
//     await typesense.collections('username_index').documents(next.documentKey._id).delete()
//     console.log("id to remove: " + next.documentKey._id)
//   } else if (next.operationType == 'update') {
//     let fields = next.updateDescription.updatedFields
//     if (!fields.username) {
//       console.log("no indexed fields was updated")
//       return;
//     }
//     let data = JSON.stringify({id: fields.id, username: fields.username})
//     await typesense.collections('username_index').documents(next.documentKey._id).update(data)
//     console.log("update:" + data)
//   } else {
//     next.fullDocument.id = next.fullDocument['_id']
//     delete next.fullDocument._id
//     let doc = next.fullDocument
//     let data = JSON.stringify({id: doc.id, username: doc.username})
//     await typesense.collections('username_index').documents().upsert(data)
//     console.log("create:" + data)
//   }
// }

// async function monitorListingsUsingEventEmitter(client:MongoClient, typesense:any, timeInMs = 60000) {
//   const collection = client.db('parse').collection('_User')
//   const changeStream = collection.watch()
//   changeStream.on('change', next => {
//     console.log("indexing document on typesense")
//     index(next, typesense)
//   })
//   await closeChangeStream(timeInMs, changeStream)
// }

// async function createSchema(schema:any, typesense:any) {
//   const collectionsList = await typesense.collections().retrieve()
//   var toCreate = collectionsList.find((value:any, index:number, array:any) => {
//     console.log(value)

//     return value['name'] == schema['name']
//   })

//   if (!toCreate) {
//     await typesense.collections().create(schema)
//   }
// }

// async function indexAllDocuments(mongo:MongoClient, typesense:any) {
//   console.log("indexing documents")
//   const typesenseCol = typesense.collections("username_index");
//   const mongoCol = mongo.db('parse').collection("_User");
//   let docs: {id:string, username:string }[] = []
//   await mongoCol.find({}).forEach(doc => {
//     docs.push({ id: doc._id.toString(), username: doc.username })
//   })
//   if(docs.length != 0)
//     typesenseCol.documents().import(docs, { action: 'upsert' })
//   console.log(docs.length + " documents indexed on typesense")
//     // mongo.db('parse').collection("_User").countDocuments().then(e => console.log(e))
//     // typesense.collections("username_index").retrieve().then(s => console.log(s.num_documents))
// }

// async function main() {
//   const typesense = new Typesense.Client({
//     nodes: [
//       {
//         host: 'localhost',
//         port: 8108,
//         protocol: 'http',
//       },
//     ],
//     apiKey: 'xyz',
//     connectionTimeoutSeconds: 2,
//   })
//   let schema = {
//     name: 'username_index',
//     fields: [
//       { name: 'id', type: 'string', facet: false },
//       { name: 'username', type: 'string', facet: false }
//     ]
//   }
//   // await typesense.collections(schema.name).delete()
//   await createSchema(schema, typesense)
//   const uri = constants.databaseURI
//   const client = new MongoClient(uri)
//   try {
//     await client.connect()
//     await listDatabases(client)
//     await indexAllDocuments(client, typesense)
//     await monitorListingsUsingEventEmitter(client, typesense)
//   } catch (e) {
//     console.error(e)
//   } finally {
//     console.log("shutting down typesense server")
//     await client.close()
//   }
// }

// main().catch(console.error)
