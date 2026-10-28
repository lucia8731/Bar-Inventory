import csv
import json
from collections import Counter
import tempfile
import unittest
from pathlib import Path
from tools.generate_catalog import build, ROOT
from tools.appearance import SHAPES, COLORS, OPTIONS, infer


class CatalogTests(unittest.TestCase):
    def test_curated_catalog_and_generated_seed(self):
        sql = build(ROOT / 'data' / 'ingredients.csv')
        self.assertEqual(sql, (ROOT / 'backend' / 'seed.sql').read_text(encoding='utf-8'))
        with (ROOT / 'data' / 'ingredients.csv').open(encoding='utf-8', newline='') as f:
            self.assertGreaterEqual(len(list(csv.DictReader(f))), 200)
        self.assertIn("('Hibiki Japanese Harmony'", sql)

    def test_spirits_are_specific_and_retired_suggestions_are_removed(self):
        with (ROOT / 'data/ingredients.csv').open(encoding='utf-8') as source:
            rows = list(csv.DictReader(source))
        counts = Counter(row['category'] for row in rows)
        for category in ('Gin', 'Vodka', 'Rum', 'Tequila & Agave', 'Whisky', 'Brandy', 'Other Spirits'):
            self.assertGreaterEqual(counts[category], 30, category)
            self.assertLessEqual(counts[category], 50, category)
        names = {row['name'] for row in rows}
        retired = json.loads((ROOT / 'data/retired_catalog_names.json').read_text())
        self.assertTrue(set(retired).isdisjoint(names))
        self.assertIn('Japanese Whisky', retired)
        self.assertIn('Hibiki Japanese Harmony', names)
        self.assertIn('Plymouth Gin', names)  # A real product, retained with its existing ID.
        sql = build(ROOT / 'data/ingredients.csv')
        self.assertIn("delete from catalog where name in (", sql)
        self.assertNotIn('delete from inventory', sql.lower())

    def test_rejects_duplicate_and_invalid_units(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'catalog.csv'
            source.write_text('name,category,unit,container_shape,container_color\nGin,Spirit,ml,bottle,clear\ngin,Spirit,ml,bottle,clear\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                build(source)
            source.write_text('name,category,unit,container_shape,container_color\nGin,Spirit,bottles,bottle,clear\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Invalid'):
                build(source)

    def test_palette_and_complete_appearance(self):
        self.assertEqual(len(SHAPES), 10)
        self.assertEqual(len(COLORS), 20)
        with (ROOT / 'data' / 'ingredients.csv').open() as f:
            for row in csv.DictReader(f):
                self.assertIn(row['container_shape'], SHAPES, row['name'])
                self.assertIn(row['container_color'], COLORS, row['name'])
        self.assertEqual(infer('Noilly Prat Original Dry', 'Vermouth & Wine'), ('wine', 'green'))
        self.assertEqual(infer('Unknown custom bottle', 'Other'), ('bottle', 'clear'))
        self.assertTrue(all(len(c['hex']) == 7 for c in OPTIONS['colors']))

    def test_rejects_invalid_appearance(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'catalog.csv'
            for shape, color in [('bad','clear'),('bottle','bad')]:
                source.write_text(f'name,category,unit,container_shape,container_color\nGin,Spirit,ml,{shape},{color}\n')
                with self.assertRaisesRegex(ValueError, 'Invalid'):
                    build(source)

    def test_rejects_small_catalog(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'catalog.csv'
            source.write_text('name,category,unit,container_shape,container_color\nGin,Spirit,ml,bottle,clear\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'at least 200'):
                build(source)


if __name__ == '__main__':
    unittest.main()
