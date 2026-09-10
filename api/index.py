import os
import sys

# Add repository root to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import GSTSimulationHandler, init_sqlite_db

# Initialize database
init_sqlite_db()

class handler(GSTSimulationHandler):
    pass
