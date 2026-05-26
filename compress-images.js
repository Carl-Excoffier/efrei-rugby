const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const rootDirectory = path.join(__dirname, "public/photos");

/**
 * This function crawls through every folder inside 'public/photos'
 */
function processDirectory(directory) {
    fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
        if (err) return console.error("Could not list the directory.", err);

        entries.forEach((entry) => {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                // If it's a folder, dive inside it!
                processDirectory(fullPath);
            } else {
                // If it's a file, check if it's an image
                processImage(fullPath);
            }
        });
    });
}

/**
 * This function compresses a single image
 */
function processImage(filePath) {
    const fileExt = path.extname(filePath).toLowerCase();

    // Only target common heavy image formats
    if ([".jpg", ".jpeg", ".png", ".tiff"].includes(fileExt)) {
        const directory = path.dirname(filePath);
        const fileName = path.basename(filePath, fileExt);
        const outputPath = path.join(directory, `${fileName}.webp`);

        console.log(`Processing: ${filePath}...`);

        sharp(filePath)
            .resize(1200, null, { withoutEnlargement: true }) // Resizes to 1200px wide (if larger)
            .webp({ quality: 80 })
            .toFile(outputPath)
            .then(() => {
                // IMPORTANT: Only delete the original if the output was created successfully
                // and if the extension was actually changed
                if (filePath !== outputPath) {
                    fs.unlinkSync(filePath);
                    console.log(
                        `✅ Compressed & Deleted Original: ${path.basename(filePath)}`,
                    );
                }
            })
            .catch((err) =>
                console.error(`❌ Error processing ${filePath}:`, err),
            );
    }
}

// Start the crawl!
console.log("🚀 Starting recursive compression in /public/photos...");
processDirectory(rootDirectory);
