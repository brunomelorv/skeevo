import random
from datetime import datetime, timedelta


def adjust_for_sending_window(
    target_dt: datetime,
    window_start: str = "08:00",
    window_end: str = "20:00",
) -> datetime:
    """
    Adjusts target_dt to stay strictly within allowed window bounds while preserving timezone awareness.
    If target_dt is before window_start on target_dt's date, adjusts to window_start on the same day.
    If target_dt is after window_end on target_dt's date, adjusts to window_start on the next day.
    """
    start_hour, start_minute = map(int, window_start.split(":"))
    end_hour, end_minute = map(int, window_end.split(":"))

    w_start = target_dt.replace(
        hour=start_hour, minute=start_minute, second=0, microsecond=0
    )
    w_end = target_dt.replace(
        hour=end_hour, minute=end_minute, second=0, microsecond=0
    )

    if target_dt < w_start:
        return w_start
    elif target_dt > w_end:
        return w_start + timedelta(days=1)
    
    return target_dt


def stagger_schedule_time(
    target_dt: datetime,
    existing_scheduled_dts: list[datetime],
    min_interval_minutes: int = 4,
) -> datetime:
    """
    Iterates and sorts existing_scheduled_dts. If a collision occurs (within min_interval_minutes),
    pushes target_dt forward to last_dt + timedelta(minutes=min_interval_minutes, seconds=random.randint(15, 60)).
    """
    if not existing_scheduled_dts:
        return target_dt

    sorted_dts = sorted(existing_scheduled_dts)
    min_interval = timedelta(minutes=min_interval_minutes)

    for last_dt in sorted_dts:
        if (last_dt <= target_dt < last_dt + min_interval) or (
            target_dt < last_dt and last_dt - target_dt < min_interval
        ):
            rand_seconds = random.randint(15, 60)
            target_dt = last_dt + timedelta(
                minutes=min_interval_minutes, seconds=rand_seconds
            )

    return target_dt
