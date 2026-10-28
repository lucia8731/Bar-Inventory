"""Integration tests run with a disposable PostgreSQL database in CI."""
import base64
import io
from PIL import Image, PngImagePlugin
import json
import os
import unittest
from uuid import uuid4
from itsdangerous import TimestampSigner
from fastapi.testclient import TestClient
from backend.main import app, db, SECRET, ROOT
from tools.appearance import SHAPES, COLORS


def cookie(uid):
    payload = base64.b64encode(json.dumps({'user_id': str(uid)}).encode())
    return TimestampSigner(SECRET).sign(payload).decode()

class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Reproduce the pre-upgrade schema and a real existing user's stock.
        cls.existing = uuid4()
        cls.existing_item = uuid4()
        old_schema = (ROOT / 'backend' / 'schema.sql').read_text(encoding='utf-8').split('-- Additive changes')[0]
        with db() as conn:
            conn.execute(old_schema)
            conn.execute('insert into app_users (id,google_sub,email) values (%s,%s,%s)', (cls.existing, str(cls.existing), 'existing@example.test'))
            conn.execute('insert into inventory (id,user_id,name,category,unit,quantity) values (%s,%s,%s,%s,%s,%s)', (cls.existing_item, cls.existing, 'Existing stock', 'Gin', 'ml', 321))
        cls.client = TestClient(app, base_url='http://testserver', headers={'Origin': 'http://testserver'})
        cls.client.__enter__()
        cls.a, cls.b = uuid4(), uuid4()
        with db() as conn:
            conn.execute('insert into app_users (id,google_sub,email) values (%s,%s,%s),(%s,%s,%s)', (cls.a,str(cls.a),'a@example.test',cls.b,str(cls.b),'b@example.test'))
    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None,None,None)
    def test_sales_and_glass_styles(self):
        c = self.client
        owner = uuid4()
        with db() as conn:
            conn.execute('insert into app_users (id,google_sub,email) values (%s,%s,%s)',(owner,str(owner),'sales@example.test'))
        c.cookies.clear()
        c.cookies.set('bar_session',cookie(owner))
        self.assertEqual(c.post('/api/inventory',json={'name':'Sales gin','category':'Gin','unit':'ml','quantity':100}).status_code,200)
        self.assertEqual(c.post('/api/cocktails',json={'name':'Test martini','glass_shape':'martini','glass_color':'clear','price':1200}).status_code,200)
        state=c.get('/api/state').json()
        item=state['inventory'][0]; drink=state['cocktails'][0]
        self.assertEqual((drink['glass_shape'],drink['glass_color'],drink['price']),('martini','clear',1200))
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Test martini','glass_shape':'coupe','glass_color':'rose'}).status_code,200)
        self.assertEqual(c.get('/api/state').json()['cocktails'][0]['price'],1200)
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Test martini','glass_shape':'invalid'}).status_code,422)
        for price in [-1, 1.5, True, 10000001]:
            self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Test martini','price':price}).status_code,422)
        self.assertEqual(c.post('/api/recipes',json={'cocktail_id':drink['id'],'inventory_id':item['id'],'amount':30}).status_code,200)
        payload={'id':str(uuid4()),'cocktail_id':drink['id'],'quantity':2,'unit_price':1200,'sold_at':'2026-10-28T10:00:00+09:00','payment_method':'card','deduct_stock':True}
        self.assertEqual(c.post('/api/sales',json=payload).status_code,200)
        self.assertEqual(c.post('/api/sales',json=payload).status_code,200)
        state=c.get('/api/state').json()
        self.assertEqual(state['inventory'][0]['quantity'],40)
        self.assertEqual(state['sales_summary'],{'revenue':2400,'units':2,'entries':1})
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Test martini','glass_shape':'coupe','glass_color':'rose','price':1500}).status_code,200)
        updated=c.get('/api/state').json()
        self.assertEqual(updated['cocktails'][0]['price'],1500)
        self.assertEqual(updated['sales'][0]['unit_price'],1200)
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Renamed martini','glass_shape':'coupe','glass_color':'rose'}).status_code,200)
        renamed=c.get('/api/state').json()
        self.assertEqual((renamed['cocktails'][0]['id'],renamed['cocktails'][0]['name'],renamed['cocktails'][0]['price']), (drink['id'],'Renamed martini',1500))
        self.assertEqual(renamed['ingredients'][0]['amount'],30)
        self.assertEqual(renamed['sales'][0]['item_name'],'Test martini')
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'  '}).status_code,400)
        self.assertEqual(len(state['activity']),1)
        self.assertEqual(c.post('/api/sales',json={**payload,'unit_price':1}).status_code,409)
        self.assertEqual(c.post('/api/sales',json={**payload,'id':str(uuid4())}).status_code,400)
        state=c.get('/api/state').json()
        self.assertEqual(state['inventory'][0]['quantity'],40)
        self.assertEqual(len(state['sales']),1)
        for field,value in [('unit_price',1.5),('unit_price',-1),('quantity',0),('payment_method','bad'),('sold_at','2026-10-28T10:00:00')]:
            self.assertEqual(c.post('/api/sales',json={**payload,'id':str(uuid4()),field:value}).status_code,422)
        custom={'id':str(uuid4()),'item_name':'Snacks','quantity':1,'unit_price':500,'sold_at':'2026-10-28T10:01:00+09:00','payment_method':'cash'}
        self.assertEqual(c.post('/api/sales',json=custom).status_code,200)
        self.assertEqual(c.get('/api/state').json()['sales_summary']['revenue'],2900)
        with TestClient(app): pass
        state=c.get('/api/state').json()
        self.assertEqual(len(state['sales']),2)
        self.assertEqual(state['cocktails'][0]['glass_color'],'rose')
        self.assertEqual(state['cocktails'][0]['price'],1500)
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'Test martini','price':None}).status_code,200)
        self.assertIsNone(c.get('/api/state').json()['cocktails'][0]['price'])
        c.cookies.clear()
        c.cookies.set('bar_session',cookie(self.b))
        self.assertEqual(c.get('/api/state').json()['sales'],[])
        self.assertEqual(c.post('/api/sales',json={**payload,'id':str(uuid4())}).status_code,404)
        self.assertEqual(c.patch('/api/cocktails/'+drink['id'],json={'name':'bad'}).status_code,404)
        c.cookies.clear()
        self.assertEqual(c.post('/api/sales',json=custom).status_code,401)

    def test_inventory_price_and_recipe_amount_changes(self):
        c=self.client
        owner=uuid4()
        with db() as conn:
            conn.execute('insert into app_users (id,google_sub,email) values (%s,%s,%s)',(owner,str(owner),'editing@example.test'))
        c.cookies.clear()
        c.cookies.set('bar_session',cookie(owner))
        self.assertEqual(c.post('/api/inventory',json={'name':'Editable gin','category':'Gin','unit':'ml','quantity':100,'purchase_price':2500}).status_code,200)
        self.assertEqual(c.post('/api/cocktails',json={'name':'Editable drink'}).status_code,200)
        state=c.get('/api/state').json();item=state['inventory'][0];drink=state['cocktails'][0]
        endpoint='/api/inventory/'+item['id']
        self.assertEqual(item['purchase_price'],2500)
        stock={'quantity':100,'low_stock_threshold':0,'purchase_price':3000}
        self.assertEqual(c.patch(endpoint,json=stock).status_code,200)
        self.assertEqual(c.patch(endpoint,json={'quantity':100,'low_stock_threshold':0}).status_code,200)
        self.assertEqual(c.get('/api/state').json()['inventory'][0]['purchase_price'],3000)
        for price in [-1,1.5,True,10000001]:
            self.assertEqual(c.patch(endpoint,json={**stock,'purchase_price':price}).status_code,422)
        recipe='/api/recipes/'+drink['id']+'/'+item['id']
        self.assertEqual(c.post('/api/recipes',json={'cocktail_id':drink['id'],'inventory_id':item['id'],'amount':30}).status_code,200)
        self.assertEqual(c.patch(recipe,json={'amount':12.5}).status_code,200)
        state=c.get('/api/state').json()
        self.assertEqual(state['ingredients'][0]['amount'],12.5)
        self.assertEqual(state['inventory'][0]['quantity'],100)
        self.assertEqual(state['activity'],[])
        for amount in [0,-1]:
            self.assertEqual(c.patch(recipe,json={'amount':amount}).status_code,422)
        self.assertEqual(c.patch('/api/recipes/'+drink['id']+'/'+str(uuid4()),json={'amount':1}).status_code,404)
        self.assertEqual(c.delete(endpoint).status_code,400)
        c.cookies.clear();c.cookies.set('bar_session',cookie(self.b))
        self.assertEqual(c.patch(recipe,json={'amount':1}).status_code,404)
        self.assertEqual(c.delete(endpoint).status_code,404)
        self.assertEqual(c.patch(endpoint,json=stock).status_code,404)
        c.cookies.clear();c.cookies.set('bar_session',cookie(owner))
        with TestClient(app): pass
        state=c.get('/api/state').json()
        self.assertEqual(state['inventory'][0]['purchase_price'],3000)
        self.assertEqual(state['ingredients'][0]['amount'],12.5)
        self.assertEqual(c.patch(endpoint,json={**stock,'purchase_price':None}).status_code,200)
        self.assertIsNone(c.get('/api/state').json()['inventory'][0]['purchase_price'])
        self.assertEqual(c.delete(recipe).status_code,200)
        self.assertEqual(c.delete(endpoint).status_code,200)
        self.assertEqual(c.get('/api/state').json()['inventory'],[])
        c.cookies.clear()
        self.assertEqual(c.patch(recipe,json={'amount':1}).status_code,401)

    def test_stock_and_user_isolation(self):
        c = self.client
        c.cookies.set('bar_session', cookie(self.a))
        self.assertEqual(c.post('/api/inventory', json={'name':'Gin','category':'Spirit','unit':'ml','quantity':100}).status_code, 200)
        self.assertEqual(c.post('/api/inventory', json={'name':'Vermouth','category':'Wine','unit':'ml','quantity':25}).status_code, 200)
        self.assertEqual(c.post('/api/cocktails', json={'name':'Martini'}).status_code, 200)
        state = c.get('/api/state').json()
        items = {i['name']:i for i in state['inventory']}; cocktail = state['cocktails'][0]['id']
        self.assertGreaterEqual(len(state['catalog']),200)
        self.assertTrue(all(i['container_shape'] in SHAPES and i['container_color'] in COLORS for i in state['catalog']))
        for name, amount in [('Gin',50),('Vermouth',20)]:
            self.assertEqual(c.post('/api/recipes', json={'cocktail_id':cocktail,'inventory_id':items[name]['id'],'amount':amount}).status_code, 200)
        self.assertEqual(c.post('/api/make', json={'cocktail_id':cocktail,'servings':1}).status_code, 200)
        self.assertEqual(c.post('/api/make', json={'cocktail_id':cocktail,'servings':1}).status_code, 400)
        remaining = {i['name']:float(i['quantity']) for i in c.get('/api/state').json()['inventory']}
        self.assertEqual(remaining, {'Gin':50, 'Vermouth':5})
        self.assertEqual(c.delete('/api/inventory/'+items['Gin']['id']).status_code,400)
        a_state = c.get('/api/state').json()
        self.assertEqual(len(a_state['activity']), 2)
        self.assertTrue(all(e['reason'].startswith('Made') for e in a_state['activity']))
        updated = {'quantity': 70, 'low_stock_threshold': 30, 'target_stock': 150, 'supplier': 'Supplier A', 'image_url': 'https://example.com/gin.jpg', 'container_shape':'square', 'container_color':'blue'}
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'], json=updated).status_code, 200)
        a_state = c.get('/api/state').json()
        gin = next(i for i in a_state['inventory'] if i['id'] == items['Gin']['id'])
        self.assertEqual((gin['quantity'],gin['target_stock'],gin['supplier'],gin['image_url']), (70,150,'Supplier A','https://example.com/gin.jpg'))
        self.assertEqual((gin['container_shape'],gin['container_color']), ('square','blue'))
        # Old clients that omit appearance must preserve a user's saved choice.
        self.assertEqual(c.patch('/api/inventory/'+gin['id'], json={'quantity':70,'low_stock_threshold':30}).status_code,200)
        saved = next(i for i in c.get('/api/state').json()['inventory'] if i['id'] == gin['id'])
        self.assertEqual((saved['container_shape'],saved['container_color']), ('square','blue'))
        self.assertEqual(len(a_state['activity']), 3)
        for field in ['container_shape','container_color']:
            self.assertEqual(c.patch('/api/inventory/'+gin['id'],json={**updated,field:'invalid'}).status_code,422)
            self.assertEqual(c.post('/api/inventory',json={'name':'Invalid','category':'Other','unit':'ml',field:'invalid'}).status_code,422)
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'], json={**updated,'image_url':'http://example.com/bad'}).status_code, 400)
        c.cookies.clear()
        c.cookies.set('bar_session', cookie(self.b))
        self.assertEqual(c.get('/api/state').json()['inventory'], [])
        self.assertEqual(c.get('/api/state').json()['activity'], [])
        self.assertEqual(c.post('/api/make', json={'cocktail_id':cocktail,'servings':1}).status_code,404)
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'],json={'quantity':0,'low_stock_threshold':0}).status_code,404)
        self.assertEqual(c.post('/api/recipes', json={'cocktail_id':cocktail,'inventory_id':items['Gin']['id'],'amount':1}).status_code,404)
    def test_upgrade_preserves_existing_stock(self):
        self.client.cookies.clear()
        self.client.cookies.set('bar_session', cookie(self.existing))
        result = self.client.get('/api/state')
        self.assertEqual(result.status_code, 200)
        item = result.json()['inventory'][0]
        self.assertEqual((item['name'], item['quantity'], item['target_stock'], item['supplier'], item['image_url']), ('Existing stock', 321, 0, '', ''))
        self.assertEqual(result.json()['activity'], [])
        self.assertEqual((item['container_shape'],item['container_color']), ('tall','green'))
        with db() as conn:
            conn.execute('update inventory set container_shape=%s,container_color=%s where id=%s', ('can','rose',self.existing_item))
        # A second application startup must not reset chosen appearances.
        with TestClient(app): pass
        saved = self.client.get('/api/state').json()['inventory'][0]
        self.assertEqual((saved['quantity'],saved['container_shape'],saved['container_color']), (321,'can','rose'))

    def test_new_item_appearance(self):
        c = self.client
        c.cookies.clear()
        c.cookies.set('bar_session', cookie(self.b))
        payload = {'name':'Custom case','category':'Other','unit':'piece','container_shape':'crate','container_color':'lemon'}
        self.assertEqual(c.post('/api/inventory',json=payload).status_code,200)
        saved = next(i for i in c.get('/api/state').json()['inventory'] if i['name'] == 'Custom case')
        self.assertEqual((saved['container_shape'],saved['container_color']), ('crate','lemon'))
        self.assertEqual(c.delete('/api/inventory/'+saved['id']).status_code,200)

    def test_profile_photos(self):
        c = self.client
        c.cookies.clear()
        c.cookies.set('bar_session', cookie(self.a))
        metadata = PngImagePlugin.PngInfo()
        metadata.add_text('private_metadata','must be stripped')
        source = io.BytesIO()
        Image.new('RGBA',(400,300),(100,160,100,128)).save(source,format='PNG',pnginfo=metadata)
        self.assertEqual(c.post('/api/profile/photo',content=source.getvalue(),headers={'Content-Type':'image/png'}).status_code,200)
        version = c.get('/api/state').json()['profile']['avatar_version']
        self.assertTrue(version)
        photo = c.get('/api/profile/photo')
        self.assertEqual(photo.status_code,200)
        self.assertEqual(photo.headers['content-type'],'image/jpeg')
        self.assertIn('no-store',photo.headers['cache-control'])
        with Image.open(io.BytesIO(photo.content)) as saved:
            self.assertEqual(saved.size,(256,256))
            self.assertEqual(saved.format,'JPEG')
            self.assertNotIn('private_metadata',saved.info)
        with TestClient(app): pass
        self.assertEqual(c.get('/api/profile/photo').content,photo.content)
        self.assertEqual(c.post('/api/profile/photo',content=b'<svg></svg>').status_code,400)
        self.assertEqual(c.post('/api/profile/photo',content=b'x'*(5*1024*1024+1)).status_code,413)
        self.assertEqual(c.get('/api/profile/photo').content,photo.content)
        c.cookies.clear()
        c.cookies.set('bar_session',cookie(self.b))
        self.assertEqual(c.get('/api/profile/photo').status_code,404)
        self.assertEqual(c.delete('/api/profile/photo').status_code,200)
        c.cookies.clear()
        c.cookies.set('bar_session',cookie(self.a))
        self.assertEqual(c.get('/api/profile/photo').content,photo.content)
        self.assertEqual(c.delete('/api/profile/photo').status_code,200)
        self.assertEqual(c.get('/api/profile/photo').status_code,404)
        self.assertIsNone(c.get('/api/state').json()['profile']['avatar_version'])
        c.cookies.clear()
        self.assertEqual(c.get('/api/profile/photo').status_code,401)
        self.assertEqual(c.post('/api/profile/photo',content=source.getvalue()).status_code,401)

    def test_requires_auth_and_origin(self):
        c = self.client
        c.cookies.clear()
        self.assertEqual(c.get('/api/state').status_code, 401)
        self.assertEqual(c.post('/api/cocktails',json={'name':'x'},headers={'Origin':'https://evil.example'}).status_code,403)
