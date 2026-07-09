from voiceflow import settings


def test_defaults_when_no_file(tmp_path):
    cfg = settings.load(tmp_path / "nope.json")
    assert cfg.model_size == "base.en"
    assert cfg.hotkey_mode == "hold"


def test_roundtrip(tmp_path):
    path = tmp_path / "config.json"
    cfg = settings.Config(model_size="tiny.en", custom_vocab={"gpt": "GPT"})
    settings.save(cfg, path)
    loaded = settings.load(path)
    assert loaded.model_size == "tiny.en"
    assert loaded.custom_vocab == {"gpt": "GPT"}


def test_unknown_keys_ignored(tmp_path):
    path = tmp_path / "config.json"
    path.write_text('{"model_size": "small", "someday_feature": true}')
    cfg = settings.load(path)
    assert cfg.model_size == "small"
    assert not hasattr(cfg, "someday_feature")


def test_corrupt_file_falls_back_to_defaults(tmp_path):
    path = tmp_path / "config.json"
    path.write_text("{not json")
    cfg = settings.load(path)
    assert cfg.model_size == "base.en"
