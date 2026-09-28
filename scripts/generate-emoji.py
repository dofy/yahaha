#!/usr/bin/env python3
"""Build the checked-in emoji catalogue using only Python's standard library."""

import argparse
import hashlib
import json
import math
import plistlib
import re
import struct
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/emoji"
CLDR = "48.2"
EMOJI = "17.0"
CACHE = ROOT / ".cache/emoji" / f"emoji-{EMOJI}-cldr-{CLDR}"
APPLE_RESOURCES = Path(
    "/System/Library/PrivateFrameworks/CoreEmoji.framework/Versions/A/Resources"
)


def canonical(value):
    # Older Apple data sometimes puts VS16 after the combining keycap.
    value = value.replace("\ufe0f", "")
    # Apple's unmodified ZWJ forms are Unicode equivalents of these RGI forms.
    return {"👨‍🤝‍👨": "👬", "👩‍🤝‍👨": "👫", "👩‍🤝‍👩": "👭", "🫱‍🫲": "🤝"}.get(value, value)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(path, data):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(path)


def download(name, url, refresh):
    path = CACHE / name
    if refresh or not path.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "yahaha-emoji-update"})
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
        path.write_bytes(raw)
    raw = path.read_bytes()
    return raw, {"url": url, "sha256": digest(raw)}


def parse_emoji_test(raw):
    entries = []
    for line in raw.decode("utf-8").splitlines():
        match = re.match(r"^([0-9A-F ]+)\s*; fully-qualified\s*# (\S+) E[\d.]+ (.+)$", line)
        if match:
            codes, emoji, name = match.groups()
            assert emoji == "".join(chr(int(code, 16)) for code in codes.split())
            entries.append({"emoji": emoji, "englishName": name})
    if len(entries) != 3944 or len({canonical(e["emoji"]) for e in entries}) != len(entries):
        raise ValueError("Unexpected Emoji 17.0 catalogue; review the upstream input")
    return entries


def parse_apple_trie(raw):
    """emoji.dat: UTF-16 trie; uint16 child count/id, (code unit, word offset) edges.

    Derive IDs directly, never by joining translated display names. Fail closed
    on changed layouts, cycles, duplicate IDs or invalid UTF-16.
    """
    mapping = {}
    visited = set()

    def visit(offset, units):
        if offset in visited or offset < 0 or offset + 4 > len(raw):
            raise ValueError("Invalid Apple emoji trie offset")
        visited.add(offset)
        count, identifier = struct.unpack_from("<HH", raw, offset)
        if len(units) > 32 or offset + 4 + count * 4 > len(raw):
            raise ValueError("Invalid Apple emoji trie node")
        if identifier:
            emoji = struct.pack("<" + "H" * len(units), *units).decode("utf-16-le")
            if identifier in mapping:
                raise ValueError("Duplicate Apple emoji identifier")
            mapping[identifier] = emoji
        for index in range(count):
            code, child = struct.unpack_from("<HH", raw, offset + 4 + index * 4)
            visit(child * 2, units + [code])

    visit(0, [])
    return mapping


def extract_apple(resources, allowed):
    hashes = {}

    def read(name):
        raw = (resources / name).read_bytes()
        hashes[name] = digest(raw)
        return raw

    mapping = parse_apple_trie(read("emoji.dat"))
    rows = {}
    counts = {}
    for locale in ("zh_CN", "zh_TW"):
        names = plistlib.loads(read(f"{locale}.lproj/AppleName.strings"))
        documents = plistlib.loads(read(f"{locale}.lproj/document_index.plist"))
        terms = plistlib.loads(read(f"{locale}.lproj/term_index.plist"))
        unmatched = []

        def row_for(identifier):
            key = canonical(mapping[int(identifier)])
            if key not in allowed:
                raise ValueError(f"Apple search document {identifier} is outside Emoji {EMOJI}")
            return rows.setdefault(key, {"emoji": allowed[key], "names": {}, "keywords": {}})

        for identifier, keywords in documents.items():
            row = row_for(identifier)
            for term, item in keywords.items():
                weight = item["w"]
                if not isinstance(weight, (int, float)) or not math.isfinite(weight) or weight < 0:
                    raise ValueError("Invalid Apple keyword weight")
                row["keywords"][term] = max(weight, row["keywords"].get(term, 0))
        for term, identifiers in terms.items():
            for identifier in identifiers:
                row_for(identifier)["keywords"].setdefault(term, 0)
        for emoji, name in names.items():
            key = canonical(emoji)
            if key not in allowed:
                unmatched.append(emoji)
                continue
            row = rows.setdefault(key, {"emoji": allowed[key], "names": {}, "keywords": {}})
            row["names"][locale] = name
            row["keywords"].setdefault(name, 0)
        counts[locale] = {
            "documents": len(documents), "mappedDocuments": len(documents),
            "terms": len(terms), "names": len(names), "nonRgiNames": unmatched,
        }

    for row in rows.values():
        row["keywords"] = sorted(row["keywords"].items())
    system = plistlib.loads(Path("/System/Library/CoreServices/SystemVersion.plist").read_bytes())
    version = plistlib.loads(read("version.plist"))
    return {
        "source": {
            "macOS": system["ProductVersion"], "build": system["ProductBuildVersion"],
            "coreEmoji": version, "sha256": hashes, "counts": counts,
            "mappedIds": len(mapping),
        },
        "entries": sorted(rows.values(), key=lambda row: row["emoji"]),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Download the pinned Unicode sources again")
    parser.add_argument("--refresh-apple", action="store_true", help="Extract the current macOS CoreEmoji resources")
    parser.add_argument("--apple-resources", type=Path, default=APPLE_RESOURCES)
    options = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    sources = {}
    raw, sources["emojiTest"] = download(
        "emoji-test.txt", f"https://www.unicode.org/Public/{EMOJI}.0/emoji/emoji-test.txt", options.refresh
    )
    entries = parse_emoji_test(raw)
    allowed = {canonical(row["emoji"]): row["emoji"] for row in entries}
    annotations = {}
    for locale in ("zh", "zh_Hant", "en"):
        annotations[locale] = {}
        for kind in ("annotations", "annotationsDerived"):
            name = f"{kind}-{locale}.xml"
            raw, sources[name] = download(
                name, f"https://raw.githubusercontent.com/unicode-org/cldr/release-48-2/common/{kind}/{locale}.xml",
                options.refresh,
            )
            for annotation in ET.fromstring(raw).iter("annotation"):
                key = canonical(annotation.attrib["cp"])
                item = annotations[locale].setdefault(key, {"name": "", "keywords": set()})
                text = "".join(annotation.itertext()).strip()
                if annotation.attrib.get("type") == "tts":
                    item["name"] = text
                else:
                    item["keywords"].update(term.strip() for term in text.split("|") if term.strip())

    if options.refresh_apple:
        snapshot = extract_apple(options.apple_resources, allowed)
    else:
        snapshot = json.loads((DATA / "apple-zh.json").read_text())
    apple = {canonical(row["emoji"]): row for row in snapshot["entries"]}

    legacy = {}
    for filename in ("emoji.json", "key.json"):
        raw = (DATA / filename).read_bytes()
        sources[filename] = {"sha256": digest(raw), "origin": "https://github.com/dofy/apple-emoji-dict"}
        for key, values in json.loads(raw).items():
            if filename == "emoji.json":
                legacy.setdefault(canonical(key), set()).update(values)
            else:
                for emoji in values:
                    legacy.setdefault(canonical(emoji), set()).add(key)

    for row in entries:
        key = canonical(row["emoji"])
        keywords = set(legacy.get(key, []))
        for locale in annotations:
            annotation = annotations[locale].get(key)
            if not annotation or not annotation["name"] or annotation["name"] == "↑↑↑":
                raise ValueError(f"Missing {locale} annotation for {row['emoji']}")
            keywords.update(annotation["keywords"])
            keywords.add(annotation["name"])
        row["name"] = annotations["zh"][key]["name"]
        row["nameHant"] = annotations["zh_Hant"][key]["name"]
        row["keywords"] = sorted(keywords)
        if key in apple:
            row["appleKeywords"] = apple[key]["keywords"]

    raw, sources["unicodeLicense"] = download(
        "LICENSE", "https://raw.githubusercontent.com/unicode-org/cldr/release-48-2/LICENSE", options.refresh
    )
    (ROOT / "public/emoji-unicode-license.txt").write_bytes(raw)
    if options.refresh_apple:
        write_json(DATA / "apple-zh.json", snapshot)
    write_json(DATA / "catalogue.json", entries)
    write_json(DATA / "sources.json", {
        "emojiVersion": EMOJI, "cldrVersion": CLDR, "emojiCount": len(entries),
        "keywordCount": len({term for row in entries for term in row["keywords"]} |
                            {term for row in entries for term, _ in row.get("appleKeywords", [])}),
        "appleEmojiCount": len(apple), "apple": snapshot["source"], "sources": sources,
        "catalogueSha256": digest((DATA / "catalogue.json").read_bytes()),
        "appleSnapshotSha256": digest((DATA / "apple-zh.json").read_bytes()),
    })
    print(f"Generated {len(entries)} emoji, {len(apple)} with Apple search terms; all zh/zh_Hant/en names present")


if __name__ == "__main__":
    main()
