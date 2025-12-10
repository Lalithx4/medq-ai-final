@echo off
echo Starting CDSS Backend on port 8000...
cd /d "%~dp0"
call venv\Scripts\activate.bat
python cdss_backend.py
