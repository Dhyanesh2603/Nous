"""Utility helper routines."""

def format_currency(amount: float) -> str:
    """Active formatter."""
    return f"${amount:,.2f}"

def dead_unreferenced_exporter(val: str) -> str:
    """This function is exported but never called anywhere in the codebase (Dead Code)."""
    return f"DEAD::{val}"
