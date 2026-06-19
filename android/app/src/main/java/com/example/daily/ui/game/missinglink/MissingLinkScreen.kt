package com.example.daily.ui.game.missinglink

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
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

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun MissingLinkScreen(
    viewModel: MissingLinkViewModel,
    onNavigateUp: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Missing Link - ${state.topicName}") },
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
                        Icon(Icons.Default.Info, contentDescription = "Info", tint = DailyCyan)
                        Column {
                            Text(
                                "MISSING LINK",
                                fontWeight = FontWeight.Bold,
                                color = DailyCyan,
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Find groups of 4 related items. Select 4 items and submit to check if they share a theme.",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                // Mistakes Indicator
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Mistakes remaining: ",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    repeat(state.maxAttempts - state.mistakesMade) {
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 4.dp)
                                .size(12.dp)
                                .background(DailyCyan, shape = RoundedCornerShape(50))
                        )
                    }
                    repeat(state.mistakesMade) {
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 4.dp)
                                .size(12.dp)
                                .background(MaterialTheme.colorScheme.error, shape = RoundedCornerShape(50))
                        )
                    }
                }

                // Solved Groups
                state.foundGroups.forEach { group ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DailyGold),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = group.theme.uppercase(),
                                fontWeight = FontWeight.Bold,
                                color = DailySurface
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = group.items.joinToString(", "),
                                color = DailySurface.copy(alpha = 0.8f),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                // Remaining Items Grid
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    maxItemsInEachRow = 4
                ) {
                    val itemModifier = Modifier
                        .weight(1f)
                        .aspectRatio(1.5f)

                    state.remainingItems.forEach { item ->
                        val isSelected = state.selectedItems.contains(item)
                        val bgColor by animateColorAsState(
                            targetValue = if (isSelected) DailyPurple else DailySurfaceCard,
                            label = "bgColor"
                        )
                        val textColor by animateColorAsState(
                            targetValue = if (isSelected) DailySurface else MaterialTheme.colorScheme.onSurface,
                            label = "textColor"
                        )

                        Card(
                            modifier = itemModifier.clickable(enabled = !state.isGameOver && !state.isSubmitting) {
                                viewModel.toggleSelection(item)
                            },
                            colors = CardDefaults.cardColors(containerColor = bgColor),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = item,
                                    color = textColor,
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(4.dp)
                                )
                            }
                        }
                    }
                    
                    // Empty spaces to pad the grid if not a multiple of 4
                    val remainder = state.remainingItems.size % 4
                    if (remainder > 0) {
                        repeat(4 - remainder) {
                            Spacer(modifier = itemModifier)
                        }
                    }
                }

                if (state.feedback != null) {
                    Text(
                        text = state.feedback!!,
                        textAlign = TextAlign.Center,
                        color = if (state.isGameOver && !state.isWon) MaterialTheme.colorScheme.error else DailyCyan,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                if (!state.isGameOver) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        OutlinedButton(
                            onClick = { viewModel.deselectAll() },
                            modifier = Modifier.weight(1f),
                            enabled = state.selectedItems.isNotEmpty() && !state.isSubmitting,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = DailyPurple)
                        ) {
                            Text("Deselect All")
                        }
                        Button(
                            onClick = { viewModel.submitGroup() },
                            modifier = Modifier.weight(1f),
                            enabled = state.selectedItems.size == 4 && !state.isSubmitting,
                            colors = ButtonDefaults.buttonColors(containerColor = DailyCyan)
                        ) {
                            Text("Submit Group")
                        }
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
                                text = if (state.isWon) "Link Established!" else "Missing Link!",
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
