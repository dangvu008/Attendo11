"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import * as Location from "expo-location"
import WeatherIcon from "../components/WeatherIcon"

const WeatherScreen = () => {
  const { userSettings, weatherData, updateWeatherData, updateSettings } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWeatherData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get location permission
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setError("Quyền truy cập vị trí bị từ chối")
        setLoading(false)
        return
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords

      // Update location in settings
      updateSettings({
        weatherLocation: { lat: latitude, lon: longitude },
      })

      // Fetch weather data from OpenWeather API
      // Note: In a real app, you would use your own API key
      const apiKey = process.env.OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_API_KEY" // Replace with actual API key
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`,
      )

      if (!response.ok) {
        throw new Error("Không thể lấy dữ liệu thời tiết")
      }

      const data = await response.json()

      // Get location name
      const locationResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`,
      )

      let locationName = "Vị trí hiện tại"

      if (locationResponse.ok) {
        const locationData = await locationResponse.json()
        if (locationData.length > 0) {
          locationName = locationData[0].name
        }
      }

      // Check for extreme weather conditions
      let warning = null

      if (data.main.temp > 35) {
        warning = "Nhiệt độ cao bất thường, hãy uống nhiều nước"
      } else if (data.main.temp < 10) {
        warning = "Nhiệt độ thấp, hãy mặc ấm"
      }

      if (data.weather[0].main === "Thunderstorm") {
        warning = "Có giông bão, hãy cẩn thận khi di chuyển"
      } else if (data.weather[0].main === "Rain" && data.rain && data.rain["1h"] > 10) {
        warning = "Mưa lớn, có thể gây ngập lụt"
      }

      // Update weather data
      const weatherInfo = {
        location: locationName,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        icon: data.weather[0].icon,
        warning,
      }

      updateWeatherData(weatherInfo)
    } catch (err) {
      console.error("Error fetching weather:", err)
      setError("Không thể lấy dữ liệu thời tiết. Vui lòng thử lại sau.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [])

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu thời tiết...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWeatherData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : weatherData ? (
        <View style={styles.weatherContainer}>
          <View style={styles.weatherHeader}>
            <Text style={styles.locationText}>{weatherData.location}</Text>
            <Text style={styles.updateText}>
              Cập nhật lúc: {new Date(weatherData.lastUpdated).toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.weatherMain}>
            <WeatherIcon iconCode={weatherData.icon} size={100} />
            <Text style={styles.temperatureText}>{weatherData.temperature}°C</Text>
            <Text style={styles.descriptionText}>{weatherData.description}</Text>
          </View>

          <View style={styles.weatherDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="opacity" size={24} color={COLORS.primary} />
              <Text style={styles.detailText}>Độ ẩm: {weatherData.humidity}%</Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="air" size={24} color={COLORS.primary} />
              <Text style={styles.detailText}>Gió: {weatherData.windSpeed} m/s</Text>
            </View>
          </View>

          {weatherData.warning && (
            <View style={styles.warningContainer}>
              <MaterialIcons name="warning" size={24} color={COLORS.warning} />
              <Text style={styles.warningText}>{weatherData.warning}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={fetchWeatherData}>
            <MaterialIcons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.refreshButtonText}>Cập nhật</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <MaterialIcons name="cloud-off" size={48} color={COLORS.gray} />
          <Text style={styles.errorText}>Không có dữ liệu thời tiết</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWeatherData}>
            <Text style={styles.retryButtonText}>Tải dữ liệu</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.darkGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    color: COLORS.darkGray,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  weatherContainer: {
    padding: 16,
  },
  weatherHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  locationText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  updateText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
  weatherMain: {
    alignItems: "center",
    marginBottom: 24,
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 18,
    color: COLORS.darkGray,
    textTransform: "capitalize",
  },
  weatherDetails: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  warningContainer: {
    backgroundColor: COLORS.warning + "20",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    color: COLORS.darkGray,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
})

export default WeatherScreen
