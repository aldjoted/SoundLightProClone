@echo off
REM Batch file to run Django manage.py with UTF-8 encoding
REM This prevents UnicodeDecodeError on Windows systems with cp1252 locale

SET PYTHONIOENCODING=utf-8
SET PYTHONUTF8=1
SET PGCLIENTENCODING=UTF8

python manage.py %*
