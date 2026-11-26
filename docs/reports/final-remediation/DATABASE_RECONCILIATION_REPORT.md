# Rekonsiliasi persediaan dan General Ledger

Pemeriksaan 25 November 2026 membuka keempat SQLite kerja dengan `mode=ro` dan `query_only`. Valuasi fisik memakai on-hand × biaya standar per SKU. Saldo posted 1030 dihitung ulang dari debit dikurangi kredit. Saldo tersimpan diperiksa terpisah.

| Tenant | Unit | Valuasi fisik | GL 1030 posted | Saldo 1030 tersimpan | Selisih fisik terhadap GL | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| PT Rasa Aruna Bersama | 651 | Rp12.951.000 | Rp12.951.000 | Rp12.951.000 | Rp0 | MATCHED |
| PT Kuliner Nusantara | 15 | Rp225.000 | Rp0 | Rp12.214.000 | Rp225.000 | MISMATCH |
| PT Resto Nusantara Baru | 15 | Rp225.000 | Rp0 | Rp12.214.000 | Rp225.000 | MISMATCH |
| PT Morie Matcha | 616 | Rp12.214.000 | Rp12.214.000 | Rp12.214.000 | Rp0 | MATCHED |
| Demo penilaian | 616 | Rp12.214.000 | Rp12.214.000 | Rp12.214.000 | Rp0 | MATCHED |

## Dokumen sumber dan penyebab

- **Rasa Aruna.** Jurnal pembuka `JE/OPENING/0001`, 10 jurnal terkait 1030/5010, dan 13 stock move ditemukan. Referensi operasional mencakup `WH/IN/0007`, `WH/OUT/0007`–`WH/OUT/0010`, serta `RET/2026/0007`. Kenaikan dari nilai pembukaan tercermin pada jurnal, sehingga perbedaan baseline demo tidak memerlukan koreksi.
- **Kuliner Nusantara dan Resto Nusantara Baru.** Kedua file memiliki 15 unit persediaan dan saldo pembuka/tersimpan 1030 Rp12.214.000, tetapi tanpa jurnal pembuka, posting persediaan, receipt, delivery, retur, atau stock move. Saldo tersimpan konsisten dengan baseline Rasa Aruna dan tidak memiliki dokumen pendukung di tenant masing-masing. Penyalinan atau impor data awal merupakan penjelasan yang perlu dikonfirmasi dengan dokumen asal. Sumber tidak cukup untuk menyatakan saldo yang tepat atau menerbitkan jurnal.
- **Morie Matcha.** Jurnal pembuka `JE/OPENING/0001` mendukung saldo Rp12.214.000. Terdapat receipt `WH/IN/0007` dalam database itu yang tidak menambah posting 1030 pada pemeriksaan ini.
- **Demo penilaian.** Validator mencocokkan semua tier vendor, saldo akun, stok per lokasi, dan `JE/OPENING/0001` debit/kredit masing-masing Rp33.714.000. [Bukti baseline](evidence/demo-baseline.json)

Finance dan Gudang perlu mencocokkan stok opname pembukaan per SKU/lokasi, neraca saldo serta dokumen approval masing-masing tenant MISMATCH. Setelah sumber sah, Finance memperoleh persetujuan dan menggunakan workflow koreksi yang membuat jurnal seimbang dengan jejak dokumen. Tidak ada posting yang dihasilkan audit. T-32 memicu status `MISMATCH` dan `autoPostBlocked=true` dengan stok serta jurnal aktual tetap sama. [Bukti kasus](evidence/pdf-cases.json) · [Prosedur](DEMO_WALKTHROUGH.md)

Untuk pemeriksaan ulang lokal jalankan `python3 scripts/reconcile_inventory.py`. Output JSON menyertakan rincian akun 1030, receipt, delivery, mutasi dan retur. Simpan hasil per tenant di lokasi yang berwenang.
