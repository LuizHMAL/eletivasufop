import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
BACKEND_DIR = ROOT_DIR / "eletivasbknd"

for p in [str(ROOT_DIR), str(BACKEND_DIR), str(BACKEND_DIR / "src")]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from eletivasbknd.src.main import app
except ImportError:
    from src.main import app

