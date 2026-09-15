"""Tests for the scrape runner — validation, error isolation, output shape.

Deliberately free of scrapegraphai imports so it runs in a bare checkout with
no dependencies installed.
"""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("ANTHROPIC_API_KEY", "sk-test-not-a-real-key")

from scraper.config import Config, ConfigError  # noqa: E402
from scraper.main import select_sources, write_output  # noqa: E402
from scraper.runner import ModelWindowError, normalize_result, scrape_source  # noqa: E402
from scraper.sources import Source, parse_sources  # noqa: E402

PASSED, FAILED = [], []


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"{'PASS' if cond else 'FAIL'}: {name}")


def raises(fn, exc=ConfigError):
    try:
        fn()
    except exc:
        return True
    except Exception:
        return False
    return False


def src(**over):
    base = dict(id="s1", label="S1", url="https://example.com", prompt="ask")
    base.update(over)
    return Source(**base)


def doc(*entries):
    return {"sources": list(entries)}


ENTRY = {"id": "a", "label": "A", "url": "https://a.test", "prompt": "p"}

# --- sources.json validation ---
check("valid document parses", len(parse_sources(doc(ENTRY)).sources) == 1)
check("missing 'sources' key rejected", raises(lambda: parse_sources({})))
check("empty source list rejected", raises(lambda: parse_sources(doc())))
check("missing prompt rejected",
      raises(lambda: parse_sources(doc({k: v for k, v in ENTRY.items() if k != "prompt"}))))
check("blank label rejected", raises(lambda: parse_sources(doc({**ENTRY, "label": "  "}))))
check("non-http url rejected",
      raises(lambda: parse_sources(doc({**ENTRY, "url": "ftp://a.test"}))))
check("uppercase id rejected", raises(lambda: parse_sources(doc({**ENTRY, "id": "Aa"}))))
check("id with slash rejected", raises(lambda: parse_sources(doc({**ENTRY, "id": "a/b"}))))
check("duplicate ids rejected", raises(lambda: parse_sources(doc(ENTRY, dict(ENTRY)))))
check("defaults applied", parse_sources(doc(ENTRY)).sources[0].emoji == "🌐")

disabled = parse_sources(doc(ENTRY, {**ENTRY, "id": "b", "enabled": False}))
check("disabled sources excluded from enabled()",
      [s.id for s in disabled.enabled()] == ["a"])
check("disabled sources still parsed", len(disabled.sources) == 2)

# --- config ---
cfg = Config()
llm = cfg.graph_config()["llm"]
check("provider prefix is present", llm["model"].startswith("anthropic/"))
check("model_tokens sent explicitly", llm["model_tokens"] == 200000)
check("temperature defaults to 0", llm["temperature"] == 0)

os.environ["SCRAPER_MODEL_TOKENS"] = "10"
check("implausible model_tokens rejected", raises(Config))
del os.environ["SCRAPER_MODEL_TOKENS"]

# --- normalize_result ---
class FakeModel:
    def model_dump(self):
        return {"n": 1, "nested": [{"x": None}]}


check("dict passes through", normalize_result({"a": 1}) == {"a": 1})
check("tuple becomes list", normalize_result(("a", "b")) == ["a", "b"])
check("pydantic-style model is dumped",
      normalize_result(FakeModel()) == {"n": 1, "nested": [{"x": None}]})
check("non-string keys coerced", normalize_result({1: "a"}) == {"1": "a"})
check("unknown object stringified", "object at" in str(normalize_result(object())))

# --- scrape_source ---
def ok_factory(prompt, url, config):
    class G:
        def run(self):
            return {"quote": "hi", "asked": prompt, "from": url}
    return G()


def boom_factory(prompt, url, config):
    raise RuntimeError("page is on fire")


def defaulted_factory(prompt, url, config):
    class G:
        model_tokens_defaulted = True

        def run(self):
            return {"should": "never be reached"}
    return G()


good = scrape_source(src(), cfg, ok_factory)
check("successful scrape is status ok", good["status"] == "ok")
check("prompt reaches the graph", good["data"]["asked"] == "ask")
check("successful scrape has no error", good["error"] is None)
check("duration recorded", isinstance(good["durationMs"], int))
check("card metadata carried through", good["emoji"] == "🌐" and good["label"] == "S1")

bad = scrape_source(src(id="s2"), cfg, boom_factory)
check("a throwing source does not raise", bad["status"] == "error")
check("error message is captured", "page is on fire" in bad["error"])
check("failed source has null data", bad["data"] is None)
check("failed source keeps its id", bad["id"] == "s2")

truncated = scrape_source(src(), cfg, defaulted_factory)
check("silent 8192-token fallback is an error", truncated["status"] == "error")
check("fallback names the cause", ModelWindowError.__name__ in truncated["error"])

# --- select_sources ---
three = [src(id="a"), src(id="b"), src(id="c")]
check("no --only means everything", len(select_sources(three, [])) == 3)
check("--only filters", [s.id for s in select_sources(three, ["b"])] == ["b"])
check("--only keeps file order", [s.id for s in select_sources(three, ["c", "a"])] == ["a", "c"])
check("unknown --only id rejected", raises(lambda: select_sources(three, ["zz"])))

# --- write_output ---
with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp) / "nested" / "scrapes.json"
    payload = {"generatedAt": "2026-09-15T00:00:00+00:00", "model": "m",
               "sources": [good, bad]}
    write_output(out, payload)
    check("output directory created", out.exists())
    reread = json.loads(out.read_text(encoding="utf-8"))
    check("output round-trips", reread == payload)
    check("no temp files left behind",
          [p.name for p in out.parent.iterdir()] == ["scrapes.json"])

    write_output(out, {"generatedAt": "later", "model": "m", "sources": []})
    check("second write replaces the first",
          json.loads(out.read_text(encoding="utf-8"))["generatedAt"] == "later")

# --- the checked-in source list is valid ---
from scraper.sources import load_sources  # noqa: E402

repo_sources = load_sources(Path(__file__).resolve().parents[1] / "scraper" / "sources.json")
check("checked-in sources.json is valid", len(repo_sources.enabled()) >= 1)

print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
if FAILED:
    print("Failures:", ", ".join(FAILED))
    sys.exit(1)
