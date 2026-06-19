package com.example.daily.domain.model

/** Feedback for a single letter in a word guess */
enum class LetterState {
    CORRECT,   // Right letter, right position (green)
    PRESENT,   // Right letter, wrong position (yellow)
    ABSENT,    // Letter not in the word (gray)
    EMPTY,     // Not yet evaluated
}

/** Result of evaluating a single letter */
data class LetterFeedback(
    val letter: Char,
    val state: LetterState,
)

/** A complete guess with per-letter feedback */
data class GuessResult(
    val word: String,
    val feedback: List<LetterFeedback>,
) {
    val isCorrect: Boolean get() = feedback.all { it.state == LetterState.CORRECT }
}

/** Feedback for a single attribute in an attribute deduction guess */
data class AttributeFeedback(
    val attributeName: String,
    val value: String,
    val state: LetterState, // Reusing LetterState for color states
)

/** A complete attribute deduction guess */
data class AttributeGuessResult(
    val entityName: String,
    val feedback: List<AttributeFeedback>,
) {
    // The backend sends a special "Name" attribute at index 0 which tells us if it's the exact answer.
    val isCorrect: Boolean get() = feedback.firstOrNull { it.attributeName == "Name" }?.state == LetterState.CORRECT
}

/** The game mode */
enum class GameMode {
    DAILY,
    INFINITE,
}

/** Represents the current state of a Word Guess game */
data class WordGuessState(
    val puzzleId: String = "",
    val topicName: String = "",
    val topicSlug: String = "",
    val mode: GameMode = GameMode.DAILY,
    val wordLength: Int = 5,
    val maxAttempts: Int = 6,
    val guesses: List<GuessResult> = emptyList(),
    val currentInput: String = "",
    val keyboardState: Map<Char, LetterState> = emptyMap(),
    val isGameOver: Boolean = false,
    val isWon: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
    val answer: String? = null, // Only revealed after game over
    val hintsUsed: Int = 0,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long = 0L,
)

/** Data about a puzzle served from the API */
data class PuzzleData(
    val id: String,
    val topicSlug: String,
    val topicName: String,
    val engine: String,
    val wordLength: Int,
    val maxAttempts: Int,
    val date: String? = null, // For daily mode
    // Attribute Deduction specific
    val attributeKeys: List<String>? = null,
    val entities: List<String>? = null,
)

/** Score result returned after submitting an attempt */
data class AttemptResult(
    val correct: Boolean,
    val score: Int,
    val rank: Int? = null, // Only for daily
    val totalPlayers: Int? = null,
    val answer: String,
)

/** A feed item representing an available game */
data class FeedItem(
    val topicSlug: String,
    val topicName: String,
    val topicIcon: String,
    val engine: String,
    val engineDisplayName: String,
    val dailyCompleted: Boolean,
    val currentStreak: Int,
    val bestScore: Int?,
)

/** User statistics for a specific game type */
data class UserStats(
    val gamesPlayed: Int = 0,
    val gamesWon: Int = 0,
    val currentStreak: Int = 0,
    val maxStreak: Int = 0,
    val averageGuesses: Float = 0f,
    val guessDistribution: Map<Int, Int> = emptyMap(), // guesses -> count
)
