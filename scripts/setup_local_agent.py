"""Create/update only this project's private Langflow flow; keep secrets local."""
from pathlib import Path
import copy, json, os, secrets, urllib.request, urllib.error

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ARUNA_LANGFLOW_URL", "http://127.0.0.1:7870").rstrip("/")
LOCAL = ROOT / ".local"
LOCAL.mkdir(exist_ok=True)
STATE = LOCAL / "agent-setup.json"

def request(path, body=None, method=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never print credentials or a response that might echo them.
        raise SystemExit(f"Langflow request {path} failed (HTTP {error.code}).") from None

auth = request("/api/v1/auto_login")
TOKEN = auth["access_token"]
catalog = request("/api/v1/all", token=TOKEN)

def custom(filename, tool_mode=False):
    code = (ROOT / "docs/agent-langflow-gratis" / filename).read_text()
    result = request("/api/v1/custom_component", {"code": code}, token=TOKEN)
    node = result["data"]
    if tool_mode:
        node = request("/api/v1/custom_component/update", {"code": code, "frontend_node": node, "template": node["template"], "field": "tool_mode", "field_value": True, "tool_mode": True}, token=TOKEN)
    return result["type"], node

def node(type_name, template, short, x, y, values=None):
    ident = f"{type_name}-{short}"
    template = copy.deepcopy(template)
    for field, value in (values or {}).items():
        template["template"][field]["value"] = value
    return {"id": ident, "type": "genericNode", "position": {"x": x, "y": y}, "data": {"id": ident, "type": type_name, "node": template}}

tool_type, tool_node = custom("aruna_erp_tool.py", True)
model_type, model_node = custom("aruna_local_model.py")
chat = node("ChatInput", catalog["input_output"]["ChatInput"], "Aruna", 0, 0)
model = node(model_type, model_node, "Aruna", 0, 400)
tool = node(tool_type, tool_node, "Aruna", 400, 600)
agent = node("Agent", catalog["models_and_agents"]["Agent"], "Aruna", 800, 0, {
    "system_prompt": "Anda Aruna, asisten ERP. Buka chat dari ERP setelah login agar izin dan instruksi pengguna diterapkan. Jawab dalam bahasa Indonesia. Jangan mengarang data perusahaan. /no_think",
    "max_iterations": 5, "max_tokens": 800, "n_messages": 4, "stream": False,
    "add_calculator_tool": False, "add_current_date_tool": False,
})
output = node("ChatOutput", catalog["input_output"]["ChatOutput"], "Aruna", 1250, 0)

def edge(source, target, output_name, types, field, input_types, field_type="other"):
    return {"source": source["id"], "target": target["id"], "data": {"sourceHandle": {"dataType": source["data"]["type"], "id": source["id"], "name": output_name, "output_types": types}, "targetHandle": {"fieldName": field, "id": target["id"], "inputTypes": input_types, "type": field_type}}}

flow = {"name": "Aruna ERP Agent — Gratis Lokal", "access_type": "PRIVATE", "description": "Ollama Qwen3 4B Instruct → Agent → tool ERP berizin → kartu tinjauan draft. Buka chat dari ERP setelah login.", "is_component": False,
        "data": {"nodes": [chat, model, tool, agent, output], "edges": [
            edge(chat, agent, "message", ["Message"], "input_value", ["Message"], "str"),
            edge(model, agent, "model", ["LanguageModel"], "model", ["LanguageModel"]),
            edge(tool, agent, "component_as_tool", ["Tool"], "tools", ["Tool"]),
            edge(agent, output, "response", ["Message"], "input_value", ["Data", "JSON", "DataFrame", "Table", "Message"]),
        ], "viewport": {"x": 0, "y": 0, "zoom": 0.7}}}

state = json.loads(STATE.read_text()) if STATE.exists() else {}
if state.get("langflow_url") and state["langflow_url"] != BASE:
    previous = LOCAL / "previous-langflow-setup.json"
    previous.write_text(json.dumps(state, indent=2)); previous.chmod(0o600)
    state = {}
if state.get("flow_id"):
    saved = request("/api/v1/flows/" + state["flow_id"], flow, "PATCH", TOKEN)
else:
    saved = request("/api/v1/flows/", flow, token=TOKEN)
    state["flow_id"] = saved["id"]
    STATE.write_text(json.dumps(state, indent=2)); STATE.chmod(0o600)

env_path = ROOT / ".env.local"
env = env_path.read_text() if env_path.exists() else ""
def existing(key):
    for line in env.splitlines():
        if line.startswith(key + "="):
            return line.partition("=")[2].strip().strip('"').strip("'")
    return None

if not state.get("key_created"):
    api_key = request("/api/v1/api_key/", {"name": "Aruna ERP local integration"}, token=TOKEN)["api_key"]
else:
    api_key = existing("LANGFLOW_API_KEY")
    if not api_key:
        raise SystemExit("The local integration key is missing. Restore .env.local before updating this flow.")
values = {
    "LANGFLOW_API_URL": BASE + "/api/v1/run/" + state["flow_id"],
    "LANGFLOW_API_KEY": api_key,
    "LANGFLOW_TOOL_COMPONENT_ID": tool["id"],
    "LANGFLOW_AGENT_COMPONENT_ID": agent["id"],
    "AGENT_GATEWAY_SECRET": existing("AGENT_GATEWAY_SECRET") or secrets.token_hex(48),
}
lines = [line for line in env.splitlines() if line.partition("=")[0] not in values]
lines.extend(key + "=" + json.dumps(value) for key, value in values.items())
env_path.write_text("\n".join(lines) + "\n"); env_path.chmod(0o600)
state.update(key_created=True, tool_component_id=tool["id"], agent_component_id=agent["id"], langflow_url=BASE)
STATE.write_text(json.dumps(state, indent=2)); STATE.chmod(0o600)
export = ROOT / "docs/agent-langflow-gratis/aruna-erp-local.langflow.json"
export.write_text(json.dumps(flow, ensure_ascii=False, indent=2) + "\n")
print("Flow ready:", BASE + "/flow/" + state["flow_id"])
print("Server-only credentials saved to .env.local; export contains no credentials.")
