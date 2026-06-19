package com.example.daily.ui.game.hallucination

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

data class HallucinationState(
    val puzzleId: String = "",
    val topicName: String = "",
    val mode: GameMode = GameMode.DAILY,
    val maxAttempts: Int = 1,
    val subject: String = "",
    val facts: List<String> = emptyList(),
    val selectedIndex: Int? = null,
    val isGameOver: Boolean = false,
    val isWon: Boolean = false,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val feedback: String? = null,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long = 0L,
)

class HallucinationViewModel(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HallucinationState(mode = mode))
    val state: StateFlow<HallucinationState> = _state.asStateFlow()

    init {
        loadPuzzle()
    }

    private fun loadPuzzle() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val puzzle = when (mode) {
                    GameMode.DAILY -> repository.getDailyPuzzle(topicSlug, "hallucination")
                    GameMode.INFINITE -> repository.getInfinitePuzzle(topicSlug, "hallucination")
                }
                _state.update {
                    it.copy(
                        puzzleId = puzzle.id,
                        topicName = puzzle.topicName,
                        maxAttempts = puzzle.maxAttempts,
                        subject = puzzle.subject ?: "",
                        facts = puzzle.facts ?: emptyList(),
                        isLoading = false,
                        startTimeMs = System.currentTimeMillis(),
                        feedback = "Select the fact that you think is completely made up (hallucinated)."
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Failed to load puzzle: ${e.message}") }
            }
        }
    }

    fun selectFact(index: Int) {
        if (_state.value.isGameOver || _state.value.isSubmitting) return
        _state.update { it.copy(selectedIndex = index) }
    }

    fun submitGuess() {
        val st = _state.value
        val guess = st.selectedIndex
        if (guess == null || st.isGameOver || st.isSubmitting) return

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true) }
            try {
                // The backend expects the guess to be the index as a string
                val result = repository.submitSimpleGuess(st.puzzleId, guess.toString(), mode)
                if (result != null && result.valid) {
                    val isWon = result.isCorrect
                    val isGameOver = true // Only 1 attempt allowed for hallucination

                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            isGameOver = isGameOver,
                            isWon = isWon,
                            feedback = result.message,
                            endTimeMs = System.currentTimeMillis()
                        )
                    }

                    if (isGameOver) {
                        submitFinalAttempt(isWon, 1)
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
                guesses = listOf(_state.value.selectedIndex.toString()),
                timeMs = _state.value.endTimeMs - _state.value.startTimeMs,
                hintsUsed = 0,
                won = won,
                mode = mode
            )
        } catch (e: Exception) {
            // Log error
        }
    }
}

class HallucinationViewModelFactory(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(HallucinationViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return HallucinationViewModel(topicSlug, mode, repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
