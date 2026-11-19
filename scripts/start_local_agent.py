"""Start installed local services without changing business data or existing flows."""
from pathlib import Path
import argparse, json, os, shutil, socket, subprocess, sys, time, urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local"
LOGS = LOCAL / "logs"
MODEL = "qwen3:4b-instruct-2507-q4_K_M"
parser = argparse.ArgumentParser()
parser.add_argument("--no-browser", action="store_true")
args = parser.parse_args()
LOGS.mkdir(parents=True, exist_ok=True)

def ready(url):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False

def port_open(port):
    with socket.socket() as client:
        client.settimeout(1)
        return client.connect_ex(("127.0.0.1", port)) == 0

def start(name, command, cwd, env, url, port, timeout):
    if ready(url):
        print(name + " sudah aktif.", flush=True)
        return
    if port_open(port):
        raise SystemExit(f"Port {port} sedang digunakan layanan lain. Periksa sebelum memulai {name}.")
    logfile = LOGS / (name.lower() + ".log")
    logfile.touch(mode=0o600, exist_ok=True); logfile.chmod(0o600)
    with logfile.open("ab") as log:
        child = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    (LOCAL / (name.lower() + ".pid")).write_text(str(child.pid))
    print("Menyalakan " + name + "…", flush=True)
    for _ in range(timeout):
        if ready(url):
            return
        if child.poll() is not None:
            raise SystemExit(f"{name} berhenti. Log: {logfile}")
        time.sleep(1)
    raise SystemExit(f"{name} masih belum siap. Log: {logfile}")

ollama = LOCAL / "ollama/ollama"
if not ollama.exists():
    raise SystemExit("Runtime lokal belum terpasang di proyek ini.")
env = os.environ.copy()
env.update(OLLAMA_HOST="127.0.0.1:11434", OLLAMA_MODELS=str(LOCAL / "models"), OLLAMA_NUM_PARALLEL="1", OLLAMA_CONTEXT_LENGTH="4096", OLLAMA_MAX_LOADED_MODELS="1", OLLAMA_NO_CLOUD="1")
start("Ollama", [str(ollama), "serve"], ROOT, env, "http://127.0.0.1:11434/api/version", 11434, 20)
with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=5) as response:
    models = json.load(response)["models"]
if not any(m["name"] == MODEL for m in models):
    raise SystemExit("Model asisten belum tersedia. Unduh " + MODEL + " pada Ollama lokal terlebih dahulu.")

langflow_python = Path.home() / ".langflow/.langflow-venv/bin/python"
langflow_data = LOCAL / "langflow"
langflow_data.mkdir(mode=0o700, exist_ok=True)
env = os.environ.copy()
env.update(LANGFLOW_DATABASE_URL="sqlite:///" + str(langflow_data / "database.db"), LANGFLOW_CONFIG_DIR=str(langflow_data), LANGFLOW_HOST="127.0.0.1", LANGFLOW_PORT="7870", LANGFLOW_AUTO_LOGIN="true", LANGFLOW_DO_NOT_TRACK="true", DO_NOT_TRACK="true")
start("Langflow", [str(langflow_python), "-m", "langflow", "run", "--host", "127.0.0.1", "--port", "7870", "--workers", "1", "--no-open-browser"], ROOT, env, "http://127.0.0.1:7870/health", 7870, 150)

if not ready("http://127.0.0.1:3000/login") and not (ROOT / ".next/BUILD_ID").exists():
    raise SystemExit("Aplikasi perlu dibangun dahulu: npm run build")
node = shutil.which("node")
if not node:
    raise SystemExit("Node.js tidak ditemukan. Buka dari Terminal yang biasa digunakan untuk ERP.")
start("ERP", [node, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3000"], ROOT, os.environ.copy(), "http://127.0.0.1:3000/login", 3000, 30)
print("\nAsisten siap. Buka http://127.0.0.1:3000, login, lalu klik logo robot.", flush=True)
if not args.no_browser:
    subprocess.run(["open", "http://127.0.0.1:3000"], check=False)
