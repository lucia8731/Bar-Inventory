"""Run the API on loopback and the Next.js server on the platform port."""
import os
import signal
import subprocess
import sys
import time

if not os.environ.get('PUBLIC_APP_URL') and os.environ.get('RENDER_EXTERNAL_URL'):
    os.environ['PUBLIC_APP_URL'] = os.environ['RENDER_EXTERNAL_URL']
os.environ.setdefault('BACKEND_URL', 'http://127.0.0.1:8000')
children = []
stopping = False

def stop(signum, frame):
    global stopping
    stopping = True
    for child in children:
        if child.poll() is None:
            child.terminate()

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    children.append(subprocess.Popen(['/opt/venv/bin/python', '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000', '--no-access-log']))
    children.append(subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', os.environ.get('PORT', '10000')]))
    while not stopping and all(child.poll() is None for child in children):
        time.sleep(0.2)
finally:
    stop(None, None)
    for child in children:
        try: child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
sys.exit(0 if stopping and all(child.returncode in (0, -signal.SIGTERM) for child in children) else 1)
