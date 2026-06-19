package com.example.daily.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

private val DailyDarkColorScheme = darkColorScheme(
    primary = DailyPurple,
    onPrimary = DailyOnPrimary,
    primaryContainer = DailyPurpleDark,
    onPrimaryContainer = DailyPurpleLight,
    secondary = DailyGold,
    onSecondary = DailySurface,
    secondaryContainer = DailyGoldDark,
    onSecondaryContainer = DailyGoldLight,
    tertiary = DailyCyan,
    onTertiary = DailySurface,
    tertiaryContainer = DailyCyan,
    onTertiaryContainer = DailyCyanLight,
    background = DailySurface,
    onBackground = DailyOnSurface,
    surface = DailySurface,
    onSurface = DailyOnSurface,
    surfaceVariant = DailySurfaceVariant,
    onSurfaceVariant = DailyOnSurfaceVariant,
    surfaceContainerLowest = DailySurface,
    surfaceContainerLow = DailySurfaceVariant,
    surfaceContainer = DailySurfaceElevated,
    surfaceContainerHigh = DailySurfaceCard,
    surfaceContainerHighest = DailySurfaceCard,
    outline = DailyOnSurfaceVariant,
    error = DailyError,
    onError = DailyOnPrimary,
)

private val DailyShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

@Composable
fun DailyTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = DailyDarkColorScheme,
        typography = Typography,
        shapes = DailyShapes,
        content = content,
    )
}
