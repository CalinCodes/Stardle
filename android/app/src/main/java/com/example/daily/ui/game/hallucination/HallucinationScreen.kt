package com.example.daily.ui.game.hallucination

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.daily.theme.DailyCyan
import com.example.daily.theme.DailyGold
import com.example.daily.theme.DailyPurple
import com.example.daily.theme.DailySurface
import com.example.daily.theme.DailySurfaceCard
import com.example.daily.theme.DailySurfaceElevated

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HallucinationScreen(
    viewModel: HallucinationViewModel,
    onNavigateUp: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Spot the Hallucination - ${state.topicName}") },
                navigationIcon = {
                    IconButton(onClick = onNavigateUp) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
                CircularProgressIndicator(color = DailyPurple)
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
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Info Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = DailySurfaceElevated),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(Icons.Default.Info, contentDescription = "Info", tint = DailyPurple)
                        Column {
                            Text(
                                "SPOT THE HALLUCINATION",
                                fontWeight = FontWeight.Bold,
                                color = DailyPurple,
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "AI systems sometimes 'hallucinate' plausible-sounding but entirely fake information. One of the facts below about ${state.subject} is completely made up. Can you spot it?",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                Text(
                    text = state.subject,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = DailyGold,
                    modifier = Modifier.padding(vertical = 16.dp)
                )

                // Facts List
                state.facts.forEachIndexed { index, fact ->
                    val isSelected = state.selectedIndex == index
                    val backgroundColor by animateColorAsState(
                        targetValue = when {
                            state.isGameOver && isSelected && state.isWon -> DailyCyan.copy(alpha = 0.2f)
                            state.isGameOver && isSelected && !state.isWon -> MaterialTheme.colorScheme.errorContainer
                            isSelected -> DailyPurple.copy(alpha = 0.2f)
                            else -> DailySurfaceCard
                        },
                        label = "card_color"
                    )
                    val borderColor by animateColorAsState(
                        targetValue = when {
                            state.isGameOver && isSelected && state.isWon -> DailyCyan
                            state.isGameOver && isSelected && !state.isWon -> MaterialTheme.colorScheme.error
                            isSelected -> DailyPurple
                            else -> DailySurfaceElevated
                        },
                        label = "border_color"
                    )

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !state.isGameOver && !state.isSubmitting) {
                                viewModel.selectFact(index)
                            },
                        colors = CardDefaults.cardColors(containerColor = backgroundColor),
                        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { viewModel.selectFact(index) },
                                enabled = !state.isGameOver && !state.isSubmitting,
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = if (state.isGameOver && !state.isWon) MaterialTheme.colorScheme.error else DailyPurple
                                )
                            )
                            Spacer(Modifier.width(16.dp))
                            Text(
                                text = fact,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }

                if (state.feedback != null) {
                    Text(
                        text = state.feedback!!,
                        textAlign = TextAlign.Center,
                        color = if (state.isGameOver && !state.isWon) MaterialTheme.colorScheme.error else DailyPurple,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }

                if (!state.isGameOver) {
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = { viewModel.submitGuess() },
                        enabled = state.selectedIndex != null && !state.isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = DailyPurple),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Accuse Fact")
                    }
                } else {
                    Spacer(Modifier.height(24.dp))
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
                                text = if (state.isWon) "You Spotted It!" else "You Got Fooled!",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (state.isWon) DailyCyan else MaterialTheme.colorScheme.onErrorContainer
                            )
                            Button(
                                onClick = onNavigateUp,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (state.isWon) DailyCyan else MaterialTheme.colorScheme.error
                                )
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
