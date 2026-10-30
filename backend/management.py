"""Bar operations: immutable sale costs, workspace-scoped reporting and atomic stock workflows."""
from datetime import datetime,date,time,timedelta,timezone
from decimal import Decimal
from uuid import UUID,uuid4
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError
from typing import Literal
import hashlib,json
from fastapi import Request,HTTPException
from pydantic import BaseModel,Field,field_validator
from psycopg.types.json import Jsonb

ZERO=Decimal('0')
def audit(conn,owner,actor,action):
    conn.execute('insert into audit_events(id,user_id,actor_id,action) values(%s,%s,%s,%s)',(uuid4(),owner,actor,action))
def workspace_lock(conn,uid):
    conn.execute('select pg_advisory_xact_lock(%s)',(UUID(str(uid)).int%(2**63-1),))
def claim(conn,uid,kind,data):
    workspace_lock(conn,uid)
    fingerprint=hashlib.sha256(data.model_dump_json().encode()).hexdigest()
    conn.execute('select pg_advisory_xact_lock(%s)',(data.id.int%(2**63-1),))
    existing=conn.execute('select * from operation_requests where id=%s',(data.id,)).fetchone()
    if existing:
        if str(existing['user_id'])!=str(uid) or existing['kind']!=kind or existing['request_hash']!=fingerprint:
            raise HTTPException(409,'This request was already used with different details. Check the saved record before retrying.')
        return False
    conn.execute('insert into operation_requests(id,user_id,kind,request_hash) values(%s,%s,%s,%s)',(data.id,uid,kind,fingerprint))
    return True

def bar_clock(conn,uid):
    row=conn.execute('select bar_timezone,day_start from app_users where id=%s',(uid,)).fetchone()
    return ZoneInfo(row['bar_timezone']),row['day_start']
def business_date(conn,uid,instant=None):
    tz,hour=bar_clock(conn,uid);local=(instant or datetime.now(timezone.utc)).astimezone(tz)
    return local.date()-timedelta(days=int(local.hour<hour))
def bounds(conn,uid,start,end):
    tz,hour=bar_clock(conn,uid)
    return datetime.combine(start,time(hour),tz).astimezone(timezone.utc),datetime.combine(end+timedelta(days=1),time(hour),tz).astimezone(timezone.utc)
def assert_day_open(conn,uid,instant):
    day=business_date(conn,uid,instant)
    if conn.execute('select 1 from day_closures where user_id=%s and business_date=%s and reopened_at is null',(uid,day)).fetchone():
        raise HTTPException(409,f'{day} is closed. The owner must reopen it before adding sales or waste.')
def recipe_cost(conn,uid,cid):
    rows=conn.execute('''select r.amount,i.purchase_price,i.bottle_size from recipe_ingredients r
        join inventory i on i.id=r.inventory_id and i.user_id=r.user_id where r.user_id=%s and r.cocktail_id=%s''',(uid,cid)).fetchall()
    if not rows or any(r['purchase_price'] is None or r['bottle_size'] is None for r in rows):return None
    return sum((r['amount']*Decimal(r['purchase_price'])/r['bottle_size'] for r in rows),ZERO)
def period_totals(conn,uid,start,end):
    a,b=bounds(conn,uid,start,end)
    row=conn.execute('''select coalesce(sum(quantity*unit_price::bigint),0) revenue,coalesce(sum(quantity),0) units,count(*) entries,
        coalesce(sum(quantity*material_cost_per_unit),0) known_material_cost,
        coalesce(sum(quantity*unit_price::bigint) filter(where material_cost_per_unit is not null),0) costed_revenue,
        count(*) filter(where material_cost_per_unit is null) uncosted_entries,
        coalesce(sum(quantity*unit_price::bigint) filter(where payment_method='cash'),0) cash,
        coalesce(sum(quantity*unit_price::bigint) filter(where payment_method='card'),0) card,
        coalesce(sum(quantity*unit_price::bigint) filter(where payment_method='other'),0) other
        from sales where user_id=%s and sold_at>=%s and sold_at<%s''',(uid,a,b)).fetchone()
    waste=conn.execute('''select count(*) entries,coalesce(sum(material_cost),0) known_cost,
        count(*) filter(where material_cost is null) uncosted_entries from waste_events where user_id=%s and occurred_at>=%s and occurred_at<%s''',(uid,a,b)).fetchone()
    row['contribution']=row['costed_revenue']-row['known_material_cost'];row['waste']=waste
    return row

def recipe_report(conn,uid):
    items=conn.execute('select * from inventory where user_id=%s',(uid,)).fetchall();stock={str(i['id']):i for i in items}
    lines=conn.execute('select * from recipe_ingredients where user_id=%s',(uid,)).fetchall()
    recipes=[]
    for c in conn.execute('select id,name,price from cocktails where user_id=%s order by name',(uid,)).fetchall():
        recipe=[l for l in lines if l['cocktail_id']==c['id']];missing=[];short=[];cost=ZERO
        for l in recipe:
            i=stock[str(l['inventory_id'])]
            if i['purchase_price'] is None or i['bottle_size'] is None:missing.append(i['name'])
            else:cost+=l['amount']*Decimal(i['purchase_price'])/i['bottle_size']
            if i['quantity']<l['amount']:short.append(i['name'])
        complete=bool(recipe) and not missing;c['material_cost']=cost if complete else None
        c['cost_rate']=cost/Decimal(c['price'])*100 if complete and c['price'] else None
        c['contribution']=Decimal(c['price'])-cost if complete and c['price'] is not None else None
        c.update(missing_cost=missing,short=short,ingredient_count=len(recipe),available=min((int(stock[str(l['inventory_id'])]['quantity']//l['amount']) for l in recipe),default=None))
        recipes.append(c)
    value=sum((i['quantity']*Decimal(i['purchase_price'])/i['bottle_size'] for i in items if i['purchase_price'] is not None and i['bottle_size'] is not None),ZERO)
    return recipes,value,sum(i['purchase_price'] is None or i['bottle_size'] is None for i in items)

class CountLine(BaseModel):
    inventory_id:UUID
    expected:float=Field(ge=0,allow_inf_nan=False)
    actual:float=Field(ge=0,le=1e12,allow_inf_nan=False)
    bottle_size:float|None=Field(default=None,gt=0,allow_inf_nan=False)
class Stocktake(BaseModel):
    id:UUID
    note:str=Field(default='',max_length=500)
    entries:list[CountLine]=Field(min_length=1,max_length=500)
    @field_validator('entries')
    @classmethod
    def unique(cls,v):
        if len({x.inventory_id for x in v})!=len(v):raise ValueError('Count each ingredient once')
        return v
class Waste(BaseModel):
    id:UUID
    inventory_id:UUID
    amount:float=Field(gt=0,le=1e12,allow_inf_nan=False)
    reason:Literal['spill','test','expired','breakage','other']
    note:str=Field(default='',max_length=500)
    occurred_at:datetime
    @field_validator('occurred_at')
    @classmethod
    def aware(cls,v):
        if v.tzinfo is None:raise ValueError('Timezone required')
        return v
class Supplier(BaseModel):
    name:str=Field(min_length=1,max_length=120)
    contact:str=Field(default='',max_length=120)
    email:str=Field(default='',max_length=254)
    phone:str=Field(default='',max_length=80)
    lead_days:int=Field(default=0,ge=0,le=365,strict=True)
    note:str=Field(default='',max_length=500)
    @field_validator('name')
    @classmethod
    def not_blank(cls,v):
        if not v.strip():raise ValueError('Name required')
        return v.strip()
class OrderLine(BaseModel):
    inventory_id:UUID
    bottles:float=Field(gt=0,le=1000000,allow_inf_nan=False)
    unit_price:int|None=Field(default=None,ge=0,le=10000000,strict=True)
class Order(BaseModel):
    id:UUID
    supplier_id:UUID
    expected_date:date|None=None
    note:str=Field(default='',max_length=500)
    lines:list[OrderLine]=Field(min_length=1,max_length=500)
    @field_validator('lines')
    @classmethod
    def unique(cls,v):
        if len({x.inventory_id for x in v})!=len(v):raise ValueError('Select each ingredient once')
        return v
class OrderStatus(BaseModel):
    status:Literal['ordered','cancelled']
class ReceiptLine(BaseModel):
    line_id:UUID
    bottles:float=Field(gt=0,le=1000000,allow_inf_nan=False)
class Receipt(BaseModel):
    id:UUID
    lines:list[ReceiptLine]=Field(min_length=1,max_length=500)
    update_cost:bool=Field(default=False,strict=True)
    @field_validator('lines')
    @classmethod
    def unique(cls,v):
        if len({x.line_id for x in v})!=len(v):raise ValueError('Receive each line once')
        return v
class CloseDay(BaseModel):
    id:UUID
    day:date
    opening_cash:float=Field(ge=0,le=1e12,allow_inf_nan=False)
    actual_cash:float=Field(ge=0,le=1e12,allow_inf_nan=False)
    note:str=Field(default='',max_length=1000)
class Reopen(BaseModel):
    reason:str=Field(min_length=3,max_length=500)
    @field_validator('reason')
    @classmethod
    def not_blank(cls,v):
        if len(v.strip())<3:raise ValueError('Enter a reason')
        return v.strip()
class Invite(BaseModel):
    email:str=Field(min_length=3,max_length=254)
    @field_validator('email')
    @classmethod
    def email_format(cls,v):
        v=v.strip().lower()
        if '@' not in v or any(c.isspace() for c in v):raise ValueError('Enter a valid email')
        return v
class Switch(BaseModel):
    owner_id:UUID
class Clock(BaseModel):
    timezone:str=Field(max_length=64)
    day_start:int=Field(ge=0,le=12,strict=True)
    @field_validator('timezone')
    @classmethod
    def timezone_exists(cls,v):
        try:ZoneInfo(v)
        except (ZoneInfoNotFoundError,ValueError):raise ValueError('Invalid timezone')
        return v

def register_management(app,db,user_id,actor_id):
    def owner(request):
        uid=user_id(request)
        if str(uid)!=str(actor_id(request)):raise HTTPException(403,'Owner access required.')
        return uid
    def log(conn,uid,request,action):audit(conn,uid,actor_id(request),action)

    @app.get('/api/workspaces')
    def workspaces(request:Request):
        actor=actor_id(request)
        with db() as conn:
            user=conn.execute('select email from app_users where id=%s',(actor,)).fetchone()
            bars=conn.execute('''select id owner_id,bar_name,display_name from app_users where id=%s or id in
                (select owner_id from bar_members where member_id=%s) order by bar_name,id''',(actor,actor)).fetchall()
            invites=conn.execute('''select i.id,i.owner_id,u.bar_name,u.display_name from bar_invites i join app_users u on u.id=i.owner_id
                where lower(i.email)=lower(%s) and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()''',(user['email'],)).fetchall()
        return {'bars':bars,'invitations':invites,'active':user_id(request)}

    @app.post('/api/workspaces/switch')
    def switch(data:Switch,request:Request):
        actor=actor_id(request)
        with db() as conn:
            if str(data.owner_id)!=str(actor) and not conn.execute('select 1 from bar_members where owner_id=%s and member_id=%s',(data.owner_id,actor)).fetchone():raise HTTPException(403,'No access to this bar.')
        request.session['bar_id']=str(data.owner_id)
        return {'ok':True}

    @app.post('/api/team/invite')
    def invite(data:Invite,request:Request):
        uid=owner(request)
        with db() as conn:
            workspace_lock(conn,uid)
            if conn.execute('select 1 from app_users where id=%s and lower(email)=%s',(uid,data.email)).fetchone():raise HTTPException(400,'You already own this bar.')
            if conn.execute('''select 1 from bar_invites where owner_id=%s and email=%s and accepted_at is null and revoked_at is null and expires_at>now()''',(uid,data.email)).fetchone():raise HTTPException(409,'An invitation is already pending.')
            iid=uuid4();conn.execute('insert into bar_invites(id,owner_id,email) values(%s,%s,%s)',(iid,uid,data.email))
            log(conn,uid,request,f'Invited staff: {data.email}')
        return {'ok':True,'id':iid}

    @app.post('/api/team/invitations/{invite_id}/accept')
    def accept(invite_id:UUID,request:Request):
        actor=actor_id(request)
        with db() as conn:
            row=conn.execute('''select i.* from bar_invites i join app_users u on lower(u.email)=lower(i.email)
                where i.id=%s and u.id=%s and i.accepted_at is null and i.revoked_at is null and i.expires_at>now() for update of i''',(invite_id,actor)).fetchone()
            if not row:raise HTTPException(404,'Invitation not found or expired. Sign in with the invited Google account.')
            conn.execute('insert into bar_members(owner_id,member_id) values(%s,%s) on conflict do nothing',(row['owner_id'],actor))
            conn.execute('update bar_invites set accepted_at=now() where id=%s',(invite_id,))
            log(conn,row['owner_id'],request,'Accepted staff invitation')
        request.session['bar_id']=str(row['owner_id'])
        return {'ok':True}

    @app.delete('/api/team/invitations/{invite_id}')
    def revoke(invite_id:UUID,request:Request):
        uid=owner(request)
        with db() as conn:
            row=conn.execute('update bar_invites set revoked_at=now() where id=%s and owner_id=%s and accepted_at is null returning email',(invite_id,uid)).fetchone()
            if not row:raise HTTPException(404,'Pending invitation not found')
            log(conn,uid,request,f'Revoked invitation: {row["email"]}')
        return {'ok':True}

    @app.delete('/api/team/members/{member_id}')
    def remove_member(member_id:UUID,request:Request):
        uid=owner(request)
        with db() as conn:
            if not conn.execute('delete from bar_members where owner_id=%s and member_id=%s returning member_id',(uid,member_id)).fetchone():raise HTTPException(404,'Staff member not found')
            log(conn,uid,request,f'Removed staff access: {member_id}')
        return {'ok':True}

    @app.put('/api/bar/clock')
    def clock(data:Clock,request:Request):
        uid=owner(request)
        with db() as conn:
            workspace_lock(conn,uid)
            if conn.execute('select 1 from day_closures where user_id=%s limit 1',(uid,)).fetchone():raise HTTPException(409,'Business-day settings are locked after the first day close to preserve historical reports.')
            conn.execute('update app_users set bar_timezone=%s,day_start=%s where id=%s',(data.timezone,data.day_start,uid));log(conn,uid,request,'Updated business-day settings')
        return {'ok':True}

    @app.get('/api/management')
    def management(request:Request):
        uid=user_id(request)
        with db() as conn:
            recipes,value,unknown=recipe_report(conn,uid)
            orders=conn.execute('select * from purchase_orders where user_id=%s order by created_at desc limit 200',(uid,)).fetchall()
            for order in orders:order['lines']=conn.execute('select * from purchase_order_lines where order_id=%s order by item_name',(order['id'],)).fetchall()
            counts=conn.execute('''select t.*,u.display_name actor_name from stocktakes t left join app_users u on u.id=t.actor_id where t.user_id=%s order by t.created_at desc limit 100''',(uid,)).fetchall()
            for count in counts:count['lines']=conn.execute('select * from stocktake_lines where stocktake_id=%s order by item_name',(count['id'],)).fetchall()
            return {'recipes':recipes,'inventory_value':value,'unvalued_items':unknown,'orders':orders,
                'suppliers':conn.execute('select * from suppliers where user_id=%s order by name',(uid,)).fetchall(),
                'stocktakes':counts,'waste':conn.execute('select w.*,u.display_name actor_name from waste_events w left join app_users u on u.id=w.actor_id where w.user_id=%s order by occurred_at desc limit 200',(uid,)).fetchall(),
                'closures':conn.execute('select * from day_closures where user_id=%s order by business_date desc,closed_at desc limit 100',(uid,)).fetchall(),
                'audit':conn.execute('''select a.*,coalesce(nullif(u.display_name,''),u.email,'Former member') actor_name from audit_events a left join app_users u on u.id=a.actor_id where a.user_id=%s order by a.created_at desc limit 200''',(uid,)).fetchall(),
                'members':conn.execute('select u.id,u.email,u.display_name from bar_members m join app_users u on u.id=m.member_id where m.owner_id=%s order by u.display_name',(uid,)).fetchall(),
                'invites':conn.execute('select id,email,expires_at from bar_invites where owner_id=%s and accepted_at is null and revoked_at is null and expires_at>now() order by created_at desc',(uid,)).fetchall() if str(uid)==str(actor_id(request)) else [],
                'clock':conn.execute('select bar_timezone,day_start from app_users where id=%s',(uid,)).fetchone(),
                'business_date':business_date(conn,uid)}

    @app.get('/api/dashboard')
    def dashboard(request:Request,period:Literal['today','week','month','custom']='week',start:date|None=None,end:date|None=None):
        uid=user_id(request)
        with db() as conn:
            today=business_date(conn,uid)
            if period=='custom':
                if not start or not end:raise HTTPException(400,'Choose both dates')
            else:
                end=today;start=today if period=='today' else today-timedelta(days=6) if period=='week' else today.replace(day=1)
            if end<start or (end-start).days>365:raise HTTPException(400,'Choose a range of up to 366 days')
            days=(end-start).days+1;previous=period_totals(conn,uid,start-timedelta(days=days),start-timedelta(days=1));totals=period_totals(conn,uid,start,end)
            a,b=bounds(conn,uid,start,end);tz,hour=bar_clock(conn,uid)
            daily=conn.execute('''select ((sold_at at time zone %s)-(%s*interval '1 hour'))::date day,sum(quantity*unit_price::bigint) revenue,sum(quantity) units
                from sales where user_id=%s and sold_at>=%s and sold_at<%s group by 1 order by 1''',(str(tz),hour,uid,a,b)).fetchall()
            by_day={r['day']:r for r in daily};series=[by_day.get(start+timedelta(days=i),{'day':start+timedelta(days=i),'revenue':0,'units':0}) for i in range(days)]
            ranking=conn.execute('''select cocktail_id,item_name name,sum(quantity) units,sum(quantity*unit_price::bigint) revenue,
                sum(quantity*(unit_price-material_cost_per_unit)) filter(where material_cost_per_unit is not null) contribution,
                count(*) filter(where material_cost_per_unit is null) uncosted_entries from sales where user_id=%s and sold_at>=%s and sold_at<%s
                group by cocktail_id,item_name order by units desc,revenue desc''',(uid,a,b)).fetchall()
            recipes,value,unknown=recipe_report(conn,uid)
            return {'start':start,'end':end,'totals':totals,'previous':previous,'series':series,'ranking':ranking,
                'inventory_value':value,'unvalued_items':unknown,'blocked_recipes':[r for r in recipes if r['short']],
                'missing_prices':sum(r['price'] is None for r in recipes),'incomplete_costs':sum(r['material_cost'] is None for r in recipes),
                'low_items':conn.execute('select id,name,quantity,unit from inventory where user_id=%s and quantity<=low_stock_threshold order by quantity,name',(uid,)).fetchall(),
                'pending_orders':conn.execute("select count(*) total from purchase_orders where user_id=%s and status in ('ordered','partial')",(uid,)).fetchone()['total'],
                'timezone':str(tz),'day_start':hour}

    @app.post('/api/stocktakes')
    def count(data:Stocktake,request:Request):
        uid=user_id(request)
        with db() as conn:
            if not claim(conn,uid,'stocktake',data):return {'ok':True}
            conn.execute('insert into stocktakes(id,user_id,actor_id,note) values(%s,%s,%s,%s)',(data.id,uid,actor_id(request),data.note))
            for line in sorted(data.entries,key=lambda x:str(x.inventory_id)):
                item=conn.execute('select * from inventory where id=%s and user_id=%s for update',(line.inventory_id,uid)).fetchone()
                if not item:raise HTTPException(404,'Ingredient not found')
                cap=Decimal(str(line.bottle_size)) if line.bottle_size is not None else None
                if abs(item['quantity']-Decimal(str(line.expected)))>Decimal('0.000001') or (item['bottle_size'] is None)!=(cap is None) or cap is not None and abs(item['bottle_size']-cap)>Decimal('0.000001'):
                    raise HTTPException(409,f'{item["name"]} changed while counting. Refresh inventory and count again.')
                actual=Decimal(str(line.actual));diff=actual-item['quantity'];cost=diff*Decimal(item['purchase_price'])/item['bottle_size'] if item['purchase_price'] is not None and item['bottle_size'] else None
                conn.execute('insert into stocktake_lines(stocktake_id,item_name,unit,expected,actual,cost_variance) values(%s,%s,%s,%s,%s,%s)',(data.id,item['name'],item['unit'],item['quantity'],actual,cost))
                conn.execute('update inventory set quantity=%s where id=%s and user_id=%s',(actual,line.inventory_id,uid))
                if diff:conn.execute('insert into stock_events(id,user_id,item_name,unit,change,reason) values(%s,%s,%s,%s,%s,%s)',(uuid4(),uid,item['name'],item['unit'],diff,'Stocktake adjustment'))
            log(conn,uid,request,f'Completed stocktake: {len(data.entries)} ingredients')
        return {'ok':True}

    @app.post('/api/waste')
    def waste(data:Waste,request:Request):
        uid=user_id(request)
        with db() as conn:
            if not claim(conn,uid,'waste',data):return {'ok':True}
            assert_day_open(conn,uid,data.occurred_at)
            if data.occurred_at>datetime.now(timezone.utc)+timedelta(minutes=5):raise HTTPException(400,'Waste cannot be recorded in the future')
            item=conn.execute('select * from inventory where id=%s and user_id=%s for update',(data.inventory_id,uid)).fetchone()
            if not item:raise HTTPException(404,'Ingredient not found')
            amount=Decimal(str(data.amount))
            if amount>item['quantity']:raise HTTPException(400,'Not enough stock for this waste entry')
            cost=amount*Decimal(item['purchase_price'])/item['bottle_size'] if item['purchase_price'] is not None and item['bottle_size'] else None
            conn.execute('update inventory set quantity=quantity-%s where id=%s and user_id=%s',(amount,data.inventory_id,uid))
            conn.execute('insert into waste_events(id,user_id,actor_id,inventory_id,item_name,unit,amount,reason,note,material_cost,occurred_at) values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',(data.id,uid,actor_id(request),data.inventory_id,item['name'],item['unit'],amount,data.reason,data.note,cost,data.occurred_at))
            conn.execute('insert into stock_events(id,user_id,item_name,unit,change,reason) values(%s,%s,%s,%s,%s,%s)',(uuid4(),uid,item['name'],item['unit'],-amount,'Waste: '+data.reason))
            log(conn,uid,request,f'Recorded waste: {item["name"]} · {amount} {item["unit"]} · {data.reason}')
        return {'ok':True}

    @app.post('/api/suppliers')
    def supplier(data:Supplier,request:Request):
        uid=owner(request)
        with db() as conn:
            sid=uuid4();conn.execute('insert into suppliers(id,user_id,name,contact,email,phone,lead_days,note) values(%s,%s,%s,%s,%s,%s,%s,%s)',(sid,uid,data.name,data.contact,data.email,data.phone,data.lead_days,data.note));log(conn,uid,request,f'Added supplier: {data.name}')
        return {'ok':True}

    @app.patch('/api/suppliers/{supplier_id}')
    def edit_supplier(supplier_id:UUID,data:Supplier,request:Request):
        uid=owner(request)
        with db() as conn:
            result=conn.execute('update suppliers set name=%s,contact=%s,email=%s,phone=%s,lead_days=%s,note=%s where id=%s and user_id=%s',(data.name,data.contact,data.email,data.phone,data.lead_days,data.note,supplier_id,uid))
            if not result.rowcount:raise HTTPException(404,'Supplier not found')
            log(conn,uid,request,f'Updated supplier: {data.name}')
        return {'ok':True}

    @app.post('/api/purchases')
    def order(data:Order,request:Request):
        uid=owner(request)
        with db() as conn:
            if not claim(conn,uid,'purchase',data):return {'ok':True}
            supplier=conn.execute('select name from suppliers where id=%s and user_id=%s for key share',(data.supplier_id,uid)).fetchone()
            if not supplier:raise HTTPException(404,'Supplier not found')
            conn.execute('insert into purchase_orders(id,user_id,supplier_id,supplier_name,expected_date,note) values(%s,%s,%s,%s,%s,%s)',(data.id,uid,data.supplier_id,supplier['name'],data.expected_date,data.note))
            for line in sorted(data.lines,key=lambda x:str(x.inventory_id)):
                item=conn.execute('select * from inventory where id=%s and user_id=%s for key share',(line.inventory_id,uid)).fetchone()
                if not item:raise HTTPException(404,'Ingredient not found')
                if not item['bottle_size']:raise HTTPException(400,f'Set capacity for {item["name"]} first')
                price=line.unit_price if line.unit_price is not None else item['purchase_price']
                conn.execute('insert into purchase_order_lines(id,order_id,inventory_id,item_name,unit,bottle_size,bottles,unit_price) values(%s,%s,%s,%s,%s,%s,%s,%s)',(uuid4(),data.id,item['id'],item['name'],item['unit'],item['bottle_size'],line.bottles,price))
            log(conn,uid,request,f'Created purchase order for {supplier["name"]}')
        return {'ok':True}

    @app.patch('/api/purchases/{order_id}')
    def status(order_id:UUID,data:OrderStatus,request:Request):
        uid=owner(request)
        with db() as conn:
            workspace_lock(conn,uid)
            row=conn.execute('select * from purchase_orders where id=%s and user_id=%s for update',(order_id,uid)).fetchone()
            if not row:raise HTTPException(404,'Order not found')
            if row['status']==data.status:return {'ok':True}
            if data.status=='ordered' and row['status']!='draft' or data.status=='cancelled' and row['status'] not in ('draft','ordered','partial'):raise HTTPException(409,'This order cannot change to that status')
            conn.execute("update purchase_orders set status=%s,ordered_at=case when %s='ordered' then now() else ordered_at end where id=%s",(data.status,data.status,order_id));log(conn,uid,request,f'Purchase order {order_id}: {data.status}')
        return {'ok':True}

    @app.post('/api/purchases/{order_id}/receive')
    def receive(order_id:UUID,data:Receipt,request:Request):
        uid=user_id(request)
        if data.update_cost and str(uid)!=str(actor_id(request)):raise HTTPException(403,'Only the owner can update cost and capacity')
        with db() as conn:
            if not claim(conn,uid,'receive:'+str(order_id),data):return {'ok':True}
            order=conn.execute('select * from purchase_orders where id=%s and user_id=%s for update',(order_id,uid)).fetchone()
            if not order:raise HTTPException(404,'Order not found')
            if order['status'] not in ('ordered','partial'):raise HTTPException(409,'Only an ordered or partially received order can be received')
            lines={str(l['id']):l for l in conn.execute('select * from purchase_order_lines where order_id=%s for update',(order_id,)).fetchall()}
            selected=[]
            for entry in data.lines:
                line=lines.get(str(entry.line_id))
                if not line or not line['inventory_id']:raise HTTPException(404,'Order line or inventory ingredient no longer exists')
                quantity=Decimal(str(entry.bottles))
                if quantity>line['bottles']-line['received_bottles']:raise HTTPException(400,'Received quantity exceeds the remaining order')
                selected.append((line,quantity))
            for line,quantity in sorted(selected,key=lambda x:str(x[0]['inventory_id'])):
                item=conn.execute('select unit from inventory where id=%s and user_id=%s for update',(line['inventory_id'],uid)).fetchone()
                if not item or item['unit']!=line['unit']:raise HTTPException(409,'Inventory changed. Check this order before receiving')
                amount=quantity*line['bottle_size']
                conn.execute('update inventory set quantity=quantity+%s where id=%s and user_id=%s',(amount,line['inventory_id'],uid))
                if data.update_cost:
                    conn.execute('update inventory set bottle_size=%s,purchase_price=%s where id=%s and user_id=%s',(line['bottle_size'],line['unit_price'],line['inventory_id'],uid))
                conn.execute('update purchase_order_lines set received_bottles=received_bottles+%s where id=%s',(quantity,line['id']))
                conn.execute('insert into stock_events(id,user_id,item_name,unit,change,reason) values(%s,%s,%s,%s,%s,%s)',(uuid4(),uid,line['item_name'],line['unit'],amount,'Purchase order received'))
            remaining=conn.execute('select 1 from purchase_order_lines where order_id=%s and received_bottles<bottles limit 1',(order_id,)).fetchone()
            conn.execute('update purchase_orders set status=%s where id=%s',('partial' if remaining else 'received',order_id))
            conn.execute('insert into purchase_receipts(id,user_id,order_id,actor_id,lines) values(%s,%s,%s,%s,%s)',(data.id,uid,order_id,actor_id(request),Jsonb(json.loads(data.model_dump_json())['lines'])))
            log(conn,uid,request,f'Received {len(data.lines)} lines for purchase order {order_id}')
        return {'ok':True}

    @app.get('/api/closing/preview')
    def closing_preview(request:Request,day:date):
        uid=user_id(request)
        with db() as conn:
            return {'day':day,'totals':period_totals(conn,uid,day,day),'closed':bool(conn.execute('select 1 from day_closures where user_id=%s and business_date=%s and reopened_at is null',(uid,day)).fetchone())}

    @app.post('/api/closing')
    def close(data:CloseDay,request:Request):
        uid=owner(request)
        with db() as conn:
            if not claim(conn,uid,'close',data):return {'ok':True}
            if data.day>business_date(conn,uid):raise HTTPException(400,'Cannot close a future business day')
            if conn.execute('select 1 from day_closures where user_id=%s and business_date=%s and reopened_at is null',(uid,data.day)).fetchone():raise HTTPException(409,'This business day is already closed')
            totals=period_totals(conn,uid,data.day,data.day)
            snapshot=json.loads(json.dumps(totals,default=str));tz,hour=bar_clock(conn,uid);snapshot.update(timezone=str(tz),day_start=hour)
            conn.execute('insert into day_closures(id,user_id,actor_id,business_date,snapshot,opening_cash,actual_cash,note) values(%s,%s,%s,%s,%s,%s,%s,%s)',(data.id,uid,actor_id(request),data.day,Jsonb(snapshot),data.opening_cash,data.actual_cash,data.note))
            log(conn,uid,request,f'Closed business day {data.day}')
        return {'ok':True}

    @app.post('/api/closing/{close_id}/reopen')
    def reopen(close_id:UUID,data:Reopen,request:Request):
        uid=owner(request)
        with db() as conn:
            workspace_lock(conn,uid)
            row=conn.execute('update day_closures set reopened_at=now(),reopen_reason=%s where id=%s and user_id=%s and reopened_at is null returning business_date',(data.reason,close_id,uid)).fetchone()
            if not row:raise HTTPException(404,'Active day close not found')
            log(conn,uid,request,f'Reopened {row["business_date"]}: {data.reason}')
        return {'ok':True}
