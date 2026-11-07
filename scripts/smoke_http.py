"""HTTP smoke checks against the disposable production-build server on 3107.

This checks server responses, not browser layout/JavaScript interactions.
"""
import argparse, hashlib, http.client, json, tempfile, uuid
from http.cookies import SimpleCookie
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--temporary-project',required=True,type=Path);p.add_argument('--host',choices=['localhost','127.0.0.1'],default='localhost');p.add_argument('--verify-restart',action='store_true');args=p.parse_args()
project=args.temporary_project.resolve()
if not project.is_relative_to(Path(tempfile.gettempdir()).resolve()) or not project.name.startswith('rasa-aruna-verification-'):
    raise SystemExit('Only an isolated verification project is allowed')
db=project/'prisma/erp.db'
if not db.exists(): raise SystemExit('Temporary database missing')
cookies=''
evidence=[]
def request(method,path,body=None,status=200,key=None):
    headers={'Content-Type':'application/json','Origin':'http://'+args.host+':3107'}
    if cookies: headers['Cookie']=cookies
    if key: headers['Idempotency-Key']=key
    conn=http.client.HTTPConnection(args.host,3107,timeout=20)
    conn.request(method,path,None if body is None else json.dumps(body),headers)
    response=conn.getresponse();data=response.read().decode();headers=dict(response.getheaders());conn.close()
    assert response.status==status,(method,path,response.status,data[:500])
    return json.loads(data),headers
def passed(name): evidence.append({'name':name,'status':'PASS'});print('[PASS]',name,flush=True)

request('GET','/api/master/customers',status=401);passed('Anonymous master API denied')
login,headers=request('POST','/api/auth/login',{'email':'owner@rasaaruna.com','password':'Password123!'})
cookie=SimpleCookie();cookie.load(headers['set-cookie']);assert all(c['httponly'] for c in cookie.values())
# Production secure cookies are sent explicitly to the fixed loopback test host.
cookies='; '.join(k+'='+v.value for k,v in cookie.items())
me,_=request('GET','/api/auth/me');assert me['user']['role']=='OWNER';passed('Real HTTP login and authenticated session')
if args.verify_restart:
    probe=json.loads((project/'http-persistence-checkpoint.json').read_text())
    detail,_=request('GET','/api/master/customers/'+probe['id']);assert detail['record']['name']==probe['name']
    request('DELETE','/api/master/customers/'+probe['id']+'?version=0')
    passed('Record persists across server stop/start and new login')
    (project/'http-restart-results.json').write_text(json.dumps(evidence,indent=2));raise SystemExit(0)

suffix=uuid.uuid4().hex[:8]
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
    request('DELETE',item+'?version=3');request('GET',item,status=404)
    passed(resource+': create, retry, read, update, stale conflict, archive, restore, delete')
order,_=request('POST','/api/sales/orders',{'contactId':'C01','lines':[{'productSku':'RICE-CHICK-S','quantity':2,'unitPrice':48000}]},key=uuid.uuid4().hex);so=order['order'];workflow='/api/workflow/sales/'+so['id']
edit,_=request('POST',workflow,{'action':'edit','version':0,'lines':[{'productSku':'RICE-CHICK-S','quantity':3,'unitPrice':48000,'discountPercent':0}]});assert edit['record']['totalGross']==158400
request('POST',workflow,{'action':'cancel','version':1});passed('Sales HTTP draft edit and safe cancellation')
cashier,headers=request('POST','/api/auth/login',{'email':'cashier@rasaaruna.com','password':'Password123!'})
cookie=SimpleCookie();cookie.load(headers['set-cookie']);cookies='; '.join(k+'='+v.value for k,v in cookie.items())
request('GET','/api/accounting/general-ledger',status=403);request('POST','/api/master/customers',{'name':'Denied'},status=403);passed('Cashier is denied GL and master mutations over HTTP')
# Leave one disposable checkpoint for a separate process-restart check.
cookies=''
_,owner_headers=request('POST','/api/auth/login',{'email':'owner@rasaaruna.com','password':'Password123!'})
owner_cookie=SimpleCookie();owner_cookie.load(owner_headers['set-cookie']);cookies='; '.join(k+'='+v.value for k,v in owner_cookie.items())
checkpoint,_=request('POST','/api/master/customers',{'name':'HTTP persistence '+suffix,'city':'Jakarta'})
(project/'http-persistence-checkpoint.json').write_text(json.dumps({'id':checkpoint['record']['id'],'name':checkpoint['record']['name']}))
Path(project/'http-smoke-results.json').write_text(json.dumps(evidence,indent=2))
print('HTTP smoke:',len(evidence),'groups passed')
