package com.example.daily.ui.game.missinglink

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

data class MissingLinkGroup(
    val theme: String,
    val items: List<String>
)

data class MissingLinkState(
    val puzzleId: String = "",
    val topicName: String = "",
    val mode: GameMode = GameMode.DAILY,
    val maxAttempts: Int = 4,
    val remainingItems: List<String> = emptyList(), // 16 items initially
    val selectedItems: Set<String> = emptySet(), // max 4
    val foundGroups: List<MissingLinkGroup> = emptyList(),
    val mistakesMade: Int = 0,
    val isGameOver: Boolean = false,
    val isWon: Boolean = false,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val feedback: String? = null,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long = 0L,
)

class MissingLinkViewModel(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(MissingLinkState(mode = mode))
    val state: StateFlow<MissingLinkState> = _state.asStateFlow()

    init {
        loadPuzzle()
    }

    private fun loadPuzzle() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val puzzle = when (mode) {
                    GameMode.DAILY -> repository.getDailyPuzzle(topicSlug, "missing-link")
                    GameMode.INFINITE -> repository.getInfinitePuzzle(topicSlug, "missing-link")
                }
                _state.update {
                    it.copy(
                        puzzleId = puzzle.id,
                        topicName = puzzle.topicName,
                        maxAttempts = puzzle.maxAttempts,
                        remainingItems = puzzle.grid ?: emptyList(),
                        isLoading = false,
                        startTimeMs = System.currentTimeMillis(),
                        feedback = "Select 4 related items to form a group."
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Failed to load puzzle: ${e.message}") }
            }
        }
    }

    fun toggleSelection(item: String) {
        val st = _state.value
        if (st.isGameOver || st.isSubmitting) return

        val newSelection = st.selectedItems.toMutableSet()
        if (newSelection.contains(item)) {
            newSelection.remove(item)
        } else if (newSelection.size < 4) {
            newSelection.add(item)
        }
        
        _state.update { it.copy(selectedItems = newSelection) }
    }

    fun deselectAll() {
        if (_state.value.isGameOver || _state.value.isSubmitting) return
        _state.update { it.copy(selectedItems = emptySet()) }
    }

    fun submitGroup() {
        val st = _state.value
        if (st.selectedItems.size != 4 || st.isGameOver || st.isSubmitting) return

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true) }
            try {
                val guessString = st.selectedItems.joinToString(",")
                val result = repository.submitMissingLinkGuess(st.puzzleId, guessString, mode)
                
                if (result != null && result.valid) {
                    if (result.isCorrect) {
                        val newFoundGroups = st.foundGroups + MissingLinkGroup(
                            theme = result.theme ?: "Unknown Group",
                            items = result.items ?: st.selectedItems.toList()
                        )
                        val newRemaining = st.remainingItems.filterNot { it in st.selectedItems }
                        
                        val isWon = newRemaining.isEmpty()
                        val isGameOver = isWon
                        
                        _state.update {
                            it.copy(
                                foundGroups = newFoundGroups,
                                remainingItems = newRemaining,
                                selectedItems = emptySet(),
                                isSubmitting = false,
                                isGameOver = isGameOver,
                                isWon = isWon,
                                feedback = "Found: ${result.theme}",
                                endTimeMs = if (isGameOver) System.currentTimeMillis() else 0L
                            )
                        }
                        
                        if (isGameOver) {
                            submitFinalAttempt(isWon, st.mistakesMade)
                        }
                    } else {
                        val newMistakes = st.mistakesMade + 1
                        val isLoss = newMistakes >= st.maxAttempts
                        val isGameOver = isLoss
                        
                        _state.update {
                            it.copy(
                                mistakesMade = newMistakes,
                                selectedItems = emptySet(), // Optionally keep them selected
                                isSubmitting = false,
                                isGameOver = isGameOver,
                                feedback = result.message ?: "Not a group.",
                                endTimeMs = if (isGameOver) System.currentTimeMillis() else 0L
                            )
                        }
                        
                        if (isGameOver) {
                            submitFinalAttempt(false, newMistakes)
                        }
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
                guesses = emptyList(),
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

class MissingLinkViewModelFactory(
    private val topicSlug: String,
    private val mode: GameMode,
    private val repository: PuzzleRepository,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MissingLinkViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MissingLinkViewModel(topicSlug, mode, repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
