"""Regression checks for translated text without word-delimiting spaces."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('content_import', pathlib.Path(__file__).with_name('import-content.py'))
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)

class InlineTranslationTests(unittest.TestCase):
    def test_adjacent_japanese_links_remain_two_distinct_destinations(self):
        self.assertEqual(compiler.inline('[蘭](/ja/plants/phalaenopsis/)と[アロエ](/ja/plants/aloe-vera/)を確認'),
                         '<a href="/ja/plants/phalaenopsis/">蘭</a>と<a href="/ja/plants/aloe-vera/">アロエ</a>を確認')

    def test_chinese_punctuation_stays_outside_external_href(self):
        self.assertEqual(compiler.inline('[資料](https://example.org/source)。再檢查植物。'),
                         '<a href="https://example.org/source">資料</a>。再檢查植物。')

    def test_actual_app_labels_retain_language_and_escape_other_html(self):
        self.assertEqual(compiler.inline('選擇 <span lang="en">Check & Water</span>；<img src=x onerror=alert(1)>'),
                         '選擇 <span lang="en">Check &amp; Water</span>；&lt;img src=x onerror=alert(1)&gt;')

    def test_lang_label_allowlist_does_not_restore_other_attributes(self):
        self.assertIn('&lt;span', compiler.inline('<span lang="en" onclick="alert(1)">x</span>'))

    def test_existing_emphasis_and_fragment_links_still_work(self):
        self.assertEqual(compiler.inline('**Soil**: [check](/plants/#lowLight) and *wait*.'),
                         '<strong>Soil</strong>: <a href="/plants/#lowLight">check</a> and <em>wait</em>.')

if __name__ == '__main__':
    unittest.main()
