package com.example.daily.ui.game.attributededuction

import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.daily.data.ServiceLocator
import com.example.daily.domain.model.AttributeFeedback
import com.example.daily.domain.model.GameMode
import com.example.daily.domain.model.LetterState
import com.example.daily.theme.*

class AttributeDeductionViewModelFactory(
    private val topicSlug: String,
    private val mode: GameMode,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AttributeDeductionViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AttributeDeductionViewModel(
                repository = ServiceLocator.puzzleRepository,
                topicSlug = topicSlug,
                mode = mode,
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

@Composable
fun AttributeDeductionScreen(
    topicSlug: String,
    mode: GameMode,
    onBack: () -> Unit,
) {
    val viewModel: AttributeDeductionViewModel = viewModel(
        factory = AttributeDeductionViewModelFactory(topicSlug, mode)
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(state.error) {
        state.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearError()
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = DailySurface,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
        ) {
            GameHeader(
                topicName = state.topicName,
                mode = state.mode,
                onBack = onBack,
                onSkip = if (state.mode == GameMode.INFINITE && !state.isLoading) viewModel::onSkip else null,
            )

            if (state.isLoading) {
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = DailyPurple)
                }
            } else {
                // Game Over Overlay
                if (state.isGameOver) {
                    GameOverBanner(
                        isWon = state.isWon,
                        answer = state.answer,
                        guesses = state.guesses.size,
                        maxAttempts = state.maxAttempts,
                        modifier = Modifier.padding(bottom = 16.dp),
                    )
                }

                // Search Bar
                if (!state.isGameOver) {
                    SearchBar(
                        query = state.currentSearchQuery,
                        onQueryChange = viewModel::onSearchQueryChanged,
                        suggestions = state.filteredEntities,
                        onSuggestionSelected = viewModel::onSubmitGuess,
                        modifier = Modifier.padding(bottom = 16.dp),
                    )
                }

                // Attributes Header
                if (state.attributeKeys.isNotEmpty()) {
                    AttributeHeaderRow(keys = state.attributeKeys)
                }

                // Guesses Grid
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Show newest at the top
                    items(state.guesses.reversed()) { guess ->
                        GuessRow(
                            entityName = guess.entityName,
                            feedback = guess.feedback.filter { it.attributeName != "Name" },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    suggestions: List<String>,
    onSuggestionSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Type to guess...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = DailySurfaceElevated,
                unfocusedContainerColor = DailySurfaceElevated,
                focusedBorderColor = DailyPurple,
                unfocusedBorderColor = Color.Transparent,
            ),
            shape = RoundedCornerShape(12.dp),
            singleLine = true,
        )

        if (suggestions.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DailySurfaceElevated),
                shape = RoundedCornerShape(12.dp),
            ) {
                Column {
                    suggestions.forEach { suggestion ->
                        Text(
                            text = suggestion,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSuggestionSelected(suggestion) }
                                .padding(16.dp),
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AttributeHeaderRow(keys: List<String>) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Empty space for the entity name column
        Spacer(modifier = Modifier.weight(1f))
        keys.forEach { key ->
            Text(
                text = key,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun GuessRow(
    entityName: String,
    feedback: List<AttributeFeedback>,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Entity Name
        Box(
            modifier = Modifier
                .weight(1f)
                .height(60.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(DailySurfaceElevated)
                .border(1.dp, DailySurfaceElevated, RoundedCornerShape(8.dp))
                .padding(4.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = entityName,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Attributes
        feedback.forEachIndexed { index, fb ->
            val targetColor = when (fb.state) {
                LetterState.CORRECT -> LetterCorrect
                LetterState.PRESENT -> LetterPresent
                LetterState.ABSENT -> LetterAbsent
                LetterState.EMPTY -> DailySurfaceElevated
            }
            
            val bgColor by animateColorAsState(
                targetValue = targetColor,
                animationSpec = tween(
                    durationMillis = 300,
                    delayMillis = index * 100, // Staggered reveal
                    easing = FastOutSlowInEasing,
                ),
                label = "attrColor",
            )

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(bgColor)
                    .padding(4.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = fb.value,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun GameHeader(
    topicName: String,
    mode: GameMode,
    onBack: () -> Unit,
    onSkip: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            tint = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .size(28.dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onBack,
                ),
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = topicName.ifEmpty { "Attribute Deduction" },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = if (mode == GameMode.DAILY) "🏆 Daily Challenge" else "♾️ Infinite Mode",
                style = MaterialTheme.typography.bodySmall,
                color = if (mode == GameMode.DAILY) DailyGold else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        if (onSkip != null) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(DailySurfaceElevated)
                    .clickable(onClick = onSkip)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Skip",
                        tint = DailyPurple,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Skip", style = MaterialTheme.typography.labelMedium, color = DailyPurple)
                }
            }
        }
    }
}

@Composable
private fun GameOverBanner(
    isWon: Boolean,
    answer: String?,
    guesses: Int,
    maxAttempts: Int,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isWon) LetterCorrect.copy(alpha = 0.2f) else LetterAbsent.copy(alpha = 0.2f)
        ),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = if (isWon) "Great Job!" else "Out of Guesses!",
                style = MaterialTheme.typography.titleLarge,
                color = if (isWon) LetterCorrect else MaterialTheme.colorScheme.onSurface,
            )
            if (answer != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "The answer was: $answer",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Guessed in $guesses/$maxAttempts",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
