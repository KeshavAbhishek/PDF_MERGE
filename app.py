from flask import Flask, request, send_file, render_template, jsonify
import PyPDF2
import io
import os
from werkzeug.utils import secure_filename
import tempfile
import logging

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 100 * 1024 * 1024  # 100MB max file size

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    """Check if the uploaded file is a PDF"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def merge_pdfs(pdf_files):
    """Merge multiple PDF files using PyPDF2"""
    try:
        merger = PyPDF2.PdfMerger()
        
        # Create a list to store file objects for cleanup
        file_objects = []
        
        for pdf_file in pdf_files:
            if pdf_file and allowed_file(pdf_file.filename):
                # Read the file content into memory
                pdf_content = io.BytesIO(pdf_file.read())
                file_objects.append(pdf_content)
                
                # Reset the file pointer
                pdf_content.seek(0)
                
                try:
                    # Append the PDF to the merger
                    merger.append(pdf_content)
                    logger.info(f"Successfully added {pdf_file.filename} to merger")
                except Exception as e:
                    logger.error(f"Error adding {pdf_file.filename}: {str(e)}")
                    raise Exception(f"Error processing {pdf_file.filename}: {str(e)}")
        
        if len(file_objects) == 0:
            raise Exception("No valid PDF files found")
        
        # Create output buffer
        output_buffer = io.BytesIO()
        
        # Write merged PDF to buffer
        merger.write(output_buffer)
        merger.close()
        
        # Reset buffer position to beginning
        output_buffer.seek(0)
        
        logger.info(f"Successfully merged {len(file_objects)} PDF files")
        return output_buffer
        
    except Exception as e:
        logger.error(f"Error in merge_pdfs: {str(e)}")
        raise e

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge_pdfs_route():
    """Handle PDF merging requests"""
    try:
        # Check if files were uploaded
        if 'pdf_files' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('pdf_files')
        
        if not files or len(files) < 2:
            return jsonify({'error': 'At least 2 PDF files are required'}), 400
        
        # Validate all files are PDFs
        for file in files:
            if not file or file.filename == '':
                return jsonify({'error': 'Empty file detected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': f'File {file.filename} is not a PDF'}), 400
        
        logger.info(f"Starting merge process for {len(files)} files")
        
        # Merge the PDFs
        merged_pdf = merge_pdfs(files)
        
        # Generate filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"merged_document_{timestamp}.pdf"
        
        # Return the merged PDF
        return send_file(
            merged_pdf,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"Error in merge route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413

@app.errorhandler(Exception)
def handle_exception(e):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({'error': 'An unexpected error occurred'}), 500

# if __name__ == '__main__':
#     # Ensure required packages are installed
#     try:
#         import PyPDF2
#     except ImportError:
#         print("PyPDF2 is not installed. Please install it using:")
#         print("pip install PyPDF2")
#         exit(1)
    
#     # Run the Flask app
#     app.run(debug=True)