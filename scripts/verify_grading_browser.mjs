/** Chrome acceptance against a disposable verify_isolated.py build, never a public URL. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const project = await fs.realpath(process.argv[2] || '.');
const temp = await fs.realpath(os.tmpdir());
assert(project.startsWith(temp + path.sep) && path.basename(project).startsWith('rasa-aruna-verification-'),
  'Pass the isolated project printed by verify_isolated.py.');
const results = JSON.parse(await fs.readFile(path.join(project, 'results.json'), 'utf8')).results;
assert(results.some(result => result.suite === 'build' && result.exit === 0));
const output = path.join(project, 'browser-evidence');
await fs.mkdir(output, { recursive: true });
const playwright = process.env.ERP_PLAYWRIGHT_MODULE;
const { chromium } = playwright ? await import(playwright) : await import('playwright');
const base = 'http://127.0.0.1:3107';
const browser = await chromium.launch({
  executablePath: process.env.ERP_CHROME_EXECUTABLE || undefined, headless: true,
});
const pages = new Map();
const log = [];
const btn = (page, name) => page.getByRole('button', { name, exact: typeof name === 'string' });
const screens = {
  owner: ['/', '/dashboard'],
  sales: ['/sales/contacts','/crm/leads','/sales/orders'],
  warehouse: ['/inventory/products','/inventory/delivery','/inventory/transfers','/inventory/receipts','/inventory/returns'],
  procurement: ['/purchase/orders'],
  finance: ['/accounting/invoices','/accounting/vendor-bills','/accounting/payments','/accounting/journal-entries'],
  cashier: ['/pos'],
};

async function go(page, route) {
  await page.goto(base + route);
  await page.waitForLoadState('networkidle');
}
async function login(page, role) {
  await go(page, '/login');
  await page.locator('input[type=email]').fill(role + '@rasaaruna.com');
  await page.locator('input[type=password]').fill('Password123!');
  await Promise.all([
    page.waitForURL(role === 'cashier' ? '**/pos' : base + '/'),
    btn(page, 'Masuk ke Sistem').click(),
  ]);
  assert.equal((await get(page, '/api/auth/me')).user.role, role.toUpperCase());
}
async function actor(role) {
  if (pages.has(role)) return pages.get(role);
  const page = await browser.newPage({ viewport: { width: 1500, height: 980 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => log.push({name: 'Browser JavaScript', role, result: 'FAIL', error: error.message}));
  await login(page, role);
  pages.set(role, page);
  return page;
}
async function request(page, route, options) {
  return page.evaluate(async ([url, init]) => {
    const res = await fetch(url, init);
    return { status: res.status, data: await res.json() };
  }, [route, options]);
}
async function get(page, url) {
  const response = await request(page, url);
  assert.equal(response.status, 200, url + ': ' + JSON.stringify(response.data));
  return response.data;
}
async function post(page, fragment, click) {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().includes(fragment) && response.request().method() === 'POST'),
    click(),
  ]);
  const body = await response.json();
  assert(response.ok(), JSON.stringify(body));
  await page.waitForLoadState('networkidle');
  return body;
}
async function action(page, name, fill = async () => {}, endpoint = '/api/workflow/') {
  await btn(page, name).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await fill(dialog);
  return post(page, endpoint, () => btn(dialog, name).click());
}
async function shot(page, name, focus) {
  if (focus) await focus.evaluate(element => element.scrollIntoView({ block:'center', behavior:'instant' }));
  await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
}
async function scenario(name, work) {
  try {
    log.push({ name, result: 'PASS', details: await work() });
    console.log('[PASS]', name);
  } catch (error) {
    log.push({ name, result: 'FAIL', error: String(error) });
    console.error('[FAIL]', name, String(error));
    await Promise.allSettled([...pages].map(([role,page]) => shot(page, 'fail-' + name + '-' + role)));
  }
}
async function reauthenticate(page, role) {
  const response = await request(page, '/api/auth/logout', { method:'POST' });
  assert.equal(response.status, 200);
  assert.equal((await request(page, '/api/auth/me')).status, 401);
  await login(page, role);
}
async function assertStock(page, sku, location, physical, reserved) {
  const data = await get(page, '/api/products/' + sku);
  const level = data.product.locations.find(item => item.locationCode === location);
  assert(level, sku + ' ' + location);
  assert.equal(level.onHand, physical);
  if (reserved !== undefined) assert.equal(level.reserved, reserved);
  return level;
}

let invoice, bill, quotation;
try {
  const owner = await actor('owner');
  const baseline = (await get(owner,'/api/dashboard/metrics')).data;
  assert.deepEqual([baseline.inventory.totalUnits, baseline.inventory.totalValuation, baseline.bank.balance,
    baseline.receivables.totalAR, baseline.payables.totalAP],[616,12214000,20000000,1500000,1000000]);
  const build = await get(owner,'/api/version');
  log.push({ name:'Fresh fixture and running build', result:'PASS', build, fixture:{units:616,valuation:12214000} });

  await scenario('roles-and-screens', async () => {
    const verified = [];
    for (const [role,routes] of Object.entries(screens)) {
      const page = await actor(role);
      for (const route of routes) {
        await go(page,route);
        await page.locator('h1').first().waitFor();
        assert.equal(await page.getByText('Halaman tidak tersedia untuk akun ini').count(),0,role+' '+route);
        verified.push({role,route,heading:await page.locator('h1').first().innerText()});
      }
    }
    return verified;
  });

  await scenario('T01-owner-navigation', async () => {
    await go(owner,'/');
    const root = owner.getByRole('navigation',{name:'Pintasan aplikasi Owner'});
    await root.waitFor();
    const expected = [
      ['Sales','/sales/orders'],['CRM','/crm/leads'],['Purchase','/purchase/orders'],['Inventory','/inventory/products'],
      ['Accounting','/accounting/journal-entries'],['Invoicing','/accounting/invoices'],['POS','/pos'],['Dashboard','/dashboard'],
    ];
    assert.equal(await root.getByRole('link').count(),8);
    assert.match(await owner.locator('body').innerText(),/PT Rasa Aruna Bersama/);
    assert.match(await owner.locator('body').innerText(),/Maya Prasetyo|OWNER/);
    await shot(owner,'01-owner-home');
    for (const [name,route] of expected) {
      await go(owner,'/');
      const shortcut = root.getByRole('link',{name:new RegExp('^'+name+'\\b')});
      assert.equal(await shortcut.getAttribute('href'),route);
      await Promise.all([owner.waitForURL(base+route),shortcut.click()]);
      await owner.locator('h1').first().waitFor();
      assert.equal(await owner.getByText('Halaman tidak tersedia untuk akun ini').count(),0,route);
    }
    await go(owner,'/');await btn(owner,'Buka daftar modul').click();
    const modal = owner.getByRole('dialog',{name:'Daftar modul'});
    assert.equal(await modal.getByRole('navigation',{name:'Pintasan aplikasi Owner'}).getByRole('link').count(),8);
    assert.match(await modal.innerText(),/PT Rasa Aruna Bersama · Owner/);
    await shot(owner,'02-owner-switcher');
    await Promise.all([owner.waitForURL(base+'/dashboard'),modal.getByRole('link',{name:/^Dashboard/}).click()]);
    await owner.setViewportSize({width:390,height:844});
    await go(owner,'/');await root.waitFor();
    assert(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await shot(owner,'03-owner-mobile');
    await btn(owner,'Buka daftar modul').click();
    assert.equal(await modal.getByRole('navigation',{name:'Pintasan aplikasi Owner'}).getByRole('link').count(),8);
    await btn(modal,'Tutup daftar modul').click();
    await owner.setViewportSize({width:1500,height:980});
    return expected;
  });

  await scenario('T02-cashier-ledger', async () => {
    const page=await actor('cashier');
    assert.equal((await request(page,'/api/accounting/general-ledger')).status,403);
    await go(page,'/accounting/journal-entries');
    await page.getByText('Halaman tidak tersedia untuk akun ini').waitFor();
    await shot(page,'04-cashier-gl-denied');
    return {status:403};
  });

  await scenario('T31-T32-dashboard-reconciliation', async () => {
    await go(owner,'/dashboard');
    await btn(owner,'Operasional hari ini').click();
    await btn(owner,'Nilai bisnis').click();
    const valuation=owner.getByText(/12[. ]214[. ]000/).first();
    await valuation.waitFor();
    await shot(owner,'05-dashboard-seed',valuation);
    await go(owner,'/accounting/reports');
    await btn(owner,'Simulasikan selisih +1 unit').click();
    await owner.getByText(/Selisih valuasi stok terhadap jurnal posted/).waitFor();
    await owner.getByText('Stok dan jurnal tetap pada nilai aktual.').waitFor();
    await shot(owner,'06-reconciliation');
    const source=owner.getByRole('link',{name:/JE\/OPENING\/0001/}).first();
    await Promise.all([owner.waitForURL('**/accounting/journal-entries**'),source.click()]);
    await shot(owner,'07-source-journal');
    const actual=(await get(owner,'/api/dashboard/metrics')).data.inventory;
    assert.equal(actual.totalUnits,616);
    assert.equal(actual.totalValuation,12214000);
    return { units:actual.totalUnits, valuation:actual.totalValuation };
  });

  await scenario('order-to-cash', async () => {
    const s=await actor('sales'), w=await actor('warehouse'), f=await actor('finance');
    await go(s,'/crm/leads');
    const lead=s.locator('article').filter({hasText:'Klinik Harmoni'});
    await btn(lead,'Buat penawaran').click();
    const dialog=s.getByRole('dialog');
    await dialog.getByLabel(/Nama Produk/).fill('RICE-CHICK-S');
    await dialog.getByLabel('Kuantitas').fill('8');
    quotation=(await post(s,'/api/sales/orders',()=>btn(dialog,'Simpan penawaran').click())).order;
    assert.equal(quotation.leadId,'LD0003');
    await go(s,'/sales/orders?id='+quotation.id);
    await action(s,'Konfirmasi');
    const detail=(await get(s,'/api/sales/orders/'+quotation.id)).order;
    const delivery=detail.deliveryOrders[0];
    assert.equal(detail.isPriceLocked,true);
    assert.equal(detail.lead.stage,'WON');
    const reserved=await assertStock(w,'RICE-CHICK-S','WH-JKT',40,14);
    assert.equal(reserved.available,26);
    await go(w,'/inventory/products?sku=RICE-CHICK-S&location=WH-JKT');
    await shot(w,'08-reservation');
    await go(w,'/inventory/delivery?id='+delivery.id);
    await action(w,'Validasi pengiriman',popup=>popup.getByLabel('Jumlah dikirim RICE-CHICK-S').fill('5'));
    await shot(w,'09-delivery-backorder',w.getByText('Rincian Pemenuhan Pengiriman & Pemisahan Backorder',{exact:true}));
    const after=(await get(s,'/api/sales/orders/'+quotation.id)).order;
    assert.equal(after.lines[0].deliveredQty,5);
    assert(after.deliveryOrders.some(order=>order.backorderOfId===delivery.id &&
      order.status==='CONFIRMED' && order.lines[0].orderedQty===3));
    await assertStock(w,'RICE-CHICK-S','WH-JKT',35,9);
    await go(f,'/accounting/invoices');
    await btn(f,'Buat Invoice Baru').click();
    const form=f.getByRole('dialog');
    await form.locator('select').first().selectOption(quotation.id);
    await form.getByLabel('Jumlah ditagih').fill('8');
    await form.getByText(/Isi jumlah bulat/).waitFor();
    assert(await btn(form,'Simpan draft invoice').isDisabled());
    await shot(f,'10-invoice-quantity-validation');
    await form.getByLabel('Jumlah ditagih').fill('5');
    invoice=(await post(f,'/api/accounting/invoices',()=>btn(form,'Simpan draft invoice').click())).invoice;
    assert.deepEqual([invoice.subtotalNet,invoice.pbjtTax,invoice.totalGross],[240000,24000,264000]);
    await go(f,'/accounting/invoices?id='+invoice.id);
    await action(f,'Posting ke pembukuan');
    const deliveryJournals=(await get(f,'/api/accounting/journal-entries?sourceDocument='+encodeURIComponent(delivery.deliveryNumber))).entries;
    const invoiceJournals=(await get(f,'/api/accounting/journal-entries?sourceDocument='+encodeURIComponent(invoice.invoiceNumber))).entries;
    assert.deepEqual(deliveryJournals.map(j=>[j.totalDebit,j.totalCredit]),[[130000,130000]]);
    assert.deepEqual(invoiceJournals.map(j=>[j.totalDebit,j.totalCredit]),[[264000,264000]]);
    await go(f,'/accounting/journal-entries?id='+invoiceJournals[0].id);
    await shot(f,'07b-sales-invoice-journal');
    await go(f,'/accounting/payments?invoiceId='+invoice.id);
    await f.getByLabel('Nominal pembayaran pelanggan').fill('100000');
    await post(f,'/api/accounting/payments',()=>btn(f,'Konfirmasi Pembayaran').click());
    await f.reload();await f.waitForLoadState('networkidle');
    assert.equal((await get(f,'/api/accounting/invoices/'+invoice.id)).invoice.outstandingAmount,164000);
    await shot(f,'11-customer-payment-refresh',f.getByText(/Sisa Piutang \(Outstanding Balance\)/).first());
    await reauthenticate(f,'finance');
    assert.equal((await get(f,'/api/accounting/invoices/'+invoice.id)).invoice.outstandingAmount,164000);
    await go(f,'/accounting/payments?invoiceId='+invoice.id);
    await f.getByLabel('Nominal pembayaran pelanggan').fill('164000');
    await post(f,'/api/accounting/payments',()=>btn(f,'Konfirmasi Pembayaran').click());
    const settled=(await get(f,'/api/accounting/invoices/'+invoice.id)).invoice;
    assert.deepEqual([settled.status,settled.outstandingAmount],['PAID',0]);
    return {lead:quotation.leadId,so:quotation.orderNumber,invoice:invoice.invoiceNumber,net:240000,tax:24000,total:264000,
      stock:{physical:35,reserved:9,available:26},journalDebitAndCredit:394000,
      partial:100000,outstanding:164000,reauthenticated:true,settled:0};
  });

  await scenario('T10-discount-owner-browser', async () => {
    const sales=await actor('sales');
    await go(sales,'/sales/orders');
    await btn(sales,'Buat penawaran').click();
    const dialog=sales.getByRole('dialog');
    await dialog.getByLabel(/Pelanggan \/ Pemesan/).selectOption('C01');
    await dialog.getByLabel(/Nama Produk/).fill('RICE-CHICK-S');
    await dialog.getByLabel('Kuantitas').fill('2');
    await dialog.getByLabel(/Diskon/).fill('20');
    const draft=(await post(sales,'/api/sales/orders',()=>btn(dialog,'Simpan penawaran').click())).order;
    await go(owner,'/sales/orders?id='+draft.id);
    await owner.getByText('Menunggu persetujuan Owner',{exact:true}).waitFor();
    await owner.getByText(/32,29%/).waitFor();
    await shot(owner,'12-owner-discount-pending',owner.getByText('Menunggu persetujuan Owner',{exact:true}));
    await action(owner,'Setujui diskon',form=>form.getByLabel('Alasan keputusan').fill('Margin kontrak diperiksa'),'/approve-discount');
    await owner.getByText(/Disetujui oleh Maya/).waitFor();
    await shot(owner,'13-owner-discount-approved',owner.getByText(/Disetujui oleh Maya/).first());
    await go(sales,'/sales/orders?id='+draft.id);
    await action(sales,'Konfirmasi');
    await sales.getByText('Harga dan diskon terkunci',{exact:true}).waitFor();
    assert.equal(await btn(sales,'Edit draft').count(),0);
    await shot(sales,'14-confirmed-price-lock',sales.getByText('Harga dan diskon terkunci',{exact:true}));
    return {so:draft.orderNumber,discount:20,net:76800,cogs:52000,profit:24800,margin:32.29,tax:7680,gross:84480};
  });

  await scenario('procure-to-pay', async () => {
    const p=await actor('procurement'), w=await actor('warehouse'), f=await actor('finance');
    await go(p,'/purchase/orders');
    await btn(p,'Pesanan Beli Baru').click();
    const dialog=p.getByRole('dialog');
    const vendor=dialog.locator('select').first();
    await vendor.selectOption('V01');
    await dialog.locator('input[list]').first().fill('COF-LATT-HOT');
    await dialog.getByText(/Harga vendor belum tersedia/).waitFor();
    await vendor.selectOption('V03');
    await dialog.getByText('Daftar harga vendor',{exact:true}).waitFor();
    await dialog.getByLabel('Kuantitas',{exact:true}).fill('10');
    assert.equal(await dialog.getByLabel(/Harga Beli \/ Satuan/).inputValue(),'12000');
    await shot(p,'15-vendor-pricelist-rfq');
    const po=(await post(p,'/api/purchase/orders',()=>btn(dialog,'Simpan Pesanan Pembelian').click())).order;
    assert.deepEqual([po.total,po.taxAmount],[120000,0]);
    await go(p,'/purchase/orders?id='+po.id);
    await action(p,'Konfirmasi');
    const receipt=(await get(p,'/api/purchase/orders/'+po.id)).order.receipts[0];
    await go(w,'/inventory/receipts?id='+receipt.id);
    await btn(w,'Validasi penerimaan').click();
    const qc=w.getByRole('dialog');
    await qc.getByLabel('Jumlah diterima COF-LATT-HOT').fill('8');
    await qc.getByLabel('Jumlah ditolak COF-LATT-HOT').fill('2');
    await qc.getByLabel('Alasan penolakan').fill('Kemasan rusak');
    await shot(w,'16-receipt-qc');
    await post(w,'/api/workflow/',()=>btn(qc,'Validasi penerimaan').click());
    await assertStock(w,'COF-LATT-HOT','WH-JKT',28);
    const inbound=(await get(p,'/api/purchase/orders/'+po.id)).order;
    assert(inbound.receipts.some(order=>order.status==='DRAFT' && order.lines[0].demandQty===2));
    await go(f,'/accounting/vendor-bills');
    await btn(f,'+ Buat tagihan').click();
    const form=f.getByRole('dialog');
    await form.locator('select').first().selectOption(po.id);
    await form.getByLabel('Ditagih',{exact:true}).fill('10');
    assert(await btn(form,'Simpan draft tagihan').isDisabled());
    await form.getByLabel('Ditagih',{exact:true}).fill('8');
    bill=(await post(f,'/api/accounting/vendor-bills',()=>btn(form,'Simpan draft tagihan').click())).bill;
    assert.equal(bill.totalGross,96000);
    await go(f,'/accounting/vendor-bills?id='+bill.id);
    await action(f,'Posting ke pembukuan');
    await shot(f,'17-three-way-vendor-bill',f.getByText(/Pencocokan Tiga Arah: PO vs Receipt/));
    await go(f,'/accounting/payments?billId='+bill.id);
    await f.getByLabel('Jumlah (Rp)',{exact:true}).fill('30000');
    const paymentUrl = '**/api/accounting/payments';
    let committed;
    let firstKey;
    const dropResponse = async route => {
      if (route.request().method() !== 'POST') return route.continue();
      firstKey = route.request().headers()['idempotency-key'];
      const response = await route.fetch();
      committed = await response.json();
      await route.abort('timedout');
    };
    await f.route(paymentUrl,dropResponse);
    await btn(f,'Catat pembayaran vendor').click();
    await f.getByText(/Respons belum diterima/).waitFor();
    await f.unroute(paymentUrl,dropResponse);
    assert(firstKey && committed?.payment);
    assert.equal(committed.remainingBalance,66000);
    await f.reload();await f.waitForLoadState('networkidle');
    await shot(f,'18a-vendor-payment-timeout-recovery');
    const retryRequest = f.waitForRequest(req=>req.url().endsWith('/api/accounting/payments') && req.method()==='POST');
    const replay=await post(f,'/api/accounting/payments',()=>btn(f,'Periksa kembali pembayaran').click());
    assert.equal((await retryRequest).headers()['idempotency-key'],firstKey);
    assert.equal(replay.payment.id,committed.payment.id);
    assert.equal(replay.remainingBalance,66000);
    await f.reload();await f.waitForLoadState('networkidle');
    assert.equal((await get(f,'/api/accounting/vendor-bills/'+bill.id)).bill.outstandingAmount,66000);
    await shot(f,'18-vendor-payment-refresh');
    await reauthenticate(f,'finance');
    assert.equal((await get(f,'/api/accounting/vendor-bills/'+bill.id)).bill.outstandingAmount,66000);
    await go(f,'/accounting/payments?billId='+bill.id);
    await f.getByLabel('Jumlah (Rp)',{exact:true}).fill('66000');
    await post(f,'/api/accounting/payments',()=>btn(f,'Catat pembayaran vendor').click());
    assert.equal((await get(f,'/api/accounting/vendor-bills/'+bill.id)).bill.status,'PAID');
    return {po:po.poNumber,bill:bill.billNumber,accepted:8,rejected:2,total:96000,partial:30000,outstanding:66000,
      reauthenticated:true,settled:0,networkTimeoutReplay:true};
  });

  await scenario('return-credit-note', async () => {
    assert(invoice);
    const w=await actor('warehouse'), f=await actor('finance');
    await go(w,'/inventory/returns');
    await btn(w,'Buat Permintaan Retur').click();
    const form=w.getByRole('dialog');
    await form.getByLabel('Invoice asal').selectOption(invoice.id);
    await form.getByLabel('Jumlah dikembalikan').fill('1');
    const returnRequest=(await post(w,'/api/returns',()=>btn(form,'Simpan permintaan retur').click())).returnRequest;
    await go(f,'/inventory/returns');
    assert.equal(await btn(f,'Proses Restock & Terbitkan Credit Note').count(),0);
    await btn(w,/Lakukan Inspeksi Mutu Gudang/).click();
    const inspection=w.getByRole('dialog');
    await inspection.getByLabel('Diterima',{exact:true}).fill('1');
    await inspection.getByLabel('Ditolak',{exact:true}).fill('0');
    await post(w,'/inspect',()=>btn(inspection,'Simpan hasil inspeksi').click());
    await go(f,'/inventory/returns');
    f.once('dialog',dialog=>dialog.accept());
    const result=await post(f,'/process',()=>btn(f,'Proses Restock & Terbitkan Credit Note').click());
    assert.deepEqual([result.creditNote.subtotalNet,result.creditNote.pbjtTax,result.creditNote.totalGross],[48000,4800,52800]);
    await go(f,'/inventory/returns');
    await shot(f,'19-return-credit-note');
    await assertStock(w,'RICE-CHICK-S','WH-JKT',36);
    return {return: returnRequest.returnNumber, credit:result.creditNote.creditNoteNumber,total:52800};
  });

  await scenario('POS-session', async () => {
    const p=await actor('cashier'), w=await actor('warehouse');
    await go(p,'/pos');
    await btn(p,'Buka Sesi Kasir Baru').click();
    const dialog=p.getByRole('dialog');
    await dialog.getByLabel('Outlet').selectOption('CAFE-JKT');
    await post(p,'/api/pos/',()=>btn(dialog,'Buka sesi').click());
    await btn(p,/COF-LATT-HOT/).click();await btn(p,/COF-LATT-HOT/).click();
    await btn(p,/COOKIE-CHO-1/).click();
    await shot(p,'20-pos-basket');
    const paid=await post(p,'/api/pos/',()=>btn(p,/Bayar Sekarang/).click());
    const receipt=p.getByRole('dialog');
    await receipt.getByText(/88[.,]000/).first().waitFor();
    await shot(p,'21-pos-receipt');
    await btn(receipt,/^Tutup$/).click();
    await btn(p,/Tutup Sesi \(/).click();
    await p.getByLabel(/Kas Fisik Aktual/).fill('0');
    await post(p,'/api/pos/',()=>btn(p,'Konfirmasi Tutup Sesi').click());
    await p.getByText(/selisih/i).last().waitFor();
    await shot(p,'22-pos-close');
    await assertStock(w,'COF-LATT-HOT','CAFE-JKT',22);
    await assertStock(w,'COOKIE-CHO-1','CAFE-JKT',19);
    return {order:paid.order?.orderNumber, paid:88000,cashIncrease:0,closed:true};
  });
} finally {
  await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(log,null,2));
  await browser.close();
}
process.exitCode = log.some(item=>item.result==='FAIL') ? 1 : 0;
