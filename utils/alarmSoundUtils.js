import { Audio } from "expo-av"

// Danh sách các âm thanh báo thức
export const ALARM_SOUNDS = [
  {
    id: "alarm_1",
    name: "Chuông chuẩn",
    file: require("../assets/sounds/alarm_1.mp3"),
  },
  {
    id: "alarm_2",
    name: "Chuông nhẹ nhàng",
    file: require("../assets/sounds/alarm_2.mp3"),
  },
  {
    id: "alarm_3",
    name: "Chuông khẩn cấp",
    file: require("../assets/sounds/alarm_3.mp3"),
  },
]

// Đối tượng Sound để lưu trữ âm thanh đang phát
let sound = null

// Hàm phát âm thanh báo thức
export const playAlarmSound = async (alarmId = "alarm_1", loop = true) => {
  try {
    // Nếu đang có âm thanh phát, dừng lại trước
    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
    }

    // Tìm âm thanh theo ID
    const selectedAlarm = ALARM_SOUNDS.find((alarm) => alarm.id === alarmId) || ALARM_SOUNDS[0]

    // Tạo đối tượng Sound mới
    const { sound: newSound } = await Audio.Sound.createAsync(selectedAlarm.file, {
      shouldPlay: true,
      isLooping: loop,
      volume: 1.0,
    })

    sound = newSound

    // Đặt chế độ âm thanh để có thể phát khi điện thoại ở chế độ im lặng
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    })

    return sound
  } catch (error) {
    console.error("Error playing alarm sound:", error)
    return null
  }
}

// Hàm dừng âm thanh báo thức
export const stopAlarmSound = async () => {
  try {
    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
      sound = null
    }
  } catch (error) {
    console.error("Error stopping alarm sound:", error)
  }
}

// Hàm kiểm tra xem âm thanh có đang phát không
export const isAlarmPlaying = async () => {
  try {
    if (sound) {
      const status = await sound.getStatusAsync()
      return status.isLoaded && status.isPlaying
    }
    return false
  } catch (error) {
    console.error("Error checking alarm status:", error)
    return false
  }
}
