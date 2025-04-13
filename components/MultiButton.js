"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { formatDate, timeToMinutes } from "../utils/dateUtils"
import { useTranslation } from "../i18n/useTranslation"

const MultiButton = () => {
  const { userSettings, shifts, addAttendanceLog, resetDailyWorkStatus, getLogsForDate, getDailyStatusForDate } =
    useAppContext()
  const { t } = useTranslation()

  const [activeShift, setActiveShift] = useState(null)
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [todayLogs, setTodayLogs] = useState([])
  const [buttonEnabled, setButtonEnabled] = useState(true)

  // Tìm ca làm việc cho ngày hôm nay
  useEffect(() => {
    const today = new Date()
    const dayOfWeek = today.toLocaleString("en-US", { weekday: "short" }).substring(0, 3)

    // Lấy trạng thái hiện tại
    const dailyStatus = getDailyStatusForDate(today)
    setCurrentStatus(dailyStatus.status)

    // Nếu đã có shiftId trong trạng thái, sử dụng nó
    if (dailyStatus.shiftId) {
      const shift = shifts.find((s) => s.id === dailyStatus.shiftId)
      if (shift) {
        setActiveShift(shift)
        return
      }
    }

    // Nếu chưa có, tìm ca làm việc phù hợp cho ngày hôm nay
    const todayShifts = shifts.filter((shift) => shift.daysApplied.includes(dayOfWeek))

    if (todayShifts.length === 1) {
      setActiveShift(todayShifts[0])
    } else if (todayShifts.length > 1) {
      // Nếu có nhiều ca, chọn ca gần nhất với thời gian hiện tại
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      todayShifts.sort((a, b) => {
        const startA = timeToMinutes(a.startTime)
        const startB = timeToMinutes(b.startTime)

        // Tính khoảng cách đến thời gian hiện tại
        const distanceA = Math.abs(startA - currentMinutes)
        const distanceB = Math.abs(startB - currentMinutes)

        return distanceA - distanceB
      })

      setActiveShift(todayShifts[0])
    }
  }, [shifts, getDailyStatusForDate])

  // Lấy logs cho ngày hôm nay
  useEffect(() => {
    const logs = getLogsForDate(new Date())
    setTodayLogs(logs)
  }, [getLogsForDate])

  // Kiểm tra xem nút có nên được enabled hay không
  useEffect(() => {
    if (!activeShift) {
      setButtonEnabled(false)
      return
    }

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    switch (currentStatus) {
      case "not_started":
        // Luôn cho phép bấm "Đi làm"
        setButtonEnabled(true)
        break
      case "waiting_check_in":
        // Cho phép check-in khi gần đến giờ bắt đầu (trong vòng 30 phút)
        const startMinutes = timeToMinutes(activeShift.startTime)
        setButtonEnabled(Math.abs(currentMinutes - startMinutes) <= 30)
        break
      case "working":
        // Cho phép check-out khi đã làm việc đủ thời gian tối thiểu hoặc gần đến giờ kết thúc
        const dailyStatus = getDailyStatusForDate(now)
        if (dailyStatus.checkInTime) {
          const checkInTime = new Date(dailyStatus.checkInTime)
          const workingMinutes = Math.floor((now - checkInTime) / 60000)

          // Tối thiểu 30 phút làm việc hoặc gần đến giờ kết thúc
          const officeEndMinutes = timeToMinutes(activeShift.officeEndTime)
          setButtonEnabled(workingMinutes >= 30 || Math.abs(currentMinutes - officeEndMinutes) <= 30)
        } else {
          setButtonEnabled(false)
        }
        break
      case "ready_to_complete":
        // Luôn cho phép hoàn tất
        setButtonEnabled(true)
        break
      case "completed":
        // Đã hoàn tất, không cho phép bấm nút chính
        setButtonEnabled(false)
        break
      default:
        setButtonEnabled(true)
    }
  }, [currentStatus, activeShift, getDailyStatusForDate])

  // Xử lý khi bấm nút
  const handleButtonPress = () => {
    if (!activeShift) {
      Alert.alert(t("common.error"), t("home.noActiveShift"))
      return
    }

    switch (currentStatus) {
      case "not_started":
        handleGoWork()
        break
      case "waiting_check_in":
        handleCheckIn()
        break
      case "working":
        handleCheckOut()
        break
      case "ready_to_complete":
        handleComplete()
        break
      default:
        break
    }
  }

  // Xử lý "Đi làm"
  const handleGoWork = () => {
    if (!activeShift) return

    addAttendanceLog("go_work", activeShift.id)
    setCurrentStatus("waiting_check_in")
  }

  // Xử lý "Chấm công vào"
  const handleCheckIn = () => {
    if (!activeShift) return

    addAttendanceLog("check_in", activeShift.id)
    setCurrentStatus("working")
  }

  // Xử lý "Ký công"
  const handlePunch = () => {
    if (!activeShift) return

    addAttendanceLog("punch", activeShift.id)
  }

  // Xử lý "Chấm công ra"
  const handleCheckOut = () => {
    if (!activeShift) return

    addAttendanceLog("check_out", activeShift.id)
    setCurrentStatus("ready_to_complete")
  }

  // Xử lý "Hoàn tất"
  const handleComplete = () => {
    if (!activeShift) return

    addAttendanceLog("complete", activeShift.id)
    setCurrentStatus("completed")
  }

  // Xử lý reset
  const handleReset = () => {
    Alert.alert(t("common.confirm"), t("home.resetConfirmation"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: () => {
          resetDailyWorkStatus()
          setCurrentStatus("not_started")
          setTodayLogs([])
        },
        style: "destructive",
      },
    ])
  }

  // Lấy thông tin hiển thị cho nút dựa trên trạng thái
  const getButtonInfo = () => {
    switch (currentStatus) {
      case "not_started":
        return {
          text: t("home.goWork"),
          icon: "directions-walk",
          color: COLORS.primary,
        }
      case "waiting_check_in":
        return {
          text: t("home.waitingCheckIn"),
          icon: "schedule",
          color: COLORS.info,
        }
      case "working":
        return {
          text: t("home.checkOut"),
          icon: "logout",
          color: COLORS.error,
        }
      case "ready_to_complete":
        return {
          text: t("home.complete"),
          icon: "check-circle",
          color: COLORS.success,
        }
      case "completed":
        return {
          text: t("home.completed"),
          icon: "done-all",
          color: COLORS.gray,
        }
      default:
        return {
          text: t("home.goWork"),
          icon: "directions-walk",
          color: COLORS.primary,
        }
    }
  }

  // Render log item
  const renderLogItem = ({ item }) => {
    let logTypeText = ""
    let logIcon = ""

    switch (item.type) {
      case "go_work":
        logTypeText = t("home.logGoWork")
        logIcon = "directions-walk"
        break
      case "check_in":
        logTypeText = t("home.logCheckIn")
        logIcon = "login"
        break
      case "punch":
        logTypeText = t("home.logPunch")
        logIcon = "touch-app"
        break
      case "check_out":
        logTypeText = t("home.logCheckOut")
        logIcon = "logout"
        break
      case "complete":
        logTypeText = t("home.logComplete")
        logIcon = "check-circle"
        break
      default:
        logTypeText = item.type
        logIcon = "info"
    }

    return (
      <View style={styles.logItem}>
        <View style={styles.logIconContainer}>
          <MaterialIcons name={logIcon} size={16} color={COLORS.white} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logType}>{logTypeText}</Text>
          <Text style={styles.logTime}>{formatDate(new Date(item.date), "time")}</Text>
        </View>
      </View>
    )
  }

  // Lấy thông tin nút
  const buttonInfo = getButtonInfo()

  // Kiểm tra xem có hiển thị nút Ký công không
  const showPunchButton = currentStatus === "working" && activeShift && activeShift.showPunch

  // Kiểm tra xem có hiển thị nút Reset không
  const showResetButton = todayLogs.length > 0

  // Kiểm tra xem có đang ở chế độ "Chỉ Đi Làm" không
  const isOnlyGoWorkMode = userSettings.onlyGoWorkMode === true

  // Nếu ở chế độ "Chỉ Đi Làm", chỉ hiển thị nút "Đi Làm"
  const finalButtonInfo = isOnlyGoWorkMode
    ? {
        text: t("home.goWork"),
        icon: "directions-walk",
        color: COLORS.primary,
      }
    : buttonInfo

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {/* Nút chính */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: finalButtonInfo.color },
            !buttonEnabled && styles.disabledButton,
          ]}
          onPress={handleButtonPress}
          disabled={!buttonEnabled || (isOnlyGoWorkMode && currentStatus !== "not_started")}
        >
          <MaterialIcons name={finalButtonInfo.icon} size={24} color={COLORS.white} />
          <Text style={styles.buttonText}>{finalButtonInfo.text}</Text>
        </TouchableOpacity>

        {/* Nút Ký công (nếu cần) */}
        {showPunchButton && !isOnlyGoWorkMode && (
          <TouchableOpacity style={styles.punchButton} onPress={handlePunch}>
            <MaterialIcons name="touch-app" size={20} color={COLORS.white} />
            <Text style={styles.punchButtonText}>{t("home.punch")}</Text>
          </TouchableOpacity>
        )}

        {/* Nút Reset */}
        {showResetButton && (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <MaterialIcons name="refresh" size={16} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Hiển thị ca làm việc hiện tại */}
      {activeShift && (
        <View style={styles.activeShiftContainer}>
          <Text style={styles.activeShiftText}>
            {t("home.activeShift")}: {activeShift.name} ({activeShift.startTime} - {activeShift.endTime})
          </Text>
        </View>
      )}

      {/* Lịch sử bấm nút */}
      {todayLogs.length > 0 && (
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>{t("home.todayLogs")}</Text>
          <FlatList
            data={todayLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  punchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  punchButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 4,
  },
  resetButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  activeShiftContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  activeShiftText: {
    color: COLORS.darkGray,
    fontSize: 14,
  },
  logsContainer: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.text,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  logIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logType: {
    fontSize: 14,
    color: COLORS.text,
  },
  logTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
})

export default MultiButton
