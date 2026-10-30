"""Integration coverage for bar operations, historical costing, roles and business-day locks."""
import unittest
from uuid import uuid4
from datetime import datetime,timezone,timedelta
from fastapi.testclient import TestClient
from backend.main import app,db
from backend.management import bounds,business_date
from test_api import cookie

class ManagementTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.client=TestClient(app,base_url='http://testserver',headers={'Origin':'http://testserver'});cls.client.__enter__()
 @classmethod
 def tearDownClass(cls):cls.client.__exit__(None,None,None)
 def setUp(self):
  self.owner,self.staff,self.other=uuid4(),uuid4(),uuid4()
  with db() as conn:
   for uid in (self.owner,self.staff,self.other):conn.execute('insert into app_users(id,google_sub,email,display_name) values(%s,%s,%s,%s)',(uid,str(uid),f'{uid}@example.test',str(uid)[:8]))
  self.sign(self.owner)
 def sign(self,uid):
  self.client.cookies.clear();self.client.cookies.set('bar_session',cookie(uid))
 def item(self,name='Gin',price=700,size=700,quantity=1400):
  r=self.client.post('/api/inventory',json={'name':name,'category':'Gin','unit':'ml','quantity':quantity,'bottle_size':size,'purchase_price':price});self.assertEqual(r.status_code,200,r.text)
  return next(i for i in self.client.get('/api/state').json()['inventory'] if i['name']==name)
 def recipe(self,item,amount=30,name='Test drink'):
  r=self.client.post('/api/cocktails',json={'name':name,'price':1200,'ingredients':[{'inventory_id':item['id'],'amount':amount}]});self.assertEqual(r.status_code,200,r.text)
  return next(c for c in self.client.get('/api/state').json()['cocktails'] if c['name']==name)
 def sale(self,cid=None,at='2026-01-10T05:00:00+09:00',**changes):
  body={'id':str(uuid4()),'cocktail_id':cid,'item_name':'Manual item','quantity':2,'unit_price':1200,'sold_at':at,'payment_method':'cash','note':'','deduct_stock':bool(cid)};body.update(changes);return body
 def quantities(self):return {i['id']:float(i['quantity']) for i in self.client.get('/api/state').json()['inventory']}
 def test_cost_snapshots_dashboard_all_sales_and_periods(self):
  c=self.client;i=self.item();drink=self.recipe(i)
  report=c.get('/api/management').json();r=report['recipes'][0];self.assertEqual(float(r['material_cost']),30);self.assertEqual(float(r['cost_rate']),2.5);self.assertEqual(float(r['contribution']),1170)
  body=self.sale(drink['id']);self.assertEqual(c.post('/api/sales',json=body).status_code,200)
  self.assertEqual(c.patch('/api/inventory/'+i['id'],json={'quantity':1340,'low_stock_threshold':0,'purchase_price':1400,'bottle_size':700}).status_code,200)
  dashboard=c.get('/api/dashboard?period=custom&start=2026-01-10&end=2026-01-10').json()
  self.assertEqual(float(dashboard['totals']['known_material_cost']),60);self.assertEqual(float(dashboard['totals']['contribution']),2340)
  self.assertEqual(float(c.get('/api/management').json()['recipes'][0]['material_cost']),60)
  # More than the UI's 500 history rows must still be included in report totals.
  with db() as conn:
   for _ in range(505):
    conn.execute("insert into sales(id,user_id,item_name,quantity,unit_price,sold_at,payment_method,stock_deducted,request_hash) values(%s,%s,'Legacy',1,100,'2026-01-10 10:00:00+09','card',false,'legacy')",(uuid4(),self.owner))
  d=c.get('/api/dashboard?period=custom&start=2026-01-10&end=2026-01-11').json();self.assertEqual(d['totals']['entries'],506);self.assertEqual(float(d['totals']['revenue']),52900);self.assertEqual(d['totals']['uncosted_entries'],505);self.assertEqual(len(d['series']),2)
  self.assertEqual(c.get('/api/dashboard?period=custom&start=2026-01-11&end=2026-01-10').status_code,400)
  self.assertEqual(c.get('/api/dashboard?period=custom&start=2024-01-01&end=2026-01-01').status_code,400)
  with db() as conn:
   self.assertEqual(str(business_date(conn,self.owner,datetime.fromisoformat('2026-01-11T02:00:00+09:00'))),'2026-01-10')
 def test_unknown_and_zero_costs_and_blocked_recipes(self):
  i=self.item(price=None,quantity=0);self.recipe(i)
  d=self.client.get('/api/management').json();self.assertIsNone(d['recipes'][0]['material_cost']);self.assertEqual(d['unvalued_items'],1)
  board=self.client.get('/api/dashboard').json();self.assertEqual(len(board['blocked_recipes']),1);self.assertEqual(board['blocked_recipes'][0]['short'],['Gin'])
  self.client.patch('/api/inventory/'+i['id'],json={'quantity':100,'low_stock_threshold':0,'purchase_price':0,'bottle_size':700})
  self.assertEqual(float(self.client.get('/api/management').json()['recipes'][0]['material_cost']),0)
 def test_stocktake_is_atomic_and_protects_concurrent_sales(self):
  c=self.client;a=self.item('A');b=self.item('B');body={'id':str(uuid4()),'note':'Night count','entries':[{'inventory_id':a['id'],'expected':1400,'actual':700,'bottle_size':700},{'inventory_id':b['id'],'expected':999,'actual':700,'bottle_size':700}]}
  self.assertEqual(c.post('/api/stocktakes',json=body).status_code,409);self.assertEqual(self.quantities()[a['id']],1400);self.assertEqual(len(c.get('/api/management').json()['stocktakes']),0)
  body['entries'][1]['expected']=1400;self.assertEqual(c.post('/api/stocktakes',json=body).status_code,200);self.assertEqual(c.post('/api/stocktakes',json=body).status_code,200);self.assertEqual(self.quantities()[a['id']],700)
  body['note']='changed';self.assertEqual(c.post('/api/stocktakes',json=body).status_code,409)
  changed={'id':str(uuid4()),'entries':[{'inventory_id':a['id'],'expected':700,'actual':500,'bottle_size':100}]};self.assertEqual(c.post('/api/stocktakes',json=changed).status_code,409)
  self.sign(self.other);changed['entries'][0]['bottle_size']=700;self.assertEqual(c.post('/api/stocktakes',json=changed).status_code,404)
 def test_waste_validates_stock_and_saves_cost(self):
  c=self.client;i=self.item();body={'id':str(uuid4()),'inventory_id':i['id'],'amount':35,'reason':'spill','note':'Service','occurred_at':'2026-01-10T10:00:00+09:00'}
  self.assertEqual(c.post('/api/waste',json=body).status_code,200);self.assertEqual(c.post('/api/waste',json=body).status_code,200);self.assertEqual(self.quantities()[i['id']],1365)
  row=c.get('/api/management').json()['waste'][0];self.assertEqual(float(row['material_cost']),35)
  bad={**body,'id':str(uuid4()),'amount':9999};self.assertEqual(c.post('/api/waste',json=bad).status_code,400);self.assertEqual(self.quantities()[i['id']],1365)
  bad['amount']=-1;self.assertEqual(c.post('/api/waste',json=bad).status_code,422)
  self.sign(self.other);bad['amount']=1;self.assertEqual(c.post('/api/waste',json=bad).status_code,404)
 def test_partial_purchases_receive_once_and_enforce_ownership(self):
  c=self.client;i=self.item();self.assertEqual(c.post('/api/suppliers',json={'name':'Supplier','lead_days':2}).status_code,200)
  supplier=c.get('/api/management').json()['suppliers'][0];body={'id':str(uuid4()),'supplier_id':supplier['id'],'expected_date':'2026-11-01','lines':[{'inventory_id':i['id'],'bottles':3,'unit_price':900}]}
  self.assertEqual(c.post('/api/purchases',json=body).status_code,200);self.assertEqual(c.post('/api/purchases',json=body).status_code,200)
  order=c.get('/api/management').json()['orders'][0];line=order['lines'][0];endpoint='/api/purchases/'+order['id'];receipt={'id':str(uuid4()),'lines':[{'line_id':line['id'],'bottles':1.5}],'update_cost':True}
  self.assertEqual(c.post(endpoint+'/receive',json=receipt).status_code,409)
  self.assertEqual(c.patch(endpoint,json={'status':'ordered'}).status_code,200)
  self.assertEqual(c.post(endpoint+'/receive',json=receipt).status_code,200);self.assertEqual(c.post(endpoint+'/receive',json=receipt).status_code,200);self.assertEqual(self.quantities()[i['id']],2450)
  state=c.get('/api/management').json();self.assertEqual(state['orders'][0]['status'],'partial');self.assertEqual(self.client.get('/api/state').json()['inventory'][0]['purchase_price'],900)
  too_much={**receipt,'id':str(uuid4()),'lines':[{'line_id':line['id'],'bottles':2}]};self.assertEqual(c.post(endpoint+'/receive',json=too_much).status_code,400)
  finish={**receipt,'id':str(uuid4()),'lines':[{'line_id':line['id'],'bottles':1.5}]};self.assertEqual(c.post(endpoint+'/receive',json=finish).status_code,200);self.assertEqual(c.get('/api/management').json()['orders'][0]['status'],'received')
  self.assertEqual(c.patch(endpoint,json={'status':'cancelled'}).status_code,409)
  self.sign(self.other);self.assertEqual(c.post(endpoint+'/receive',json={**finish,'id':str(uuid4())}).status_code,404)
 def test_day_close_locks_sales_waste_and_preserves_snapshots(self):
  c=self.client;i=self.item();drink=self.recipe(i);sale=self.sale(drink['id']);self.assertEqual(c.post('/api/sales',json=sale).status_code,200)
  close={'id':str(uuid4()),'day':'2026-01-10','opening_cash':10000,'actual_cash':12400,'note':'Closed'}
  self.assertEqual(c.post('/api/closing',json=close).status_code,200);self.assertEqual(c.post('/api/closing',json=close).status_code,200)
  saved=c.get('/api/management').json()['closures'][0];self.assertEqual(float(saved['snapshot']['revenue']),2400)
  self.assertEqual(c.post('/api/sales',json=sale).status_code,200)
  self.assertEqual(c.post('/api/sales',json=self.sale(drink['id'])).status_code,409)
  self.assertEqual(c.post('/api/waste',json={'id':str(uuid4()),'inventory_id':i['id'],'amount':1,'reason':'test','occurred_at':'2026-01-11T02:00:00+09:00'}).status_code,409)
  self.assertEqual(c.put('/api/bar/clock',json={'timezone':'UTC','day_start':0}).status_code,409)
  self.assertEqual(c.post('/api/closing/'+saved['id']+'/reopen',json={'reason':'Correct a missed sale'}).status_code,200)
  self.assertEqual(c.post('/api/sales',json=self.sale(drink['id'])).status_code,200)
  self.assertEqual(float(c.get('/api/management').json()['closures'][0]['snapshot']['revenue']),2400)
  self.assertEqual(c.post('/api/closing',json={**close,'id':str(uuid4()),'actual_cash':14800}).status_code,200)
 def test_team_permissions_personal_profile_and_revocation(self):
  c=self.client;i=self.item();drink=self.recipe(i)
  email=f'{self.staff}@example.test';self.assertEqual(c.post('/api/team/invite',json={'email':email}).status_code,200)
  invite=c.get('/api/management').json()['invites'][0]
  self.sign(self.other);self.assertEqual(c.post('/api/team/invitations/'+invite['id']+'/accept').status_code,404)
  self.sign(self.staff);self.assertEqual(len(c.get('/api/workspaces').json()['invitations']),1)
  self.assertEqual(c.post('/api/team/invitations/'+invite['id']+'/accept').status_code,200)
  staff_cookie=c.cookies.get('bar_session')
  state=c.get('/api/state').json();self.assertEqual(state['workspace']['role'],'staff');self.assertEqual(len(state['inventory']),1)
  self.assertEqual(c.post('/api/sales',json=self.sale(drink['id'])).status_code,200)
  for endpoint,body in [('/api/inventory',{'name':'Forbidden','category':'Gin','unit':'ml'}),('/api/cocktails',{'name':'Forbidden'}),('/api/team/invite',{'email':'someone@example.test'}),('/api/closing',{'id':str(uuid4()),'day':'2026-01-10','opening_cash':0,'actual_cash':0})]:
   self.assertEqual(c.post(endpoint,json=body).status_code,403,endpoint)
  self.assertEqual(c.patch('/api/inventory/'+i['id'],json={'quantity':0,'low_stock_threshold':0}).status_code,403)
  self.assertEqual(c.put('/api/profile',json={'display_name':'Staff name','preferred_unit':'oz'}).status_code,200)
  self.assertEqual(c.get('/api/state').json()['profile']['display_name'],'Staff name')
  self.assertEqual(c.put('/api/profile',json={'display_name':'Staff name','bar_name':'Takeover'}).status_code,403)
  self.assertEqual(c.get('/api/dashboard').status_code,200)
  self.sign(self.owner);audit=c.get('/api/management').json()['audit'];self.assertTrue(any(event['actor_name']=='Staff name' and event['action']=='Recorded sales' for event in audit))
  self.assertEqual(c.delete('/api/team/members/'+str(self.staff)).status_code,200)
  c.cookies.clear();c.cookies.set('bar_session',staff_cookie)
  self.assertEqual(c.post('/api/sales',json=self.sale(drink['id'])).status_code,403)
  self.assertEqual(c.post('/api/workspaces/switch',json={'owner_id':str(self.owner)}).status_code,403)
  self.assertEqual(len(c.get('/api/state').json()['inventory']),0)
