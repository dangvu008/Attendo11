import * as Notifications from "expo-notifications"
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import { getActiveShift, getAttendanceLogByType, getNotes, getShiftById } from "./database"
import { formatDate } from "./dateUtils"
import {
  scheduleAlarm,
  cancelAlarmsByType,
  cancelAllAlarms,
  initializeAlarmSystem,
  triggerAlarmNow,
} from "./alarmUtils"

// Định nghĩa task name cho background fetch
const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK"

// Cấu hình notifications
export const configureNotifications = async () => {
  try {
    // Yêu cầu quyền
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== "granted") {
      console.log("Notification permissions not granted")
      return false
    }

    // Cấu hình cách thông báo xuất hiện khi ứng dụng ở foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })

    // Khởi tạo hệ thống báo thức
    await initializeAlarmSystem()

    // Đăng ký background task
    await registerBackgroundNotificationTask()

    return true
  } catch (error) {
    console.error("Error configuring notifications:", error)
    return false
  }
}

// Đăng ký background task
const registerBackgroundNotificationTask = async () => {
  try {
    // Kiểm tra xem task đã được đăng ký chưa
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)

    if (!isRegistered) {
      // Định nghĩa task
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
        try {
          // Kiểm tra và lên lịch thông báo
          const result = await scheduleNotificationsForActiveShift()
          return result ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData
        } catch (error) {
          console.error("Error in background task:", error)
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
      })

      // Đăng ký background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 phút
        stopOnTerminate: false,
        startOnBoot: true,
      })
    }
  } catch (error) {
    console.error("Error registering background task:", error)
  }
}

// Lên lịch báo thức xuất phát
export const scheduleDepartureNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo xuất phát hiện tại
    await cancelAlarmsByType("departure")

    // Lấy ngày hiện tại
    const today = new Date()
    const todayString = formatDate(today)

    // Kiểm tra xem người dùng đã bấm "Đi làm" chưa
    const goWorkLog = await getAttendanceLogByType(todayString, "go_work")
    if (goWorkLog) {
      console.log("User already went to work, not scheduling departure notification")
      return null
    }

    // Phân tích thời gian xuất phát
    const [hours, minutes] = shift.departureTime.split(":").map(Number)

    // Tạo thời gian kích hoạt thông báo
    const trigger = new Date()
    trigger.setHours(hours, minutes, 0, 0)

    // Nếu thời gian đã qua, lên lịch cho ngày mai
    if (trigger <= new Date()) {
      // Kiểm tra xem ngày mai có phải là ngày áp dụng ca làm việc không
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDay = tomorrow.getDay() // 0 = Sunday, 1 = Monday, ...

      // Nếu ca làm việc không áp dụng cho ngày mai, không lên lịch
      if (!shift.daysApplied[tomorrowDay]) {
        console.log(`Tomorrow (day ${tomorrowDay}) is not in shift's applied days, not scheduling`)
        return null
      }

      trigger.setDate(trigger.getDate() + 1)
    }

    // Lên lịch báo thức thay vì thông báo thông thường
    const alarmId = await scheduleAlarm({
      title: "Đến giờ đi làm",
      body: `Đã đến giờ xuất phát đi làm cho ca ${shift.name}`,
      triggerTime: trigger,
      type: "departure",
      data: { shiftId: shift.id },
    })

    console.log(`Scheduled departure alarm for ${trigger.toLocaleString()}, ID: ${alarmId}`)
    return alarmId
  } catch (error) {
    console.error("Error scheduling departure notification:", error)
    return null
  }
}

// Lên lịch báo thức chấm công vào
export const scheduleCheckInNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo chấm công vào hiện tại
    await cancelAlarmsByType("check-in")

    // Lấy ngày hiện tại
    const today = new Date()
    const todayString = formatDate(today)

    // Kiểm tra xem người dùng đã chấm công vào chưa
    const checkInLog = await getAttendanceLogByType(todayString, "check_in")
    if (checkInLog) {
      console.log("User already checked in, not scheduling check-in notification")
      return null
    }

    // Phân tích thời gian bắt đầu
    const [hours, minutes] = shift.startTime.split(":").map(Number)

    // Tạo thời gian kích hoạt thông báo (startTime - remindBeforeStart)
    const trigger = new Date()
    trigger.setHours(hours, minutes, 0, 0)
    trigger.setMinutes(trigger.getMinutes() - shift.remindBeforeStart)

    // Nếu thời gian đã qua, lên lịch cho ngày mai
    if (trigger <= new Date()) {
      // Kiểm tra xem ngày mai có phải là ngày áp dụng ca làm việc không
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDay = tomorrow.getDay() // 0 = Sunday, 1 = Monday, ...

      // Nếu ca làm việc không áp dụng cho ngày mai, không lên lịch
      if (!shift.daysApplied[tomorrowDay]) {
        console.log(`Tomorrow (day ${tomorrowDay}) is not in shift's applied days, not scheduling`)
        return null
      }

      trigger.setDate(trigger.getDate() + 1)
    }

    // Lên lịch báo thức thay vì thông báo thông thường
    const alarmId = await scheduleAlarm({
      title: "Sắp đến giờ chấm công vào",
      body: `Còn ${shift.remindBeforeStart} phút nữa đến giờ chấm công vào cho ca ${shift.name}`,
      triggerTime: trigger,
      type: "check-in",
      data: { shiftId: shift.id },
    })

    console.log(`Scheduled check-in alarm for ${trigger.toLocaleString()}, ID: ${alarmId}`)
    return alarmId
  } catch (error) {
    console.error("Error scheduling check-in notification:", error)
    return null
  }
}

// Lên lịch báo thức chấm công ra
export const scheduleCheckOutNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo chấm công ra hiện tại
    await cancelAlarmsByType("check-out")

    // Lấy ngày hiện tại
    const today = new Date()
    const todayString = formatDate(today)

    // Kiểm tra xem người dùng đã chấm công ra chưa
    const checkOutLog = await getAttendanceLogByType(todayString, "check_out")
    if (checkOutLog) {
      console.log("User already checked out, not scheduling check-out notification")
      return null
    }

    // Phân tích thời gian kết thúc
    const [hours, minutes] = shift.endTime.split(":").map(Number)

    // Tạo thời gian kích hoạt thông báo
    const trigger = new Date()
    trigger.setHours(hours, minutes, 0, 0)

    // Nếu thời gian đã qua, lên lịch cho ngày mai
    if (trigger <= new Date()) {
      // Kiểm tra xem ngày mai có phải là ngày áp dụng ca làm việc không
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDay = tomorrow.getDay() // 0 = Sunday, 1 = Monday, ...

      // Nếu ca làm việc không áp dụng cho ngày mai, không lên lịch
      if (!shift.daysApplied[tomorrowDay]) {
        console.log(`Tomorrow (day ${tomorrowDay}) is not in shift's applied days, not scheduling`)
        return null
      }

      trigger.setDate(trigger.getDate() + 1)
    }

    // Lên lịch báo thức thay vì thông báo thông thường
    const alarmId = await scheduleAlarm({
      title: "Đã đến giờ chấm công ra",
      body: `Đã đến giờ kết thúc ca ${shift.name}, hãy chấm công ra`,
      triggerTime: trigger,
      type: "check-out",
      data: { shiftId: shift.id },
    })

    console.log(`Scheduled check-out alarm for ${trigger.toLocaleString()}, ID: ${alarmId}`)
    return alarmId
  } catch (error) {
    console.error("Error scheduling check-out notification:", error)
    return null
  }
}

// Lên lịch tất cả thông báo cho một ca làm việc
export const scheduleAllNotifications = async (shift) => {
  if (!shift) return

  try {
    // Kiểm tra xem ca làm việc có áp dụng cho hôm nay không
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, ...

    // Chuyển đổi daysApplied thành số ngày
    let daysApplied = []
    if (Array.isArray(shift.daysApplied)) {
      // Nếu là mảng boolean
      if (typeof shift.daysApplied[0] === "boolean") {
        daysApplied = shift.daysApplied.map((applied, index) => (applied ? index : null)).filter((day) => day !== null)
      }
      // Nếu là mảng string (Sun, Mon, Tue, ...)
      else {
        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
        daysApplied = shift.daysApplied.map((day) => dayMap[day]).filter((day) => day !== undefined)
      }
    }

    // Nếu hôm nay không nằm trong daysApplied, không lên lịch thông báo
    if (!daysApplied.includes(today)) {
      console.log(`Today (day ${today}) is not in shift's applied days: ${JSON.stringify(daysApplied)}`)
      return
    }

    // Lên lịch tất cả thông báo
    const departureId = await scheduleDepartureNotification(shift)
    const checkInId = await scheduleCheckInNotification(shift)
    const checkOutId = await scheduleCheckOutNotification(shift)

    // Lên lịch thông báo cho các ghi chú liên quan đến ca làm việc này
    await scheduleNoteNotifications(shift.id)

    return {
      departureId,
      checkInId,
      checkOutId,
    }
  } catch (error) {
    console.error("Error scheduling all notifications:", error)
    return null
  }
}

// Lên lịch thông báo cho các ghi chú
export const scheduleNoteNotifications = async (shiftId = null) => {
  try {
    // Lấy tất cả ghi chú
    const notes = await getNotes()
    if (!notes || notes.length === 0) return []

    // Lấy ngày hiện tại và ngày trong tuần
    const today = new Date()
    const dayOfWeek = today.toLocaleString("en-US", { weekday: "short" }) // 'Sun', 'Mon', etc.
    const todayDay = today.getDay() // 0 = Sunday, 1 = Monday, ...

    // Lọc ghi chú cần thông báo
    const notesToNotify = []

    for (const note of notes) {
      let shouldNotify = false

      // Trường hợp 1: Ghi chú liên kết với ca làm việc cụ thể
      if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
        // Nếu không có shiftId được chỉ định, kiểm tra tất cả ca
        if (!shiftId) {
          // Kiểm tra từng ca liên kết
          for (const id of note.associatedShiftIds) {
            const shift = await getShiftById(id)
            if (shift && shift.daysApplied && shift.daysApplied[todayDay]) {
              shouldNotify = true
              break
            }
          }
        }
        // Nếu có shiftId được chỉ định, chỉ kiểm tra ca đó
        else if (note.associatedShiftIds.includes(shiftId)) {
          const shift = await getShiftById(shiftId)
          if (shift && shift.daysApplied && shift.daysApplied[todayDay]) {
            shouldNotify = true
          }
        }
      }
      // Trường hợp 2: Ghi chú không liên kết với ca nào, sử dụng explicitReminderDays
      else if (
        (!note.associatedShiftIds || note.associatedShiftIds.length === 0) &&
        note.explicitReminderDays &&
        note.explicitReminderDays.includes(dayOfWeek)
      ) {
        shouldNotify = true
      }

      if (shouldNotify) {
        notesToNotify.push(note)
      }
    }

    // Lên lịch thông báo cho các ghi chú đã lọc
    const notificationIds = []

    for (const note of notesToNotify) {
      // Phân tích thời gian nhắc nhở
      const reminderDate = new Date(note.reminderTime)
      const hours = reminderDate.getHours()
      const minutes = reminderDate.getMinutes()

      // Tạo thời gian kích hoạt thông báo
      const trigger = new Date()
      trigger.setHours(hours, minutes, 0, 0)

      // Nếu thời gian đã qua, không lên lịch
      if (trigger <= new Date()) {
        continue
      }

      // Lên lịch báo thức với ưu tiên cao
      const alarmId = await scheduleAlarm({
        title: note.title,
        body: note.content,
        triggerTime: trigger,
        type: "note",
        data: { noteId: note.id },
      })

      console.log(`Scheduled note alarm for ${trigger.toLocaleString()}, ID: ${alarmId}`)
      notificationIds.push(alarmId)
    }

    return notificationIds
  } catch (error) {
    console.error("Error scheduling note notifications:", error)
    return []
  }
}

// Hủy thông báo theo loại
export const cancelNotificationsByType = async (type) => {
  try {
    return await cancelAlarmsByType(type)
  } catch (error) {
    console.error(`Error canceling ${type} notifications:`, error)
    return false
  }
}

// Hủy tất cả thông báo
export const cancelAllNotifications = async () => {
  try {
    return await cancelAllAlarms()
  } catch (error) {
    console.error("Error canceling all notifications:", error)
    return false
  }
}

// Lên lịch thông báo dựa trên ca làm việc hiện tại
export const scheduleNotificationsForActiveShift = async () => {
  try {
    // Lấy ca làm việc hiện tại
    const activeShift = await getActiveShift()
    if (!activeShift) {
      console.log("No active shift found, not scheduling notifications")
      return false
    }

    // Lên lịch thông báo
    const result = await scheduleAllNotifications(activeShift)
    return !!result
  } catch (error) {
    console.error("Error scheduling notifications for active shift:", error)
    return false
  }
}

// Xử lý thông báo khi nhận được
export const handleReceivedNotification = async (notification) => {
  try {
    const { type, shiftId, noteId } = notification.request.content.data || {}

    if (!type) return

    // Ghi log thông báo đã nhận
    console.log(`Received notification of type: ${type}`)

    // Kích hoạt báo thức ngay lập tức nếu là thông báo quan trọng
    if (type === "departure" || type === "check-in" || type === "check-out") {
      await triggerAlarmNow({
        title: notification.request.content.title,
        body: notification.request.content.body,
        type,
        data: { shiftId, noteId },
      })
    }

    return true
  } catch (error) {
    console.error("Error handling received notification:", error)
    return false
  }
}

// Thiết lập listener cho thông báo
export const setupNotificationListeners = () => {
  // Listener cho thông báo khi ứng dụng đang chạy
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    handleReceivedNotification(notification)
  })

  // Listener cho thông báo khi người dùng tương tác
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { type } = response.notification.request.content.data || {}
    console.log(`User interacted with notification of type: ${type}`)
  })

  // Trả về hàm cleanup
  return {
    removeNotificationListeners: () => {
      foregroundSubscription.remove()
      responseSubscription.remove()
    },
  }
}

