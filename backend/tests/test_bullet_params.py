"""Tests for BulletParam and Section models to ensure they accept boolean values."""
import pytest
from app.api.models import BulletParam, Section


def test_bullet_param_accepts_boolean_visible():
    """BulletParam should accept boolean values in params (not just strings)."""
    bullet = BulletParam(
        id="1",
        text="Test bullet",
        params={"visible": False}  # Boolean, not string
    )
    assert bullet.params["visible"] is False
    assert isinstance(bullet.params["visible"], bool)
    
    bullet2 = BulletParam(
        id="2",
        text="Test bullet 2",
        params={"visible": True}
    )
    assert bullet2.params["visible"] is True
    assert isinstance(bullet2.params["visible"], bool)


def test_bullet_param_accepts_mixed_types():
    """BulletParam params should accept any value types (bool, int, str, etc.)."""
    bullet = BulletParam(
        id="1",
        text="Test",
        params={
            "visible": False,  # bool
            "count": 5,  # int
            "name": "test",  # str
            "score": 85.5,  # float
        }
    )
    assert bullet.params["visible"] is False
    assert bullet.params["count"] == 5
    assert bullet.params["name"] == "test"
    assert bullet.params["score"] == 85.5


def test_section_accepts_boolean_visible():
    """Section should accept boolean values in params."""
    section = Section(
        id="1",
        title="Test Section",
        bullets=[],
        params={"visible": False}
    )
    assert section.params["visible"] is False
    
    section2 = Section(
        id="2",
        title="Test Section 2",
        bullets=[],
        params={"visible": True}
    )
    assert section2.params["visible"] is True


def test_section_with_bullets_accepts_booleans():
    """Section with bullets should accept boolean values in both section and bullet params."""
    section = Section(
        id="1",
        title="Experience",
        bullets=[
            BulletParam(
                id="1",
                text="Worked on project",
                params={"visible": True}
            ),
            BulletParam(
                id="2",
                text="Led team",
                params={"visible": False}
            )
        ],
        params={"visible": True}
    )
    
    assert section.params["visible"] is True
    assert section.bullets[0].params["visible"] is True
    assert section.bullets[1].params["visible"] is False


def test_export_payload_with_boolean_params():
    """ExportPayload should accept sections with boolean params."""
    from app.api.models import ExportPayload
    
    payload = ExportPayload(
        name="Test Resume",
        title="Developer",
        sections=[
            Section(
                id="1",
                title="Hidden Section",
                bullets=[],
                params={"visible": False}
            ),
            Section(
                id="2",
                title="Visible Section",
                bullets=[
                    BulletParam(
                        id="1",
                        text="Bullet 1",
                        params={"visible": True}
                    ),
                    BulletParam(
                        id="2",
                        text="Bullet 2",
                        params={"visible": False}
                    )
                ],
                params={"visible": True}
            )
        ]
    )
    
    # Verify the structure
    assert len(payload.sections) == 2
    assert payload.sections[0].params["visible"] is False
    assert payload.sections[1].params["visible"] is True
    assert payload.sections[1].bullets[0].params["visible"] is True
    assert payload.sections[1].bullets[1].params["visible"] is False

