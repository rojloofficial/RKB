import "server-only";

// Lazy-load cloudinary so that importing this module (and cold-starting the
// upload/UPI routes) does not pay the Cloudinary SDK init cost unless an
// upload actually happens.
type Cloudinary = typeof import("cloudinary").v2;

async function getCloudinary(): Promise<Cloudinary> {
  const { v2 } = await import("cloudinary");
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return v2;
}

export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder = "rojlo",
  timeoutMs = 25000
): Promise<string> {
  const cloudinary = await getCloudinary();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Cloudinary upload timed out after 25 seconds"));
      }
    }, timeoutMs);

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

