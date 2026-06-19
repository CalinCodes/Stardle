package com.example.daily.ui.game.attributededuction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.daily.data.repository.PuzzleRepository
import com.example.daily.domain.model.AttributeGuessResult
import com.example.daily.domain.model.GameMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AttributeDeductionState(
    val puzzleId: String = "",
    val topicName: String = "",
    val topicSlug: String = "",
    val mode: GameMode = GameMode.DAILY,
    val maxAttempts: Int = 8,
    val attributeKeys: List<String> = emptyList(),
    val availableEntities: List<String> = emptyList(),
    val currentSearchQuery: String = "",
    val filteredEntities: List<String> = emptyList(),
    val guesses: List<AttributeGuessResult> = emptyList(),
    val isGameOver: Boolean = false,
    val isWon: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
    val answer: String? = null,
    val hintsUsed: Int = 0,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long = 0L,
)

class AttributeDeductionViewModel(
    private val repository: PuzzleRepository,
    private val topicSlug: String,
    private val mode: GameMode,
) : ViewModel() {

    private val _state = MutableStateFlow(AttributeDeductionState(
        topicSlug = topicSlug,
        mode = mode,
    ))
    val state: StateFlow<AttributeDeductionState> = _state.asStateFlow()

    init {
        loadPuzzle()
    }

    private fun loadPuzzle() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val puzzle = when (mode) {
                    GameMode.DAILY -> repository.getDailyPuzzle(topicSlug, "attribute-deduction")
                    GameMode.INFINITE -> repository.getInfinitePuzzle(topicSlug, "attribute-deduction")
                }
                _state.update {
                    it.copy(
                        puzzleId = puzzle.id,
                        topicName = puzzle.topicName,
                        maxAttempts = puzzle.maxAttempts,
                        attributeKeys = puzzle.attributeKeys ?: emptyList(),
                        availableEntities = puzzle.entities?.sorted() ?: emptyList(),
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

    fun onSearchQueryChanged(query: String) {
        _state.update { current ->
            val filtered = if (query.isBlank()) {
                emptyList()
            } else {
                current.availableEntities.filter { 
                    it.contains(query, ignoreCase = true) 
                    && !current.guesses.any { g -> g.entityName.equals(it, ignoreCase = true) }
                }.take(5)
            }
            current.copy(
                currentSearchQuery = query,
                filteredEntities = filtered,
            )
        }
    }

    fun onSubmitGuess(guess: String) {
        val current = _state.value
        if (current.isGameOver) return
        
        // Find exact casing from available
        val entityName = current.availableEntities.firstOrNull { it.equals(guess, ignoreCase = true) }
        if (entityName == null) {
            _state.update { it.copy(error = "Unknown entity") }
            return
        }

        if (current.guesses.any { it.entityName == entityName }) {
            _state.update { it.copy(error = "Already guessed") }
            return
        }

        viewModelScope.launch {
            try {
                val result = repository.submitAttributeGuess(current.puzzleId, entityName, mode)
                if (result == null) {
                    _state.update { it.copy(error = "Failed to submit guess") }
                    return@launch
                }

                val newGuesses = current.guesses + result
                val isWon = result.isCorrect
                val isGameOver = isWon || newGuesses.size >= current.maxAttempts

                _state.update {
                    it.copy(
                        guesses = newGuesses,
                        currentSearchQuery = "",
                        filteredEntities = emptyList(),
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

    private suspend fun submitFinalAttempt(guesses: List<AttributeGuessResult>, won: Boolean) {
        val current = _state.value
        try {
            val result = repository.submitAttempt(
                puzzleId = current.puzzleId,
                guesses = guesses.map { it.entityName },
                timeMs = current.endTimeMs - current.startTimeMs,
                hintsUsed = current.hintsUsed,
                won = won,
                mode = mode,
            )
            _state.update { it.copy(answer = result.answer) }
        } catch (_: Exception) {
        }
    }

    fun onSkip() {
        if (mode == GameMode.INFINITE) {
            _state.update {
                AttributeDeductionState(
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
}
