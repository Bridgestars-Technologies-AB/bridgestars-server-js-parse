import sizeOf from "image-size";
import * as mime from "mime";

Parse.Cloud.beforeSaveFile(async ({ file, user }) => {
  file.addTag("createdBy", user?.id);

  const fileData = await file.getData(); //base64 encoded

  if (mime.getType(file.name())?.includes("image")) {
    const img = new Buffer(fileData, "base64");
    const dim = sizeOf(img);

    console.log(dim.width, dim.height);
    const max = 256;
    console.log("fileSize: ", Buffer.byteLength(fileData, "utf8") / 1e3, " kB");
    if (!dim.width || !dim.height)
      throw new Error(
        "Image size could not be read, image is probably corrupt."
      );
    if (dim.width > max || dim.height > max)
      throw new Error(
        `Image size is ${dim.width}x${dim.height} which is larger than max size: ${max}x${max}.`
      );
  } else {
    //clamp size, or dont allow for now
    const size = Buffer.byteLength(fileData, "utf8");
    throw new Error(
      "Non-image type files are not accepted. (fileSize: " + size + ")"
    );
  }
  const newFile: Parse.File = new Parse.File("avatar_" + file.name(), {
    base64: fileData,
  });
  newFile.setMetadata(file.metadata);
  newFile.setTags(file.tags);

  return newFile;
});
