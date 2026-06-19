package com.example.daily.ui.game.wordguess

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.daily.data.repository.PuzzleRepository
import com.example.daily.domain.model.GameMode
import com.example.daily.domain.model.GuessResult
import com.example.daily.domain.model.LetterState
import com.example.daily.domain.model.WordGuessState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class WordGuessViewModel(
    private val repository: PuzzleRepository,
    private val topicSlug: String,
    private val mode: GameMode,
) : ViewModel() {

    private val _state = MutableStateFlow(WordGuessState(
        topicSlug = topicSlug,
        mode = mode,
    ))
    val state: StateFlow<WordGuessState> = _state.asStateFlow()

    init {
        loadPuzzle()
    }

    private fun loadPuzzle() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val puzzle = when (mode) {
                    GameMode.DAILY -> repository.getDailyPuzzle(topicSlug, "word-guess")
                    GameMode.INFINITE -> repository.getInfinitePuzzle(topicSlug, "word-guess")
                }
                _state.update {
                    it.copy(
                        puzzleId = puzzle.id,
                        topicName = puzzle.topicName,
                        wordLength = puzzle.wordLength,
                        maxAttempts = puzzle.maxAttempts,
                        isLoading = false,
                        startTimeMs = System.currentTimeMillis(),
                    )
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load puzzle")
                }
            }
        }
    }

    fun onLetterInput(letter: Char) {
        _state.update { current ->
            if (current.isGameOver) return@update current
            if (current.currentInput.length >= current.wordLength) return@update current
            current.copy(currentInput = current.currentInput + letter.uppercaseChar())
        }
    }

    fun onBackspace() {
        _state.update { current ->
            if (current.isGameOver) return@update current
            if (current.currentInput.isEmpty()) return@update current
            current.copy(currentInput = current.currentInput.dropLast(1))
        }
    }

    fun onSubmitGuess() {
        val current = _state.value
        if (current.isGameOver) return
        if (current.currentInput.length != current.wordLength) return

        val guess = current.currentInput.uppercase()

        viewModelScope.launch {
            try {
                val result = repository.submitGuess(current.puzzleId, guess, mode)
                if (result == null) {
                    // Invalid word
                    _state.update { it.copy(error = "Not a valid word") }
                    return@launch
                }

                val newGuesses = current.guesses + result
                val newKeyboardState = current.keyboardState.toMutableMap()
                result.feedback.forEach { fb ->
                    val existing = newKeyboardState[fb.letter]
                    // Only upgrade state: ABSENT -> PRESENT -> CORRECT
                    val shouldUpdate = existing == null ||
                        (existing == LetterState.ABSENT && fb.state != LetterState.ABSENT) ||
                        (existing == LetterState.PRESENT && fb.state == LetterState.CORRECT)
                    if (shouldUpdate) {
                        newKeyboardState[fb.letter] = fb.state
                    }
                }

                val isWon = result.isCorrect
                val isGameOver = isWon || newGuesses.size >= current.maxAttempts

                _state.update {
                    it.copy(
                        guesses = newGuesses,
                        currentInput = "",
                        keyboardState = newKeyboardState,
                        isWon = isWon,
                        isGameOver = isGameOver,
                        endTimeMs = if (isGameOver) System.currentTimeMillis() else 0L,
                        error = null,
                    )
                }

                if (isGameOver) {
                    submitFinalAttempt(newGuesses, isWon)
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message ?: "Error submitting guess") }
            }
        }
    }

    private suspend fun submitFinalAttempt(guesses: List<GuessResult>, won: Boolean) {
        val current = _state.value
        try {
            val result = repository.submitAttempt(
                puzzleId = current.puzzleId,
                guesses = guesses.map { it.word },
                timeMs = current.endTimeMs - current.startTimeMs,
                hintsUsed = current.hintsUsed,
                won = won,
                mode = mode,
            )
            _state.update { it.copy(answer = result.answer) }
        } catch (_: Exception) {
            // Non-critical — game state is already finalized locally
        }
    }

    fun onHintRequested() {
        // TODO: Implement hint system — reveal a letter, increment hintsUsed
        _state.update { it.copy(hintsUsed = it.hintsUsed + 1) }
    }

    fun onSkip() {
        if (mode == GameMode.INFINITE) {
            _state.update {
                WordGuessState(
                    topicSlug = topicSlug,
                    mode = mode,
                )
            }
            loadPuzzle()
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }

    /** Generate a shareable emoji result card */
    fun generateShareText(): String {
        val current = _state.value
        val header = "Daily ${current.topicName} — Word Guess"
        val guessCount = if (current.isWon) "${current.guesses.size}/${current.maxAttempts}" else "X/${current.maxAttempts}"
        val grid = current.guesses.joinToString("\n") { guess ->
            guess.feedback.joinToString("") { fb ->
                when (fb.state) {
                    LetterState.CORRECT -> "🟩"
                    LetterState.PRESENT -> "🟨"
                    LetterState.ABSENT -> "⬛"
                    LetterState.EMPTY -> "⬜"
                }
            }
        }
        return "$header $guessCount\n\n$grid"
    }
}
