"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { useAppContext } from "../context/AppContext"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useTranslation } from "../i18n/useTranslation"

const NoteForm = ({ visible, onClose, noteToEdit = null }) => {
  const { shifts, addNote, updateNote, isNoteDuplicate } = useAppContext()
  const { t } = useTranslation()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [reminderTime, setReminderTime] = useState("08:00")
  const [associatedShiftIds, setAssociatedShiftIds] = useState([])
  const [explicitReminderDays, setExplicitReminderDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"])

  const [errors, setErrors] = useState({})
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Khởi tạo form khi mở
  useEffect(() => {
    if (visible) {
      if (noteToEdit) {
        // Chế độ sửa
        setTitle(noteToEdit.title || "")
        setContent(noteToEdit.content || "")
        setReminderTime(noteToEdit.reminderTime || "08:00")
        setAssociatedShiftIds(noteToEdit.associatedShiftIds || [])
        setExplicitReminderDays(noteToEdit.explicitReminderDays || ["Mon", "Tue", "Wed", "Thu", "Fri"])
      } else {
        // Chế độ thêm mới
        resetForm()
      }
      setErrors({})
    }
  }, [visible, noteToEdit])

  // Reset form
  const resetForm = () => {
    setTitle("")
    setContent("")
    setReminderTime("08:00")
    setAssociatedShiftIds([])
    setExplicitReminderDays(["Mon", "Tue", "Wed", "Thu", "Fri"])
    setErrors({})
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Kiểm tra tiêu đề
    if (!title.trim()) {
      newErrors.title = t("notes.validation.titleRequired")
    } else if (title.length > 100) {
      newErrors.title = t("notes.validation.titleRequired")
    }

    // Kiểm tra nội dung
    if (!content.trim()) {
      newErrors.content = t("notes.validation.contentRequired")
    } else if (content.length > 300) {
      newErrors.content = t("notes.validation.contentRequired")
    }

    // Kiểm tra thời gian nhắc nhở
    if (!reminderTime) {
      newErrors.reminderTime = t("notes.validation.reminderTimeRequired")
    }

    // Kiểm tra ngày nhắc nhở (nếu không có ca liên kết)
    if (associatedShiftIds.length === 0 && explicitReminderDays.length === 0) {
      newErrors.explicitReminderDays = t("notes.validation.reminderDaysRequired")
    }

    // Kiểm tra trùng lặp
    if (title.trim() && content.trim() && isNoteDuplicate(title, content, noteToEdit?.id)) {
      newErrors.duplicate = t("notes.validation.duplicateNote")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Xử lý lưu ghi chú
  const handleSave = () => {
    if (!validateForm()) return

    Alert.alert(t("common.confirm"), t("notes.saveConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.save"),
        onPress: () => {
          const noteData = {
            title: title.trim(),
            content: content.trim(),
            reminderTime,
            associatedShiftIds,
            explicitReminderDays: associatedShiftIds.length > 0 ? [] : explicitReminderDays,
          }

          if (noteToEdit) {
            updateNote(noteToEdit.id, noteData)
          } else {
            addNote(noteData)
          }

          onClose()
        },
      },
    ])
  }

  // Xử lý thay đổi thời gian
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === "ios")

    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0")
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0")
      setReminderTime(`${hours}:${minutes}`)
    }
  }

  // Xử lý toggle ca làm việc
  const toggleShift = (shiftId) => {
    if (associatedShiftIds.includes(shiftId)) {
      setAssociatedShiftIds(associatedShiftIds.filter((id) => id !== shiftId))
    } else {
      setAssociatedShiftIds([...associatedShiftIds, shiftId])
    }
  }

  // Xử lý toggle ngày nhắc nhở
  const toggleDay = (day) => {
    if (explicitReminderDays.includes(day)) {
      setExplicitReminderDays(explicitReminderDays.filter((d) => d !== day))
    } else {
      setExplicitReminderDays([...explicitReminderDays, day])
    }
  }

  // Hiển thị time picker
  const showTimePickerModal = () => {
    setShowTimePicker(true)
  }

  // Định dạng thời gian hiển thị
  const formatDisplayTime = (timeString) => {
    if (!timeString) return ""

    const [hours, minutes] = timeString.split(":").map(Number)

    if (isNaN(hours) || isNaN(minutes)) return timeString

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{noteToEdit ? t("notes.editNote") : t("notes.addNote")}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Tiêu đề */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("notes.title")}</Text>
              <TextInput
                style={[styles.input, errors.title ? styles.inputError : null]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("notes.title")}
                maxLength={100}
              />
              <View style={styles.inputFooter}>
                {errors.title ? (
                  <Text style={styles.errorText}>{errors.title}</Text>
                ) : (
                  <Text style={styles.charCount}>{t("notes.characterCount", { current: title.length, max: 100 })}</Text>
                )}
              </View>
            </View>

            {/* Nội dung */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("notes.content")}</Text>
              <TextInput
                style={[styles.textArea, errors.content ? styles.inputError : null]}
                value={content}
                onChangeText={setContent}
                placeholder={t("notes.content")}
                multiline
                numberOfLines={4}
                maxLength={300}
                textAlignVertical="top"
              />
              <View style={styles.inputFooter}>
                {errors.content ? (
                  <Text style={styles.errorText}>{errors.content}</Text>
                ) : (
                  <Text style={styles.charCount}>
                    {t("notes.characterCount", { current: content.length, max: 300 })}
                  </Text>
                )}
              </View>
            </View>

            {/* Thời gian nhắc nhở */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("notes.reminderTime")}</Text>
              <TouchableOpacity
                style={[styles.timePicker, errors.reminderTime ? styles.inputError : null]}
                onPress={showTimePickerModal}
              >
                <Text style={styles.timePickerText}>{formatDisplayTime(reminderTime)}</Text>
                <MaterialIcons name="access-time" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.reminderTime && <Text style={styles.errorText}>{errors.reminderTime}</Text>}

              {showTimePicker && (
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = reminderTime.split(":").map(Number)
                    const date = new Date()
                    date.setHours(hours, minutes, 0, 0)
                    return date
                  })()}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {/* Ca làm việc liên kết */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("notes.associatedShifts")}</Text>
              {shifts.length > 0 ? (
                <View style={styles.shiftsContainer}>
                  {shifts.map((shift) => (
                    <View key={shift.id} style={styles.shiftItem}>
                      <Text style={styles.shiftName}>{shift.name}</Text>
                      <Switch
                        value={associatedShiftIds.includes(shift.id)}
                        onValueChange={() => toggleShift(shift.id)}
                        trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                        thumbColor={associatedShiftIds.includes(shift.id) ? COLORS.accent : COLORS.white}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noShiftsText}>{t("shifts.noShifts")}</Text>
              )}
            </View>

            {/* Ngày nhắc nhở (nếu không theo ca) */}
            {associatedShiftIds.length === 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("notes.reminderDays")}</Text>
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
                      style={[styles.dayButton, explicitReminderDays.includes(day) ? styles.dayButtonActive : {}]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          explicitReminderDays.includes(day) ? styles.dayButtonTextActive : {},
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.explicitReminderDays && <Text style={styles.errorText}>{errors.explicitReminderDays}</Text>}
              </View>
            )}

            {/* Lỗi trùng lặp */}
            {errors.duplicate && <Text style={[styles.errorText, styles.duplicateError]}>{errors.duplicate}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, Object.keys(errors).length > 0 ? styles.disabledButton : {}]}
              onPress={handleSave}
              disabled={Object.keys(errors).length > 0}
            >
              <Text style={styles.saveButtonText}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: "90%",
    maxHeight: "90%",
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  formContainer: {
    padding: 16,
    maxHeight: "70%",
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
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: 16,
    minHeight: 100,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  duplicateError: {
    textAlign: "center",
    marginBottom: 16,
  },
  timePicker: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timePickerText: {
    fontSize: 16,
    color: COLORS.text,
  },
  shiftsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: "hidden",
  },
  shiftItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  shiftName: {
    fontSize: 16,
    color: COLORS.text,
  },
  noShiftsText: {
    color: COLORS.gray,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
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
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    alignItems: "center",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    alignItems: "center",
    marginRight: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButtonText: {
    color: COLORS.darkGray,
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
})

export default NoteForm
