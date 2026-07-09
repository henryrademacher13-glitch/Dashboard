from voiceflow.undo import UndoManager


def test_undo_returns_last_utterance_joined():
    u = UndoManager()
    u.begin_utterance()
    u.record("Hello")
    u.record(" world.")
    u.end_utterance()
    assert u.undo() == "Hello world."
    assert u.undo() is None


def test_utterances_pop_in_reverse_order():
    u = UndoManager()
    for text in ("first.", "second.", "third."):
        u.begin_utterance()
        u.record(text)
        u.end_utterance()
    assert u.undo() == "third."
    assert u.undo() == "second."
    assert u.undo() == "first."


def test_empty_utterance_not_recorded():
    u = UndoManager()
    u.begin_utterance()
    u.end_utterance()
    assert u.undo() is None


def test_record_without_begin_still_works():
    u = UndoManager()
    u.record("loose text")
    assert u.undo() == "loose text"


def test_undo_during_open_utterance_finishes_it_first():
    u = UndoManager()
    u.begin_utterance()
    u.record("in progress")
    assert u.undo() == "in progress"


def test_max_depth_enforced():
    u = UndoManager(max_depth=2)
    for text in ("a", "b", "c"):
        u.begin_utterance()
        u.record(text)
        u.end_utterance()
    assert u.undo() == "c"
    assert u.undo() == "b"
    assert u.undo() is None
