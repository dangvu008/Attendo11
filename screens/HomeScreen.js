"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import WeeklyStatusGrid from "../components/WeeklyStatusGrid"
import AlarmModal from "../components/AlarmModal"
import WeatherIcon from "../components/WeatherIcon"
import NoteItem from "../components/NoteItem"
import NoteForm from "../components/NoteForm"
import { formatDate, getDayOfWeek, timeToMinutes } from "../utils/dateUtils"
import { MaterialIcons } from "@expo/vector-icons"
import { useTranslation } from "../i18n/useTranslation"
// Thêm import MultiButton
import MultiButton from "../components/MultiButton"

const HomeScreen = ({ navigation }) => {
  const {
    userSettings,
    shifts,
    attendanceRecords,
    weatherData,
    addAttendanceRecord,
    notes,
    deleteNote,
    getNotesForToday,
    getNextReminderDate,
  } = useAppContext()
  const { t } = useTranslation()

  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeShifts, setActiveShifts] = useState([])
  const [showAlarm, setShowAlarm] = useState(false)
  const [alarmData, setAlarmData] = useState({
    title: "",
    message: "",
    alarmSound: "alarm_1",
  })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState(null)
  const [todayNotes, setTodayNotes] = useState([])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Find active shifts for today
  useEffect(() => {
    const today = getDayOfWeek(new Date())
    const todayShifts = shifts.filter((shift) => shift.daysApplied.includes(today))
    setActiveShifts(todayShifts)
  }, [shifts])

  // Lấy danh sách ghi chú cho ngày hôm nay
  useEffect(() => {
    const fetchTodayNotes = () => {
      // Lấy tất cả ghi chú cho ngày hôm nay
      const allTodayNotes = getNotesForToday()

      // Sắp xếp theo thời gian nhắc nhở gần nhất
      allTodayNotes.sort((a, b) => {
        const dateA = getNextReminderDate(a)
        const dateB = getNextReminderDate(b)

        // Nếu không có ngày nhắc nhở, sắp xếp theo updatedAt
        if (!dateA && !dateB) {
          return new Date(b.updatedAt) - new Date(a.updatedAt)
        }
        if (!dateA) return 1
        if (!dateB) return -1

        return dateA.getTime() - dateB.getTime()
      })

      // Chỉ lấy tối đa 3 ghi chú
      setTodayNotes(allTodayNotes.slice(0, 3))
    }

    fetchTodayNotes()
  }, [notes, shifts, getNotesForToday, getNextReminderDate])

  // Check for shift reminders
  useEffect(() => {
    if (activeShifts.length === 0 || !userSettings.alarmSoundEnabled) return

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    activeShifts.forEach((shift) => {
      const startMinutes = timeToMinutes(shift.startTime)
      const endMinutes = timeToMinutes(shift.endTime)

      // Check for start reminder
      if (Math.abs(currentMinutes - startMinutes) === shift.remindBeforeStart) {
        triggerAlarm(
          t("alarm.timeToWork"),
          t("alarm.shiftStartingSoon", { name: shift.name, minutes: shift.remindBeforeStart }),
          "alarm_1",
        )
      }

      // Check for end reminder
      if (Math.abs(currentMinutes - endMinutes) === shift.remindAfterEnd) {
        triggerAlarm(
          t("alarm.timeToWork"),
          t("alarm.shiftEndingSoon", { name: shift.name, minutes: shift.remindAfterEnd }),
          "alarm_2",
        )
      }
    })
  }, [currentTime, activeShifts, userSettings, t])

  // Trigger alarm
  const triggerAlarm = (title, message, alarmSound) => {
    setAlarmData({
      title,
      message,
      alarmSound,
    })
    setShowAlarm(true)
  }

  // Handle check-in
  const handleCheckIn = () => {
    if (activeShifts.length === 0) {
      Alert.alert(
        t("attendance.noShiftsToCheckIn"),
        t("attendance.noShiftsToCheckIn") + " " + t("shifts.addShiftPrompt"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("shifts.addShift"),
            onPress: () => navigation.navigate("Shifts", { screen: "ShiftDetail", params: { isNew: true } }),
          },
        ],
      )
      return
    }

    // If there's only one shift, use it directly
    if (activeShifts.length === 1) {
      recordAttendance(activeShifts[0].id, "check-in")
      return
    }

    // If there are multiple shifts, let the user choose
    Alert.alert(
      t("attendance.chooseShift"),
      t("attendance.multipleShiftsPrompt"),
      activeShifts.map((shift) => ({
        text: shift.name,
        onPress: () => recordAttendance(shift.id, "check-in"),
      })),
    )
  }

  // Handle check-out
  const handleCheckOut = () => {
    // Find shifts that have been checked in but not checked out
    const checkedInShifts = activeShifts.filter((shift) => {
      const today = new Date().toISOString().split("T")[0]

      const checkIns = attendanceRecords.filter(
        (record) => record.shiftId === shift.id && record.date.startsWith(today) && record.type === "check-in",
      )

      const checkOuts = attendanceRecords.filter(
        (record) => record.shiftId === shift.id && record.date.startsWith(today) && record.type === "check-out",
      )

      return checkIns.length > 0 && checkOuts.length === 0
    })

    if (checkedInShifts.length === 0) {
      Alert.alert(t("common.error"), t("attendance.needCheckInFirst"))
      return
    }

    // If there's only one shift, use it directly
    if (checkedInShifts.length === 1) {
      recordAttendance(checkedInShifts[0].id, "check-out")
      return
    }

    // If there are multiple shifts, let the user choose
    Alert.alert(
      t("attendance.chooseShift"),
      t("attendance.multipleCheckInsPrompt"),
      checkedInShifts.map((shift) => ({
        text: shift.name,
        onPress: () => recordAttendance(shift.id, "check-out"),
      })),
    )
  }

  // Record attendance
  const recordAttendance = (shiftId, type) => {
    const record = {
      shiftId,
      type,
      date: new Date().toISOString(),
    }

    addAttendanceRecord(record)

    Alert.alert(
      type === "check-in" ? t("attendance.checkInSuccess") : t("attendance.checkOutSuccess"),
      `${type === "check-in" ? t("attendance.checkInSuccess") : t("attendance.checkOutSuccess")} ${formatDate(new Date(), "time")}`,
    )
  }

  // Handle day press on weekly grid
  const handleDayPress = (date) => {
    navigation.navigate("CheckInOut", { date: date.toISOString() })
  }

  // Get today's attendance status
  const getTodayAttendanceStatus = () => {
    const today = new Date().toISOString().split("T")[0]

    const checkIns = attendanceRecords.filter((record) => record.date.startsWith(today) && record.type === "check-in")

    const checkOuts = attendanceRecords.filter((record) => record.date.startsWith(today) && record.type === "check-out")

    if (checkIns.length === 0) {
      return t("home.checkInStatus.notCheckedIn")
    } else if (checkOuts.length === 0) {
      return t("home.checkInStatus.checkedInNotOut")
    } else {
      return t("home.checkInStatus.checkedInAndOut")
    }
  }

  // Xử lý thêm ghi chú mới
  const handleAddNote = () => {
    setNoteToEdit(null)
    setShowNoteForm(true)
  }

  // Xử lý sửa ghi chú
  const handleEditNote = (note) => {
    setNoteToEdit(note)
    setShowNoteForm(true)
  }

  // Xử lý xóa ghi chú
  const handleDeleteNote = (note) => {
    Alert.alert(t("common.confirm"), t("notes.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        onPress: () => deleteNote(note.id),
        style: "destructive",
      },
    ])
  }

  // Xử lý xem tất cả ghi chú
  const handleViewAllNotes = () => {
    navigation.navigate("Notes")
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(currentTime, "date")}</Text>
          <Text style={styles.time}>{formatDate(currentTime, "time")}</Text>
          <Text style={styles.status}>{getTodayAttendanceStatus()}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn}>
            <MaterialIcons name="login" size={24} color={COLORS.white} />
            <Text style={styles.actionButtonText}>{t("attendance.checkIn")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.checkOutButton]} onPress={handleCheckOut}>
            <MaterialIcons name="logout" size={24} color={COLORS.white} />
            <Text style={styles.actionButtonText}>{t("attendance.checkOut")}</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đa Năng */}
        <MultiButton />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.weeklySchedule")}</Text>
          <WeeklyStatusGrid onDayPress={handleDayPress} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.todayShifts")}</Text>
          {activeShifts.length > 0 ? (
            activeShifts.map((shift) => (
              <TouchableOpacity
                key={shift.id}
                style={styles.shiftCard}
                onPress={() => navigation.navigate("Shifts", { screen: "ShiftDetail", params: { shiftId: shift.id } })}
              >
                <View style={styles.shiftHeader}>
                  <Text style={styles.shiftName}>{shift.name}</Text>
                  <MaterialIcons name="access-time" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.shiftTimes}>
                  <Text style={styles.shiftTime}>
                    <MaterialIcons name="login" size={16} color={COLORS.success} /> {shift.startTime}
                  </Text>
                  <Text style={styles.shiftTime}>
                    <MaterialIcons name="logout" size={16} color={COLORS.error} /> {shift.endTime}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t("home.noShiftsToday")}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("Shifts", { screen: "ShiftDetail", params: { isNew: true } })}
              >
                <Text style={styles.addButtonText}>{t("home.addNewShift")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Khu vực ghi chú */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("home.notes")}</Text>
            <View style={styles.noteActions}>
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllNotes}>
                <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addNoteButton} onPress={handleAddNote}>
                <MaterialIcons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {todayNotes.length > 0 ? (
            todayNotes.map((note) => (
              <NoteItem key={note.id} note={note} onEdit={handleEditNote} onDelete={handleDeleteNote} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t("notes.noNotes")}</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
                <Text style={styles.addButtonText}>{t("notes.addNotePrompt")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {weatherData && userSettings.weatherWarningEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.weather")}</Text>
            <View style={styles.weatherCard}>
              <Text style={styles.weatherLocation}>{weatherData.location}</Text>
              <View style={styles.weatherInfo}>
                <WeatherIcon iconCode={weatherData.icon} size={50} />
                <View style={styles.weatherTextInfo}>
                  <Text style={styles.weatherTemp}>{weatherData.temperature}°C</Text>
                  <Text style={styles.weatherDesc}>{weatherData.description}</Text>
                </View>
              </View>
              {weatherData.warning && (
                <View style={styles.warningBox}>
                  <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                  <Text style={styles.warningText}>{weatherData.warning}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <AlarmModal
        visible={showAlarm}
        onDismiss={() => setShowAlarm(false)}
        title={alarmData.title}
        message={alarmData.message}
        alarmSound={alarmData.alarmSound}
        vibrationEnabled={userSettings.alarmVibrationEnabled}
      />

      <NoteForm
        visible={showNoteForm}
        onClose={() => {
          setShowNoteForm(false)
          setNoteToEdit(null)
        }}
        noteToEdit={noteToEdit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    alignItems: "center",
  },
  date: {
    color: COLORS.white,
    fontSize: 16,
  },
  time: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: "bold",
    marginVertical: 8,
  },
  status: {
    color: COLORS.white,
    fontSize: 14,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  checkOutButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 8,
    color: COLORS.text,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllButton: {
    marginRight: 8,
  },
  viewAllText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  addNoteButton: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  shiftTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shiftTime: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 16,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.gray,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  weatherCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  weatherLocation: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  weatherTextInfo: {
    marginLeft: 12,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: "bold",
  },
  weatherDesc: {
    fontSize: 14,
    color: COLORS.darkGray,
    textTransform: "capitalize",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warning + "20",
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  warningText: {
    color: COLORS.darkGray,
    marginLeft: 8,
    flex: 1,
  },
})

export default HomeScreen
