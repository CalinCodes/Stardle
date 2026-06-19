package com.example.daily

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.daily.data.ServiceLocator
import com.example.daily.domain.model.GameMode
import com.example.daily.ui.feed.FeedScreen
import com.example.daily.ui.feed.FeedViewModel
import com.example.daily.ui.game.wordguess.WordGuessScreen
import com.example.daily.ui.game.wordguess.WordGuessViewModel
import com.example.daily.ui.game.attributededuction.AttributeDeductionScreen
import com.example.daily.ui.game.attributededuction.AttributeDeductionViewModel
import com.example.daily.ui.onboarding.OnboardingScreen

@Composable
fun MainNavigation() {
    val backStack = rememberNavBackStack(Onboarding)

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<Onboarding> {
                OnboardingScreen(
                    onComplete = { selectedTopics ->
                        // TODO: Submit interests to backend
                        backStack.clear()
                        backStack.add(Feed)
                    },
                    modifier = Modifier.safeDrawingPadding(),
                )
            }

            entry<Feed> {
                val feedViewModel = viewModel {
                    FeedViewModel(ServiceLocator.puzzleRepository)
                }
                FeedScreen(
                    viewModel = feedViewModel,
                    onGameClick = { topicSlug, engine, mode ->
                        if (engine == "word-guess") {
                            backStack.add(WordGuessGame(topicSlug = topicSlug, mode = mode))
                        } else if (engine == "attribute-deduction") {
                            backStack.add(AttributeDeductionGame(topicSlug = topicSlug, mode = mode))
                        }
                    },
                    modifier = Modifier.safeDrawingPadding(),
                )
            }

            entry<WordGuessGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                val wordGuessViewModel = viewModel {
                    WordGuessViewModel(
                        repository = ServiceLocator.puzzleRepository,
                        topicSlug = key.topicSlug,
                        mode = gameMode,
                    )
                }
                WordGuessScreen(
                    viewModel = wordGuessViewModel,
                    onBack = { backStack.removeLastOrNull() },
                    modifier = Modifier.safeDrawingPadding(),
                )
            }

            entry<AttributeDeductionGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                AttributeDeductionScreen(
                    topicSlug = key.topicSlug,
                    mode = gameMode,
                    onBack = { backStack.removeLastOrNull() },
                )
            }
        },
    )
}
