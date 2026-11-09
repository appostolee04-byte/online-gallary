
// ======================================================
// SHADDRACK ONLINE GALLERY - ADMIN DASHBOARD
// ======================================================

// 1. SUPABASE CONFIGURATION

const SUPABASE_URL = "https://tofrlyutxxfkxmdevsvk.supabase.co";

const SUPABASE_KEY = "sb_publishable_XINQAzfUeVG19m8wBiuE5w_jMTtMAzm";

const BUCKET_NAME = "gallery-photos";

const { createClient } = supabase;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = ["nature", "people", "travel", "events", "other"];

let galleryPhotos = [];


// ======================================================
// 2. GET HTML ELEMENTS
// ======================================================

const photoGrid = document.getElementById("photoGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const photoTitleInput = document.getElementById("photoTitle");
const photoCategoryInput = document.getElementById("photoCategory");
const photoFileInput = document.getElementById("photoFile");

const uploadButton = document.getElementById("uploadButton");
const uploadStatus = document.getElementById("uploadStatus");

const logoutButton = document.getElementById("logoutButton");
const logoutButtonTop = document.getElementById("logoutButtonTop");


// ======================================================
// 3. DASHBOARD INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function initializeDashboard() {
    try {
        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) {
            window.location.href = "index.html";
            return;
        }

        // Verify that the logged-in user is an administrator
        const { data: admin, error: adminError } = await client
            .from("gallery_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError || !admin) {
            alert("Access denied. You are not an authorized administrator.");
            await client.auth.signOut();
            window.location.href = "index.html";
            return;
        }

        // Display logged-in email
        document.querySelectorAll("#adminEmail, #loggedInEmail").forEach(element => {
            element.textContent = user.email;
        });

        await loadPhotos();

    } catch (error) {
        console.error("Dashboard initialization error:", error);
        showStatus("Unable to initialize dashboard. Check your connection.", "error");
    }
}


// ======================================================
// 4. LOAD PHOTOS FROM SUPABASE STORAGE
// ======================================================

async function loadPhotos() {
    if (!photoGrid) return;

    photoGrid.innerHTML = "<p>Loading gallery photos...</p>";

    galleryPhotos = [];

    try {
        for (const category of CATEGORIES) {

            const { data: files, error } = await client.storage
                .from(BUCKET_NAME)
                .list(category, {
                    limit: 100,
                    sortBy: {
                        column: "created_at",
                        order: "desc"
                    }
                });

            if (error) {
                console.error("Error loading category:", category, error);
                continue;
            }

            for (const file of files || []) {

                // Ignore folders and empty entries
                if (!file.name || !file.id) continue;

                const path = `${category}/${file.name}`;

                const { data: publicData } = client.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(path);

                const title = getPhotoTitle(file.name);

                galleryPhotos.push({
                    name: file.name,
                    path: path,
                    title: title,
                    category: category,
                    url: publicData.publicUrl
                });
            }
        }

        updateStatistics();
        displayPhotos();

    } catch (error) {
        console.error("Gallery loading error:", error);
        photoGrid.innerHTML = "<p>Could not load gallery photos.</p>";
    }
}


// ======================================================
// 5. EXTRACT PHOTO TITLE FROM FILENAME
// ======================================================

function getPhotoTitle(filename) {
    let title = filename.replace(/\.[^/.]+$/, "");

    // Remove timestamp prefix
    title = title.replace(/^\d+--/, "");

    // Replace hyphens and underscores with spaces
    title = title.replace(/[-_]/g, " ");

    return title || "Gallery Photo";
}


// ======================================================
// 6. DISPLAY PHOTOS
// ======================================================

function displayPhotos() {
    if (!photoGrid) return;

    const searchTerm = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const selectedCategory = categoryFilter
        ? categoryFilter.value.toLowerCase()
        : "all";

    const filteredPhotos = galleryPhotos.filter(photo => {

        const matchesSearch =
            photo.title.toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            photo.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    photoGrid.innerHTML = "";

    if (filteredPhotos.length === 0) {
        photoGrid.innerHTML = "<p>No photos found.</p>";
        return;
    }

    filteredPhotos.forEach(photo => {

        const card = document.createElement("div");
        card.className = "photo-card";

        const image = document.createElement("img");
        image.src = photo.url;
        image.alt = photo.title;
        image.loading = "lazy";
        image.style.cursor = "pointer";

        const title = document.createElement("h3");
        title.textContent = photo.title;

        const category = document.createElement("p");
        category.textContent = `Category: ${photo.category}`;

const editButton = document.createElement("button");
editButton.textContent = "Edit Details";
editButton.className = "edit-button";

editButton.addEventListener("click", () => {
    editPhoto(photo);
});

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Photo";
        deleteButton.className = "delete-button";

        // Open photo viewer when image is clicked
        image.addEventListener("click", () => {
            openPhotoViewer(photo);
        });

        // Delete photo
        deleteButton.addEventListener("click", () => {
            deletePhoto(photo);
        });

        
card.appendChild(image);
card.appendChild(title);
card.appendChild(category);
card.appendChild(editButton);
card.appendChild(deleteButton);

        photoGrid.appendChild(card);
    });
    
// ======================================================
// EDIT PHOTO TITLE AND CATEGORY
// ======================================================

async function editPhoto(photo) {

    // Ask for the new photo title
    const newTitle = prompt(
        "Enter the new photo title:",
        photo.title
    );

    if (newTitle === null) return;

    const cleanTitle = newTitle.trim();

    if (!cleanTitle) {
        alert("Photo title cannot be empty.");
        return;
    }

    // Ask for the new category
    const newCategory = prompt(
        "Enter category: nature, people, travel, events, other",
        photo.category
    );

    if (newCategory === null) return;

    const cleanCategory = newCategory.trim().toLowerCase();

    if (!CATEGORIES.includes(cleanCategory)) {
        alert("Invalid category. Please enter nature, people, travel, events or other.");
        return;
    }

    // Get the original file extension
    const extension = photo.name.split(".").pop().toLowerCase();

    // Create a safe filename
    const safeTitle = cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const newFilename = `${Date.now()}--${safeTitle}.${extension}`;

    const newPath = `${cleanCategory}/${newFilename}`;

    try {

        // Download the existing image from storage
        const { data: imageFile, error: downloadError } =
            await client.storage
                .from(BUCKET_NAME)
                .download(photo.path);

        if (downloadError) throw downloadError;

        // Upload the same image using the new title and category
        const { error: uploadError } = await client.storage
            .from(BUCKET_NAME)
            .upload(newPath, imageFile, {
                contentType: imageFile.type || "application/octet-stream",
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Remove the old image after the new one uploads successfully
        const { error: deleteError } = await client.storage
            .from(BUCKET_NAME)
            .remove([photo.path]);

        if (deleteError) {

            // Attempt to remove the new copy if the old one could not be deleted
            await client.storage
                .from(BUCKET_NAME)
                .remove([newPath]);

            throw deleteError;
        }

        alert("Photo details updated successfully!");

        // Reload the gallery
        await loadPhotos();

    } catch (error) {

        console.error("Photo editing error:", error);

        alert("Could not update photo: " + error.message);
    }
}

}


// ======================================================
// 7. UPDATE DASHBOARD STATISTICS
// ======================================================

function updateStatistics() {

    const totalPhotos = galleryPhotos.length;

    const categoriesUsed = new Set(
        galleryPhotos.map(photo => photo.category)
    );

    const photoCountElement = document.getElementById("totalPhotos");
    const categoryCountElement = document.getElementById("totalCategories");

    if (photoCountElement) {
        photoCountElement.textContent = totalPhotos;
    }

    if (categoryCountElement) {
        categoryCountElement.textContent = CATEGORIES.length;
    }

    const bucketElement = document.getElementById("bucketStatus");

    if (bucketElement) {
        bucketElement.textContent = "Connected";
    }
}


// ======================================================
// 8. UPLOAD NEW PHOTO
// ======================================================

if (uploadButton) {
    uploadButton.addEventListener("click", uploadPhoto);
}

async function uploadPhoto(event) {

    if (event) event.preventDefault();

    const title = photoTitleInput.value.trim();
    const category = photoCategoryInput.value.toLowerCase();
    const file = photoFileInput.files[0];

    if (!title) {
        showStatus("Please enter a photo title.", "error");
        return;
    }

    if (!CATEGORIES.includes(category)) {
        showStatus("Please select a valid category.", "error");
        return;
    }

    if (!file) {
        showStatus("Please choose a photo.", "error");
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
        showStatus("Only JPG, PNG, WEBP and GIF images are allowed.", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showStatus("Your photo must not exceed 5 MB.", "error");
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";

    showStatus("Uploading your photo...", "info");

    try {

        const extension = file.name.split(".").pop().toLowerCase();

        const safeTitle = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const filename =
            `${Date.now()}--${safeTitle}.${extension}`;

        const filePath = `${category}/${filename}`;

        const { error } = await client.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (error) throw error;

        showStatus("Photo uploaded successfully!", "success");

        photoTitleInput.value = "";
        photoFileInput.value = "";

        await loadPhotos();

    } catch (error) {
        console.error("Upload error:", error);
        showStatus("Upload failed: " + error.message, "error");

    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload Photo";
    }
}


// ======================================================
// 9. FULL-SIZE PHOTO VIEWER
// ======================================================

const imageViewer = document.getElementById("imageViewer");
const fullSizeImage = document.getElementById("fullSizeImage");
const fullSizeTitle = document.getElementById("fullSizeTitle");
const closeViewer = document.getElementById("closeViewer");
const downloadPhoto = document.getElementById("downloadPhoto");

let selectedPhoto = null;

function openPhotoViewer(photo) {

    if (!imageViewer || !fullSizeImage) return;

    selectedPhoto = photo;

    fullSizeImage.src = photo.url;
    fullSizeImage.alt = photo.title;

    if (fullSizeTitle) {
        fullSizeTitle.textContent = photo.title;
    }

    if (downloadPhoto) {
        downloadPhoto.href = photo.url;
        downloadPhoto.download = photo.name;
    }

    imageViewer.classList.add("active");
}


// ======================================================
// 10. DOWNLOAD FULL-SIZE PHOTO
// ======================================================

if (downloadPhoto) {

    downloadPhoto.addEventListener("click", async function(event) {

        event.preventDefault();

        if (!selectedPhoto) {
            alert("Please select a photo first.");
            return;
        }

        try {

            const response = await fetch(selectedPhoto.url);

            if (!response.ok) {
                throw new Error("Unable to retrieve photo.");
            }

            const blob = await response.blob();

            const objectURL = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = objectURL;
            link.download = selectedPhoto.name;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(objectURL);
            }, 2000);

        } catch (error) {

            console.error("Download error:", error);

            // Fallback: open the public photo URL
            window.open(selectedPhoto.url, "_blank");

            alert("Your browser could not download the file directly. The photo has been opened in a new tab.");
        }
    });
}


// ======================================================
// 11. CLOSE PHOTO VIEWER
// ======================================================

function closePhotoViewer() {

    if (!imageViewer) return;

    imageViewer.classList.remove("active");

    if (fullSizeImage) {
        fullSizeImage.src = "";
    }

    selectedPhoto = null;
}

if (closeViewer) {
    closeViewer.addEventListener("click", closePhotoViewer);
}

if (imageViewer) {

    imageViewer.addEventListener("click", function(event) {

        if (event.target === imageViewer) {
            closePhotoViewer();
        }
    });
}

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        closePhotoViewer();
    }
});


// ======================================================
// 12. DELETE PHOTO
// ======================================================

async function deletePhoto(photo) {

    const confirmed = confirm(
        `Are you sure you want to delete "${photo.title}"?`
    );

    if (!confirmed) return;

    try {

        const { error } = await client.storage
            .from(BUCKET_NAME)
            .remove([photo.path]);

        if (error) throw error;

        alert("Photo deleted successfully!");

        await loadPhotos();

    } catch (error) {

        console.error("Delete error:", error);

        alert("Could not delete photo: " + error.message);
    }
}


// ======================================================
// 13. SEARCH AND CATEGORY FILTER
// ======================================================

if (searchInput) {
    searchInput.addEventListener("input", displayPhotos);
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", displayPhotos);
}


// ======================================================
// 14. LOGOUT
// ======================================================

async function logout() {

    const confirmed = confirm("Are you sure you want to sign out?");

    if (!confirmed) return;

    const { error } = await client.auth.signOut();

    if (error) {
        alert("Could not sign out. Please try again.");
        console.error(error);
        return;
    }

    window.location.href = "index.html";
}

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

if (logoutButtonTop) {
    logoutButtonTop.addEventListener("click", logout);
}


// ======================================================
// 15. STATUS MESSAGE
// ======================================================

function showStatus(message, type) {

    if (!uploadStatus) {
        console.log(message);
        return;
    }

    uploadStatus.textContent = message;

    uploadStatus.className = "upload-status " + type;
}
