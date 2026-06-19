package com.example.daily.data.repository

import com.example.daily.data.api.AttemptRequest
import com.example.daily.data.api.DailyApiService
import com.example.daily.data.api.GuessRequest
import com.example.daily.data.api.InterestsRequest
import com.example.daily.domain.model.AttemptResult
import com.example.daily.domain.model.FeedItem
import com.example.daily.domain.model.GameMode
import com.example.daily.domain.model.LetterFeedback
import com.example.daily.domain.model.LetterState
import com.example.daily.domain.model.GuessResult
import com.example.daily.domain.model.PuzzleData

class PuzzleRepository(private val api: DailyApiService) {

    suspend fun getDailyPuzzle(topicSlug: String, engine: String): PuzzleData {
        val response = api.getDailyPuzzle(topicSlug, engine)
        return PuzzleData(
            id = response.id,
            topicSlug = response.topicSlug,
            topicName = response.topicName,
            engine = response.engine,
            wordLength = response.wordLength,
            maxAttempts = response.maxAttempts,
            date = response.date,
            attributeKeys = response.attributeKeys,
            entities = response.entities,
        )
    }

    suspend fun getInfinitePuzzle(topicSlug: String, engine: String): PuzzleData {
        val response = api.getInfinitePuzzle(topicSlug, engine)
        return PuzzleData(
            id = response.id,
            topicSlug = response.topicSlug,
            topicName = response.topicName,
            engine = response.engine,
            wordLength = response.wordLength,
            maxAttempts = response.maxAttempts,
            date = response.date,
            attributeKeys = response.attributeKeys,
            entities = response.entities,
        )
    }

    suspend fun submitGuess(puzzleId: String, guess: String, mode: GameMode): GuessResult? {
        val request = GuessRequest(puzzleId = puzzleId, guess = guess)
        val response = when (mode) {
            GameMode.DAILY -> api.submitDailyGuess(puzzleId, request)
            GameMode.INFINITE -> api.submitInfiniteGuess(puzzleId, request)
        }
        if (!response.valid) return null
        return GuessResult(
            word = guess,
            feedback = response.feedback.map { fb ->
                LetterFeedback(
                    letter = fb.letter?.firstOrNull() ?: ' ',
                    state = when (fb.state) {
                        "correct" -> LetterState.CORRECT
                        "present" -> LetterState.PRESENT
                        else -> LetterState.ABSENT
                    },
                )
            },
        )
    }

    suspend fun submitAttributeGuess(puzzleId: String, guess: String, mode: GameMode): com.example.daily.domain.model.AttributeGuessResult? {
        val request = GuessRequest(puzzleId = puzzleId, guess = guess)
        val response = when (mode) {
            GameMode.DAILY -> api.submitDailyGuess(puzzleId, request)
            GameMode.INFINITE -> api.submitInfiniteGuess(puzzleId, request)
        }
        if (!response.valid) return null
        return com.example.daily.domain.model.AttributeGuessResult(
            entityName = guess,
            feedback = response.feedback.map { fb ->
                com.example.daily.domain.model.AttributeFeedback(
                    attributeName = fb.attribute ?: "",
                    value = fb.value ?: "",
                    state = when (fb.state) {
                        "correct" -> LetterState.CORRECT
                        "present" -> LetterState.PRESENT
                        else -> LetterState.ABSENT
                    },
                )
            },
        )
    }

    suspend fun submitAttempt(
        puzzleId: String,
        guesses: List<String>,
        timeMs: Long,
        hintsUsed: Int,
        won: Boolean,
        mode: GameMode,
    ): AttemptResult {
        val request = AttemptRequest(
            puzzleId = puzzleId,
            guesses = guesses,
            timeMs = timeMs,
            hintsUsed = hintsUsed,
            won = won,
        )
        val response = when (mode) {
            GameMode.DAILY -> api.submitDailyAttempt(puzzleId, request)
            GameMode.INFINITE -> api.submitInfiniteAttempt(puzzleId, request)
        }
        return AttemptResult(
            correct = response.correct,
            score = response.score,
            rank = response.rank,
            totalPlayers = response.totalPlayers,
            answer = response.answer,
        )
    }

    suspend fun getFeed(): List<FeedItem> {
        return api.getFeed().map { item ->
            FeedItem(
                topicSlug = item.topicSlug,
                topicName = item.topicName,
                topicIcon = item.topicIcon,
                engine = item.engine,
                engineDisplayName = item.engineDisplayName,
                dailyCompleted = item.dailyCompleted,
                currentStreak = item.currentStreak,
                bestScore = item.bestScore,
            )
        }
    }

    suspend fun submitInterests(topicIds: List<String>, difficulty: String) {
        api.submitInterests(InterestsRequest(topicIds = topicIds, difficulty = difficulty))
    }
}
