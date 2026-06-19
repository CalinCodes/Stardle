package com.example.daily.ui.game.wordguess

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.daily.domain.model.GameMode
import com.example.daily.domain.model.GuessResult
import com.example.daily.domain.model.LetterFeedback
import com.example.daily.domain.model.LetterState
import com.example.daily.domain.model.WordGuessState
import com.example.daily.theme.DailyGold
import com.example.daily.theme.DailyPurple
import com.example.daily.theme.DailySurfaceCard
import com.example.daily.theme.DailySurfaceElevated
import com.example.daily.theme.LetterAbsent
import com.example.daily.theme.LetterCorrect
import com.example.daily.theme.LetterDefault
import com.example.daily.theme.LetterInput
import com.example.daily.theme.LetterPresent

@Composable
fun WordGuessScreen(
    viewModel: WordGuessViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Header
            GameHeader(
                topicName = state.topicName,
                mode = state.mode,
                onBack = onBack,
                onSkip = if (state.mode == GameMode.INFINITE) viewModel::onSkip else null,
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (state.isLoading) {
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = DailyPurple)
                }
            } else {
                // Guess Grid
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    GuessGrid(
                        guesses = state.guesses,
                        currentInput = state.currentInput,
                        wordLength = state.wordLength,
                        maxAttempts = state.maxAttempts,
                        currentRow = state.guesses.size,
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Game Over Message
                if (state.isGameOver) {
                    GameOverBanner(
                        isWon = state.isWon,
                        answer = state.answer,
                        guessCount = state.guesses.size,
                        maxAttempts = state.maxAttempts,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Keyboard
                GameKeyboard(
                    keyboardState = state.keyboardState,
                    onLetterClick = viewModel::onLetterInput,
                    onBackspace = viewModel::onBackspace,
                    onEnter = viewModel::onSubmitGuess,
                    enabled = !state.isGameOver,
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        ) { data ->
            Snackbar(
                snackbarData = data,
                containerColor = DailySurfaceCard,
                contentColor = MaterialTheme.colorScheme.onSurface,
            )
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
                text = topicName.ifEmpty { "Word Guess" },
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
private fun GuessGrid(
    guesses: List<GuessResult>,
    currentInput: String,
    wordLength: Int,
    maxAttempts: Int,
    currentRow: Int,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        for (row in 0 until maxAttempts) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                for (col in 0 until wordLength) {
                    val isCompletedRow = row < guesses.size
                    val isCurrentRow = row == currentRow

                    val letter = when {
                        isCompletedRow -> guesses[row].feedback.getOrNull(col)?.letter
                        isCurrentRow -> currentInput.getOrNull(col)
                        else -> null
                    }
                    
                    val state = when {
                        isCompletedRow -> guesses[row].feedback.getOrNull(col)?.state ?: LetterState.EMPTY
                        else -> LetterState.EMPTY
                    }
                    
                    val revealDelay = if (isCompletedRow) col * 150 else 0
                    
                    androidx.compose.runtime.key(row, col) {
                        LetterTile(
                            letter = letter,
                            state = state,
                            revealDelay = revealDelay,
                            isInput = isCurrentRow,
                            hasLetter = isCurrentRow && letter != null,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LetterTile(
    letter: Char?,
    state: LetterState,
    modifier: Modifier = Modifier,
    revealDelay: Int = 0,
    isInput: Boolean = false,
    hasLetter: Boolean = false,
) {
    val targetColor = when (state) {
        LetterState.CORRECT -> LetterCorrect
        LetterState.PRESENT -> LetterPresent
        LetterState.ABSENT -> LetterAbsent
        LetterState.EMPTY -> if (isInput && hasLetter) LetterInput else LetterDefault
    }

    val bgColor by animateColorAsState(
        targetValue = targetColor,
        animationSpec = tween(
            durationMillis = 300,
            delayMillis = revealDelay,
            easing = FastOutSlowInEasing,
        ),
        label = "tileColor",
    )

    val scale by animateFloatAsState(
        targetValue = if (isInput && hasLetter) 1.08f else 1f,
        animationSpec = tween(100),
        label = "tileScale",
    )

    val borderColor = when {
        state != LetterState.EMPTY -> Color.Transparent
        isInput && hasLetter -> DailyPurple.copy(alpha = 0.6f)
        else -> Color.Transparent
    }

    Box(
        modifier = modifier
            .size(52.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .border(
                width = 2.dp,
                color = borderColor,
                shape = RoundedCornerShape(8.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (letter != null) {
            Text(
                text = letter.uppercase(),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Black,
                    fontSize = 24.sp,
                ),
                color = Color.White,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun GameOverBanner(
    isWon: Boolean,
    answer: String?,
    guessCount: Int,
    maxAttempts: Int,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isWon) LetterCorrect.copy(alpha = 0.15f)
                else DailySurfaceCard
            )
            .padding(16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = if (isWon) "🎉 Brilliant!" else "💫 Nice try!",
                style = MaterialTheme.typography.titleLarge,
                color = if (isWon) LetterCorrect else DailyGold,
            )
            if (!isWon && answer != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "The word was: $answer",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (isWon) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Solved in $guessCount/$maxAttempts guesses",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun GameKeyboard(
    keyboardState: Map<Char, LetterState>,
    onLetterClick: (Char) -> Unit,
    onBackspace: () -> Unit,
    onEnter: () -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val rows = listOf(
        "QWERTYUIOP",
        "ASDFGHJKL",
        "ZXCVBNM",
    )

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        rows.forEachIndexed { rowIndex, row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Enter key on last row
                if (rowIndex == 2) {
                    KeyboardKey(
                        label = "⏎",
                        state = null,
                        onClick = { if (enabled) onEnter() },
                        isWide = true,
                        accentColor = DailyPurple,
                    )
                }

                row.forEach { letter ->
                    val state = keyboardState[letter]
                    KeyboardKey(
                        label = letter.toString(),
                        state = state,
                        onClick = { if (enabled) onLetterClick(letter) },
                    )
                }

                // Backspace on last row
                if (rowIndex == 2) {
                    KeyboardKey(
                        label = "⌫",
                        state = null,
                        onClick = { if (enabled) onBackspace() },
                        isWide = true,
                    )
                }
            }
        }
    }
}

@Composable
private fun KeyboardKey(
    label: String,
    state: LetterState?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isWide: Boolean = false,
    accentColor: Color? = null,
) {
    val bgColor = when (state) {
        LetterState.CORRECT -> LetterCorrect
        LetterState.PRESENT -> LetterPresent
        LetterState.ABSENT -> LetterAbsent
        else -> accentColor ?: DailySurfaceElevated
    }

    val animatedBg by animateColorAsState(
        targetValue = bgColor,
        animationSpec = tween(300),
        label = "keyColor",
    )

    Box(
        modifier = modifier
            .height(48.dp)
            .then(if (isWide) Modifier.width(52.dp) else Modifier.width(32.dp))
            .clip(RoundedCornerShape(6.dp))
            .background(animatedBg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge.copy(
                fontSize = if (isWide) 16.sp else 14.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = Color.White,
        )
    }
}
