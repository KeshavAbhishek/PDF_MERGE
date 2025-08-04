from flask import Flask, request, send_file, render_template, jsonify, url_for
import PyPDF2
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import logging

app = Flask(__name__)

# --- Configuration ---
# Define the folder to store uploaded files
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set a maximum file size for uploads (e.g., 100MB)
app.config['MAX_CONTENT_LENGTH'] = 100 * 100 * 1024 * 1024

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Ensure Upload Directory Exists ---
# Create the directory if it doesn't already exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    """Check if the uploaded file is a PDF."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def merge_pdfs_from_paths(pdf_paths, output_path):
    """Merge multiple PDF files from their file paths."""
    try:
        merger = PyPDF2.PdfMerger()
        for path in pdf_paths:
            try:
                merger.append(path)
                logger.info(f"Successfully added {os.path.basename(path)} to merger.")
            except Exception as e:
                logger.error(f"Error adding {os.path.basename(path)}: {str(e)}")
                # Raise an exception to be caught in the route
                raise Exception(f"Could not process file: {os.path.basename(path)}")

        # Write the merged PDF to the specified output path
        merger.write(output_path)
        merger.close()
        logger.info(f"Successfully merged PDFs into {os.path.basename(output_path)}")
        return output_path
    except Exception as e:
        logger.error(f"Error in merge_pdfs_from_paths: {str(e)}")
        # Re-raise the exception to be handled by the route's error handling
        raise e

@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge_pdfs_route():
    """Handle PDF merging requests."""
    try:
        if 'pdf_files' not in request.files:
            return jsonify({'error': 'No files part in the request'}), 400

        files = request.files.getlist('pdf_files')

        if not files or len(files) < 2:
            return jsonify({'error': 'At least 2 PDF files are required'}), 400

        saved_paths = []
        for file in files:
            if file and allowed_file(file.filename):
                # Sanitize the filename before saving
                filename = secure_filename(file.filename)
                path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(path)
                saved_paths.append(path)
            else:
                # If a file is not allowed, clean up any already saved files for this request
                for p in saved_paths:
                    os.remove(p)
                return jsonify({'error': f'Invalid file detected: {file.filename}'}), 400

        logger.info(f"Starting merge process for {len(saved_paths)} files.")

        # Generate a unique filename for the merged document
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        merged_filename = f"merged_document_{timestamp}.pdf"
        merged_output_path = os.path.join(app.config['UPLOAD_FOLDER'], merged_filename)

        # Perform the merge using the saved file paths
        merge_pdfs_from_paths(saved_paths, merged_output_path)

        # --- Cleanup ---
        # Remove the original uploaded files after a successful merge
        for path in saved_paths:
            try:
                os.remove(path)
                logger.info(f"Removed original file: {os.path.basename(path)}")
            except OSError as e:
                logger.error(f"Error removing file {os.path.basename(path)}: {e.strerror}")

        # Generate the download URL for the new route
        download_url = url_for('download_merged_file', filename=merged_filename)

        # Return a JSON response with the download link
        return jsonify({'download_url': download_url})

    except Exception as e:
        logger.error(f"Error in merge route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/downloadmerged/<filename>')
def download_merged_file(filename):
    """Serve the merged file for downloading."""
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(path):
        return send_file(path, as_attachment=True)
    else:
        logger.error(f"Download attempt for non-existent file: {filename}")
        return jsonify({'error': 'File not found. It may have been deleted.'}), 404

# --- Error Handlers ---
@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413

@app.errorhandler(Exception)
def handle_exception(e):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({'error': 'An unexpected error occurred'}), 500