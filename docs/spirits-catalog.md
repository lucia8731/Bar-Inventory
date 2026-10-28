# Spirits catalog — 28 October 2026

Ingredients contains specific released product expressions, rather than style placeholders. Counts: Gin 35, Vodka 35, Rum 40, Tequila & Agave 40, Whisky 50, Brandy 40, Other Spirits 38 (278 spirits; 471 ingredients overall). Bottle sizes and prices are intentionally not inferred: they vary by market and are entered when adding stock.

## Research references

Manufacturer portfolios and product pages were consulted alongside specialist retail listings to check brands, expression names and ambiguous spellings. These are research references, not a claim that every product is available in every market today.

- [Suntory spirit portfolio](https://www.suntory.com/our-brands/category/spirits.html) and [House of Suntory products](https://house.suntory.com/products): Hibiki Japanese Harmony, Yamazaki, Hakushu, Toki, Roku, Haku.
- [Nikka brands](https://www.nikka.com/en/brands/): Yoichi, Miyagikyo, From the Barrel, Coffey Grain/Malt/Gin/Vodka.
- [Pernod Ricard brands](https://www.pernod-ricard.com/en/house-brands): Beefeater, Plymouth, Monkey 47, Absolut, Havana Club, Martell and whisky portfolios.
- [Bacardi portfolio](https://www.bacardilimited.com/our-brands/portfolio/): Bacardí, Bombay, Grey Goose, Patrón, Santa Teresa, Ilegal and Leblon.
- [Diageo brands](https://www.diageo.com/en/our-business/diageo-at-a-glance): Tanqueray, Gordon’s, Smirnoff, Cîroc, Captain Morgan, Don Julio, Casamigos, Johnnie Walker and Crown Royal.
- [Bombay Premier Cru](https://www.bombaysapphire.com/products/premier-cru-murcian-lemon/), [Hendrick’s collection](https://us.hendricksgin.com/hendricks-gin-collection/), [Belvedere Organic](https://www.belvederevodka.com/en-us/collection/vodka/belvedere-vodka-organic), [Chopin](https://chopinvodka.com/).
- [Planteray recipes and named expressions](https://planterayrum.com/cocktails/), [Novo Fogo producer booklet](https://novofogo.com/wp-content/uploads/2023/03/Novo-Fogo-Booklet.pdf).
- [Glenmorangie](https://www.glenmorangie.com/): Original is now 12 years old.
- [Spirits Platform](https://spiritsplatform.com.au/brands/): Rémy Martin, St-Rémy, Metaxa, Teremana, Los Siete Misterios and other represented brands.
- [JSS Naka Naka](https://shochujapan.org/en-gb/presentation-of-producers/kurokihonten-co-ltd/), [Hakkaisan rice shochu](https://www.hakkaisan.co.jp/sake/yoroshiku/), [Kumejima’s Kumesen Brown](https://shop.k-kumesen.biz/products/ブラウン).
- [Kansai Airport Zisha Daqu listing](https://www.kixdutyfree.jp/en/luzhou-laojiao-zisha-daqu-500ml-2205900115.html), [Massenez Kirsch Vieux specialist listing](https://www.diffordsguide.com/beer-wine-spirits/5375/g-e-massenez-kirsch-vieux-eau-de-vie), [The Whisky Exchange vodka brands](https://www.thewhiskyexchange.com/brands/spirits/335/vodka).

## Migration and maintenance

`data/ingredients.csv` is the source of truth; `tools/generate_catalog.py` validates it and produces `backend/seed.sql`. Application startup runs the same generator inside the schema migration transaction.

`data/retired_catalog_names.json` explicitly lists old catalog placeholders. Only those suggestion rows are deleted. Plymouth Gin is a real product and retains its existing catalog ID. Other existing product IDs and custom suggestions remain stable through upsert. User inventory, quantities, recipes, sales and history are never renamed or deleted by this migration. A generic inventory entry cannot be mapped safely to a real bottle without its owner’s knowledge.

Shapes and the 20-color palette are editable illustrations, not exact product photographs. Capacity, ABV, price, region, and local availability are not asserted by the catalog. Liqueur, wine, mixer and pantry categories are outside this spirits replacement.
