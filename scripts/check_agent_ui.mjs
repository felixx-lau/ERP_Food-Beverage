// Uses a separate headless browser profile and a temporary ERP database only.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const root = process.cwd();
const scratch = fs.readFileSync(path.join(root, ".local/e2e-directory.txt"), "utf8").trim();
assert(path.basename(scratch).startsWith("aruna-agent-e2e-"));
const values = Object.fromEntries(fs.readFileSync(path.join(scratch, ".env.local"), "utf8").split("\n").filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), JSON.parse(l.slice(l.indexOf("=") + 1))]));
const db = new PrismaClient({ datasourceUrl: `file:${scratch}/prisma/erp.db` });
const user = await db.user.findFirstOrThrow({ where: { role: "OWNER", active: true } });
const b64 = x => Buffer.from(JSON.stringify(x)).toString("base64url");
const content = b64({ alg: "HS256" }) + "." + b64({ id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion, companyId: "default", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+1800 });
const token = content + "." + crypto.createHmac("sha256", values.JWT_SECRET).update(content).digest("base64url");
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(t => t.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject) => { ws.onopen=resolve; ws.onerror=reject; });
let seq=0; const pending = new Map();
ws.onmessage = event => { const data=JSON.parse(event.data); const p=pending.get(data.id); if(p){pending.delete(data.id);data.error?p.reject(new Error(data.error.message)):p.resolve(data.result);} };
function call(method, params={}) { return new Promise((resolve,reject) => {const id=++seq; pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));}); }
async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true }); if(result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result?.value; }
async function until(expression, timeout=15000) { const end=Date.now()+timeout; while(Date.now()<end){const value=await evaluate(`Boolean(${expression})`);if(value)return value; await new Promise(r=>setTimeout(r,250));}throw new Error("UI condition timed out: "+expression); }
await call("Page.enable"); await call("Network.enable");
await call("Emulation.setDeviceMetricsOverride", {width:1400,height:1000,deviceScaleFactor:1,mobile:false});
await call("Network.setCookie", {name:"rasa_aruna_session",value:token,url:"http://127.0.0.1:3002",httpOnly:true,sameSite:"Lax"});
await call("Network.setCookie", {name:"rasa_aruna_company",value:"default",url:"http://127.0.0.1:3002",sameSite:"Lax"});
await call("Page.navigate", {url:"http://127.0.0.1:3002"});
await until(`document.querySelector('button[aria-label="Buka chatbot Aruna Assistant"]')`);
await evaluate(`document.querySelector('button[aria-label="Buka chatbot Aruna Assistant"]').click()`);
await until(`document.querySelector('[role="dialog"] textarea')`);
const details = await evaluate(`(()=>{const p=document.querySelector('[role="dialog"]');return {width:p.getBoundingClientRect().width,animation:getComputedStyle(p).animationName,inputFocused:document.activeElement.tagName==='TEXTAREA',suggestions:p.querySelectorAll('button').length};})()`);
assert(details.width <= 400 && details.animation !== "none" && details.inputFocused);
fs.writeFileSync(path.join(root,".local/logs/chat-desktop.png"),Buffer.from((await call("Page.captureScreenshot",{format:"png"})).data,"base64"));
console.log("[PASS] Desktop launcher, opening animation, initial input focus",details);
await call("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
await until(`innerWidth===390`);
await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
const mobile = await evaluate(`(()=>{const p=document.querySelector('[role="dialog"]');const b=p.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,viewport:innerWidth};})()`);
console.log("Mobile bounds",mobile);
assert(mobile.left>=0 && mobile.right<=mobile.viewport && mobile.top>=0 && mobile.bottom<=844);
fs.writeFileSync(path.join(root,".local/logs/chat-mobile.png"),Buffer.from((await call("Page.captureScreenshot",{format:"png"})).data,"base64"));
console.log("[PASS] Mobile chat remains inside viewport",mobile);
await call("Emulation.clearDeviceMetricsOverride");
let savedDocument;
if(process.argv.includes("--draft")) {
  const customer=await db.contact.findFirstOrThrow({where:{archivedAt:null,type:"CUSTOMER"}});
  const product=await db.productVariant.findFirstOrThrow({where:{archivedAt:null}});
  const count=await db.salesOrder.count();
  const message=`Siapkan draft penawaran untuk pelanggan ID ${customer.id}, SKU ${product.sku}, kuantitas 2, harga master, diskon 0. Panggil prepare_sales_quote. Belum simpan dokumen bisnis.`;
  await evaluate(`(()=>{const t=document.querySelector('[role="dialog"] textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(t,${JSON.stringify(message)});t.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await until(`!document.querySelector('[role="dialog"] button[aria-label="Kirim pesan"]').disabled`);
  await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Kirim pesan"]').click()`);
  await until(`Array.from(document.querySelectorAll('[role="dialog"] button')).some(b=>b.textContent==='Tinjau rincian')`,220000);
  assert.equal(await db.salesOrder.count(),count);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Tinjau rincian').click()`);
  await until(`Array.from(document.querySelectorAll('[role="dialog"] button')).some(b=>b.textContent==='Simpan draft')`);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Simpan draft').scrollIntoView({block:'end'})`);
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  assert(await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Simpan draft').getBoundingClientRect();const f=document.querySelector('[role="dialog"] footer').getBoundingClientRect();return b.top>0 && b.bottom<=f.top+1;})()`));
  fs.writeFileSync(path.join(root,".local/logs/chat-review.png"),Buffer.from((await call("Page.captureScreenshot",{format:"png"})).data,"base64"));
  await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Simpan draft');window.__arunaReviewCard=b.closest('article');b.click();})()`);
  await until(`window.__arunaReviewCard?.innerText.includes('DRAFT TERSIMPAN')`,30000);
  assert.equal(await db.salesOrder.count(),count+1);
  const saved=await db.salesOrder.findFirstOrThrow({orderBy:{createdAt:"desc"}});assert.equal(saved.status,"DRAFT");
  savedDocument = {number:saved.orderNumber, href:await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] a')).find(a=>a.textContent.includes(${JSON.stringify(saved.orderNumber)}))?.getAttribute('href')`)};
  assert.equal(savedDocument.href,`/sales/orders?id=${saved.id}`);
  console.log("[PASS] Real model → authorized tool → proposal card → explicit click → one DRAFT",{number:saved.orderNumber});
}
await evaluate(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
assert(await evaluate(`!document.querySelector('[role="dialog"]') && document.activeElement.getAttribute('aria-label')==='Buka chatbot Aruna Assistant'`));
console.log("[PASS] Escape closes chat and restores launcher focus");
if(savedDocument) {
  await call("Page.navigate",{url:"http://127.0.0.1:3002"+savedDocument.href});
  await until(`document.body.innerText.includes(${JSON.stringify(savedDocument.number)})`,20000);
  console.log("[PASS] Saved document link opens the correct order",{number:savedDocument.number});
}
ws.close(); await db.$disconnect();
