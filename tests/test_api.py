"""Integration tests run with a disposable PostgreSQL database in CI."""
import base64
import json
import os
import unittest
from uuid import uuid4
from itsdangerous import TimestampSigner
from fastapi.testclient import TestClient
from backend.main import app, db, SECRET


def cookie(uid):
    payload = base64.b64encode(json.dumps({'user_id': str(uid)}).encode())
    return TimestampSigner(SECRET).sign(payload).decode()

class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, base_url='http://testserver', headers={'Origin': 'http://testserver'})
        cls.client.__enter__()
        cls.a, cls.b = uuid4(), uuid4()
        with db() as conn:
            conn.execute('insert into app_users (id,google_sub,email) values (%s,%s,%s),(%s,%s,%s)', (cls.a,str(cls.a),'a@example.test',cls.b,str(cls.b),'b@example.test'))
    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None,None,None)
    def test_stock_and_user_isolation(self):
        c = self.client
        c.cookies.set('bar_session', cookie(self.a))
        self.assertEqual(c.post('/api/inventory', json={'name':'Gin','category':'Spirit','unit':'ml','quantity':100}).status_code, 200)
        self.assertEqual(c.post('/api/inventory', json={'name':'Vermouth','category':'Wine','unit':'ml','quantity':25}).status_code, 200)
        self.assertEqual(c.post('/api/cocktails', json={'name':'Martini'}).status_code, 200)
        state = c.get('/api/state').json()
        items = {i['name']:i for i in state['inventory']}; cocktail = state['cocktails'][0]['id']
        self.assertGreaterEqual(len(state['catalog']),200)
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
        updated = {'quantity': 70, 'low_stock_threshold': 30, 'target_stock': 150, 'supplier': 'Supplier A', 'image_url': 'https://example.com/gin.jpg'}
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'], json=updated).status_code, 200)
        a_state = c.get('/api/state').json()
        gin = next(i for i in a_state['inventory'] if i['id'] == items['Gin']['id'])
        self.assertEqual((gin['quantity'],gin['target_stock'],gin['supplier'],gin['image_url']), (70,150,'Supplier A','https://example.com/gin.jpg'))
        self.assertEqual(len(a_state['activity']), 3)
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'], json={**updated,'image_url':'http://example.com/bad'}).status_code, 400)
        c.cookies.clear()
        c.cookies.set('bar_session', cookie(self.b))
        self.assertEqual(c.get('/api/state').json()['inventory'], [])
        self.assertEqual(c.get('/api/state').json()['activity'], [])
        self.assertEqual(c.post('/api/make', json={'cocktail_id':cocktail,'servings':1}).status_code,404)
        self.assertEqual(c.patch('/api/inventory/'+items['Gin']['id'],json={'quantity':0,'low_stock_threshold':0}).status_code,404)
        self.assertEqual(c.post('/api/recipes', json={'cocktail_id':cocktail,'inventory_id':items['Gin']['id'],'amount':1}).status_code,404)
    def test_requires_auth_and_origin(self):
        c = self.client
        c.cookies.clear()
        self.assertEqual(c.get('/api/state').status_code, 401)
        self.assertEqual(c.post('/api/cocktails',json={'name':'x'},headers={'Origin':'https://evil.example'}).status_code,403)
