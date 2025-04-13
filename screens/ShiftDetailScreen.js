"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { timeToMinutes } from "../utils/dateUtils"
import { useTranslation } from "../i18n/useTranslation"

const ShiftDetailScreen = ({ route, navigation }) => {
  const { shiftId, isNew } = route.params || {}
  const { shifts, addShift, updateShift } = useAppContext()
  const { t } = useTranslation()

  const [name, setName] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [officeEndTime, setOfficeEndTime] = useState("17:00")
  const [endTime, setEndTime] = useState("17:30")
  const [departureTime, setDepartureTime] = useState("07:30")
  const [daysApplied, setDaysApplied] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"])
  const [remindBeforeStart, setRemindBeforeStart] = useState(15)
  const [remindAfterEnd, setRemindAfterEnd] = useState(15)
  const [showPunch, setShowPunch] = useState(false)
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [penaltyRoundingMinutes, setPenaltyRoundingMinutes] = useState(30)

  // State để lưu trữ lỗi validation
  const [errors, setErrors] = useState({
    name: null,
    departureTime: null,
    startTime: null,
    officeEndTime: null,
    endTime: null,
    daysApplied: null,
  })

  // Load shift data if editing
  useEffect(() => {
    if (!isNew && shiftId) {
      const shift = shifts.find((s) => s.id === shiftId)
      if (shift) {
        setName(shift.name)
        setStartTime(shift.startTime)
        setOfficeEndTime(shift.officeEndTime)
        setEndTime(shift.endTime)
        setDepartureTime(shift.departureTime)
        setDaysApplied(shift.daysApplied)
        setRemindBeforeStart(shift.remindBeforeStart)
        setRemindAfterEnd(shift.remindAfterEnd)
        setShowPunch(shift.showPunch)
        setBreakMinutes(shift.breakMinutes)
        setPenaltyRoundingMinutes(shift.penaltyRoundingMinutes)
      }
    }
  }, [isNew, shiftId, shifts])

  // Set title based on whether we're adding or editing
  useEffect(() => {
    navigation.setOptions({
      title: isNew ? t("shifts.addShift") : t("shifts.shiftDetails"),
    })
  }, [isNew, navigation, t])

  // Validate name
  const validateName = (value) => {
    // Kiểm tra rỗng
    if (!value.trim()) {
      return "Tên ca không được để trống."
    }

    // Kiểm tra độ dài
    if (value.length > 200) {
      return "Tên ca quá dài (tối đa 200 ký tự)."
    }

    // Kiểm tra ký tự hợp lệ - cho phép chữ cái, chữ số và khoảng trắng
    // Regex này cho phép Unicode cho các ngôn ngữ khác nhau
    const validNameRegex = /^[\p{L}\p{N}\s]+$/u
    if (!validNameRegex.test(value)) {
      return "Tên ca chứa ký tự không hợp lệ."
    }

    // Kiểm tra trùng lặp
    const normalizedValue = value.trim().toLowerCase()
    const isDuplicate = shifts.some(
      (shift) => shift.id !== shiftId && shift.name.trim().toLowerCase() === normalizedValue,
    )
    if (isDuplicate) {
      return "Tên ca này đã tồn tại."
    }

    return null
  }

  // Validate departure time vs start time
  const validateDepartureTime = (depTime, startT) => {
    const depMinutes = timeToMinutes(depTime)
    let startMinutes = timeToMinutes(startT)

    // Xử lý trường hợp qua đêm
    if (depMinutes > startMinutes) {
      startMinutes += 24 * 60 // Thêm 24 giờ
    }

    // Kiểm tra khoảng cách tối thiểu 5 phút
    if (startMinutes - depMinutes < 5) {
      return "Giờ xuất phát phải trước giờ bắt đầu ít nhất 5 phút."
    }

    return null
  }

  // Validate start time vs office end time
  const validateStartAndOfficeEnd = (startT, officeEndT) => {
    const startMinutes = timeToMinutes(startT)
    let officeEndMinutes = timeToMinutes(officeEndT)

    // Xử lý trường hợp qua đêm
    if (officeEndMinutes < startMinutes) {
      officeEndMinutes += 24 * 60 // Thêm 24 giờ
    }

    // Kiểm tra start phải trước office end
    if (startMinutes >= officeEndMinutes) {
      return "Giờ bắt đầu phải trước giờ kết thúc HC."
    }

    // Kiểm tra khoảng thời gian làm việc tối thiểu 2 giờ
    if (officeEndMinutes - startMinutes < 120) {
      // 2 giờ = 120 phút
      return "Thời gian làm việc HC tối thiểu phải là 2 giờ."
    }

    return null
  }

  // Validate office end time vs end time
  const validateOfficeEndAndEnd = (officeEndT, endT) => {
    const officeEndMinutes = timeToMinutes(officeEndT)
    let endMinutes = timeToMinutes(endT)

    // Xử lý trường hợp qua đêm
    if (endMinutes < officeEndMinutes) {
      endMinutes += 24 * 60 // Thêm 24 giờ
    }

    // Kiểm tra end phải sau hoặc bằng office end
    if (endMinutes < officeEndMinutes) {
      return "Giờ kết thúc ca phải sau hoặc bằng giờ kết thúc HC."
    }

    // Nếu end sau office end (có OT), kiểm tra khoảng cách tối thiểu 30 phút
    if (endMinutes > officeEndMinutes && endMinutes - officeEndMinutes < 30) {
      return "Nếu có OT, giờ kết thúc ca phải sau giờ kết thúc HC ít nhất 30 phút."
    }

    return null
  }

  // Validate days applied
  const validateDaysApplied = (days) => {
    if (!days || days.length === 0) {
      return "Vui lòng chọn ít nhất một ngày áp dụng ca."
    }
    return null
  }

  // Validate all fields
  const validateAllFields = () => {
    const nameError = validateName(name)
    const departureTimeError = validateDepartureTime(departureTime, startTime)
    const startOfficeEndError = validateStartAndOfficeEnd(startTime, officeEndTime)
    const officeEndEndError = validateOfficeEndAndEnd(officeEndTime, endTime)
    const daysAppliedError = validateDaysApplied(daysApplied)

    setErrors({
      name: nameError,
      departureTime: departureTimeError,
      startTime: startOfficeEndError,
      officeEndTime: startOfficeEndError || officeEndEndError,
      endTime: officeEndEndError,
      daysApplied: daysAppliedError,
    })

    return !(nameError || departureTimeError || startOfficeEndError || officeEndEndError || daysAppliedError)
  }

  // Handle field changes with validation
  const handleNameChange = (value) => {
    setName(value)
    setErrors((prev) => ({ ...prev, name: validateName(value) }))
  }

  const handleDepartureTimeChange = (value) => {
    setDepartureTime(value)
    setErrors((prev) => ({ ...prev, departureTime: validateDepartureTime(value, startTime) }))
  }

  const handleStartTimeChange = (value) => {
    setStartTime(value)
    setErrors((prev) => ({
      ...prev,
      departureTime: validateDepartureTime(departureTime, value),
      startTime: validateStartAndOfficeEnd(value, officeEndTime),
    }))
  }

  const handleOfficeEndTimeChange = (value) => {
    setOfficeEndTime(value)
    setErrors((prev) => ({
      ...prev,
      startTime: validateStartAndOfficeEnd(startTime, value),
      officeEndTime: validateOfficeEndAndEnd(value, endTime),
    }))
  }

  const handleEndTimeChange = (value) => {
    setEndTime(value)
    setErrors((prev) => ({ ...prev, endTime: validateOfficeEndAndEnd(officeEndTime, value) }))
  }

  const handleSave = () => {
    if (!validateAllFields()) {
      return
    }

    const shiftData = {
      name,
      startTime,
      officeEndTime,
      endTime,
      departureTime,
      daysApplied,
      remindBeforeStart,
      remindAfterEnd,
      showPunch,
      breakMinutes,
      penaltyRoundingMinutes,
    }

    if (isNew) {
      addShift(shiftData)
    } else {
      updateShift(shiftId, shiftData)
    }

    navigation.goBack()
  }

  const toggleDay = (day) => {
    let newDaysApplied
    if (daysApplied.includes(day)) {
      newDaysApplied = daysApplied.filter((d) => d !== day)
    } else {
      newDaysApplied = [...daysApplied, day]
    }
    setDaysApplied(newDaysApplied)
    setErrors((prev) => ({ ...prev, daysApplied: validateDaysApplied(newDaysApplied) }))
  }

  // Kiểm tra xem có lỗi nào không để vô hiệu hóa nút Lưu
  const hasErrors = () => {
    return Object.values(errors).some((error) => error !== null)
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.shiftName")}</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          value={name}
          onChangeText={handleNameChange}
          placeholder={t("shifts.shiftName")}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.departureTime")}</Text>
        <TextInput
          style={[styles.input, errors.departureTime ? styles.inputError : null]}
          value={departureTime}
          onChangeText={handleDepartureTimeChange}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
        />
        {errors.departureTime && <Text style={styles.errorText}>{errors.departureTime}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.startTime")}</Text>
        <TextInput
          style={[styles.input, errors.startTime ? styles.inputError : null]}
          value={startTime}
          onChangeText={handleStartTimeChange}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
        />
        {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.officeEndTime")}</Text>
        <TextInput
          style={[styles.input, errors.officeEndTime ? styles.inputError : null]}
          value={officeEndTime}
          onChangeText={handleOfficeEndTimeChange}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
        />
        {errors.officeEndTime && <Text style={styles.errorText}>{errors.officeEndTime}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.maxEndTime")}</Text>
        <TextInput
          style={[styles.input, errors.endTime ? styles.inputError : null]}
          value={endTime}
          onChangeText={handleEndTimeChange}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
        />
        {errors.endTime && <Text style={styles.errorText}>{errors.endTime}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.breakMinutes")}</Text>
        <TextInput
          style={styles.input}
          value={breakMinutes.toString()}
          onChangeText={(text) => setBreakMinutes(Number.parseInt(text) || 0)}
          placeholder="Nhập số phút"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.remindBeforeStart")}</Text>
        <TextInput
          style={styles.input}
          value={remindBeforeStart.toString()}
          onChangeText={(text) => setRemindBeforeStart(Number.parseInt(text) || 0)}
          placeholder="Nhập số phút"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.remindAfterEnd")}</Text>
        <TextInput
          style={styles.input}
          value={remindAfterEnd.toString()}
          onChangeText={(text) => setRemindAfterEnd(Number.parseInt(text) || 0)}
          placeholder="Nhập số phút"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.penaltyRoundingMinutes")}</Text>
        <TextInput
          style={styles.input}
          value={penaltyRoundingMinutes.toString()}
          onChangeText={(text) => setPenaltyRoundingMinutes(Number.parseInt(text) || 0)}
          placeholder="Nhập số phút"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.requirePunch")}</Text>
        <View style={styles.switchContainer}>
          <Switch
            value={showPunch}
            onValueChange={setShowPunch}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={showPunch ? COLORS.accent : COLORS.white}
          />
          <Text style={styles.switchLabel}>{showPunch ? t("common.yes") : t("common.no")}</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("shifts.daysApplied")}</Text>
        <View style={styles.daysContainer}>
          {[
            { day: "Mon", label: t("shifts.days.mon") },
            { day: "Tue", label: t("shifts.days.tue") },
            { day: "Wed", label: t("shifts.days.wed") },
            { day: "Thu", label: t("shifts.days.thu") },
            { day: "Fri", label: t("shifts.days.fri") },
            { day: "Sat", label: t("shifts.days.sat") },
            { day: "Sun", label: t("shifts.days.sun") },
          ].map(({ day, label }) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, daysApplied.includes(day) ? styles.dayButtonActive : {}]}
              onPress={() => toggleDay(day)}
            >
              <Text style={[styles.dayButtonText, daysApplied.includes(day) ? styles.dayButtonTextActive : {}]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.daysApplied && <Text style={styles.errorText}>{errors.daysApplied}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, hasErrors() ? styles.disabledButton : {}]}
        onPress={handleSave}
        disabled={hasErrors()}
      >
        <Text style={styles.saveButtonText}>{t("common.save")}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: 16,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
  },
  dayButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  dayButtonTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default ShiftDetailScreen
