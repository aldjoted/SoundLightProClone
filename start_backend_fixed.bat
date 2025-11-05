@echo off
REM Start the Django backend server with virtual environment activated

cd backend
IF EXIST "venv\Scripts\activate.bat" (
    CALL venv\Scripts\activate.bat
)
python manage.py runserver
