import pytest
from datetime import datetime, timezone, timedelta
from app.services.followup_calculator import (
    adjust_for_sending_window,
    stagger_schedule_time,
)


def test_adjust_for_sending_window_before_window():
    # 03:00 AM -> 08:00 AM of same day
    dt = datetime(2026, 7, 20, 3, 0, 0, tzinfo=timezone.utc)
    adjusted = adjust_for_sending_window(dt, window_start="08:00", window_end="20:00")
    assert adjusted == datetime(2026, 7, 20, 8, 0, 0, tzinfo=timezone.utc)


def test_adjust_for_sending_window_after_window():
    # 21:30 PM -> 08:00 AM of next day
    dt = datetime(2026, 7, 20, 21, 30, 0, tzinfo=timezone.utc)
    adjusted = adjust_for_sending_window(dt, window_start="08:00", window_end="20:00")
    assert adjusted == datetime(2026, 7, 21, 8, 0, 0, tzinfo=timezone.utc)


def test_adjust_for_sending_window_inside_window():
    # 14:00 PM -> unchanged
    dt = datetime(2026, 7, 20, 14, 0, 0, tzinfo=timezone.utc)
    adjusted = adjust_for_sending_window(dt, window_start="08:00", window_end="20:00")
    assert adjusted == datetime(2026, 7, 20, 14, 0, 0, tzinfo=timezone.utc)


def test_stagger_schedule_time_collision():
    # Existing: 10:00 AM, target: 10:01 AM, min_interval: 4 -> staggered >= 10:04 AM
    existing_1 = datetime(2026, 7, 20, 10, 0, 0, tzinfo=timezone.utc)
    target = datetime(2026, 7, 20, 10, 1, 0, tzinfo=timezone.utc)
    staggered = stagger_schedule_time(target, [existing_1], min_interval_minutes=4)

    expected_min = existing_1 + timedelta(minutes=4)
    assert staggered >= expected_min
