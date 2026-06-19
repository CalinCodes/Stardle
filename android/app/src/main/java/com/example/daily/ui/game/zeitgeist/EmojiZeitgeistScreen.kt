package com.example.daily.ui.game.zeitgeist

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.daily.theme.DailyCyan
import com.example.daily.theme.DailyGold
import com.example.daily.theme.DailyPurple
import com.example.daily.theme.DailySurface
import com.example.daily.theme.DailySurfaceCard
import com.example.daily.theme.DailySurfaceElevated

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmojiZeitgeistScreen(
    viewModel: EmojiZeitgeistViewModel,
    onNavigateUp: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trend Translator - ${state.topicName}") },
                navigationIcon = {
                    IconButton(onClick = onNavigateUp) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DailySurface,
                )
            )
        },
        containerColor = DailySurface
    ) { padding ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = DailyCyan)
            }
        } else if (state.error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Info Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = DailySurfaceElevated),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(Icons.Default.Info, contentDescription = "Info", tint = DailyGold)
                        Column {
                            Text(
                                "EMOJI ZEITGEIST",
                                fontWeight = FontWeight.Bold,
                                color = DailyGold,
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Pop culture moves quickly. These 5 emojis symbolize a trending event, movie, or gadget. Translate them!",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                // Emoji Display
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DailySurfaceCard),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        state.emojis.forEachIndexed { index, emoji ->
                            // Simple scale animation on load
                            var isVisible by remember { mutableStateOf(false) }
                            LaunchedEffect(Unit) {
                                kotlinx.coroutines.delay(index * 150L)
                                isVisible = true
                            }
                            val scale by animateFloatAsState(
                                targetValue = if (isVisible) 1f else 0.5f,
                                animationSpec = tween(500, easing = FastOutSlowInEasing),
                                label = "scale"
                            )
                            val alpha by animateFloatAsState(
                                targetValue = if (isVisible) 1f else 0f,
                                animationSpec = tween(500),
                                label = "alpha"
                            )

                            Text(
                                text = emoji,
                                fontSize = 42.sp,
                                modifier = Modifier
                                    .scale(scale)
                                    .alpha(alpha)
                            )
                        }
                    }
                }

                // Feedback text
                if (state.feedback != null) {
                    Text(
                        text = state.feedback!!,
                        textAlign = TextAlign.Center,
                        color = DailyCyan,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                // Input Field
                if (!state.isGameOver) {
                    OutlinedTextField(
                        value = state.currentInput,
                        onValueChange = viewModel::onInputChanged,
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("e.g. Jurassic Park") },
                        enabled = !state.isSubmitting,
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DailyCyan,
                            unfocusedBorderColor = DailySurfaceElevated,
                        ),
                        trailingIcon = {
                            IconButton(
                                onClick = { viewModel.submitGuess() },
                                enabled = !state.isSubmitting && state.currentInput.isNotBlank()
                            ) {
                                Icon(Icons.Default.Search, contentDescription = "Submit", tint = DailyCyan)
                            }
                        }
                    )

                    TextButton(onClick = { viewModel.requestHint() }) {
                        Text("❔ Request clue (${state.hintsUsed}/${state.clues.size})", color = DailyGold)
                    }
                }

                // Guesses History
                if (state.guesses.isNotEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            "HISTORY",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            state.guesses.forEach { guess ->
                                Surface(
                                    color = DailySurfaceElevated,
                                    shape = RoundedCornerShape(8.dp),
                                ) {
                                    Text(
                                        text = guess,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }
                    }
                }

                if (state.isGameOver) {
                    Spacer(Modifier.weight(1f))
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (state.isWon) DailyCyan.copy(alpha = 0.2f) else MaterialTheme.colorScheme.errorContainer
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = if (state.isWon) "Brilliant Translation!" else "Game Over",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (state.isWon) DailyCyan else MaterialTheme.colorScheme.onErrorContainer
                            )
                            Button(
                                onClick = onNavigateUp,
                                colors = ButtonDefaults.buttonColors(containerColor = if (state.isWon) DailyCyan else MaterialTheme.colorScheme.error)
                            ) {
                                Text("Back to Feed")
                            }
                        }
                    }
                }
            }
        }
    }
}
