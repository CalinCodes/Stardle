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
import com.example.daily.ui.game.hallucination.HallucinationScreen
import com.example.daily.ui.game.hallucination.HallucinationViewModel
import com.example.daily.ui.game.missinglink.MissingLinkScreen
import com.example.daily.ui.game.missinglink.MissingLinkViewModel
import com.example.daily.ui.game.zeitgeist.EmojiZeitgeistScreen
import com.example.daily.ui.game.zeitgeist.EmojiZeitgeistViewModel
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
                        } else if (engine == "zeitgeist") {
                            backStack.add(EmojiZeitgeistGame(topicSlug = topicSlug, mode = mode))
                        } else if (engine == "hallucination") {
                            backStack.add(HallucinationGame(topicSlug = topicSlug, mode = mode))
                        } else if (engine == "missing-link") {
                            backStack.add(MissingLinkGame(topicSlug = topicSlug, mode = mode))
                        }
                    },
                    modifier = Modifier.safeDrawingPadding(),
                )
            }

            entry<WordGuessGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                // Added key = key.toString() to ensure fresh ViewModel per topic
                val wordGuessViewModel = viewModel(key = key.toString()) {
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
                // Note: AttributeDeductionScreen currently handles its own state logic
                // but should ideally follow the same ViewModel pattern as others
                AttributeDeductionScreen(
                    topicSlug = key.topicSlug,
                    mode = gameMode,
                    onBack = { backStack.removeLastOrNull() },
                )
            }

            entry<EmojiZeitgeistGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                // Added key = key.toString()
                val zeitgeistViewModel = viewModel(key = key.toString()) {
                    EmojiZeitgeistViewModel(
                        topicSlug = key.topicSlug,
                        mode = gameMode,
                        repository = ServiceLocator.puzzleRepository,
                    )
                }
                EmojiZeitgeistScreen(
                    viewModel = zeitgeistViewModel,
                    onNavigateUp = { backStack.removeLastOrNull() },
                )
            }

            entry<HallucinationGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                // Added key = key.toString()
                val hallucinationViewModel = viewModel(key = key.toString()) {
                    HallucinationViewModel(
                        topicSlug = key.topicSlug,
                        mode = gameMode,
                        repository = ServiceLocator.puzzleRepository,
                    )
                }
                HallucinationScreen(
                    viewModel = hallucinationViewModel,
                    onNavigateUp = { backStack.removeLastOrNull() },
                )
            }

            entry<MissingLinkGame> { key ->
                val gameMode = if (key.mode == "daily") GameMode.DAILY else GameMode.INFINITE
                // Added key = key.toString()
                val missingLinkViewModel = viewModel(key = key.toString()) {
                    MissingLinkViewModel(
                        topicSlug = key.topicSlug,
                        mode = gameMode,
                        repository = ServiceLocator.puzzleRepository,
                    )
                }
                MissingLinkScreen(
                    viewModel = missingLinkViewModel,
                    onNavigateUp = { backStack.removeLastOrNull() },
                )
            }
        },
    )
}