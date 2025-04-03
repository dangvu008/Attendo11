import * as Notifications from "expo-notifications"
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import { getActiveShift, getAttendanceLogByType } from "./database"
import { formatDate } from "./dateUtils"

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

// Lên lịch thông báo xuất phát
export const scheduleDepartureNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo xuất phát hiện tại
    await cancelNotificationsByType("departure")

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

    // Lên lịch thông báo
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Đến giờ đi làm",
        body: `Đã đến giờ xuất phát đi làm cho ca ${shift.name}`,
        data: { type: "departure", shiftId: shift.id },
        sound: true,
      },
      trigger,
    })

    console.log(`Scheduled departure notification for ${trigger.toLocaleString()}, ID: ${notificationId}`)
    return notificationId
  } catch (error) {
    console.error("Error scheduling departure notification:", error)
    return null
  }
}

// Lên lịch thông báo chấm công vào
export const scheduleCheckInNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo chấm công vào hiện tại
    await cancelNotificationsByType("check-in")

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

    // Lên lịch thông báo
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sắp đến giờ chấm công vào",
        body: `Còn ${shift.remindBeforeStart} phút nữa đến giờ chấm công vào cho ca ${shift.name}`,
        data: { type: "check-in", shiftId: shift.id },
        sound: true,
      },
      trigger,
    })

    console.log(`Scheduled check-in notification for ${trigger.toLocaleString()}, ID: ${notificationId}`)
    return notificationId
  } catch (error) {
    console.error("Error scheduling check-in notification:", error)
    return null
  }
}

// Lên lịch thông báo chấm công ra
export const scheduleCheckOutNotification = async (shift) => {
  if (!shift) return null

  try {
    // Hủy thông báo chấm công ra hiện tại
    await cancelNotificationsByType("check-out")

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

    // Lên lịch thông báo
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Đã đến giờ chấm công ra",
        body: `Đã đến giờ kết thúc ca ${shift.name}, hãy chấm công ra`,
        data: { type: "check-out", shiftId: shift.id },
        sound: true,
      },
      trigger,
    })

    console.log(`Scheduled check-out notification for ${trigger.toLocaleString()}, ID: ${notificationId}`)
    return notificationId
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

// Hủy thông báo theo loại
export const cancelNotificationsByType = async (type) => {
  try {
    // Lấy tất cả thông báo đã lên lịch
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Lọc thông báo theo loại
    const notificationsToCancel = scheduledNotifications.filter(
      (notification) => notification.content.data?.type === type,
    )

    // Hủy từng thông báo
    for (const notification of notificationsToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      console.log(`Canceled ${type} notification: ${notification.identifier}`)
    }

    return true
  } catch (error) {
    console.error(`Error canceling ${type} notifications:`, error)
    return false
  }
}

// Hủy tất cả thông báo
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    console.log("Canceled all scheduled notifications")
    return true
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
    const { type, shiftId } = notification.request.content.data || {}

    if (!type) return

    // Ghi log thông báo đã nhận
    console.log(`Received notification of type: ${type}`)

    // Có thể thêm logic xử lý khác tùy thuộc vào loại thông báo

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
  return () => {
    foregroundSubscription.remove()
    responseSubscription.remove()
  }
}

