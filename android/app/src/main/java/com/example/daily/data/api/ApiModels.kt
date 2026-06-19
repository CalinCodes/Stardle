package com.example.daily.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Puzzle response from the API */
@Serializable
data class PuzzleResponse(
    val id: String,
    @SerialName("topic_slug") val topicSlug: String,
    @SerialName("topic_name") val topicName: String,
    val engine: String,
    @SerialName("word_length") val wordLength: Int,
    @SerialName("max_attempts") val maxAttempts: Int,
    val date: String? = null,
    // Attribute Deduction specific:
    @SerialName("attribute_keys") val attributeKeys: List<String>? = null,
    val entities: List<String>? = null,
    // Zeitgeist specific:
    val emojis: List<String>? = null,
    val clues: List<String>? = null,
    // Hallucination specific:
    val subject: String? = null,
    val facts: List<String>? = null,
    // Missing Link specific:
    val grid: List<String>? = null,
)

/** Attempt submission request */
@Serializable
data class AttemptRequest(
    @SerialName("puzzle_id") val puzzleId: String,
    val guesses: List<String>,
    @SerialName("time_ms") val timeMs: Long,
    @SerialName("hints_used") val hintsUsed: Int,
    val won: Boolean,
)

/** Attempt submission response */
@Serializable
data class AttemptResponse(
    val correct: Boolean,
    val score: Int,
    val rank: Int? = null,
    @SerialName("total_players") val totalPlayers: Int? = null,
    val answer: String,
)

/** Feed item from the API */
@Serializable
data class FeedItemResponse(
    @SerialName("topic_slug") val topicSlug: String,
    @SerialName("topic_name") val topicName: String,
    @SerialName("topic_icon") val topicIcon: String,
    val engine: String,
    @SerialName("engine_display_name") val engineDisplayName: String,
    @SerialName("daily_completed") val dailyCompleted: Boolean,
    @SerialName("current_streak") val currentStreak: Int,
    @SerialName("best_score") val bestScore: Int? = null,
)

/** Leaderboard entry */
@Serializable
data class LeaderboardEntryResponse(
    val rank: Int,
    @SerialName("display_name") val displayName: String,
    val score: Int,
    val guesses: Int,
    @SerialName("time_ms") val timeMs: Long,
)

/** Onboarding interests request */
@Serializable
data class InterestsRequest(
    @SerialName("topic_ids") val topicIds: List<String>,
    val difficulty: String = "medium",
)

/** Word guess attempt — validates a single guess and returns feedback */
@Serializable
data class GuessRequest(
    @SerialName("puzzle_id") val puzzleId: String,
    val guess: String,
)

@Serializable
data class FeedbackItemResponse(
    val state: String, // "correct", "present", "absent"
    // Word Guess specific:
    val letter: String? = null,
    // Attribute Deduction specific:
    val attribute: String? = null,
    val value: String? = null,
)

@Serializable
data class GuessResponse(
    val valid: Boolean,
    val feedback: List<FeedbackItemResponse> = emptyList(),
    val message: String? = null,
    // New games specific:
    val correct: Boolean? = null,
    val theme: String? = null,
    val items: List<String>? = null,
)
