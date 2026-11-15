"""Teaching tool for Langflow. All inventory here is fictional demo data.

Paste into New Custom Component, enable Tool Mode, and connect to Agent.Tools.
This component never connects to or changes the ERP database.
"""

import json
from datetime import datetime
from zoneinfo import ZoneInfo

from langflow.custom import Component
from langflow.io import MessageTextInput, Output
from langflow.schema import Data


class DemoOperasional(Component):
    display_name = "Demo Operasional ERP"
    description = (
        "Tool latihan dengan DATA SIMULASI. Input JSON: action=cek_stok, "
        "rencana_belanja, atau pratinjau_rfq. Opsional sku dan days (1-7). "
        "Menghitung kebutuhan barang berdasarkan stok tersedia, reservasi, "
        "dan pemakaian contoh. Tidak menyimpan dokumen ERP."
    )
    icon = "PackageSearch"
    name = "DemoOperasional"

    inputs = [
        MessageTextInput(
            name="request_json",
            display_name="Permintaan JSON",
            info='Contoh: {"action":"rencana_belanja","days":3}',
            value='{"action":"cek_stok"}',
            tool_mode=True,
        ),
    ]
    outputs = [Output(display_name="Hasil", name="result", method="run_task")]

    def run_task(self) -> Data:
        def result(payload):
            return Data(data={
                "data_source": "SIMULASI — bukan data ERP",
                "as_of": datetime.now(ZoneInfo("Asia/Jakarta")).isoformat(),
                **payload,
            })

        try:
            request = json.loads(self.request_json)
        except (TypeError, ValueError):
            return result({"ok": False, "error": "Input harus JSON yang valid."})
        if not isinstance(request, dict):
            return result({"ok": False, "error": "Input harus object JSON."})

        action = request.get("action")
        if action not in {"cek_stok", "rencana_belanja", "pratinjau_rfq"}:
            return result({"ok": False, "error": "Action tidak tersedia."})
        days = request.get("days", 3)
        if type(days) is not int or not 1 <= days <= 7:
            return result({"ok": False, "error": "days harus bilangan bulat 1–7."})
        sku = request.get("sku")
        if sku is not None and not isinstance(sku, str):
            return result({"ok": False, "error": "sku harus teks."})

        # Rates, supplier and prices are deliberately fictional teaching inputs.
        rows = [
            {"sku": "DEMO-BERAS", "name": "Beras", "unit": "kg", "on_hand": 20, "reserved": 8, "daily_usage": 7, "unit_price": 15000},
            {"sku": "DEMO-AYAM", "name": "Ayam", "unit": "kg", "on_hand": 12, "reserved": 4, "daily_usage": 6, "unit_price": 40000},
            {"sku": "DEMO-KOPI", "name": "Kopi", "unit": "kg", "on_hand": 10, "reserved": 2, "daily_usage": 1, "unit_price": 100000},
        ]
        if sku:
            rows = [row for row in rows if row["sku"] == sku]
            if not rows:
                return result({"ok": False, "error": "SKU simulasi tidak ditemukan."})
        enriched = []
        for row in rows:
            available = row["on_hand"] - row["reserved"]
            # Simple exercise: rates represent additional, unreserved demand.
            suggested = max(0, row["daily_usage"] * days - available)
            enriched.append({**row, "available": available, "suggested_qty": suggested})

        if action == "cek_stok":
            return result({"ok": True, "items": enriched})

        lines = [row for row in enriched if row["suggested_qty"] > 0]
        if action == "rencana_belanja":
            return result({
                "ok": True,
                "days": days,
                "assumption": "Contoh permintaan tambahan yang belum termasuk reservasi; belum memasukkan incoming PO, lead time atau safety stock.",
                "items": lines,
            })

        return result({
            "ok": True,
            "status": "PREVIEW_ONLY_NOT_SAVED",
            "document": "RFQ_SIMULASI",
            "vendor": "Vendor Contoh — harus dipilih dari master ERP pada implementasi nyata",
            "lines": [
                {"productSku": row["sku"], "orderedQty": row["suggested_qty"], "unitPrice": row["unit_price"]}
                for row in lines
            ],
            "estimated_subtotal": sum(row["suggested_qty"] * row["unit_price"] for row in lines),
            "saved_to_erp": False,
            "message": "Ini pratinjau latihan. Belum ada RFQ/PO di ERP dan tidak ada transaksi stok atau uang.",
        })
