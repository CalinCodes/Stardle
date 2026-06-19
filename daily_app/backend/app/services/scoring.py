"""
Scoring model per the implementation plan:

| Factor            | Points   |
|-------------------|----------|
| Correct solution  | +100     |
| Per unused guess  | +10 each |
| Speed bonus       | +0 to +50|
| Hint penalty      | -15 each |
| Perfect game      | +25      |
"""


def calculate_score(
    won: bool,
    num_guesses: int,
    max_attempts: int,
    time_ms: int,
    hints_used: int,
) -> int:
    """Calculate the score for a puzzle attempt."""
    if not won:
        return 0

    score = 100  # Base score for solving

    # Bonus for unused guesses
    unused = max_attempts - num_guesses
    score += unused * 10

    # Speed bonus (0-50 points)
    # Under 30s = full bonus, over 5min = no bonus
    if time_ms > 0:
        seconds = time_ms / 1000
        if seconds <= 30:
            score += 50
        elif seconds <= 300:
            # Linear scale from 50 to 0 between 30s and 300s
            ratio = 1.0 - (seconds - 30) / 270
            score += int(ratio * 50)

    # Hint penalty
    score -= hints_used * 15

    # Perfect game bonus (no hints, 3 or fewer guesses)
    if hints_used == 0 and num_guesses <= 3:
        score += 25

    return max(score, 0)
