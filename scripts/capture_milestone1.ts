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
        } catch {}
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

async function capture() {
  console.log("📸 Capturing Langkah 1 Milestone Screens (Beranda + Dashboard)...");
  const outDir = path.resolve(process.cwd(), "docs/screens/step1");
  fs.mkdirSync(outDir, { recursive: true });

  const user = await prisma.user.findFirst({ where: { role: "OWNER" } });
  if (!user) throw new Error("No owner user found");

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
    "--user-data-dir=/tmp/cdp-step1-" + Date.now(),
  ]);

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://localhost:9222/json/version");
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  const listRes = await fetch("http://localhost:9222/json/list");
  const list = await listRes.json();
  const page = list.find((p: any) => p.type === "page") || list[0];

  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Network.enable");
  await client.send("Network.setCookie", {
    name: "rasa_aruna_session",
    value: token,
    domain: "localhost",
    path: "/",
  });

  const pages = [
    { name: "beranda", url: "http://localhost:3000/" },
    { name: "dashboard", url: "http://localhost:3000/dashboard" },
  ];

  for (const p of pages) {
    // Desktop
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Page.navigate", { url: p.url });
    await new Promise((r) => setTimeout(r, 2500));
    const dShot = await client.send("Page.captureScreenshot", { format: "png" });
    if (dShot?.result?.data) {
      fs.writeFileSync(path.join(outDir, `${p.name}_desktop.png`), Buffer.from(dShot.result.data, "base64"));
      console.log(`Saved: ${p.name}_desktop.png`);
    }

    // Mobile
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await client.send("Page.navigate", { url: p.url });
    await new Promise((r) => setTimeout(r, 2000));
    const mShot = await client.send("Page.captureScreenshot", { format: "png" });
    if (mShot?.result?.data) {
      fs.writeFileSync(path.join(outDir, `${p.name}_mobile.png`), Buffer.from(mShot.result.data, "base64"));
      console.log(`Saved: ${p.name}_mobile.png`);
    }
  }

  client.close();
  chromeProc.kill();
  console.log("✅ Milestone 1 screenshots captured successfully.");
}

capture().catch((e) => {
  console.error("Capture error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
