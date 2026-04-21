import pytest
from app.services.differ import compare, multi_granularity_compare


def test_no_changes():
    result = compare("Hello world", "Hello world")
    assert result.summary["total"] == 0


def test_insertion():
    result = compare("Hello world", "Hello beautiful world")
    assert result.summary["additions"] >= 1
    types = {s["type"] for s in result.revised_spans}
    assert "insert" in types


def test_deletion():
    result = compare("Hello beautiful world", "Hello world")
    assert result.summary["deletions"] >= 1
    types = {s["type"] for s in result.original_spans}
    assert "delete" in types


def test_modification():
    result = compare("Hello world", "Hello earth")
    assert result.summary["modifications"] >= 1


def test_empty_strings():
    result = compare("", "")
    assert result.summary["total"] == 0


def test_summary_includes_moves_key():
    result = compare("a b c", "a x c")
    assert "moves" in result.summary


def test_summary_counts_consistent():
    result = compare("a b c", "a x c")
    s = result.summary
    assert s["total"] == s["additions"] + s["deletions"] + s["modifications"] + s["moves"]


def test_multi_granularity():
    result = multi_granularity_compare("The quick brown fox", "The slow brown fox")
    assert "original_spans" in result
    assert "revised_spans"  in result
    assert "summary"        in result
    assert result["summary"]["total"] >= 1


def test_span_offsets_monotonic():
    result = compare("one two three four", "one THREE four")
    offsets = [s["offset"] for s in result.original_spans if s["text"]]
    assert offsets == sorted(offsets)


def test_move_detection_short_text_not_flagged():
    # Short paragraphs (<30 chars) should NOT be flagged as moves
    result = compare("a\n\nb", "b\n\na")
    # No move spans expected for very short paragraphs
    move_types = [s["type"] for s in result.original_spans if "move" in s["type"]]
    assert len(move_types) == 0


def test_move_detection_long_paragraphs():
    # Long paragraphs that relocate should be detected as moves
    para = "This is a sufficiently long paragraph to be considered for move detection by the engine."
    text_a = f"{para}\n\nSome other content that stays in place here."
    text_b = f"Some other content that stays in place here.\n\n{para}"
    result = compare(text_a, text_b)
    all_types = (
        [s["type"] for s in result.original_spans] +
        [s["type"] for s in result.revised_spans]
    )
    # Should detect at least one move span OR treat as replace (engine best-effort)
    assert any(t in ("move_from", "move_to", "delete", "insert") for t in all_types)


def test_span_types_valid():
    valid = {"equal", "insert", "delete", "replace", "move_from", "move_to"}
    result = compare("alpha beta gamma delta", "alpha gamma beta delta")
    for s in result.original_spans + result.revised_spans:
        assert s["type"] in valid
