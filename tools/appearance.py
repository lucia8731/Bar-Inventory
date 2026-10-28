"""Shared palette validation and editable, illustrative defaults (not product photography)."""
import json
from pathlib import Path
OPTIONS = json.loads((Path(__file__).resolve().parents[1] / 'data' / 'appearance.json').read_text())
SHAPES = {option['id'] for option in OPTIONS['shapes']}
COLORS = {option['id'] for option in OPTIONS['colors']}

def infer(name, category, unit='ml'):
    n, c = name.casefold(), category.casefold()
    shape, color = 'bottle', 'clear'
    if c == 'whisky': shape, color = 'square', 'amber'
    elif c == 'brandy': shape, color = 'round', 'amber'
    elif c == 'gin': shape, color = 'tall', 'green'
    elif c == 'vodka': shape, color = 'tall', 'clear'
    elif c == 'rum': color = 'amber' if any(x in n for x in ('gold','aged','vieux','spiced','demerara')) else 'brown' if any(x in n for x in ('dark','black')) else 'clear'
    elif c == 'tequila & agave': shape, color = 'round', 'amber' if any(x in n for x in ('reposado','añejo')) else 'clear'
    elif c == 'vermouth & wine': shape, color = 'wine', 'green'
    elif c == 'bitters': shape, color = 'dropper', 'brown'
    elif c == 'syrup': shape, color = 'tall', 'gold'
    elif c == 'juice & purée': shape, color = 'carton', 'gold'
    elif c == 'mixer': shape, color = 'can', 'clear'
    elif c == 'fruit' or unit == 'piece': shape, color = 'crate', 'green'
    elif 'liqueur' in c: color = 'gold'
    elif c == 'aperitif & amaro': color = 'brown'
    if any(x in n for x in ('milk','cream','orgeat','coconut')): color = 'cream'
    if any(x in n for x in ('milk','cream')) and c == 'mixer': shape = 'carton'
    if any(x in n for x in ('coffee','espresso','cacao','chocolate','cola')): color = 'brown'
    if any(x in n for x in ('lemon','yuzu','banana','pineapple','yellow')): color = 'lemon'
    if any(x in n for x in ('orange','apricot','mango','aperol')): color = 'orange'
    if any(x in n for x in ('peach','grapefruit')): color = 'coral'
    if any(x in n for x in ('lime','mint','menthe','melon','green','absinthe','genepy')): color = 'green'
    if any(x in n for x in ('olive','cynar')): color = 'olive'
    if any(x in n for x in ('rose','rosé','pink','lychee')): color = 'rose'
    if any(x in n for x in ('violette','lavender')): color = 'lavender'
    if any(x in n for x in ('cassis','mûre','blackberry','blueberry','grape juice')): color = 'purple'
    if 'blue curaçao' in n: color = 'blue'
    if any(x in n for x in ('cherry','strawberry','raspberry','framboise','grenadine','cranberry','tomato','pomegranate','campari','select aperitivo','peychaud')): color = 'red'
    if any(x in n for x in ('red wine','rouge','sweet vermouth','port wine')): color = 'burgundy'
    if any(x in n for x in ('chartreuse','bénédictine','jägermeister','fernet','maraschino')): color = 'green'
    if 'galliano' in n: shape, color = 'tall', 'lemon'
    if 'cointreau' in n: shape, color = 'square', 'amber'
    if 'grand marnier' in n: shape, color = 'round', 'brown'
    if 'noilly' in n or 'noily' in n: shape, color = 'wine', 'green'
    if c == 'garnish & pantry' and any(x in n for x in ('olive','onion','cherry','sugar','salt','shavings')): shape = 'jar'
    return shape, color
