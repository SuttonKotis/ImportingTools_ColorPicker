class ColorPicker {
    constructor() {
        this.images = [];
        this.currentImageIndex = 0;
        this.pickingMode = false;
        this.activeRowIndex = -1;
        this.colors = [];
        this.isCollapsed = false;
        this.csvFileName = null;

        // Canvas elements
        this.imageCanvas = document.getElementById('imageCanvas');
        this.ctx = this.imageCanvas.getContext('2d');
        this.magnifier = document.getElementById('magnifier');
        this.magnifierCanvas = document.getElementById('magnifierCanvas');
        this.magnifierCtx = this.magnifierCanvas.getContext('2d');

        // Zoom and pan
        this.scale = 1;
        this.minScale = 0.1;
        this.maxScale = 5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        this.magnifierCanvas.width = 150;
        this.magnifierCanvas.height = 150;

        this.init();
    }

    init() {
        // Button listeners
        document.getElementById('loadImagesBtn').addEventListener('click', () => this.loadImages());
        document.getElementById('loadCSVBtn').addEventListener('click', () => this.loadCSV());
        document.getElementById('exportCSVBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('clearColorsBtn').addEventListener('click', () => this.clearColors());
        document.getElementById('toggleCollapseBtn').addEventListener('click', () => this.toggleCollapse());

        // Navigation buttons
        document.getElementById('prevImageBtn').addEventListener('click', () => this.previousImage());
        document.getElementById('nextImageBtn').addEventListener('click', () => this.nextImage());

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.resetZoom());

        // File input listeners
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImagesLoad(e));
        document.getElementById('csvInput').addEventListener('change', (e) => this.handleCSVLoad(e));

        // Canvas mouse events
        this.imageCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.imageCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.imageCanvas.addEventListener('mouseleave', () => this.hideMagnifier());
        this.imageCanvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Middle mouse pan
        this.imageCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.imageCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        const btn = document.getElementById('toggleCollapseBtn');
        const panel = document.getElementById('tablePanel');
        const fullHeader = document.getElementById('tableHeaderFull');
        const collapsedHeader = document.getElementById('tableHeaderCollapsed');

        if (this.isCollapsed) {
            btn.textContent = 'Expand';
            panel.classList.add('collapsed');
            fullHeader.style.display = 'none';
            collapsedHeader.style.display = 'table-row';
        } else {
            btn.textContent = 'Collapse';
            panel.classList.remove('collapsed');
            fullHeader.style.display = 'table-row';
            collapsedHeader.style.display = 'none';
        }

        this.renderTable();
    }

    loadImages() {
        document.getElementById('imageInput').click();
    }

    handleImagesLoad(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        this.images = [];
        let loadedCount = 0;

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    this.images[index] = {
                        element: img,
                        name: file.name
                    };
                    loadedCount++;

                    if (loadedCount === files.length) {
                        this.currentImageIndex = 0;
                        this.displayCurrentImage();
                        this.updateImageIndicator();
                        this.setStatus(`Loaded ${files.length} image(s)`, 'success');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    displayCurrentImage() {
        if (!this.images.length) return;

        const img = this.images[this.currentImageIndex].element;
        const container = document.getElementById('imageContainer');

        // Set canvas size to container size
        const rect = container.getBoundingClientRect();
        this.imageCanvas.width = rect.width - 40;
        this.imageCanvas.height = rect.height - 40;

        this.originalImage = img;
        this.resetZoom();
        this.render();

        this.imageCanvas.style.display = 'block';
        container.querySelector('.empty-state').style.display = 'none';

        // Enable navigation buttons
        document.getElementById('prevImageBtn').disabled = this.currentImageIndex === 0;
        document.getElementById('nextImageBtn').disabled = this.currentImageIndex === this.images.length - 1;
    }

    render() {
        if (!this.originalImage) return;

        const canvas = this.imageCanvas;
        const ctx = this.ctx;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply transformations
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(this.offsetX, this.offsetY);

        // Draw image centered
        const imgWidth = this.originalImage.width;
        const imgHeight = this.originalImage.height;

        const x = (canvas.width - imgWidth) / 2;
        const y = (canvas.height - imgHeight) / 2;

        ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);

        // Restore context state
        ctx.restore();
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.imageCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(this.scale * delta, this.minScale), this.maxScale);

        if (newScale !== this.scale) {
            // Calculate zoom point
            const zoomPointX = (mouseX - this.imageCanvas.width / 2) / this.scale;
            const zoomPointY = (mouseY - this.imageCanvas.height / 2) / this.scale;

            this.scale = newScale;

            // Adjust offset to zoom towards mouse position
            const newZoomPointX = (mouseX - this.imageCanvas.width / 2) / this.scale;
            const newZoomPointY = (mouseY - this.imageCanvas.height / 2) / this.scale;

            this.offsetX += (newZoomPointX - zoomPointX) * this.scale;
            this.offsetY += (newZoomPointY - zoomPointY) * this.scale;

            this.render();
            this.updateZoomLevel();
        }
    }

    handleMouseDown(e) {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.imageCanvas.style.cursor = 'grabbing';
        }
    }

    handleMouseUp(e) {
        if (e.button === 1) { // Middle mouse button
            this.isPanning = false;
            this.imageCanvas.style.cursor = this.pickingMode ? 'crosshair' : 'default';
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const deltaX = e.clientX - this.panStartX;
            const deltaY = e.clientY - this.panStartY;

            this.offsetX += deltaX;
            this.offsetY += deltaY;

            this.panStartX = e.clientX;
            this.panStartY = e.clientY;

            this.render();
            return;
        }

        if (!this.originalImage || !this.pickingMode) {
            this.hideMagnifier();
            return;
        }

        const rect = this.imageCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Transform canvas coordinates to image coordinates
        const imgCoords = this.canvasToImageCoords(canvasX, canvasY);

        if (imgCoords.x >= 0 && imgCoords.x < this.originalImage.width &&
            imgCoords.y >= 0 && imgCoords.y < this.originalImage.height) {
            this.showMagnifier(imgCoords.x, imgCoords.y, e.clientX, e.clientY);
            this.imageCanvas.style.cursor = 'crosshair';
        } else {
            this.hideMagnifier();
        }
    }

    canvasToImageCoords(canvasX, canvasY) {
        const canvas = this.imageCanvas;

        // Reverse the transformations
        let x = canvasX;
        let y = canvasY;

        // Remove offset
        x -= this.offsetX;
        y -= this.offsetY;

        // Remove scale from center
        x -= canvas.width / 2;
        y -= canvas.height / 2;
        x /= this.scale;
        y /= this.scale;
        x += canvas.width / 2;
        y += canvas.height / 2;

        // Adjust for image position
        const imgX = (canvas.width - this.originalImage.width) / 2;
        const imgY = (canvas.height - this.originalImage.height) / 2;

        x -= imgX;
        y -= imgY;

        return { x: Math.floor(x), y: Math.floor(y) };
    }

    showMagnifier(imgX, imgY, clientX, clientY) {
        // Create temporary canvas for sampling from original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.originalImage, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, this.originalImage.width, this.originalImage.height);

        // Sample 3x3 area centered on cursor
        let r = 0, g = 0, b = 0;
        let validPixels = 0;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const px = imgX + dx;
                const py = imgY + dy;

                if (px >= 0 && px < this.originalImage.width &&
                    py >= 0 && py < this.originalImage.height) {
                    const idx = (py * this.originalImage.width + px) * 4;
                    r += imageData.data[idx];
                    g += imageData.data[idx + 1];
                    b += imageData.data[idx + 2];
                    validPixels++;
                }
            }
        }

        // Calculate average
        if (validPixels > 0) {
            r = Math.round(r / validPixels);
            g = Math.round(g / validPixels);
            b = Math.round(b / validPixels);
        }

        const hex = this.rgbToHex(r, g, b);

        // Draw magnified view
        const zoom = 10;
        const size = 15;

        this.magnifierCtx.imageSmoothingEnabled = false;
        this.magnifierCtx.clearRect(0, 0, 150, 150);

        // Draw zoomed pixels
        for (let dy = -Math.floor(size/2); dy <= Math.floor(size/2); dy++) {
            for (let dx = -Math.floor(size/2); dx <= Math.floor(size/2); dx++) {
                const px = imgX + dx;
                const py = imgY + dy;

                if (px >= 0 && px < this.originalImage.width &&
                    py >= 0 && py < this.originalImage.height) {
                    const idx = (py * this.originalImage.width + px) * 4;
                    const pixelColor = `rgb(${imageData.data[idx]}, ${imageData.data[idx + 1]}, ${imageData.data[idx + 2]})`;

                    this.magnifierCtx.fillStyle = pixelColor;
                    this.magnifierCtx.fillRect(
                        (dx + Math.floor(size/2)) * zoom,
                        (dy + Math.floor(size/2)) * zoom,
                        zoom,
                        zoom
                    );
                }
            }
        }

        // Draw 3x3 sampling area outline (centered on cursor)
        this.magnifierCtx.strokeStyle = '#fff';
        this.magnifierCtx.lineWidth = 2;
        this.magnifierCtx.strokeRect(
            Math.floor(size/2) * zoom - zoom * 1.5,
            Math.floor(size/2) * zoom - zoom * 1.5,
            3 * zoom,
            3 * zoom
        );

        // Draw center crosshair
        this.magnifierCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.magnifierCtx.lineWidth = 1;
        this.magnifierCtx.beginPath();
        this.magnifierCtx.moveTo(75, 0);
        this.magnifierCtx.lineTo(75, 150);
        this.magnifierCtx.moveTo(0, 75);
        this.magnifierCtx.lineTo(150, 75);
        this.magnifierCtx.stroke();

        // Update color info
        this.magnifier.querySelector('.color-swatch').style.backgroundColor = hex;
        this.magnifier.querySelector('.color-hex').textContent = hex;

        // Position magnifier
        this.magnifier.style.left = clientX + 20 + 'px';
        this.magnifier.style.top = clientY - 75 + 'px';
        this.magnifier.style.display = 'block';
    }

    hideMagnifier() {
        this.magnifier.style.display = 'none';
    }

    handleCanvasClick(e) {
        if (!this.pickingMode || !this.originalImage) return;

        const rect = this.imageCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const imgCoords = this.canvasToImageCoords(canvasX, canvasY);

        if (imgCoords.x >= 0 && imgCoords.x < this.originalImage.width &&
            imgCoords.y >= 0 && imgCoords.y < this.originalImage.height) {

            // Create temporary canvas for sampling
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.originalImage, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, this.originalImage.width, this.originalImage.height);

            // Sample 3x3 area
            let r = 0, g = 0, b = 0;
            let validPixels = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = imgCoords.x + dx;
                    const py = imgCoords.y + dy;

                    if (px >= 0 && px < this.originalImage.width &&
                        py >= 0 && py < this.originalImage.height) {
                        const idx = (py * this.originalImage.width + px) * 4;
                        r += imageData.data[idx];
                        g += imageData.data[idx + 1];
                        b += imageData.data[idx + 2];
                        validPixels++;
                    }
                }
            }

            if (validPixels > 0) {
                r = Math.round(r / validPixels);
                g = Math.round(g / validPixels);
                b = Math.round(b / validPixels);
            }

            const hex = this.rgbToHex(r, g, b);

            // Update the active row
            if (this.activeRowIndex >= 0 && this.activeRowIndex < this.colors.length) {
                this.colors[this.activeRowIndex]['HEX VALUE'] = hex;
                this.renderTable();

                const colorName = this.colors[this.activeRowIndex]['COLOR NAME'] || `Row ${this.activeRowIndex + 1}`;
                this.setStatus(`Picked ${hex} for ${colorName}`, 'success');
            }

            this.endPicking();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') {
            this.previousImage();
        } else if (e.key === 'ArrowRight') {
            this.nextImage();
        }
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.displayCurrentImage();
            this.updateImageIndicator();
        }
    }

    nextImage() {
        if (this.currentImageIndex < this.images.length - 1) {
            this.currentImageIndex++;
            this.displayCurrentImage();
            this.updateImageIndicator();
        }
    }

    updateImageIndicator() {
        const indicator = document.getElementById('imageIndicator');
        if (this.images.length > 0) {
            indicator.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        } else {
            indicator.textContent = 'No images';
        }
    }

    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, this.maxScale);
        this.render();
        this.updateZoomLevel();
    }

    zoomOut() {
        this.scale = Math.max(this.scale * 0.8, this.minScale);
        this.render();
        this.updateZoomLevel();
    }

    resetZoom() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
        this.updateZoomLevel();
    }

    updateZoomLevel() {
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
    }

    startPicking(rowIndex) {
        if (!this.images.length) {
            this.setStatus('Please load images first', 'error');
            return;
        }

        this.pickingMode = true;
        this.activeRowIndex = rowIndex;

        // Highlight active row
        document.querySelectorAll('#tableBody tr').forEach((tr, i) => {
            tr.classList.toggle('active', i === rowIndex);
        });

        const colorName = this.colors[rowIndex]['COLOR NAME'] || `Row ${rowIndex + 1}`;
        this.setStatus(`Picking color for ${colorName}. Click on the image to select a color.`, 'info');
    }

    endPicking() {
        this.pickingMode = false;
        this.activeRowIndex = -1;
        this.hideMagnifier();

        document.querySelectorAll('#tableBody tr').forEach(tr => {
            tr.classList.remove('active');
        });

        this.imageCanvas.style.cursor = 'default';
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        this.colors.forEach((color, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = index;
            tr.classList.add('clickable-row');

            // Check if row should be omitted (but still shown)
            const isOmitted = color['OMIT'] === 'X';
            if (isOmitted) {
                tr.style.opacity = '0.6';
            }

            if (this.isCollapsed) {
                // Collapsed view - only essential columns
                tr.innerHTML = `
                    <td class="factory-number">${color['FACTORY NUMBER'] || ''}</td>
                    <td class="color-name">${color['COLOR NAME'] || ''}</td>
                    <td class="preview-cell">
                        ${color['HEX VALUE'] ?
                            `<div class="color-preview" style="background-color: ${color['HEX VALUE']}"></div>
                             <span class="hex-value-small">${color['HEX VALUE']}</span>` :
                            '<span class="empty-color">No color</span>'}
                    </td>
                `;
            } else {
                // Full view - all columns
                tr.innerHTML = `
                    <td class="factory-number">${color['FACTORY NUMBER'] || ''}</td>
                    <td class="color-name">${color['COLOR NAME'] || ''}</td>
                    <td>${color['COLOR GROUP'] || ''}</td>
                    <td class="hex-value">${color['HEX VALUE'] || ''}</td>
                    <td class="preview-cell">
                        ${color['HEX VALUE'] ? `<div class="color-preview" style="background-color: ${color['HEX VALUE']}"></div>` : ''}
                    </td>
                `;
            }

            // Make row clickable
            tr.addEventListener('click', () => {
                this.startPicking(index);
            });

            tbody.appendChild(tr);
        });

        this.updateColorCount();
    }

    updateTableTitle() {
        const tableTitle = document.querySelector('.table-header h3');
        if (this.csvFileName) {
            // Remove .csv extension for cleaner display
            const displayName = this.csvFileName.replace(/\.csv$/i, '');
            tableTitle.textContent = `Color Table: ${displayName}`;
        } else {
            tableTitle.textContent = 'Color Table';
        }
    }

    clearColors() {
        if (!confirm('Clear all sampled colors? This cannot be undone.')) return;

        this.colors.forEach(color => {
            color['HEX VALUE'] = '';
        });

        this.renderTable();
        this.setStatus('All colors cleared', 'warning');
    }

    updateColorCount() {
        const count = this.colors.filter(c => c['HEX VALUE']).length;
        document.getElementById('colorCount').textContent = `${count} colors`;
    }

    loadCSV() {
        document.getElementById('csvInput').click();
    }

    handleCSVLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.csvFileName = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            this.parseCSV(csv);
        };
        reader.readAsText(file);
    }

    parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            this.setStatus('Invalid CSV file', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        this.colors = [];

        // Check for required columns
        const requiredColumns = ['FACTORY NUMBER', 'COLOR NAME', 'COLOR GROUP'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
            // Show CSV cleaner dialog
            this.showCSVCleaner(headers, lines);
            return;
        }

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            // Ensure HEX VALUE column exists
            if (!row.hasOwnProperty('HEX VALUE')) {
                row['HEX VALUE'] = '';
            }

            this.colors.push(row);
        }

        this.renderTable();
        this.updateTableTitle();
        this.setStatus(`Loaded ${this.colors.length} colors from CSV`, 'success');
    }

    showCSVCleaner(headers, lines) {
        const modal = document.createElement('div');
        modal.className = 'csv-cleaner-modal';
        modal.innerHTML = `
            <div class="csv-cleaner-content">
                <h3>CSV Compatibility Check</h3>
                <p>Your CSV file is missing some required columns for the color picker.</p>
                <div class="csv-cleaner-info">
                    <p><strong>Current columns:</strong> ${headers.join(', ')}</p>
                    <p><strong>Required columns:</strong> FACTORY NUMBER, COLOR NAME, COLOR GROUP</p>
                </div>
                <p>Would you like to add the missing columns automatically?</p>
                <div class="csv-cleaner-buttons">
                    <button id="csvCleanerYes" class="btn btn-primary">Yes, Add Columns</button>
                    <button id="csvCleanerNo" class="btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('csvCleanerYes').addEventListener('click', () => {
            this.cleanCSV(headers, lines);
            document.body.removeChild(modal);
        });

        document.getElementById('csvCleanerNo').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.setStatus('CSV import cancelled', 'warning');
        });
    }

    cleanCSV(originalHeaders, lines) {
        const requiredColumns = ['FACTORY NUMBER', 'COLOR NAME', 'COLOR GROUP', 'OMIT'];
        const headers = [...originalHeaders];

        // Add missing required columns
        requiredColumns.forEach(col => {
            if (!headers.includes(col)) {
                headers.push(col);
            }
        });

        this.colors = [];

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};

            // Map original data
            originalHeaders.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            // Add default values for required columns
            if (!row['FACTORY NUMBER']) {
                row['FACTORY NUMBER'] = i.toString();
            }
            if (!row['COLOR NAME']) {
                // Try to use first column as color name if it exists
                row['COLOR NAME'] = values[0] || `Color ${i}`;
            }
            if (!row['COLOR GROUP']) {
                row['COLOR GROUP'] = '';
            }
            if (!row['OMIT']) {
                row['OMIT'] = '';
            }
            if (!row['HEX VALUE']) {
                row['HEX VALUE'] = '';
            }

            this.colors.push(row);
        }

        this.renderTable();
        this.updateTableTitle();
        this.setStatus(`CSV cleaned and loaded with ${this.colors.length} colors`, 'success');
    }

    exportCSV() {
        if (this.colors.length === 0) {
            this.setStatus('No data to export', 'error');
            return;
        }

        // Get all unique headers including HEX VALUE
        const headers = new Set();
        this.colors.forEach(row => {
            Object.keys(row).forEach(key => headers.add(key));
        });

        // Ensure HEX VALUE is included
        headers.add('HEX VALUE');

        const headerArray = Array.from(headers);
        let csv = headerArray.join(',') + '\n';

        this.colors.forEach(color => {
            const values = headerArray.map(header => {
                const value = color[header] || '';
                // Escape commas and quotes in values
                if (value.includes(',') || value.includes('"')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Use loaded CSV filename with _with_hex suffix
        let downloadName = 'colors_with_hex.csv';
        if (this.csvFileName) {
            const baseName = this.csvFileName.replace(/\.csv$/i, '');
            downloadName = `${baseName}_with_hex.csv`;
        }
        a.download = downloadName;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.setStatus('CSV exported successfully', 'success');
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    setStatus(message, type = 'info') {
        const statusBar = document.getElementById('statusBar');
        statusBar.textContent = message;
        statusBar.className = `status-bar ${type}`;

        if (type === 'success') {
            setTimeout(() => {
                statusBar.className = 'status-bar';
                statusBar.textContent = 'Ready';
            }, 3000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ColorPicker();
});