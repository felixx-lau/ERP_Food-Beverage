"""HTTP smoke checks against the disposable production-build server on 3107.

This checks server responses, not browser layout/JavaScript interactions.
"""
import argparse, http.client, json, sqlite3, tempfile, uuid
from contextlib import closing
from http.cookies import SimpleCookie
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--temporary-project',required=True,type=Path);p.add_argument('--host',choices=['localhost','127.0.0.1'],default='localhost')
mode=p.add_mutually_exclusive_group()
mode.add_argument('--verify-restart',action='store_true')
mode.add_argument('--verify-tenant-isolation',action='store_true')
args=p.parse_args()
project=args.temporary_project.resolve()
if not project.is_relative_to(Path(tempfile.gettempdir()).resolve()) or not project.name.startswith('rasa-aruna-verification-'):
    raise SystemExit('Only an isolated verification project is allowed')
db=project/'prisma/erp.db'
if not db.exists(): raise SystemExit('Temporary database missing')
cookies=''
company_cookie=''
evidence=[]
def request(method,path,body=None,status=200,key=None):
    headers={'Content-Type':'application/json','Origin':'http://'+args.host+':3107'}
    if cookies or company_cookie: headers['Cookie']='; '.join(x for x in (cookies,company_cookie) if x)
    if key: headers['Idempotency-Key']=key
    conn=http.client.HTTPConnection(args.host,3107,timeout=20)
    conn.request(method,path,None if body is None else json.dumps(body),headers)
    response=conn.getresponse();data=response.read().decode();headers=dict(response.getheaders());conn.close()
    assert response.status==status,(method,path,response.status,data[:500])
    return json.loads(data),headers
def passed(name): evidence.append({'name':name,'status':'PASS'});print('[PASS]',name,flush=True)

request('GET','/api/master/customers',status=401);passed('Anonymous master API denied')
def login_as(email,role):
    global cookies
    cookies=''
    _,headers=request('POST','/api/auth/login',{'email':email,'password':'Password123!'})
    cookie=SimpleCookie();cookie.load(headers['set-cookie'])
    assert cookie and all(c['httponly'] for c in cookie.values())
    cookies='; '.join(k+'='+v.value for k,v in cookie.items())
    me,_=request('GET','/api/auth/me');assert me['user']['role']==role
login_as('owner@rasaaruna.com','OWNER')
request('GET','/api/dashboard/metrics')
request('POST','/api/master/customers',{'name':'Denied'},status=403)
passed('Owner reads company metrics and cannot create master customers')
login_as('admin@rasaaruna.com','HEAD_ADMIN')
passed('Head Admin starts authenticated administration session')
if args.verify_restart:
    probe=json.loads((project/'http-persistence-checkpoint.json').read_text())
    detail,_=request('GET','/api/master/customers/'+probe['id']);assert detail['record']['name']==probe['name']
    request('DELETE','/api/master/customers/'+probe['id']+'?version=0')
    passed('Record persists across server stop/start and new login')
    (project/'http-restart-results.json').write_text(json.dumps(evidence,indent=2));raise SystemExit(0)

if args.verify_tenant_isolation:
    tenant='verification-'+uuid.uuid4().hex[:8]
    isolated_file=project/'prisma'/f'{tenant}.db'
    with closing(sqlite3.connect(db.as_uri()+'?mode=ro',uri=True)) as source, closing(sqlite3.connect(isolated_file)) as target:
        source.backup(target)
    registry=project/'prisma/companies.json'
    initial=registry.read_text()
    companies=json.loads(initial)
    companies.append({'id':tenant,'name':'Tenant Verifikasi','brand':'Tenant Verifikasi',
                      'dbFile':isolated_file.name,'createdAt':'2026-01-01T00:00:00Z'})
    registry.write_text(json.dumps(companies))

    def switch(company):
        global company_cookie
        _,headers=request('POST','/api/companies/switch',{'companyId':company})
        cookie=SimpleCookie();cookie.load(headers['set-cookie'])
        assert cookie['rasa_aruna_company'].value==company
        company_cookie='rasa_aruna_company='+company
        request('GET','/api/auth/me',status=401)
        login_as('admin@rasaaruna.com','HEAD_ADMIN')

    try:
        marker,_=request('POST','/api/master/customers',{'name':'Tenant-default '+tenant})
        own='/api/master/customers/'+marker['record']['id']
        switch(tenant)
        request('GET',own,status=404)
        other,_=request('POST','/api/master/customers',{'name':'Tenant-second '+tenant})
        other_path='/api/master/customers/'+other['record']['id']
        switch('default')
        request('GET',other_path,status=404)
        actual,_=request('GET',own)
        assert actual['record']['name']==marker['record']['name']
        request('DELETE',own+'?version=0')
        passed('Tenant switch requires fresh login and each company sees only its own transaction data')
        (project/'http-tenant-results.json').write_text(json.dumps(evidence,indent=2))
    finally:
        registry.write_text(initial)
    raise SystemExit(0)

suffix=uuid.uuid4().hex[:8]
baseline_lead, _ = request('GET', '/api/master/leads/LD0003')
cases=[('customers',{'name':'HTTP Customer '+suffix,'city':'Jakarta','email':'http@example.test','paymentTerms':'NET7','creditLimit':500000},'id'),('vendors',{'name':'HTTP Vendor '+suffix,'city':'Bogor'},'id'),('products',{'sku':'HTTP-'+suffix,'name':'HTTP Product','size':'Single','color':'Original','unit':'box','salesPrice':10000,'standardCost':5000},'sku'),('categories',{'code':'HTTP-CAT-'+suffix,'name':'HTTP Category'},'code'),('units',{'code':'http-unit-'+suffix,'name':'HTTP Unit'},'code'),('locations',{'code':'HTTP-LOC-'+suffix,'name':'HTTP Location','usage':'Internal'},'code'),('accounts',{'code':'99'+suffix[:4],'name':'HTTP Account','type':'ASSET'},'code'),('vendor-prices',{'vendorId':'V03','productSku':'COF-LATT-HOT','minimumQty':99,'price':11000},'id'),('leads',{'name':'HTTP Lead','contactId':'C01','expectedRevenue':100000,'stage':'NEW'},'id')]
for resource,body,field in cases:
    base='/api/master/'+resource;key=uuid.uuid4().hex
    created,_=request('POST',base,body,key=key);record=created['record'];item=base+'/'+record[field]
    retry,_=request('POST',base,body,key=key);assert retry['record'][field]==record[field]
    detail,_=request('GET',item);assert detail['record'][field]==record[field]
    updated,_=request('PATCH',item,{'version':0,**({'price':10500} if resource=='vendor-prices' else {'name':'HTTP Updated '+suffix})});assert updated['record']['version']==1
    request('PATCH',item,{'version':0,'name':'Stale update'},status=409)
    archived,_=request('PATCH',item,{'version':1,'action':'archive'});assert archived['record']['archivedAt']
    restored,_=request('PATCH',item,{'version':2,'action':'restore'});assert restored['record']['archivedAt'] is None
    version = restored['record']['version']
    if resource == 'leads':
        denial, _ = request('DELETE', item+f'?version={version}', status=409)
        assert 'Batalkan lead' in denial['error']
        cancelled, _ = request('PATCH', item, {'version': version, 'action': 'cancel'})
        assert cancelled['record']['archivedAt']
        version = cancelled['record']['version']
    request('DELETE',item+f'?version={version}');request('GET',item,status=404)
    if resource == 'leads':
        baseline_after, _ = request('GET', '/api/master/leads/LD0003')
        assert baseline_after['record'] == baseline_lead['record']
        with closing(sqlite3.connect(db.as_uri()+'?mode=ro', uri=True)) as reader:
            events = reader.execute("""
                SELECT action,actorRole,notes FROM AuditLog
                WHERE (documentType='MASTER_leads' AND documentId=?)
                   OR (action='OPERATION_REJECTED' AND documentId=?)
            """, (record['id'], item)).fetchall()
            assert sum(action == 'OPERATION_REJECTED' and role == 'HEAD_ADMIN' and
                       'Batalkan lead' in (notes or '') for action,role,notes in events) == 1, events
            for expected in ('CANCEL','DELETE_UNUSED'):
                assert sum(action == expected and role == 'HEAD_ADMIN' for action,role,_ in events) == 1, events
        passed('leads: active delete rejected, cancellation and delete audited, baseline lead preserved')
        continue
    passed(resource+': create, retry, read, update, stale conflict, archive, restore, delete')
order,_=request('POST','/api/sales/orders',{'contactId':'C01','lines':[{'productSku':'RICE-CHICK-S','quantity':2,'unitPrice':48000}]},key=uuid.uuid4().hex);so=order['order'];workflow='/api/workflow/sales/'+so['id']
edit,_=request('POST',workflow,{'action':'edit','version':0,'lines':[{'productSku':'RICE-CHICK-S','quantity':3,'unitPrice':48000,'discountPercent':0}]});assert edit['record']['totalGross']==158400
request('POST',workflow,{'action':'cancel','version':1});passed('Sales HTTP draft edit and safe cancellation')
login_as('cashier@rasaaruna.com','CASHIER')
request('GET','/api/accounting/general-ledger',status=403);request('POST','/api/master/customers',{'name':'Denied'},status=403);passed('Cashier is denied GL and master mutations over HTTP')
# Leave one disposable checkpoint for a separate process-restart check.
login_as('admin@rasaaruna.com','HEAD_ADMIN')
checkpoint,_=request('POST','/api/master/customers',{'name':'HTTP persistence '+suffix,'city':'Jakarta'})
(project/'http-persistence-checkpoint.json').write_text(json.dumps({'id':checkpoint['record']['id'],'name':checkpoint['record']['name']}))
Path(project/'http-smoke-results.json').write_text(json.dumps(evidence,indent=2))
print('HTTP smoke:',len(evidence),'groups passed')
