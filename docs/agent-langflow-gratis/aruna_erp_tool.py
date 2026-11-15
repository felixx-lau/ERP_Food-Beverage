"""Langflow Tool Mode component. Credentials never appear in the tool schema."""
import json
from urllib.parse import urlparse
import httpx
from langflow.custom import Component
from langflow.io import DictInput, MessageTextInput, Output, SecretStrInput, StrInput
from langflow.schema import Data


class ArunaERPTools(Component):
    display_name = "Aruna ERP Tools"
    description = "Read authorized ERP data and prepare review proposals. Cannot save, post, confirm, or send messages."
    icon = "ShieldCheck"
    name = "ArunaERPTools"
    inputs = [
        MessageTextInput(name="action", display_name="Action", tool_mode=True, required=True,
                         info="profile, inventory, contacts, sales_orders, purchase_orders, invoices, pos_sessions, restock_plan, briefing, worklist, financial_summary, sop, prepare_sales_quote, prepare_purchase_rfq, prepare_transfer"),
        DictInput(name="args", display_name="Arguments", tool_mode=True,
                  value={}, info='A JSON object, for example {"query":"matcha","limit":5}. financial_summary dates must be strings: {"start":"2026-02-01","end":"2026-02-01"}. Prepare tools use lines:[{productSku,quantity,unitPrice?}], contactId/vendorId or sourceLocation/destLocation.'),
        SecretStrInput(name="capability", display_name="Temporary ERP capability", value="", advanced=True,
                       info="Injected by the authenticated ERP backend per run; leave empty in the saved flow."),
        StrInput(name="gateway_url", display_name="Local ERP gateway", value="http://127.0.0.1:3000/api/agent/tools", advanced=True),
    ]
    outputs = [Output(name="result", display_name="ERP result", method="call_erp")]

    async def call_erp(self) -> Data:
        endpoint = urlparse(self.gateway_url)
        if endpoint.scheme != "http" or endpoint.hostname not in ("127.0.0.1", "localhost") or endpoint.path != "/api/agent/tools" or endpoint.username or endpoint.password or endpoint.query or endpoint.fragment:
            return Data(data={"error": "ERP gateway must use the configured local loopback endpoint."})
        capability = self.capability.get_secret_value() if hasattr(self.capability, "get_secret_value") else str(self.capability or "")
        if not capability:
            return Data(data={"error": "Buka chat dari ERP setelah login. Playground tidak memiliki izin pengguna ERP."})
        try:
            args = self.args if isinstance(self.args, dict) else json.loads(self.args or "{}")
            if not isinstance(args, dict):
                return Data(data={"error": "args must be a JSON object."})
            async with httpx.AsyncClient(timeout=45, follow_redirects=False, trust_env=False) as client:
                response = await client.post(self.gateway_url, headers={"Authorization": f"Bearer {capability}"}, json={"action": self.action, "args": args})
            if response.status_code != 200:
                error = response.json().get("error", "Tool ditolak oleh ERP.")
                return Data(data={"error": error, "status": response.status_code})
            return Data(data=response.json())
        except (ValueError, httpx.RequestError):
            return Data(data={"error": "Permintaan tool tidak valid atau gateway ERP tidak dapat dihubungi. Jangan mengarang hasil."})
