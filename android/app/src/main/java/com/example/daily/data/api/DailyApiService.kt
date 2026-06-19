package com.example.daily.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit API service for the Daily backend.
 * Base URL is configured in the DI module.
 */
interface DailyApiService {

    // --- Onboarding ---

    @POST("onboarding/interests")
    suspend fun submitInterests(@Body request: InterestsRequest)

    // --- Feed ---

    @GET("feed")
    suspend fun getFeed(): List<FeedItemResponse>

    // --- Daily mode ---

    @GET("daily/{topic}/{engine}")
    suspend fun getDailyPuzzle(
        @Path("topic") topic: String,
        @Path("engine") engine: String,
    ): PuzzleResponse

    @POST("daily/{puzzleId}/attempt")
    suspend fun submitDailyAttempt(
        @Path("puzzleId") puzzleId: String,
        @Body request: AttemptRequest,
    ): AttemptResponse

    @POST("daily/{puzzleId}/guess")
    suspend fun submitDailyGuess(
        @Path("puzzleId") puzzleId: String,
        @Body request: GuessRequest,
    ): GuessResponse

    // --- Infinite mode ---

    @GET("infinite/{topic}/{engine}/next")
    suspend fun getInfinitePuzzle(
        @Path("topic") topic: String,
        @Path("engine") engine: String,
    ): PuzzleResponse

    @POST("infinite/{puzzleId}/attempt")
    suspend fun submitInfiniteAttempt(
        @Path("puzzleId") puzzleId: String,
        @Body request: AttemptRequest,
    ): AttemptResponse

    @POST("infinite/{puzzleId}/guess")
    suspend fun submitInfiniteGuess(
        @Path("puzzleId") puzzleId: String,
        @Body request: GuessRequest,
    ): GuessResponse

    // --- Leaderboard ---

    @GET("leaderboard/{topic}/{engine}/{date}")
    suspend fun getLeaderboard(
        @Path("topic") topic: String,
        @Path("engine") engine: String,
        @Path("date") date: String,
    ): List<LeaderboardEntryResponse>
}
