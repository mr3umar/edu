import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maximum dimensions for each thumbnail preset.
//
// The image is fitted INSIDE this box while
// preserving its original aspect ratio.
const THUMBNAIL_SIZES = {
        sm: 160,
        md: 320,
        lg: 640,
} as const;

type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

// Prevent multiple requests from generating
// the same thumbnail simultaneously.
const generationLocks = new Map<
        string,
        Promise<void>
>();

// --------------------------------------------------
// Helpers
// --------------------------------------------------

async function fileExists(
        filePath: string
): Promise<boolean> {
        try {
                await fs.access(filePath);
                return true;
        } catch {
                return false;
        }
}


export function isValidThumbnailSize(
        size: string
): size is ThumbnailSize {
        return size in THUMBNAIL_SIZES;
}

// --------------------------------------------------
// Find original image
// --------------------------------------------------

async function findOriginalImage(
        bookUid: string
): Promise<string | null> {


        const booksRoot = path.resolve(__dirname, '..', 'files');
        const filePath = path.join(booksRoot, 'pdf-images', bookUid, '0');

        if (await fileExists(filePath)) {
                return filePath;
        }

        return null;
}

// --------------------------------------------------
// Generate thumbnail
// --------------------------------------------------

interface GenerateThumbnailOptions {
        originalPath: string;
        thumbnailPath: string;
        maxSize: number;
}

async function generateThumbnail(
        options: GenerateThumbnailOptions
): Promise<void> {

        const {
                originalPath,
                thumbnailPath,
                maxSize,
        } = options;

        // Make sure destination directory exists.
        await fs.mkdir(
                path.dirname(thumbnailPath),
                {
                        recursive: true,
                }
        );

        // Generate into a temporary file first.
        //
        // This prevents another request from reading
        // an incomplete PNG.
        const temporaryPath =
                `${thumbnailPath}.${process.pid}.${Date.now()}.tmp`;

        try {

                await sharp(originalPath)
                        // Respect EXIF orientation.
                        .rotate()

                        // Maintain aspect ratio.
                        // The image will fit INSIDE maxSize × maxSize.
                        .resize({
                                width: maxSize,
                                height: maxSize,
                                fit: "inside",
                                withoutEnlargement: true,
                        })

                        // Always output PNG.
                        .png({
                                compressionLevel: 8,
                        })

                        .toFile(temporaryPath);

                // Atomic replacement.
                await fs.rename(
                        temporaryPath,
                        thumbnailPath
                );

        } catch (error) {

                await fs
                        .unlink(temporaryPath)
                        .catch(() => { });

                throw error;
        }
}

// --------------------------------------------------
// Get or create thumbnail
// --------------------------------------------------

export async function getOrCreateThumbnail(
        bookUid: string,
        size: ThumbnailSize
): Promise<string> {

        const maxSize =
                THUMBNAIL_SIZES[size];

        const booksRoot = path.resolve(__dirname, '..', 'files');
        const thumbnailPath = path.join(booksRoot, 'pdf-thumbnails', bookUid, `${size}.png`);
        

        // -----------------------------------------------
        // Already generated
        // -----------------------------------------------

        if (await fileExists(thumbnailPath)) {
                return thumbnailPath;
        }

        const lockKey =
                `${bookUid}:${size}`;

        // -----------------------------------------------
        // Another request is already generating it
        // -----------------------------------------------

        const existingLock =
                generationLocks.get(lockKey);

        if (existingLock) {

                await existingLock;

                return thumbnailPath;
        }

        // -----------------------------------------------
        // Generate
        // -----------------------------------------------

        const generationPromise = (async () => {

                try {

                        // Check again after acquiring the lock.
                        //
                        // Another request could have completed the
                        // file between our first check and here.

                        if (
                                await fileExists(thumbnailPath)
                        ) {
                                return;
                        }

                        const originalPath =
                                await findOriginalImage(bookUid);

                        if (!originalPath) {

                                const error =
                                        new Error(
                                                "Original image not found"
                                        );

                                (
                                        error as Error & {
                                                code?: string;
                                        }
                                ).code = "IMAGE_NOT_FOUND";

                                throw error;
                        }

                        console.log(`Generate thumbnail for book ${bookUid}, size: ${size}`)
                        await generateThumbnail({
                                originalPath,
                                thumbnailPath,
                                maxSize,
                        });

                } finally {

                        generationLocks.delete(
                                lockKey
                        );
                }

        })();

        generationLocks.set(
                lockKey,
                generationPromise
        );

        await generationPromise;

        return thumbnailPath;
}
