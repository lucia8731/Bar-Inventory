"""Bar Inventory API: Google sign-in, PostgreSQL, and transactional recipes."""
import os
import io
import warnings
import hashlib
from datetime import datetime
from PIL import Image, ImageOps, UnidentifiedImageError
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID, uuid4

import psycopg
from psycopg import errors
from psycopg.rows import dict_row
from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response
from pydantic import BaseModel, Field, field_validator
from tools.appearance import SHAPES, COLORS, infer
from starlette.middleware.sessions import SessionMiddleware
from tools.generate_catalog import build as build_catalog

ROOT = Path(__file__).resolve().parent.parent
DATABASE_URL = os.environ.get('DATABASE_URL', '')
PUBLIC_URL = os.environ.get('PUBLIC_APP_URL', 'http://localhost:3000').rstrip('/')
SECRET = os.environ.get('SESSION_SECRET', '')
GOOGLE_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
if not DATABASE_URL or not SECRET or len(SECRET) < 32:
    raise RuntimeError('Set DATABASE_URL and a SESSION_SECRET of at least 32 characters')
if not PUBLIC_URL.startswith('https://') and os.environ.get('APP_ENV') == 'production':
    raise RuntimeError('PUBLIC_APP_URL must use HTTPS in production')

def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@asynccontextmanager
async def lifespan(app):
    with db() as conn:
        conn.execute((ROOT / 'backend' / 'schema.sql').read_text(encoding='utf-8'))
        conn.execute(build_catalog(ROOT / 'data' / 'ingredients.csv'))
        for row in conn.execute('select id, name, category, unit from inventory where container_shape is null or container_color is null').fetchall():
            shape, color = infer(row['name'], row['category'], row['unit'])
            conn.execute('update inventory set container_shape=coalesce(container_shape,%s), container_color=coalesce(container_color,%s) where id=%s', (shape, color, row['id']))
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SECRET, same_site='lax', https_only=os.environ.get('APP_ENV') == 'production', session_cookie='bar_session', max_age=60*60*24*7)
oauth = OAuth()
oauth.register(name='google', client_id=GOOGLE_ID, client_secret=GOOGLE_SECRET,
               server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
               client_kwargs={'scope': 'openid email profile'})

@app.middleware('http')
async def origin_check(request: Request, call_next):
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        origin = request.headers.get('origin')
        if origin != PUBLIC_URL:
            return JSONResponse({'detail': 'Invalid request origin'}, status_code=403)
    return await call_next(request)

@app.exception_handler(psycopg.IntegrityError)
async def integrity_error(request, exc):
    if isinstance(exc, errors.ForeignKeyViolation):
        return JSONResponse({'detail': 'This ingredient is used in a recipe. Remove it from the recipe first.'}, status_code=400)
    return JSONResponse({'detail': 'That item already exists or has invalid values.'}, status_code=400)

def user_id(request: Request) -> str:
    uid = request.session.get('user_id')
    if not uid:
        raise HTTPException(401, 'Please sign in.')
    return uid

@app.get('/api/auth/login')
async def login(request: Request):
    if not GOOGLE_ID or not GOOGLE_SECRET:
        raise HTTPException(503, 'Google sign-in is not configured.')
    return await oauth.google.authorize_redirect(request, f'{PUBLIC_URL}/api/auth/callback')

@app.get('/api/auth/callback')
async def callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        info = token.get('userinfo')
        if not info or not info.get('sub') or not info.get('email') or not info.get('email_verified'):
            raise ValueError('A verified Google account is required')
    except Exception:
        raise HTTPException(401, 'Google sign-in failed. Please try again.')
    with db() as conn:
        row = conn.execute('''insert into app_users (id, google_sub, email, display_name)
            values (%s, %s, %s, %s) on conflict (google_sub) do update set email=excluded.email
            returning id''', (uuid4(), info['sub'], info['email'], info.get('name', ''))).fetchone()
    request.session.clear()
    request.session['user_id'] = str(row['id'])
    return RedirectResponse(PUBLIC_URL + '/')

@app.get('/api/session')
def session(request: Request):
    uid = request.session.get('user_id')
    if not uid:
        return {'user': None}
    with db() as conn:
        row = conn.execute('select id, email, display_name from app_users where id=%s', (uid,)).fetchone()
    return {'user': row}

@app.post('/api/auth/logout')
def logout(request: Request):
    request.session.clear()
    return {'ok': True}

@app.get('/api/state')
def state(request: Request):
    uid = user_id(request)
    with db() as conn:
        return {
            'profile': conn.execute('select display_name, avatar_version from app_users where id=%s', (uid,)).fetchone(),
            'inventory': conn.execute('select id, name, category, unit, quantity, low_stock_threshold, target_stock, supplier, image_url, container_shape, container_color from inventory where user_id=%s order by name', (uid,)).fetchall(),
            'catalog': conn.execute('select id, name, category, unit, container_shape, container_color from catalog order by name').fetchall(),
            'cocktails': conn.execute('select id, name, glass_shape, glass_color from cocktails where user_id=%s order by name', (uid,)).fetchall(),
            'ingredients': conn.execute('select cocktail_id, inventory_id, amount from recipe_ingredients where user_id=%s', (uid,)).fetchall(),
            'sales': conn.execute('select id, item_name, quantity, unit_price, sold_at, payment_method, note, stock_deducted from sales where user_id=%s order by sold_at desc, id desc limit 500', (uid,)).fetchall(),
            'sales_summary': conn.execute('select coalesce(sum(quantity * unit_price::bigint),0) as revenue, coalesce(sum(quantity),0) as units, count(*) as entries from sales where user_id=%s', (uid,)).fetchone(),
            'activity': conn.execute('select id, item_name, unit, change, reason, created_at from stock_events where user_id=%s order by created_at desc, id desc limit 100', (uid,)).fetchall(),
        }

class Appearance(BaseModel):
    container_shape: str | None = None
    container_color: str | None = None

    @field_validator('container_shape')
    @classmethod
    def valid_shape(cls, value):
        if value is not None and value not in SHAPES: raise ValueError('Invalid container shape')
        return value

    @field_validator('container_color')
    @classmethod
    def valid_color(cls, value):
        if value is not None and value not in COLORS: raise ValueError('Invalid container color')
        return value

class NewItem(Appearance):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=120)
    unit: str
    quantity: float = Field(default=0, ge=0, allow_inf_nan=False)
    low_stock_threshold: float = Field(default=0, ge=0, allow_inf_nan=False)
class Stock(Appearance):
    quantity: float = Field(ge=0, allow_inf_nan=False)
    low_stock_threshold: float = Field(ge=0, allow_inf_nan=False)
    target_stock: float = Field(default=0, ge=0, allow_inf_nan=False)
    supplier: str = Field(default='', max_length=120)
    image_url: str = Field(default='', max_length=2048)
class Name(BaseModel):
    name: str = Field(min_length=1, max_length=120)
GLASSES = {'coupe','martini','rocks','highball','collins','wine','flute','hurricane'}
class CocktailStyle(Name):
    glass_shape: str = 'coupe'
    glass_color: str = 'gold'
    @field_validator('glass_shape')
    @classmethod
    def valid_glass(cls, value):
        if value not in GLASSES: raise ValueError('Invalid glass shape')
        return value
    @field_validator('glass_color')
    @classmethod
    def valid_glass_color(cls, value):
        if value not in COLORS: raise ValueError('Invalid glass color')
        return value

class Sale(BaseModel):
    id: UUID
    cocktail_id: UUID | None = None
    item_name: str = Field(default='', max_length=120)
    quantity: int = Field(ge=1, le=1000, strict=True)
    unit_price: int = Field(ge=0, le=10000000, strict=True)
    sold_at: datetime
    payment_method: str
    note: str = Field(default='', max_length=500)
    deduct_stock: bool = False
    @field_validator('sold_at')
    @classmethod
    def aware_time(cls, value):
        if value.utcoffset() is None: raise ValueError('A timezone is required')
        return value
    @field_validator('payment_method')
    @classmethod
    def valid_payment(cls, value):
        if value not in {'cash','card','other'}: raise ValueError('Invalid payment method')
        return value

class Recipe(BaseModel):
    cocktail_id: UUID
    inventory_id: UUID
    amount: float = Field(gt=0, allow_inf_nan=False)
class Make(BaseModel):
    cocktail_id: UUID
    servings: int = Field(ge=1, le=1000)
class Profile(BaseModel):
    display_name: str = Field(max_length=100)

def trimmed(value: str) -> str:
    result = value.strip()
    if not result: raise HTTPException(400, 'A name and category are required.')
    return result

@app.post('/api/inventory')
def add_item(data: NewItem, request: Request):
    uid = user_id(request)
    if data.unit not in ('ml', 'piece'): raise HTTPException(400, 'Invalid unit')
    shape, color = infer(data.name, data.category, data.unit)
    with db() as conn:
        conn.execute('insert into inventory (id,user_id,name,category,unit,quantity,low_stock_threshold,container_shape,container_color) values (%s,%s,%s,%s,%s,%s,%s,%s,%s)', (uuid4(), uid, trimmed(data.name), trimmed(data.category), data.unit, data.quantity, data.low_stock_threshold, data.container_shape or shape, data.container_color or color))
    return {'ok': True}

@app.patch('/api/inventory/{item_id}')
def update_item(item_id: UUID, data: Stock, request: Request):
    uid = user_id(request)
    if data.image_url and not data.image_url.startswith('https://'):
        raise HTTPException(400, 'Image URL must start with https://')
    with db() as conn:
        item = conn.execute('select name, unit, quantity from inventory where id=%s and user_id=%s for update', (item_id, uid)).fetchone()
        if not item: raise HTTPException(404, 'Ingredient not found')
        conn.execute('update inventory set quantity=%s, low_stock_threshold=%s, target_stock=%s, supplier=%s, image_url=%s, container_shape=coalesce(%s,container_shape), container_color=coalesce(%s,container_color) where id=%s and user_id=%s', (data.quantity, data.low_stock_threshold, data.target_stock, data.supplier.strip(), data.image_url.strip(), data.container_shape, data.container_color, item_id, uid))
        conn.execute('insert into stock_events (id,user_id,item_name,unit,change,reason) select %s,%s,%s,%s,%s::numeric-%s,%s where %s::numeric <> %s', (uuid4(), uid, item['name'], item['unit'], data.quantity, item['quantity'], 'Stock adjustment', data.quantity, item['quantity']))
    return {'ok': True}

@app.delete('/api/inventory/{item_id}')
def delete_item(item_id: UUID, request: Request):
    with db() as conn:
        result = conn.execute('delete from inventory where id=%s and user_id=%s', (item_id, user_id(request)))
        if not result.rowcount: raise HTTPException(404, 'Ingredient not found')
    return {'ok': True}

@app.post('/api/cocktails')
def add_cocktail(data: CocktailStyle, request: Request):
    with db() as conn: conn.execute('insert into cocktails (id,user_id,name,glass_shape,glass_color) values (%s,%s,%s,%s,%s)', (uuid4(), user_id(request), trimmed(data.name), data.glass_shape, data.glass_color))
    return {'ok': True}

@app.patch('/api/cocktails/{cocktail_id}')
def update_cocktail(cocktail_id: UUID, data: CocktailStyle, request: Request):
    with db() as conn:
        result = conn.execute('update cocktails set name=%s, glass_shape=%s, glass_color=%s where id=%s and user_id=%s', (trimmed(data.name), data.glass_shape, data.glass_color, cocktail_id, user_id(request)))
        if not result.rowcount: raise HTTPException(404, 'Cocktail not found')
    return {'ok': True}

@app.delete('/api/cocktails/{cocktail_id}')
def delete_cocktail(cocktail_id: UUID, request: Request):
    with db() as conn:
        result = conn.execute('delete from cocktails where id=%s and user_id=%s', (cocktail_id, user_id(request)))
        if not result.rowcount: raise HTTPException(404, 'Cocktail not found')
    return {'ok': True}

def lock_cocktail(conn, uid, cocktail_id):
    row = conn.execute('select id from cocktails where id=%s and user_id=%s for update', (cocktail_id, uid)).fetchone()
    if not row: raise HTTPException(404, 'Cocktail not found')

@app.post('/api/recipes')
def add_recipe(data: Recipe, request: Request):
    uid = user_id(request)
    with db() as conn:
        lock_cocktail(conn, uid, data.cocktail_id)
        conn.execute('insert into recipe_ingredients (user_id,cocktail_id,inventory_id,amount) values (%s,%s,%s,%s)', (uid, data.cocktail_id, data.inventory_id, data.amount))
    return {'ok': True}

@app.delete('/api/recipes/{cocktail_id}/{item_id}')
def delete_recipe(cocktail_id: UUID, item_id: UUID, request: Request):
    uid = user_id(request)
    with db() as conn:
        lock_cocktail(conn, uid, cocktail_id)
        result = conn.execute('delete from recipe_ingredients where cocktail_id=%s and inventory_id=%s and user_id=%s', (cocktail_id, item_id, uid))
        if not result.rowcount: raise HTTPException(404, 'Recipe ingredient not found')
    return {'ok': True}

def consume_stock(conn, uid, cocktail_id, servings, reason):
    rows = conn.execute('''select i.id, i.name, i.unit, i.quantity, r.amount from recipe_ingredients r
        join inventory i on i.id=r.inventory_id and i.user_id=r.user_id
        where r.user_id=%s and r.cocktail_id=%s order by i.id for update of i''', (uid, cocktail_id)).fetchall()
    if not rows: raise HTTPException(400, 'Add ingredients to this recipe first.')
    for row in rows:
        if row['quantity'] < row['amount'] * servings: raise HTTPException(400, f"Insufficient stock: {row['name']}")
    for row in rows:
        used = row['amount'] * servings
        conn.execute('update inventory set quantity=quantity-%s where id=%s and user_id=%s', (used, row['id'], uid))
        conn.execute('insert into stock_events (id,user_id,item_name,unit,change,reason) values (%s,%s,%s,%s,%s,%s)', (uuid4(), uid, row['name'], row['unit'], -used, reason))

@app.post('/api/make')
def make(data: Make, request: Request):
    uid = user_id(request)
    with db() as conn:
        lock_cocktail(conn, uid, data.cocktail_id)
        cocktail = conn.execute('select name from cocktails where id=%s and user_id=%s', (data.cocktail_id, uid)).fetchone()
        consume_stock(conn, uid, data.cocktail_id, data.servings, f"Made {data.servings} × {cocktail['name']}")
    return {'ok': True}

@app.put('/api/profile')
def save_profile(data: Profile, request: Request):
    with db() as conn:
        conn.execute('update app_users set display_name=%s where id=%s', (data.display_name.strip(), user_id(request)))
    return {'ok': True}

@app.post('/api/profile/photo')
async def upload_profile_photo(request: Request):
    uid = user_id(request)
    payload = bytearray()
    async for chunk in request.stream():
        if len(payload) + len(chunk) > 5 * 1024 * 1024:
            raise HTTPException(413, 'Choose a photo smaller than 5 MB.')
        payload.extend(chunk)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(payload)) as source:
                if source.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise ValueError('Unsupported photo format')
                if source.width * source.height > 12_000_000:
                    raise ValueError('Photo dimensions are too large')
                oriented = ImageOps.exif_transpose(source)
                cropped = ImageOps.fit(oriented.convert('RGBA'), (256, 256), method=Image.Resampling.LANCZOS)
                photo = Image.new('RGB', (256, 256), 'white')
                photo.paste(cropped, mask=cropped.getchannel('A'))
                output = io.BytesIO()
                photo.save(output, format='JPEG', quality=85, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(400, 'Choose a JPG, PNG or WebP photo up to 12 megapixels.')
    with db() as conn:
        conn.execute('update app_users set avatar_data=%s, avatar_version=%s where id=%s', (output.getvalue(), uuid4(), uid))
    return {'ok': True}

@app.get('/api/profile/photo')
def profile_photo(request: Request):
    with db() as conn:
        row = conn.execute('select avatar_data from app_users where id=%s', (user_id(request),)).fetchone()
    if not row or row['avatar_data'] is None: raise HTTPException(404, 'No profile photo yet.')
    return Response(bytes(row['avatar_data']), media_type='image/jpeg', headers={'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff'})

@app.delete('/api/profile/photo')
def remove_profile_photo(request: Request):
    with db() as conn:
        conn.execute('update app_users set avatar_data=null, avatar_version=null where id=%s', (user_id(request),))
    return {'ok': True}

@app.post('/api/sales')
def record_sale(data: Sale, request: Request):
    uid = user_id(request)
    fingerprint = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
    with db() as conn:
        # Serialize retries so a successful sale cannot consume stock twice.
        conn.execute('select pg_advisory_xact_lock(%s)', (data.id.int % (2**63-1),))
        existing = conn.execute('select user_id,request_hash from sales where id=%s', (data.id,)).fetchone()
        if existing:
            if str(existing['user_id']) != str(uid) or existing['request_hash'] != fingerprint:
                raise HTTPException(409, 'This sale reference has already been used.')
            return {'ok': True}
        name = data.item_name.strip()
        if data.cocktail_id:
            lock_cocktail(conn, uid, data.cocktail_id)
            name = conn.execute('select name from cocktails where id=%s and user_id=%s', (data.cocktail_id,uid)).fetchone()['name']
        elif data.deduct_stock:
            raise HTTPException(400, 'Select a cocktail to deduct recipe stock.')
        if not name: raise HTTPException(400, 'Enter an item name or select a cocktail.')
        if data.deduct_stock:
            consume_stock(conn, uid, data.cocktail_id, data.quantity, f'Sale: {name}')
        conn.execute('insert into sales (id,user_id,cocktail_id,item_name,quantity,unit_price,sold_at,payment_method,note,stock_deducted,request_hash) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', (data.id,uid,data.cocktail_id,name,data.quantity,data.unit_price,data.sold_at,data.payment_method,data.note.strip(),data.deduct_stock,fingerprint))
    return {'ok': True}
