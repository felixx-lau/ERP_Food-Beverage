import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";

class CDPClient {
  ws: WebSocket;
  id = 1;
  callbacks = new Map<number, (res: any) => void>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve(true);
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data.toString());
          if (msg.id && this.callbacks.has(msg.id)) {
            this.callbacks.get(msg.id)!(msg);
            this.callbacks.delete(msg.id);
          }
        } catch (err) {}
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = this.id++;
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

const PAGES_TO_CAPTURE = [
  { name: "01_login", url: "http://localhost:3000/login", needsAuth: false },
  { name: "02_home", url: "http://localhost:3000/", needsAuth: true },
  { name: "03_dashboard", url: "http://localhost:3000/dashboard", needsAuth: true },
  { name: "04_sales_orders", url: "http://localhost:3000/sales/orders", needsAuth: true },
  { name: "05_purchase_orders", url: "http://localhost:3000/purchase/orders", needsAuth: true },
  { name: "06_inventory_products", url: "http://localhost:3000/inventory/products", needsAuth: true },
  { name: "07_pos", url: "http://localhost:3000/pos", needsAuth: true },
  { name: "08_accounting_invoices", url: "http://localhost:3000/accounting/invoices", needsAuth: true },
  { name: "09_journal_entries", url: "http://localhost:3000/accounting/journal-entries", needsAuth: true },
  { name: "10_crm_leads", url: "http://localhost:3000/crm/leads", needsAuth: true },
];

async function main() {
  const mode = process.argv.includes("--mode=after") ? "after" : "before";
  console.log(`📸 Starting Screenshot Capture for mode: [${mode.toUpperCase()}]`);

  // Target directories
  const targetDirs = [
    path.resolve(process.cwd(), `docs/screens/${mode}`),
    path.resolve(process.cwd(), `../docs/screens/${mode}`),
    path.resolve(`/Users/felix/.gemini/antigravity/brain/bc4c9979-f510-456e-8fa1-fc893b8b8a84/screens/${mode}`),
  ];

  targetDirs.forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  const user = await prisma.user.findFirst({ where: { role: "OWNER" } });
  if (!user) {
    throw new Error("No owner found in database");
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const chromeProc = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless",
    "--disable-gpu",
    "--remote-debugging-port=9222",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=/tmp/cdp-chrome-screens-" + Date.now(),
  ]);

  // Wait for CDP readiness
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://localhost:9222/json/version");
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  const listRes = await fetch("http://localhost:9222/json/list");
  const list = await listRes.json();
  const pageTarget = list.find((p: any) => p.type === "page") || list[0];

  if (!pageTarget) {
    throw new Error("No page target found");
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Network.enable");

  // Set Auth cookie
  await client.send("Network.setCookie", {
    name: "rasa_aruna_session",
    value: token,
    domain: "localhost",
    path: "/",
  });

  for (const page of PAGES_TO_CAPTURE) {
    console.log(`Capturing: ${page.name}...`);

    // 1. DESKTOP (1280px)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await client.send("Page.navigate", { url: page.url });
    // Allow animations, data fetching, Chart.js rendering
    await new Promise((r) => setTimeout(r, 2000));

    const desktopShot = await client.send("Page.captureScreenshot", { format: "png" });
    if (desktopShot?.result?.data) {
      const buf = Buffer.from(desktopShot.result.data, "base64");
      targetDirs.forEach((dir) => {
        fs.writeFileSync(path.join(dir, `${page.name}_desktop.png`), buf);
      });
      console.log(`  -> Desktop: saved (${buf.length} bytes)`);
    }

    // 2. MOBILE (375px)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await client.send("Page.navigate", { url: page.url });
    await new Promise((r) => setTimeout(r, 1800));

    const mobileShot = await client.send("Page.captureScreenshot", { format: "png" });
    if (mobileShot?.result?.data) {
      const buf = Buffer.from(mobileShot.result.data, "base64");
      targetDirs.forEach((dir) => {
        fs.writeFileSync(path.join(dir, `${page.name}_mobile.png`), buf);
      });
      console.log(`  -> Mobile: saved (${buf.length} bytes)`);
    }
  }

  client.close();
  chromeProc.kill();
  console.log(`\n🎉 All ${PAGES_TO_CAPTURE.length * 2} screenshots captured successfully in ${mode.toUpperCase()} folder!`);
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
