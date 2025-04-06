/**
 * Task Debug Utilities
 *
 * Các công cụ để theo dõi và gỡ lỗi các task chạy nền trong ứng dụng
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./database";

// Định nghĩa key cho lịch sử task
const TASK_HISTORY_KEY = "attendo_task_history";

/**
 * Lưu lịch sử thực thi task
 *
 * @param {string} taskName - Tên của task
 * @param {any} result - Kết quả thực thi task
 * @returns {Promise<boolean>} - True nếu thành công
 */
export const logTaskExecution = async (taskName, result) => {
  try {
    // Lấy lịch sử hiện tại
    const taskHistoryJson =
      (await AsyncStorage.getItem(TASK_HISTORY_KEY)) || "[]";
    const taskHistory = JSON.parse(taskHistoryJson);

    // Thêm bản ghi mới
    taskHistory.unshift({
      taskName,
      timestamp: new Date().toISOString(),
      result: typeof result === "object" ? JSON.stringify(result) : result,
    });

    // Giới hạn lịch sử tối đa 100 bản ghi
    const limitedHistory = taskHistory.slice(0, 100);

    // Lưu lại lịch sử
    await AsyncStorage.setItem(
      TASK_HISTORY_KEY,
      JSON.stringify(limitedHistory)
    );
    console.log(`Đã ghi nhận thực thi task: ${taskName}`);

    return true;
  } catch (error) {
    console.error("Lỗi khi ghi nhận lịch sử task:", error);
    return false;
  }
};

/**
 * Lấy lịch sử thực thi task
 *
 * @returns {Promise<Array>} - Mảng chứa lịch sử thực thi task
 */
export const getTaskHistory = async () => {
  try {
    const taskHistoryJson =
      (await AsyncStorage.getItem(TASK_HISTORY_KEY)) || "[]";
    return JSON.parse(taskHistoryJson);
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử task:", error);
    return [];
  }
};

/**
 * Xóa lịch sử thực thi task
 *
 * @returns {Promise<boolean>} - True nếu thành công
 */
export const clearTaskHistory = async () => {
  try {
    await AsyncStorage.removeItem(TASK_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử task:", error);
    return false;
  }
};
