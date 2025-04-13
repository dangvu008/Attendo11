"use client"

import { View, Image, StyleSheet } from "react-native"

// Ánh xạ mã icon từ OpenWeatherMap sang icon tùy chỉnh
const WEATHER_ICON_MAP = {
  // Mã icon mặc định từ OpenWeatherMap
  "01d": require("../assets/weather-icons/clear-day.png"), // Trời quang đãng (ngày)
  "01n": require("../assets/weather-icons/clear-night.png"), // Trời quang đãng (đêm)
  "02d": require("../assets/weather-icons/partly-cloudy-day.png"), // Mây rải rác (ngày)
  "02n": require("../assets/weather-icons/partly-cloudy-night.png"), // Mây rải rác (đêm)
  "03d": require("../assets/weather-icons/cloudy.png"), // Mây rải rác
  "03n": require("../assets/weather-icons/cloudy.png"), // Mây rải rác
  "04d": require("../assets/weather-icons/cloudy.png"), // Mây đen
  "04n": require("../assets/weather-icons/cloudy.png"), // Mây đen
  "09d": require("../assets/weather-icons/rain.png"), // Mưa rào
  "09n": require("../assets/weather-icons/rain.png"), // Mưa rào
  "10d": require("../assets/weather-icons/rain.png"), // Mưa (ngày)
  "10n": require("../assets/weather-icons/rain.png"), // Mưa (đêm)
  "11d": require("../assets/weather-icons/thunderstorm.png"), // Giông bão
  "11n": require("../assets/weather-icons/thunderstorm.png"), // Giông bão
  "13d": require("../assets/weather-icons/snow.png"), // Tuyết
  "13n": require("../assets/weather-icons/snow.png"), // Tuyết
  "50d": require("../assets/weather-icons/fog.png"), // Sương mù
  "50n": require("../assets/weather-icons/fog.png"), // Sương mù
}

const WeatherIcon = ({ iconCode, size = 50, style }) => {
  // Nếu không có mã icon hoặc mã không hợp lệ, sử dụng icon mặc định
  const iconSource = iconCode && WEATHER_ICON_MAP[iconCode] ? WEATHER_ICON_MAP[iconCode] : WEATHER_ICON_MAP["01d"]

  return (
    <View style={[styles.container, style]}>
      <Image source={iconSource} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
})

export default WeatherIcon
