document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusArea = document.getElementById('status-area');
    const previewGallery = document.getElementById('preview-gallery');

    // --- State Management ---
    let uploadedFiles = [];

    // --- Load the overlay template ---
    const layoutTemplate = new Image();
    // Use a cross-origin attribute if your image is hosted elsewhere, though not needed for local files.
    // layoutTemplate.crossOrigin = "Anonymous"; 
    layoutTemplate.onload = () => console.log("Layout template loaded successfully.");
    layoutTemplate.onerror = () => alert("CRITICAL ERROR: Could not load 'posting-layout.png'. Please check the file name and path.");
    layoutTemplate.src = 'posting-layout.png';

    // --- Core Logic ---

    function initializeState() {
        uploadedFiles = [];
        previewGallery.innerHTML = '';
        statusArea.textContent = '';
        generateBtn.disabled = true;
        fileInput.value = ''; // Reset file input
    }

    function handleFiles(files) {
        initializeState();
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        uploadedFiles = imageFiles;
        statusArea.textContent = `${uploadedFiles.length} photo(s) are ready to be processed.`;
        generateBtn.disabled = false;
        
        // Generate simple blob URL previews for the gallery to show what's been uploaded
        uploadedFiles.forEach(file => {
            const thumb = document.createElement('img');
            thumb.src = URL.createObjectURL(file);
            thumb.onload = () => URL.revokeObjectURL(thumb.src); // Free up memory
            previewGallery.appendChild(thumb);
        });
    }

    // This helper function loads a single file and returns a Promise
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(`Image load error for: ${file.name}`);
                img.src = reader.result;
            };
            reader.onerror = () => reject(`FileReader error for: ${file.name}`);
            reader.readAsDataURL(file);
        });
    }

    function drawCoverImage(img) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for each new image
        const canvasAspectRatio = canvas.width / canvas.height;
        const imgAspectRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspectRatio > canvasAspectRatio) {
            drawHeight = canvas.height;
            drawWidth = drawHeight * imgAspectRatio;
            drawX = -(drawWidth - canvas.width) / 2;
            drawY = 0;
        } else {
            drawWidth = canvas.width;
            drawHeight = drawWidth / imgAspectRatio;
            drawX = 0;
            drawY = -(drawHeight - canvas.height) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.drawImage(layoutTemplate, 0, 0, canvas.width, canvas.height);
    }

    async function generateAndZipFiles() {
        if (uploadedFiles.length === 0) return;

        generateBtn.disabled = true;
        resetBtn.disabled = true;
        const zip = new JSZip();
        previewGallery.innerHTML = ''; // Clear initial previews to show final generated ones

        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            statusArea.textContent = `Processing image ${i + 1} of ${uploadedFiles.length}: ${file.name}`;
            
            try {
                const image = await loadImage(file);
                drawCoverImage(image);

                // Add the generated image to the zip file
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const fileName = `layout_${String(i + 1).padStart(3, '0')}.png`;
                zip.file(fileName, blob);

                // Add a preview of the *final* generated layout to the gallery
                const previewImg = document.createElement('img');
                previewImg.src = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG for smaller preview size
                previewGallery.appendChild(previewImg);

            } catch (error) {
                console.error(error);
                // Optionally show an error preview
            }
        }

        statusArea.textContent = "Zipping files... please wait.";

        // Generate the zip file and trigger the download
        zip.generateAsync({ type: "blob" })
            .then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = "generated_layouts.zip";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                statusArea.textContent = "All done! Your .zip file has been downloaded.";
                resetBtn.disabled = false;
            });
    }

    // --- Event Listeners ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    resetBtn.addEventListener('click', initializeState);
    generateBtn.addEventListener('click', generateAndZipFiles);

    // --- Initialize on page load ---
    initializeState();
});