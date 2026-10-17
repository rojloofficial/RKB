/**
 * Client-side HTML5 Canvas Image Watermarking & Uploader for RKB Blog
 * Adds a modern translucent brand pill with an amber status dot.
 */

export const WATERMARK_CONFIG = {
  brandText: "rkb.in",
  dotColor: "#f59e0b",
  defaultFileNamePrefix: "rkb-blog",
  maxDimension: 1920,
  quality: 0.9,
};

/**
 * Draws a stylish brand watermark pill on the bottom-right corner of an HTML Canvas
 */
export function drawBlogWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  customBrandText?: string
): void {
  const brandText = customBrandText || WATERMARK_CONFIG.brandText;
  
  // Scale watermark proportionally based on image size
  const baseScale = Math.max(0.7, Math.min(width, height) / 1000);
  const fontSize = Math.round(18 * baseScale);
  const paddingX = Math.round(18 * baseScale);
  const paddingY = Math.round(10 * baseScale);
  const dotRadius = Math.round(4.5 * baseScale);
  const dotMarginRight = Math.round(10 * baseScale);
  const borderRadius = Math.round(12 * baseScale);

  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  const textMetrics = ctx.measureText(brandText);
  const textWidth = textMetrics.width;

  const pillWidth = paddingX * 2 + dotRadius * 2 + dotMarginRight + textWidth;
  const pillHeight = fontSize + paddingY * 2;

  const margin = Math.round(24 * baseScale);
  const pillX = width - pillWidth - margin;
  const pillY = height - pillHeight - margin;

  // Draw pill background with dark frosted glass effect
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
  } else {
    // Fallback rounded rectangle
    const r = borderRadius;
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillWidth - r, pillY);
    ctx.quadraticCurveTo(pillX + pillWidth, pillY, pillX + pillWidth, pillY + r);
    ctx.lineTo(pillX + pillWidth, pillY + pillHeight - r);
    ctx.quadraticCurveTo(pillX + pillWidth, pillY + pillHeight, pillX + pillWidth - r, pillY + pillHeight);
    ctx.lineTo(pillX + r, pillY + pillHeight);
    ctx.quadraticCurveTo(pillX, pillY + pillHeight, pillX, pillY + pillHeight - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();
  }
  ctx.fill();

  // Subtle border ring
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw glowing amber indicator dot
  const dotCenterX = pillX + paddingX + dotRadius;
  const dotCenterY = pillY + pillHeight / 2;

  ctx.shadowColor = WATERMARK_CONFIG.dotColor;
  ctx.shadowBlur = 6 * baseScale;
  ctx.fillStyle = WATERMARK_CONFIG.dotColor;
  ctx.beginPath();
  ctx.arc(dotCenterX, dotCenterY, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw brand typography
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(
    brandText,
    dotCenterX + dotRadius + dotMarginRight,
    pillY + pillHeight / 2 + 1
  );

  ctx.restore();
}

/**
 * Loads an image file, applies resizing & watermark, and returns a high-quality JPEG Blob
 */
export async function watermarkImageFile(
  file: File,
  customBrandText?: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image into memory"));
      img.onload = () => {
        let targetWidth = img.width;
        let targetHeight = img.height;

        // Downscale large images if necessary while preserving aspect ratio
        if (targetWidth > WATERMARK_CONFIG.maxDimension || targetHeight > WATERMARK_CONFIG.maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * WATERMARK_CONFIG.maxDimension) / targetWidth);
            targetWidth = WATERMARK_CONFIG.maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * WATERMARK_CONFIG.maxDimension) / targetHeight);
            targetHeight = WATERMARK_CONFIG.maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Could not initialize 2D canvas context"));
        }

        // Draw original image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Stamp brand watermark pill
        drawBlogWatermark(ctx, targetWidth, targetHeight, customBrandText);

        // Convert to high-quality JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          },
          "image/jpeg",
          WATERMARK_CONFIG.quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Watermarks an image and uploads it to /api/upload (Cloudinary)
 * Returns the public CDN URL
 */
export async function uploadWatermarkedBlogImage(
  file: File,
  customBrandText?: string
): Promise<string> {
  const blob = await watermarkImageFile(file, customBrandText);
  const fileName = `${WATERMARK_CONFIG.defaultFileNamePrefix}-${Date.now()}.jpg`;
  const watermarkedFile = new File([blob], fileName, { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("file", watermarkedFile);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Failed to upload watermarked blog image");
  }

  return data.url;
}
