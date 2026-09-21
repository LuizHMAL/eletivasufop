# Exposição de app para compatibilidade com uvicorn main:app
try:
    from .index import app
except ImportError:
    from index import app

__all__ = ["app"]

