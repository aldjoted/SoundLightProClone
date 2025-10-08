#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Set UTF-8 encoding for Windows to prevent UnicodeDecodeError
# This MUST be done before importing Django or psycopg2
if sys.platform == 'win32':
    # Force UTF-8 encoding globally
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'
    os.environ['PGCLIENTENCODING'] = 'UTF8'
    
    # Monkey-patch locale.getpreferredencoding to always return UTF-8
    # This prevents psycopg2 from reading the Windows cp1252 locale
    import locale
    _original_getpreferredencoding = locale.getpreferredencoding
    
    def _patched_getpreferredencoding(do_setlocale=True):
        return 'UTF-8'
    
    locale.getpreferredencoding = _patched_getpreferredencoding
    
    # Force UTF-8 for stdout/stderr
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()