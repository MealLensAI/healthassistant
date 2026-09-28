import pdfplumber
import sys

try:
    with pdfplumber.open("Untitled document (3).pdf") as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"--- Page {i+1} ---")
            print(page.extract_text())
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
