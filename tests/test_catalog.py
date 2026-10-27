import csv
import tempfile
import unittest
from pathlib import Path
from tools.generate_catalog import build, ROOT


class CatalogTests(unittest.TestCase):
    def test_curated_catalog_and_generated_seed(self):
        sql = build(ROOT / 'data' / 'ingredients.csv')
        self.assertEqual(sql, (ROOT / 'backend' / 'seed.sql').read_text(encoding='utf-8'))
        with (ROOT / 'data' / 'ingredients.csv').open(encoding='utf-8', newline='') as f:
            self.assertGreaterEqual(len(list(csv.DictReader(f))), 200)
        self.assertIn("('Gin", sql)

    def test_rejects_duplicate_and_invalid_units(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'catalog.csv'
            source.write_text('name,category,unit\nGin,Spirit,ml\ngin,Spirit,ml\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                build(source)
            source.write_text('name,category,unit\nGin,Spirit,bottles\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Invalid'):
                build(source)

    def test_rejects_small_catalog(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'catalog.csv'
            source.write_text('name,category,unit\nGin,Spirit,ml\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'at least 200'):
                build(source)


if __name__ == '__main__':
    unittest.main()
