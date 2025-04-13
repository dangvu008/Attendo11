"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { formatDate, getDayOfWeek } from "../utils/dateUtils"

const CheckInOutScreen = ({ route, navigation }) => {
  const { date: dateParam } = route.params || {}
  const { shifts, attendanceRecords, addAttendanceRecord } = useAppContext()

  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date())
  const [records, setRecords] = useState([])
  const [availableShifts, setAvailableShifts] = useState([])

  // Load records for the selected date
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split("T")[0]

    const filteredRecords = attendanceRecords.filter((record) => record.date.startsWith(dateStr))

    // Sort by date
    filteredRecords.sort((a, b) => new Date(a.date) - new Date(b.date))

    setRecords(filteredRecords)

    // Find shifts for this day of week
    const dayOfWeek = getDayOfWeek(selectedDate)
    const shiftsForDay = shifts.filter((shift) => shift.daysApplied.includes(dayOfWeek))
    setAvailableShifts(shiftsForDay)
  }, [selectedDate, attendanceRecords, shifts])

  // Handle check-in
  const handleCheckIn = (shiftId) => {
    // Check if already checked in
    const hasCheckIn = records.some((record) => record.shiftId === shiftId && record.type === "check-in")

    if (hasCheckIn) {
      Alert.alert("Đã check-in", "Bạn đã check-in cho ca làm việc này rồi.")
      return
    }

    // Create record with selected date but current time
    const now = new Date()
    const recordDate = new Date(selectedDate)
    recordDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

    const record = {
      shiftId,
      type: "check-in",
      date: recordDate.toISOString(),
    }

    addAttendanceRecord(record)

    Alert.alert("Check-in thành công", `Bạn đã check-in lúc ${formatDate(now, "time")}`)
  }

  // Handle check-out
  const handleCheckOut = (shiftId) => {
    // Check if already checked in
    const hasCheckIn = records.some((record) => record.shiftId === shiftId && record.type === "check-in")

    if (!hasCheckIn) {
      Alert.alert("Chưa check-in", "Bạn cần check-in trước khi check-out.")
      return
    }

    // Check if already checked out
    const hasCheckOut = records.some((record) => record.shiftId === shiftId && record.type === "check-out")

    if (hasCheckOut) {
      Alert.alert("Đã check-out", "Bạn đã check-out cho ca làm việc này rồi.")
      return
    }

    // Create record with selected date but current time
    const now = new Date()
    const recordDate = new Date(selectedDate)
    recordDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

    const record = {
      shiftId,
      type: "check-out",
      date: recordDate.toISOString(),
    }

    addAttendanceRecord(record)

    Alert.alert("Check-out thành công", `Bạn đã check-out lúc ${formatDate(now, "time")}`)
  }

  // Get shift name by ID
  const getShiftName = (shiftId) => {
    const shift = shifts.find((s) => s.id === shiftId)
    return shift ? shift.name : "Ca không xác định"
  }

  // Render record item
  const renderRecordItem = ({ item }) => {
    return (
      <View style={styles.recordItem}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordShift}>{getShiftName(item.shiftId)}</Text>
          <Text style={styles.recordTime}>{formatDate(item.date, "time")}</Text>
        </View>
        <View style={[styles.recordType, item.type === "check-in" ? styles.checkInType : styles.checkOutType]}>
          <MaterialIcons name={item.type === "check-in" ? "login" : "logout"} size={16} color={COLORS.white} />
          <Text style={styles.recordTypeText}>{item.type === "check-in" ? "Check-in" : "Check-out"}</Text>
        </View>
      </View>
    )
  }

  // Render shift item
  const renderShiftItem = ({ item }) => {
    const hasCheckIn = records.some((record) => record.shiftId === item.id && record.type === "check-in")

    const hasCheckOut = records.some((record) => record.shiftId === item.id && record.type === "check-out")

    return (
      <View style={styles.shiftItem}>
        <Text style={styles.shiftName}>{item.name}</Text>
        <Text style={styles.shiftTime}>
          {item.startTime} - {item.endTime}
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton, hasCheckIn ? styles.disabledButton : {}]}
            onPress={() => handleCheckIn(item.id)}
            disabled={hasCheckIn}
          >
            <MaterialIcons name="login" size={16} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Check-in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.checkOutButton,
              !hasCheckIn || hasCheckOut ? styles.disabledButton : {},
            ]}
            onPress={() => handleCheckOut(item.id)}
            disabled={!hasCheckIn || hasCheckOut}
          >
            <MaterialIcons name="logout" size={16} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Check-out</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{formatDate(selectedDate, "date")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ca làm việc</Text>
        {availableShifts.length > 0 ? (
          <FlatList
            data={availableShifts}
            renderItem={renderShiftItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có ca làm việc nào vào ngày này</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử chấm công</Text>
        {records.length > 0 ? (
          <FlatList
            data={records}
            renderItem={renderRecordItem}
            keyExtractor={(item, index) => `${item.shiftId}-${item.type}-${index}`}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có dữ liệu chấm công</Text>
          </View>
        )}
      </View>
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
    padding: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  section: {
    marginVertical: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 8,
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  shiftItem: {
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
  shiftName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  shiftTime: {
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  checkInButton: {
    backgroundColor: COLORS.primary,
  },
  checkOutButton: {
    backgroundColor: COLORS.error,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 4,
  },
  recordItem: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  recordInfo: {
    flex: 1,
  },
  recordShift: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  recordTime: {
    color: COLORS.darkGray,
    fontSize: 12,
  },
  recordType: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  checkInType: {
    backgroundColor: COLORS.primary,
  },
  checkOutType: {
    backgroundColor: COLORS.error,
  },
  recordTypeText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: "center",
  },
})

export default CheckInOutScreen
