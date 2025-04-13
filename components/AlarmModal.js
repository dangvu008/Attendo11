"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration } from "react-native"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { playAlarmSound, stopAlarmSound } from "../utils/alarmSoundUtils"
import { formatDate } from "../utils/dateUtils"
import { useTranslation } from "../i18n/useTranslation"

const AlarmModal = ({ visible, onDismiss, title, message, alarmSound = "alarm_1", vibrationEnabled = true }) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const { t } = useTranslation()

  // Phát âm thanh và rung khi modal hiển thị
  useEffect(() => {
    let interval

    if (visible) {
      // Phát âm thanh
      playAlarmSound(alarmSound)

      // Rung nếu được bật
      if (vibrationEnabled) {
        // Rung theo mẫu: 500ms rung, 500ms nghỉ, lặp lại
        Vibration.vibrate([500, 500], true)
      }

      // Đếm thời gian đã hiển thị
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      // Dừng âm thanh và rung khi modal đóng
      stopAlarmSound()
      Vibration.cancel()
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
      stopAlarmSound()
      Vibration.cancel()
    }
  }, [visible, alarmSound, vibrationEnabled])

  // Tự động đóng sau 5 phút nếu không có tương tác
  useEffect(() => {
    if (elapsedTime >= 300) {
      // 300 giây = 5 phút
      onDismiss()
    }
  }, [elapsedTime, onDismiss])

  // Định dạng thời gian đã hiển thị
  const formatElapsedTime = () => {
    const minutes = Math.floor(elapsedTime / 60)
    const seconds = elapsedTime % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.alarmIcon}>
            <MaterialIcons name="alarm-on" size={48} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>{title || t("alarm.alarm")}</Text>
          <Text style={styles.message}>{message || t("alarm.timeToWork")}</Text>
          <Text style={styles.time}>{formatDate(new Date(), "full")}</Text>
          <Text style={styles.elapsedTime}>
            {t("alarm.displayTime")}: {formatElapsedTime()}
          </Text>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>{t("alarm.dismissAlarm")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "80%",
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  alarmIcon: {
    backgroundColor: COLORS.accent + "20",
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginBottom: 16,
    textAlign: "center",
  },
  time: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  elapsedTime: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
  },
  dismissButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  dismissButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
})

export default AlarmModal
