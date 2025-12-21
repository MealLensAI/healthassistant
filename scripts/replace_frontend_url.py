#!/usr/bin/env python3

"""
Script to replace __FRONTEND_URL__ placeholder in HTML files with actual FRONTEND_URL
Usage: python scripts/replace_frontend_url.py
"""

import os
import sys

# Get FRONTEND_URL from environment or use localhost as fallback
frontend_url = os.environ.get('FRONTEND_URL') or os.environ.get('VITE_FRONTEND_URL') or 'http://localhost:5173'

# Files to process
files_to_process = [
    'frontend/index.html',
    'backend/frontend/index.html'
]

print(f"Replacing __FRONTEND_URL__ with: {frontend_url}")

for file_path in files_to_process:
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace all instances of __FRONTEND_URL__ with actual URL
            content = content.replace('__FRONTEND_URL__', frontend_url)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Updated {file_path}")
        except Exception as e:
            print(f"❌ Error processing {file_path}: {str(e)}")
            sys.exit(1)
    else:
        print(f"⚠️  File not found: {file_path}")

print("✅ Frontend URL replacement complete!")