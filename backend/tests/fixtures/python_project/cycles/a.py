"""Cycle module A."""
from cycles.b import execute_b

def execute_a():
    return "A" + execute_b()
