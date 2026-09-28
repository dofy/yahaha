"""Golden fixtures for Apple's binary ID mapping (no macOS dependency in CI)."""
import importlib.util
import struct
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "emoji_generator", Path(__file__).resolve().parents[1] / "scripts/generate-emoji.py"
)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class AppleMappingTest(unittest.TestCase):
    def test_utf16_surrogates_terminal_ids_and_word_offsets(self):
        # One terminal BMP sequence and one surrogate pair; IDs are deliberately
        # out of traversal order to catch accidental numbering by array position.
        fixture = struct.pack(
            "<" + "H" * 18,
            2, 0, 0x2665, 6, 0xD83E, 8, 0, 3799,
            1, 0, 0xDEE1, 12, 1, 3678, 0xFE0F, 16, 0, 99,
        )
        self.assertEqual(generator.parse_apple_trie(fixture), {3799: "♥", 3678: "🫡", 99: "🫡️"})

    def test_reject_changed_or_corrupt_binary_formats(self):
        fixtures = [b"", b"\x00", struct.pack("<HHHH", 1, 0, 65, 0),
                    struct.pack("<HHHH", 1, 0, 65, 99),
                    struct.pack("<" + "H" * 10, 2, 0, 65, 6, 66, 8, 0, 1, 0, 1)]
        for fixture in fixtures:
            with self.subTest(fixture=fixture):
                with self.assertRaises((ValueError, UnicodeError, struct.error)):
                    generator.parse_apple_trie(fixture)

    def test_legacy_keycap_and_apple_joined_forms(self):
        self.assertEqual(generator.canonical("0⃣️"), generator.canonical("0️⃣"))
        self.assertEqual(generator.canonical("👨‍🤝‍👨"), "👬")
        self.assertNotEqual(generator.canonical("🫱🏽‍🫲🏼"), generator.canonical("🤝"))


if __name__ == "__main__":
    unittest.main()
