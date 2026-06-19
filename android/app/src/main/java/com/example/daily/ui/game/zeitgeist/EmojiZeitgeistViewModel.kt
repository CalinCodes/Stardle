package com.example.daily.ui.game.zeitgeist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.daily.data.repository.PuzzleRepository
import com.example.daily.domain.model.GameMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ZeitgeistState(
    val puzzleId: String = "",
    val topicName: String = "",
    val mode: GameMode = GameMode.DAILY,
    val maxAttempts: Int = 3,
    val emojis: List<String> = emptyList(),
    val clues: List<String> = emptyList(),
    val hintsUsed: Int = 0,
    val currentInput: String = "",
    val guesses: List<String> = emptyList(),
    val isGameOver: Boolean = false,
    val isWon: Boolean = false,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val feedback: String? = null,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long = 0L,
)

class EmojiZeitgeistViewModel(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ZeitgeistState(mode = mode))
    val state: StateFlow<ZeitgeistState> = _state.asStateFlow()

    init {
        loadPuzzle()
    }

    private fun loadPuzzle() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val puzzle = when (mode) {
                    GameMode.DAILY -> repository.getDailyPuzzle(topicSlug, "zeitgeist")
                    GameMode.INFINITE -> repository.getInfinitePuzzle(topicSlug, "zeitgeist")
                }
                _state.update {
                    it.copy(
                        puzzleId = puzzle.id,
                        topicName = puzzle.topicName,
                        maxAttempts = puzzle.maxAttempts,
                        emojis = puzzle.emojis ?: emptyList(),
                        clues = puzzle.clues ?: emptyList(),
                        isLoading = false,
                        startTimeMs = System.currentTimeMillis(),
                        feedback = "Decode the emojis into a famous movie, event, or trend."
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Failed to load puzzle: ${e.message}") }
            }
        }
    }

    fun onInputChanged(input: String) {
        if (_state.value.isGameOver || _state.value.isSubmitting) return
        _state.update { it.copy(currentInput = input) }
    }

    fun requestHint() {
        val st = _state.value
        if (st.hintsUsed < st.clues.size && !st.isGameOver) {
            val clue = st.clues[st.hintsUsed]
            _state.update {
                it.copy(
                    hintsUsed = it.hintsUsed + 1,
                    feedback = "\uD83D\uDD0E Clue: $clue"
                )
            }
        } else if (!st.isGameOver) {
            _state.update { it.copy(feedback = "No more clues available!") }
        }
    }

    fun submitGuess() {
        val st = _state.value
        val guess = st.currentInput.trim()
        if (guess.isEmpty() || st.isGameOver || st.isSubmitting) return

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true) }
            try {
                val result = repository.submitSimpleGuess(st.puzzleId, guess, mode)
                if (result != null && result.valid) {
                    val updatedGuesses = st.guesses + guess
                    val isWon = result.isCorrect
                    val isLoss = !isWon && updatedGuesses.size >= st.maxAttempts
                    val isGameOver = isWon || isLoss

                    _state.update {
                        it.copy(
                            guesses = updatedGuesses,
                            currentInput = "",
                            isSubmitting = false,
                            isGameOver = isGameOver,
                            isWon = isWon,
                            feedback = result.message,
                            endTimeMs = if (isGameOver) System.currentTimeMillis() else 0L
                        )
                    }

                    if (isGameOver) {
                        submitFinalAttempt(isWon, updatedGuesses.size)
                    }
                } else {
                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            feedback = "Invalid guess submission."
                        )
                    }
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isSubmitting = false,
                        feedback = "Network error."
                    )
                }
            }
        }
    }

    private suspend fun submitFinalAttempt(won: Boolean, numGuesses: Int) {
        try {
            repository.submitAttempt(
                puzzleId = _state.value.puzzleId,
                guesses = _state.value.guesses,
                timeMs = _state.value.endTimeMs - _state.value.startTimeMs,
                hintsUsed = _state.value.hintsUsed,
                won = won,
                mode = mode
            )
        } catch (e: Exception) {
            // Log error
        }
    }
}

class EmojiZeitgeistViewModelFactory(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(EmojiZeitgeistViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return EmojiZeitgeistViewModel(topicSlug, mode, repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
