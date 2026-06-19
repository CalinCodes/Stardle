package com.example.daily.ui.onboarding

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.daily.theme.DailyGold
import com.example.daily.theme.DailyPurple
import com.example.daily.theme.DailyPurpleDark
import com.example.daily.theme.DailySurfaceCard
import com.example.daily.theme.DailySurfaceElevated

data class TopicOption(
    val id: String,
    val name: String,
    val icon: String,
)

private val availableTopics = listOf(
    TopicOption("geography", "Geography", "🌍"),
    TopicOption("science", "Science", "🔬"),
    TopicOption("history", "History", "📜"),
    TopicOption("movies", "Movies", "🎬"),
    TopicOption("music", "Music", "🎵"),
    TopicOption("sports", "Sports", "⚽"),
    TopicOption("food", "Food & Cooking", "🍳"),
    TopicOption("animals", "Animals", "🐾"),
    TopicOption("technology", "Technology", "💻"),
    TopicOption("literature", "Literature", "📚"),
    TopicOption("art", "Art & Design", "🎨"),
    TopicOption("nature", "Nature", "🌿"),
    TopicOption("space", "Space", "🚀"),
    TopicOption("gaming", "Gaming", "🎮"),
    TopicOption("math", "Mathematics", "🔢"),
    TopicOption("medicine", "Medicine", "🩺"),
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(
    onComplete: (selectedTopics: List<String>) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedTopics by remember { mutableStateOf(setOf<String>()) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        Text(
            text = "🧩",
            style = MaterialTheme.typography.displayLarge,
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "What interests you?",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Pick a few topics and we'll build your\npersonalized puzzle feed",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(32.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            availableTopics.forEach { topic ->
                TopicChip(
                    topic = topic,
                    isSelected = topic.id in selectedTopics,
                    onClick = {
                        selectedTopics = if (topic.id in selectedTopics) {
                            selectedTopics - topic.id
                        } else {
                            selectedTopics + topic.id
                        }
                    },
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { onComplete(selectedTopics.toList()) },
            enabled = selectedTopics.isNotEmpty(),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = DailyPurple,
                disabledContainerColor = DailyPurpleDark.copy(alpha = 0.3f),
            ),
        ) {
            Text(
                text = if (selectedTopics.isEmpty()) "Pick at least one topic"
                else "Let's play! (${selectedTopics.size} selected)",
                style = MaterialTheme.typography.labelLarge,
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun TopicChip(
    topic: TopicOption,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bgColor by animateColorAsState(
        targetValue = if (isSelected) DailyPurple.copy(alpha = 0.2f) else DailySurfaceCard,
        label = "chipBg",
    )
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) DailyPurple else DailySurfaceElevated,
        label = "chipBorder",
    )
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow,
        ),
        label = "chipScale",
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(
                width = 1.5.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(
            text = "${topic.icon} ${topic.name}",
            style = MaterialTheme.typography.bodyMedium,
            color = if (isSelected) DailyGold else MaterialTheme.colorScheme.onSurface,
        )
    }
}
