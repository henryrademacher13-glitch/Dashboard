from voiceflow.textproc import TranscriptCleaner


def test_capitalizes_sentence_starts():
    c = TranscriptCleaner()
    assert c.process("hello world. this is a test") == "Hello world. This is a test"


def test_capitalization_state_spans_chunks():
    c = TranscriptCleaner()
    assert c.process("hello there.") == "Hello there."
    # New chunk after a sentence end: capitalized and space-joined.
    assert c.process("nice to meet you") == " Nice to meet you"
    # Mid-sentence continuation: joined with a space, not capitalized.
    assert c.process("and your dog") == " and your dog"


def test_removes_filler_words():
    c = TranscriptCleaner()
    assert c.process("um, hello there") == "Hello there"
    assert c.process("i think, um, that works.") == " i think, that works."


def test_filler_only_chunk_is_dropped_without_breaking_state():
    c = TranscriptCleaner()
    assert c.process("uh") == ""
    assert c.process("hello") == "Hello"


def test_fillers_not_removed_inside_words():
    c = TranscriptCleaner(filler_words=["um"])
    assert "umbrella" in c.process("my umbrella is red")


def test_filler_removal_can_be_disabled():
    c = TranscriptCleaner(remove_fillers=False)
    assert "um" in c.process("um hello").lower()


def test_custom_vocab_replacement():
    c = TranscriptCleaner(custom_vocab={"claude code": "Claude Code", "anthropic": "Anthropic"})
    assert (
        c.process("i use claude code at anthropic")
        == "I use Claude Code at Anthropic"
    )


def test_no_space_before_punctuation_chunk():
    c = TranscriptCleaner()
    assert c.process("hello") == "Hello"
    assert c.process(", world") == ", world"


def test_whitespace_normalized():
    c = TranscriptCleaner()
    assert c.process("  hello   world  ") == "Hello world"


def test_reset_starts_fresh():
    c = TranscriptCleaner()
    c.process("hello world")
    c.reset()
    assert c.process("new session") == "New session"


def test_digits_consume_capitalization_slot():
    c = TranscriptCleaner()
    # "5 apples" must not become "5 Apples".
    assert c.process("5 apples are here") == "5 apples are here"


def test_question_and_exclamation_end_sentences():
    c = TranscriptCleaner()
    assert c.process("really? yes! ok") == "Really? Yes! Ok"
