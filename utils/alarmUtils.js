import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import {
  Platform,
  Vibration,
  Alert,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import * as KeepAwake from "expo-keep-awake";
import { STORAGE_KEYS } from "./database";
import React, { useEffect } from "react";
import { logTaskExecution } from "./taskDebugUtils";

/**
 * Alarm Utilities Module
 *
 * This module provides functions for creating and managing alarms in the Attendo app.
 * It uses Expo Notifications for notification features and Vibration for feedback.
 */

// Define task names
export const BACKGROUND_ALARM_TASK = "BACKGROUND_ALARM_TASK";
const ALARM_CHANNEL_ID = "attendo-alarms";

// Sound objects
const alarmSound = null;
let isPlaying = false;
let activeAlarmId = null;
const vibrationInterval = null;

/**
 * Initialize alarm system
 *
 * @returns {Promise<boolean>} - True if initialization was successful
 */
export const initializeAlarmSystem = async () => {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Notification permissions not granted");
      return false;
    }

    // Create notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: "Attendo Alarms",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6a5acd",
      });
    }

    // Register background task
    await registerBackgroundAlarmTask();

    return true;
  } catch (error) {
    console.error("Error initializing alarm system:", error);
    return false;
  }
};

/**
 * Register background task for alarms
 *
 * @returns {Promise<void>}
 */
const registerBackgroundAlarmTask = async () => {
  try {
    // Kiểm tra xem task đã được đăng ký chưa
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_ALARM_TASK
    );

    if (!isRegistered) {
      // Định nghĩa task
      TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
        try {
          console.log("Background Alarm Task đang chạy...");

          // Kiểm tra và dọn dẹp thông báo trùng lặp
          await cleanupDuplicateNotifications();

          // Kiểm tra và lên lịch cảnh báo
          const result = await checkAndScheduleAlarms();

          // Ghi nhận lịch sử chạy task
          await logTaskExecution(BACKGROUND_ALARM_TASK, {
            result,
            notificationsCount: (
              await Notifications.getAllScheduledNotificationsAsync()
            ).length,
          });

          return result
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.error("Lỗi trong background alarm task:", error);
          await logTaskExecution(BACKGROUND_ALARM_TASK, {
            error: error.message,
          });
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Đăng ký background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: 15 * 60, // 15 phút
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log("Đã đăng ký Background Alarm Task");
    } else {
      console.log("Background Alarm Task đã được đăng ký trước đó");
    }
  } catch (error) {
    console.error("Lỗi khi đăng ký background alarm task:", error);
  }
};

/**
 * Check for upcoming alarms and schedule them
 *
 * @returns {Promise<boolean>} - True if alarms were scheduled
 */
const checkAndScheduleAlarms = async () => {
  // Implementation will depend on your app's specific needs
  // This is a placeholder for the actual implementation
  return false;
};

/**
 * Schedule an alarm
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {Date} options.triggerTime - When to trigger the alarm
 * @param {string} options.type - Alarm type (e.g., 'departure', 'check-in', 'check-out')
 * @param {Object} options.data - Additional data to include with the alarm
 * @param {string} options.identifier - Optional unique identifier for the notification
 * @returns {Promise<string>} - Alarm ID
 */
export const scheduleAlarm = async ({
  title,
  body,
  triggerTime,
  type,
  data = {},
  identifier = null,
}) => {
  try {
    // Get user settings
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const soundEnabled =
      settings.soundEnabled !== undefined ? settings.soundEnabled : true;
    const vibrationEnabled =
      settings.vibrationEnabled !== undefined
        ? settings.vibrationEnabled
        : true;

    // Calculate trigger time in seconds
    const now = new Date();
    const triggerAt = triggerTime.getTime();

    // If trigger time is in the past, don't schedule
    if (triggerAt <= now.getTime()) {
      console.log("Alarm trigger time is in the past, not scheduling");
      return null;
    }

    // If an identifier is provided, cancel any existing notification with this ID
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }

    // Schedule with Expo Notifications
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundEnabled,
        vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
        priority: "high",
        data: {
          type,
          alarmType: "attendo_alarm",
          ...data,
        },
      },
      trigger: {
        date: triggerAt,
      },
      identifier: identifier || `${type}-${Date.now()}`,
    });

    console.log(
      `Scheduled alarm for ${triggerTime.toLocaleString()}, ID: ${notificationId}`
    );
    return notificationId;
  } catch (error) {
    console.error("Error scheduling alarm:", error);
    return null;
  }
};

/**
 * Trigger an alarm immediately
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {string} options.type - Alarm type
 * @param {Object} options.data - Additional data
 * @returns {Promise<string>} - Alarm ID
 */
export const triggerAlarmNow = async ({ title, body, type, data = {} }) => {
  try {
    // Get user settings
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const soundEnabled =
      settings.soundEnabled !== undefined ? settings.soundEnabled : true;
    const vibrationEnabled =
      settings.vibrationEnabled !== undefined
        ? settings.vibrationEnabled
        : true;

    // Create a unique ID for this alarm
    const alarmId = Date.now().toString();
    activeAlarmId = alarmId;

    // Keep screen awake while alarm is active
    KeepAwake.activateKeepAwake();

    // Start vibration if enabled
    if (vibrationEnabled) {
      // Vibrate in a pattern (500ms on, 500ms off)
      Vibration.vibrate([0, 500, 500], true);
    }

    // Show notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundEnabled,
        vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
        priority: "high",
        data: {
          type,
          alarmType: "attendo_alarm",
          alarmId,
          ...data,
        },
      },
      trigger: null, // Immediate notification
    });

    return identifier;
  } catch (error) {
    console.error("Error triggering alarm:", error);
    return null;
  }
};

/**
 * Stop the currently playing alarm
 *
 * @returns {Promise<boolean>} - True if alarm was stopped
 */
export const stopAlarm = async () => {
  try {
    // Stop sound
    if (alarmSound && isPlaying) {
      // In a real app, you would stop the sound here
      isPlaying = false;
    }

    // Stop vibration
    Vibration.cancel();

    // Allow screen to sleep again
    KeepAwake.deactivateKeepAwake();

    // Cancel the notification if it exists
    if (activeAlarmId) {
      await Notifications.dismissNotificationAsync(activeAlarmId);
      activeAlarmId = null;
    }

    return true;
  } catch (error) {
    console.error("Error stopping alarm:", error);
    return false;
  }
};

/**
 * Cancel a scheduled alarm by ID
 *
 * @param {string} alarmId - ID of the alarm to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarm = async (alarmId) => {
  try {
    if (!alarmId) return false;

    await Notifications.cancelScheduledNotificationAsync(alarmId);
    console.log(`Canceled alarm: ${alarmId}`);
    return true;
  } catch (error) {
    console.error(`Error canceling alarm ${alarmId}:`, error);
    return false;
  }
};

/**
 * Cancel all alarms of a specific type
 *
 * @param {string} type - Type of alarms to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarmsByType = async (type) => {
  try {
    console.log(`Bắt đầu hủy thông báo loại: ${type}`);

    // Lấy tất cả thông báo đã lên lịch
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    let cancelCount = 0;

    // Lọc thông báo theo loại và hủy chúng
    for (const notification of notifications) {
      const notificationType = notification.content?.data?.type;

      if (notificationType === type) {
        console.log(
          `Hủy thông báo ID: ${notification.identifier}, loại: ${type}`
        );
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
        cancelCount++;

        // Đồng thời xóa ID khỏi bảng ánh xạ
        const date = notification.content?.data?.date;
        if (date) {
          await removeNotificationId(type, date);
        }
      }
    }

    console.log(`Đã hủy ${cancelCount} thông báo loại: ${type}`);
    return cancelCount;
  } catch (error) {
    console.error(`Lỗi khi hủy thông báo loại ${type}:`, error);
    return 0;
  }
};

/**
 * Cancel all scheduled alarms
 *
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAllAlarms = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Canceled all alarms");
    return true;
  } catch (error) {
    console.error("Error canceling all alarms:", error);
    return false;
  }
};

/**
 * Handle alarm response
 *
 * @param {Object} notification - Notification object
 * @returns {Promise<boolean>} - True if handled successfully
 */
export const handleAlarmResponse = async (notification) => {
  try {
    const { type, alarmId } = notification.request.content.data || {};

    if (!type) return false;

    // Stop the alarm
    await stopAlarm();

    // Log the response time
    console.log(`Alarm response for ${type} at ${new Date().toISOString()}`);

    return true;
  } catch (error) {
    console.error("Error handling alarm response:", error);
    return false;
  }
};

/**
 * Schedule notifications for active shift
 *
 * @returns {Promise<boolean>} - True if notifications were scheduled successfully
 */
export const scheduleNotificationsForActiveShift = async () => {
  try {
    // 1. Hủy tất cả thông báo hiện tại
    console.log("Hủy thông báo cũ trước khi lên lịch mới");
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Lấy ca làm việc hiện tại
    const shift = await getActiveShift();
    if (!shift) {
      console.log("Không tìm thấy ca làm việc, không lên lịch thông báo");
      return false;
    }

    // 3. Kiểm tra xem hôm nay có phải ngày làm việc không
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2...

    if (!shift.daysApplied[dayOfWeek]) {
      console.log(
        `Hôm nay (thứ ${dayOfWeek}) không nằm trong lịch ca làm việc`
      );
      return false;
    }

    // 4. Tạo ID duy nhất cho mỗi loại thông báo
    const shiftId = shift.id || "default";
    const dateStr = today.toISOString().split("T")[0];

    const departureId = `departure-${shiftId}-${dateStr}`;
    const checkInId = `checkin-${shiftId}-${dateStr}`;
    const checkOutId = `checkout-${shiftId}-${dateStr}`;

    // 5. Lên lịch các thông báo với ID cố định
    await scheduleDepartureNotification(shift, departureId);
    await scheduleCheckInNotification(shift, checkInId);
    await scheduleCheckOutNotification(shift, checkOutId);

    // 6. Kiểm tra lại sau khi lên lịch
    await checkScheduledNotifications();

    return true;
  } catch (error) {
    console.error("Lỗi khi lên lịch thông báo:", error);
    return false;
  }
};

/**
 * Schedule departure notification
 *
 * @param {Object} shift - Shift object
 * @param {string} identifier - Fixed identifier for the notification
 * @returns {Promise<string>} - Scheduled notification ID or null if not scheduled
 */
export const scheduleDepartureNotification = async (shift, identifier) => {
  if (!shift) return null;

  try {
    // Kiểm tra đã qua thời gian hay chưa
    const now = new Date();
    const [hours, minutes] = shift.departureTime.split(":").map(Number);
    const triggerTime = new Date(now);
    triggerTime.setHours(hours, minutes, 0, 0);

    // Nếu đã qua thời gian xuất phát, không lên lịch
    if (triggerTime <= now) {
      console.log(
        `Thời gian xuất phát ${hours}:${minutes} đã qua, không lên lịch`
      );
      return null;
    }

    // Kiểm tra xem đã có bản ghi chấm công nào chưa
    const todayStr = now.toISOString().split("T")[0];
    const goWorkLog = await getAttendanceLogByType(todayStr, "go_work");

    if (goWorkLog) {
      console.log("Đã có bản ghi 'đi làm', không lên lịch thông báo xuất phát");
      return null;
    }

    // Lên lịch với identifier cụ thể
    console.log(
      `Lên lịch thông báo xuất phát lúc ${triggerTime.toLocaleTimeString()} với ID: ${identifier}`
    );

    const content = {
      title: "Đến giờ đi làm",
      body: `Đã đến giờ xuất phát đi làm cho ca ${shift.name}`,
      sound: "default",
      priority: "high",
      data: {
        type: "departure",
        alarmType: "attendo_alarm",
        shiftId: shift.id,
      },
    };

    const trigger = { date: triggerTime };

    const alarmId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
      identifier, // Sử dụng identifier để tránh trùng lặp
    });

    return alarmId;
  } catch (error) {
    console.error("Lỗi khi lên lịch thông báo xuất phát:", error);
    return null;
  }
};

/**
 * Schedule check-in notification
 *
 * @param {Object} shift - Shift object
 * @param {string} identifier - Fixed identifier for the notification
 * @returns {Promise<string>} - Scheduled notification ID or null if not scheduled
 */
export const scheduleCheckInNotification = async (shift, identifier) => {
  if (!shift) return null;

  try {
    // If the time has already passed in the day, don't schedule the notification
    const now = new Date();
    const [hours, minutes] = shift.checkInTime.split(":").map(Number);
    const triggerTime = new Date();
    triggerTime.setHours(hours, minutes, 0, 0);

    if (triggerTime <= now) {
      // Check if today is the day the shift is applied
      const today = now.getDay();
      if (shift.daysApplied[today]) {
        console.log("Check-in time already passed for today");
        return null;
      }
    }

    // Schedule notification with fixed identifier
    const alarmId = await scheduleAlarm({
      title: "Đến giờ đi làm",
      body: `Đã đến giờ check-in cho ca ${shift.name}`,
      triggerTime,
      type: "check-in",
      data: { shiftId: shift.id },
      identifier, // Pass identifier
    });

    return alarmId;
  } catch (error) {
    console.error("Error scheduling check-in notification:", error);
    return null;
  }
};

/**
 * Schedule check-out notification
 *
 * @param {Object} shift - Shift object
 * @param {string} identifier - Fixed identifier for the notification
 * @returns {Promise<string>} - Scheduled notification ID or null if not scheduled
 */
export const scheduleCheckOutNotification = async (shift, identifier) => {
  if (!shift) return null;

  try {
    // If the time has already passed in the day, don't schedule the notification
    const now = new Date();
    const [hours, minutes] = shift.checkOutTime.split(":").map(Number);
    const triggerTime = new Date();
    triggerTime.setHours(hours, minutes, 0, 0);

    if (triggerTime <= now) {
      // Check if today is the day the shift is applied
      const today = now.getDay();
      if (shift.daysApplied[today]) {
        console.log("Check-out time already passed for today");
        return null;
      }
    }

    // Schedule notification with fixed identifier
    const alarmId = await scheduleAlarm({
      title: "Đến giờ đi làm",
      body: `Đã đến giờ check-out cho ca ${shift.name}`,
      triggerTime,
      type: "check-out",
      data: { shiftId: shift.id },
      identifier, // Pass identifier
    });

    return alarmId;
  } catch (error) {
    console.error("Error scheduling check-out notification:", error);
    return null;
  }
};

// Thêm nút debug vào giao diện khi đang phát triển
const debugAppState = () => {
  const appState = {
    currentShift,
    multiButtonMode,
    currentAction,
    todayLogs,
    // Thêm các trạng thái khác nếu cần
  };

  console.log("Trạng thái app hiện tại:", JSON.stringify(appState, null, 2));
  Alert.alert("Trạng thái App", JSON.stringify(appState, null, 2));
};

// Thêm nút debug vào giao diện
{
  __DEV__ && (
    <TouchableOpacity style={styles.debugButton} onPress={debugAppState}>
      <Text style={styles.debugButtonText}>Debug</Text>
    </TouchableOpacity>
  );
}

const performAction = async (force = false, overrideAction = null) => {
  console.log("performAction được gọi với params:", { force, overrideAction });

  try {
    const actionToPerform = overrideAction || currentAction;
    console.log("Hành động sẽ thực hiện:", actionToPerform);

    // Kiểm tra dữ liệu trước khi thực hiện
    if (!currentShift) {
      console.error("Lỗi: không có ca làm việc hiện tại");
      return { success: false, message: "Không có ca làm việc" };
    }

    // Log các thông tin quan trọng
    console.log("Thông tin ca làm việc:", {
      name: currentShift.name,
      startTime: currentShift.startTime,
      endTime: currentShift.endTime,
      daysApplied: currentShift.daysApplied,
    });

    const result = await addAttendanceLog(actionToPerform, force);
    console.log("Kết quả addAttendanceLog:", result);

    // Phần code còn lại...

    return result;
  } catch (error) {
    console.error("Lỗi trong performAction:", error);
    console.error("Stack:", error.stack);
    return { success: false, message: error.message };
  }
};

// Thêm vào AppContext.js hoặc nơi khởi động app
const cleanupNotifications = async () => {
  try {
    console.log("Kiểm tra và dọn dẹp thông báo...");

    // Lấy danh sách thông báo hiện tại
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();

    // Tìm các thông báo trùng lặp
    const seenIdentifiers = new Set();
    const duplicates = [];

    notifications.forEach((notification) => {
      const type = notification.content?.data?.type;
      if (!type) return;

      const key = `${type}-${notification.trigger?.date}`;
      if (seenIdentifiers.has(key)) {
        duplicates.push(notification.identifier);
      } else {
        seenIdentifiers.add(key);
      }
    });

    // Xóa các thông báo trùng lặp
    if (duplicates.length > 0) {
      console.log(
        `Tìm thấy ${duplicates.length} thông báo trùng lặp, đang xóa...`
      );
      for (const id of duplicates) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }

    console.log("Hoàn tất dọn dẹp thông báo");
  } catch (error) {
    console.error("Lỗi khi dọn dẹp thông báo:", error);
  }
};

// Thêm nút debug trong SettingsScreen.js hoặc một màn hình phù hợp
const DebugAlarmSection = () => {
  const checkAlarms = async () => {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();

    // Thông tin chi tiết hơn
    const alarmsInfo = notifications.map((notif) => ({
      id: notif.identifier,
      title: notif.content.title,
      triggerAt: notif.trigger.date
        ? new Date(notif.trigger.date).toLocaleString()
        : "N/A",
      type: notif.content.data?.type || "unknown",
    }));

    // Hiển thị kết quả
    Alert.alert(
      "Thông báo đã lên lịch",
      `Tổng số: ${notifications.length}\n\n${JSON.stringify(
        alarmsInfo,
        null,
        2
      )}`
    );
  };

  const clearAllAlarms = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert("Thành công", "Đã xóa tất cả thông báo đã lên lịch");
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Debug Thông Báo</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.debugButton} onPress={checkAlarms}>
          <Text style={styles.buttonText}>Kiểm tra thông báo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, { backgroundColor: "red" }]}
          onPress={clearAllAlarms}
        >
          <Text style={[styles.buttonText, { color: "white" }]}>
            Xóa tất cả thông báo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Thêm vào SettingsScreen
{
  __DEV__ && <DebugAlarmSection />;
}

// Thêm hàm kiểm tra và hiển thị các thông báo đã lên lịch
export const checkScheduledNotifications = async () => {
  try {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Có ${notifications.length} thông báo đã lên lịch:`);

    // Nhóm các thông báo theo loại để dễ kiểm tra
    const byType = {};
    notifications.forEach((notification) => {
      const type = notification.content?.data?.type || "unknown";
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        id: notification.identifier,
        title: notification.content.title,
        trigger: notification.trigger,
      });
    });

    console.log("Thông báo theo loại:", JSON.stringify(byType, null, 2));
    return notifications;
  } catch (error) {
    console.error("Lỗi khi kiểm tra thông báo:", error);
    return [];
  }
};

// Replace the top-level useEffect at the bottom of the file with a function
export const initializeNotificationsCheck = () => {
  // Function to check notifications (moved from useEffect)
  const checkNotifications = async () => {
    const notifications = await checkScheduledNotifications();
    console.log(`Tổng số thông báo đã lên lịch: ${notifications.length}`);
  };

  checkNotifications();
};

// Lưu lịch sử chạy background task
// Đã được import từ utils/taskDebugUtils.js
