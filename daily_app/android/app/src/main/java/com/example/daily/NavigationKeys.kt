package com.example.daily

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Onboarding : NavKey

@Serializable data object Feed : NavKey

@Serializable
data class WordGuessGame(
    val topicSlug: String,
    val mode: String, // "daily" or "infinite"
) : NavKey

@Serializable
data class AttributeDeductionGame(
    val topicSlug: String,
    val mode: String, // "daily" or "infinite"
) : NavKey

@Serializable
data class Leaderboard(
    val topicSlug: String,
    val engine: String,
    val date: String,
) : NavKey
