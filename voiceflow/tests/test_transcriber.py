"""Streaming logic tests with a fake model and fake recorder (no audio deps)."""

import time

from voiceflow.transcriber import Segment, StreamingTranscriber, split_committable


class FakeSegment:
    def __init__(self, start, end, text):
        self.start, self.end, self.text = start, end, text


class FakeModel:
    """Returns the segments scripted for the current audio duration."""

    def __init__(self, script):
        # script: list of (min_duration_seconds, [FakeSegment...])
        self.script = script

    def transcribe(self, audio, **kwargs):
        duration = len(audio) / 16000
        segments = []
        for min_dur, segs in self.script:
            if duration >= min_dur:
                segments = segs
        return iter(segments), None


class FakeRecorder:
    """A fixed amount of captured audio; samples are just zeros."""

    def __init__(self, total_seconds=2.0, sample_rate=16000):
        self.total = int(total_seconds * sample_rate)
        self.dropped = 0

    def get_audio(self, start_sample):
        return [0.0] * max(0, self.total - start_sample)

    def drop_until(self, sample):
        self.dropped = sample

    def stop(self):
        pass


def test_split_committable_holds_back_recent_segments():
    segments = [
        Segment(0.0, 1.0, " hello"),
        Segment(1.0, 2.0, " world"),
        Segment(2.0, 2.9, " tail"),
    ]
    stable = split_committable(segments, buffer_duration=3.0, holdback=1.0)
    assert [s.text for s in stable] == [" hello", " world"]


def test_split_committable_only_commits_a_prefix():
    # If the first segment is too recent, nothing commits.
    segments = [Segment(0.0, 2.5, " late"), Segment(2.5, 2.8, " later")]
    assert split_committable(segments, 3.0, 1.0) == []


def test_streaming_commits_then_flushes_on_stop():
    # Full 2.0s buffer -> two segments; the 1.0s tail alone -> just "world".
    model = FakeModel(
        [
            (0.0, [FakeSegment(0.0, 0.4, " world")]),
            (1.9, [FakeSegment(0.0, 1.0, " hello"), FakeSegment(1.0, 1.4, " world")]),
        ]
    )

    out = []
    t = StreamingTranscriber(
        on_text=out.append,
        model=model,
        interval=0.05,
        holdback=0.8,
        min_audio=0.1,
    )
    recorder = FakeRecorder(total_seconds=2.0)
    t.start(recorder)
    deadline = time.monotonic() + 5
    while " hello" not in out and time.monotonic() < deadline:
        time.sleep(0.02)
    assert out == [" hello"]          # the tail is held back while recording
    assert recorder.dropped == 16000  # committed audio was freed

    recorder.stop()
    t.stop()
    assert out == [" hello", " world"]  # tail flushed on stop


def test_stop_without_start_is_noop():
    t = StreamingTranscriber(on_text=lambda s: None, model=FakeModel([]))
    t.stop()  # must not raise


def test_ready_reflects_injected_model():
    assert StreamingTranscriber(on_text=print, model=FakeModel([])).ready
    assert not StreamingTranscriber(on_text=print).ready
