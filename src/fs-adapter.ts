export default {
  module: "@parse/s3-files-adapter",
  options: {
    bucket: "bridgestars-fs-service",
    // optional:
    region: "eu-north-1", // default value
    bucketPrefix: "", // default value
    directAccess: true, // default value
    fileAcl: null, // default value
    baseUrl: null, // default value
    baseUrlDirect: false, // default value
    signatureVersion: "v4", // default value
    globalCacheControl: "max-age=86400", // default value. Or 'public, max-age=86400' for 24 hrs Cache-Control
    ServerSideEncryption: "AES256|aws:kms", //AES256 or aws:kms, or if you do not pass this, encryption won't be done
    validateFilename: null, // Default to parse-server FilesAdapter::validateFilename.
    generateKey: null, // Will default to Parse.FilesController.preserveFileName
  },
};
