@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
python -m war_room_adk.main
