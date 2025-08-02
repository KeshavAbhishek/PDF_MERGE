// --- THEME TOGGLE SCRIPT ---

document.addEventListener('DOMContentLoaded', () => {
    const themeCheckbox = document.getElementById('theme-checkbox');
    const darkThemeStyle = document.getElementById('dark-theme-style');

    // Function to apply the selected theme
    const applyTheme = (isDarkMode) => {
        // Enable or disable the dark theme stylesheet
        darkThemeStyle.disabled = !isDarkMode;
        
        // Toggle class on body for specific JS/CSS hooks if needed
        document.body.classList.toggle('dark-mode', isDarkMode);

        // Sync the checkbox state
        themeCheckbox.checked = isDarkMode;
    };

    // Event listener for the toggle switch
    themeCheckbox.addEventListener('change', () => {
        const isDarkMode = themeCheckbox.checked;
        applyTheme(isDarkMode);
        // Save the user's preference in localStorage
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Check for a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme === 'dark');
    } else {
        // If no theme is saved, default based on time (it's night in your location)
        const hour = new Date().getHours();
        const isNight = hour >= 18 || hour < 6;
        applyTheme(isNight);
        localStorage.setItem('theme', isNight ? 'dark' : 'light');
    }
});


class PDFMerger {
    constructor() {
        this.files = [];
        this.initializeElements();
        this.setupEventListeners();
        // this.initializeSortable();
    }

    initializeElements() {
        this.dropArea = document.getElementById('drop-area');
        this.fileInput = document.getElementById('pdf_files');
        this.filesContainer = document.getElementById('files-container');
        this.emptyState = document.getElementById('empty-state');
        this.mergeBtn = document.getElementById('merge-btn');
        this.form = document.getElementById('pdf-form');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.progressFill = document.getElementById('progress-fill');
    }

    setupEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop events
        this.dropArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    initializeSortable() {
        new Sortable(this.filesContainer, {
            animation: 500,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            filter: '.empty-state',
            onEnd: (evt) => {
                // Skip if empty state was involved
                if (evt.item.classList.contains('empty-state')) return;
                
                // Reorder files array
                const movedFile = this.files.splice(evt.oldIndex, 1)[0];
                this.files.splice(evt.newIndex, 0, movedFile);
                this.updateFileOrder();
                this.showNotification('File reordered successfully', 'success');
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!this.dropArea.contains(e.relatedTarget)) {
            this.dropArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropArea.classList.remove('dragover');
        this.handleFiles(e.dataTransfer.files);
    }

    handleFiles(fileList) {
        const newFiles = Array.from(fileList).filter(file => {
            // Check if file is PDF
            if (file.type !== 'application/pdf') {
                this.showNotification('Only PDF files are allowed', 'error');
                return false;
            }
            
            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                this.showNotification('File size should not exceed 50MB', 'error');
                return false;
            }
            
            // Check for duplicate files
            const isDuplicate = this.files.some(existingFile => 
                existingFile.name === file.name && existingFile.size === file.size
            );
            
            if (isDuplicate) {
                this.showNotification(`File "${file.name}" is already added`, 'error');
                return false;
            }
            
            return true;
        });

        // Add new files to the array
        this.files = [...this.files, ...newFiles];
        this.renderFiles();
        this.updateMergeButton();
        
        if (newFiles.length > 0) {
            this.showNotification(`${newFiles.length} file(s) added successfully`, 'success');
        }
    }

    renderFiles() {
        if (this.files.length === 0) {
            setTimeout(() => {
                document.location.reload();
            }, 1500);
            this.emptyState.style.display = 'block';
            return;
        }

        this.emptyState.style.display = 'none';
        
        // Clear existing file cards except empty state
        const fileCards = this.filesContainer.querySelectorAll('.file-card');
        fileCards.forEach(card => card.remove());

        this.files.forEach((file, index) => {
            const fileCard = this.createFileCard(file, index);
            this.filesContainer.appendChild(fileCard);
        });

        this.updateFileOrder();
    }

    createFileCard(file, index) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="file-order">${index + 1}</div>
            <div class="drag-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="file-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="file-info">
                <div class="file-name" title="${file.name}">${file.name}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
            </div>
            <div class="reorder-controls">
                <button type="button" class="action-btn reorder-btn ${index === 0 ? 'disabled' : ''}" 
                        onclick="pdfMerger.moveFileUp(${index})" 
                        title="Move up" 
                        ${index === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button type="button" class="action-btn reorder-btn ${index === this.files.length - 1 ? 'disabled' : ''}" 
                        onclick="pdfMerger.moveFileDown(${index})" 
                        title="Move down" 
                        ${index === this.files.length - 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="file-actions">
                <button type="button" class="action-btn view-btn" onclick="pdfMerger.viewFile(${index})" title="Preview PDF">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="action-btn remove-btn" onclick="pdfMerger.removeFile(${index})" title="Remove file">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        return card;
    }

    updateFileOrder() {
        const orderElements = this.filesContainer.querySelectorAll('.file-order');
        orderElements.forEach((element, index) => {
            element.textContent = index + 1;
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index) {
        const removedFile = this.files[index];
        this.files.splice(index, 1);
        this.renderFiles();
        this.updateMergeButton();
        
        // Update file input
        const dt = new DataTransfer();
        this.files.forEach(file => dt.items.add(file));
        this.fileInput.files = dt.files;
        
        this.showNotification(`Removed "${removedFile.name}"`, 'success');
    }

    viewFile(index) {
        const file = this.files[index];
        const url = URL.createObjectURL(file);
        
        // Open in new tab
        const newWindow = window.open(url, '_blank');
        
        // Check if popup was blocked
        if (!newWindow) {
            this.showNotification('Popup blocked. Please allow popups to preview files.', 'error');
        }
        
        // Clean up URL after some time
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    moveFileUp(index) {
        if (index <= 0) return;
        
        // Swap files
        [this.files[index - 1], this.files[index]] = [this.files[index], this.files[index - 1]];
        
        // Re-render files with animation
        this.renderFiles();
        this.showNotification('File moved up', 'success');
    }

    moveFileDown(index) {
        if (index >= this.files.length - 1) return;
        
        // Swap files
        [this.files[index], this.files[index + 1]] = [this.files[index + 1], this.files[index]];
        
        // Re-render files with animation
        this.renderFiles();
        this.showNotification('File moved down', 'success');
    }

    updateMergeButton() {
        const fileCount = this.files.length;
        this.mergeBtn.disabled = fileCount < 2;
        
        if (fileCount === 0) {
            this.mergeBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>Select PDFs to merge';
        } else if (fileCount === 1) {
            this.mergeBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>Add at least 1 more PDF';
        } else {
            this.mergeBtn.innerHTML = `<i class="fas fa-compress-arrows-alt"></i>Merge ${fileCount} PDFs`;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.files.length < 2) {
            this.showNotification('Please select at least 2 PDF files', 'error');
            return;
        }

        this.showLoading();
        
        const formData = new FormData();
        this.files.forEach(file => formData.append('pdf_files', file));

        try {
            const response = await fetch('/merge', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                this.downloadFile(blob, `merged_${Date.now()}.pdf`);
                this.showNotification('PDFs merged successfully!', 'success');
                
                // Reset form after successful merge
                setTimeout(() => {
                    this.resetForm();
                }, 2000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to merge PDFs');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    resetForm() {
        this.files = [];
        this.renderFiles();
        this.updateMergeButton();
        this.fileInput.value = '';
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
        this.simulateProgress();
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
        this.progressFill.style.width = '0%';
    }

    simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) {
                clearInterval(interval);
                progress = 90;
            }
            this.progressFill.style.width = progress + '%';
        }, 200);
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    
}

// Initialize the PDF Merger
const pdfMerger = new PDFMerger();