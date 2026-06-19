package com.example.daily.data

import com.example.daily.data.api.DailyApiService
import com.example.daily.data.repository.PuzzleRepository
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/**
 * Simple service locator — provides singleton instances
 * of API service and repository. In a production app you'd use Hilt.
 */
object ServiceLocator {

    // Backend URL — 10.0.2.2 maps to host loopback from Android emulator
    private const val BASE_URL = "http://10.0.2.2:5001/"

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
            )
            .addInterceptor { chain ->
                // Add device ID header for simple auth
                val request = chain.request().newBuilder()
                    .addHeader("X-Device-Id", DeviceIdProvider.getDeviceId())
                    .build()
                chain.proceed(request)
            }
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    val apiService: DailyApiService by lazy {
        retrofit.create(DailyApiService::class.java)
    }

    val puzzleRepository: PuzzleRepository by lazy {
        PuzzleRepository(apiService)
    }
}

/** Simple device ID provider using a UUID persisted in SharedPreferences */
object DeviceIdProvider {
    private var deviceId: String? = null

    fun init(context: android.content.Context) {
        val prefs = context.getSharedPreferences("daily_prefs", android.content.Context.MODE_PRIVATE)
        deviceId = prefs.getString("device_id", null) ?: run {
            val newId = java.util.UUID.randomUUID().toString()
            prefs.edit().putString("device_id", newId).apply()
            newId
        }
    }

    fun getDeviceId(): String = deviceId ?: "unknown"
}
