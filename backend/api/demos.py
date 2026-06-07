"""Interactive teaching demos."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/demos", tags=["demos"])


class TimerInput(BaseModel):
    clock_hz: float = Field(..., gt=0)
    prescaler: int = Field(..., ge=0)
    arr: int = Field(..., ge=0)


class ProcessInput(BaseModel):
    pid: str
    arrival_time: int = Field(..., ge=0)
    burst_time: int = Field(..., gt=0)


class RoundRobinInput(BaseModel):
    time_quantum: int = Field(..., gt=0)
    processes: list[ProcessInput]


@router.post("/embedded/timer")
def timer_calculator(body: TimerInput):
    timer_frequency_hz = body.clock_hz / (body.prescaler + 1)
    period_seconds = (body.arr + 1) / timer_frequency_hz
    interrupt_frequency_hz = 1.0 / period_seconds if period_seconds > 0 else 0.0

    return {
        "timer_frequency_hz": round(timer_frequency_hz, 4),
        "period_seconds": round(period_seconds, 6),
        "interrupt_frequency_hz": round(interrupt_frequency_hz, 6),
    }


def _simulate_round_robin(time_quantum: int, processes: list[dict[str, Any]]) -> dict[str, Any]:
    procs = sorted(processes, key=lambda p: p["arrival_time"])
    remaining = {p["pid"]: p["burst_time"] for p in procs}
    arrival = {p["pid"]: p["arrival_time"] for p in procs}
    burst = {p["pid"]: p["burst_time"] for p in procs}

    time = 0
    timeline: list[dict[str, Any]] = []
    queue: list[str] = []
    idx = 0
    completed: dict[str, int] = {}

    while len(completed) < len(procs):
        while idx < len(procs) and procs[idx]["arrival_time"] <= time:
            queue.append(procs[idx]["pid"])
            idx += 1

        if not queue:
            if idx < len(procs):
                time = procs[idx]["arrival_time"]
            continue

        pid = queue.pop(0)
        start = time
        run_time = min(time_quantum, remaining[pid])
        time += run_time
        remaining[pid] -= run_time
        timeline.append({"pid": pid, "start": start, "end": time})

        while idx < len(procs) and procs[idx]["arrival_time"] <= time:
            queue.append(procs[idx]["pid"])
            idx += 1

        if remaining[pid] > 0:
            queue.append(pid)
        else:
            completed[pid] = time

    waiting_times = [completed[p["pid"]] - p["arrival_time"] - p["burst_time"] for p in procs]
    turnaround_times = [completed[p["pid"]] - p["arrival_time"] for p in procs]
    n = len(procs)

    return {
        "timeline": timeline,
        "metrics": {
            "average_waiting_time": round(sum(waiting_times) / n, 4),
            "average_turnaround_time": round(sum(turnaround_times) / n, 4),
        },
    }


@router.post("/os/round_robin")
def round_robin_demo(body: RoundRobinInput):
    processes = [p.model_dump() for p in body.processes]
    return _simulate_round_robin(body.time_quantum, processes)
