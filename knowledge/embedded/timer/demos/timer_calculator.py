"""Reference: see POST /api/demos/embedded/timer"""
def calc(clock_hz, prescaler, arr):
    freq = clock_hz / (prescaler + 1)
    period = (arr + 1) / freq
    return freq, period, 1 / period
