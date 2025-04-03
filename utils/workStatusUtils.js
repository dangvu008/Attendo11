import {
  getActiveShift,
  getAttendanceLogs,
  updateDailyWorkStatus,
  getDailyWorkStatus,
  safeGetItem,
  safeSetItem,
  STORAGE_KEYS,
} from "./database";

// Mã trạng thái làm việc
export const WORK_STATUS = {
  FULL_WORK: "FULL_WORK", // Đủ công (✅ / ✔️)
  MISSING_CHECKIN: "MISSING_CHECKIN", // Đi làm nhưng thiếu chấm công (❗!)
  NOT_UPDATED: "NOT_UPDATED", // Chưa cập nhật (❓ hoặc --)
  LEAVE: "LEAVE", // Nghỉ phép (📩 P)
  SICK_LEAVE: "SICK_LEAVE", // Nghỉ bệnh (🛌 B)
  HOLIDAY: "HOLIDAY", // Nghỉ lễ (🎌 H)
  ABSENT: "ABSENT", // Vắng không lý do (❌ X)
  LATE_EARLY: "LATE_EARLY", // RV - Vào muộn / Ra sớm
};

// Ký hiệu hiển thị
export const STATUS_ICONS = {
  [WORK_STATUS.FULL_WORK]: "✅",
  [WORK_STATUS.MISSING_CHECKIN]: "❗",
  [WORK_STATUS.NOT_UPDATED]: "❓",
  [WORK_STATUS.LEAVE]: "📩",
  [WORK_STATUS.SICK_LEAVE]: "🛌",
  [WORK_STATUS.HOLIDAY]: "🎌",
  [WORK_STATUS.ABSENT]: "❌",
  [WORK_STATUS.LATE_EARLY]: "RV",
};

// Định nghĩa ngưỡng thời gian cho phép trễ/sớm (phút)
const TIME_THRESHOLDS = {
  LATE_THRESHOLD: 5, // Số phút cho phép đi muộn
  EARLY_THRESHOLD: 5, // Số phút cho phép về sớm
};

// Calculate work status based on attendance logs
export const calculateWorkStatus = async (date) => {
  try {
    // Get active shift
    const activeShift = await getActiveShift();
    if (!activeShift || !activeShift.startTime) {
      console.log("No active shift found, cannot calculate work status");
      return {
        status: WORK_STATUS.NOT_UPDATED,
        statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có ca làm việc được áp dụng",
      };
    }

    // Get attendance logs for the date
    const logs = await getAttendanceLogs(date);

    // Kiểm tra nghỉ lễ
    const isHolidayStatus = await isHoliday(date);
    if (isHolidayStatus) {
      return {
        status: WORK_STATUS.HOLIDAY,
        statusDisplay: STATUS_ICONS[WORK_STATUS.HOLIDAY],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Ngày nghỉ lễ",
      };
    }

    // Kiểm tra nghỉ phép/bệnh
    const leaveStatus = await getLeaveStatus(date);
    if (leaveStatus) {
      if (leaveStatus === "LEAVE") {
        return {
          status: WORK_STATUS.LEAVE,
          statusDisplay: STATUS_ICONS[WORK_STATUS.LEAVE],
          totalWorkTime: 0,
          overtime: 0,
          remarks: "Nghỉ phép",
        };
      } else if (leaveStatus === "SICK_LEAVE") {
        return {
          status: WORK_STATUS.SICK_LEAVE,
          statusDisplay: STATUS_ICONS[WORK_STATUS.SICK_LEAVE],
          totalWorkTime: 0,
          overtime: 0,
          remarks: "Nghỉ bệnh",
        };
      }
    }

    // Nếu không có log và là ngày quá khứ, đánh dấu là vắng không lý do
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if ((!logs || logs.length === 0) && checkDate < today) {
      return {
        status: WORK_STATUS.ABSENT,
        statusDisplay: STATUS_ICONS[WORK_STATUS.ABSENT],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Vắng không lý do",
      };
    }

    if (!logs || logs.length === 0) {
      console.log("No attendance logs found for the date");
      return {
        status: WORK_STATUS.NOT_UPDATED,
        statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có dữ liệu chấm công",
      };
    }

    // Find relevant logs
    const goWorkLog = logs.find((log) => log.type === "go_work");
    const checkInLog = logs.find((log) => log.type === "check_in");
    const checkOutLog = logs.find((log) => log.type === "check_out");
    const completeLog = logs.find((log) => log.type === "complete");

    // Kiểm tra thiếu chấm công
    if (goWorkLog && !checkInLog && !checkOutLog) {
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã bấm nút đi làm nhưng thiếu chấm công vào/ra",
        goWorkTime: new Date(goWorkLog.timestamp).toLocaleTimeString(),
      };
    }

    // Thiếu chấm công ra
    if ((goWorkLog || checkInLog) && !checkOutLog) {
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Thiếu chấm công ra",
        checkInTime: checkInLog
          ? new Date(checkInLog.timestamp).toLocaleTimeString()
          : null,
        goWorkTime: goWorkLog
          ? new Date(goWorkLog.timestamp).toLocaleTimeString()
          : null,
      };
    }

    // Parse shift times
    const [startHours, startMinutes] = activeShift.startTime
      .split(":")
      .map(Number);
    const [officeEndHours, officeEndMinutes] = activeShift.officeEndTime
      .split(":")
      .map(Number);

    // Create Date objects for shift times
    const shiftStartTime = new Date(date);
    shiftStartTime.setHours(startHours, startMinutes, 0, 0);

    const shiftEndTime = new Date(date);
    shiftEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0);

    // Calculate standard work time (in hours)
    const standardWorkTime = (shiftEndTime - shiftStartTime) / (1000 * 60 * 60);

    // Nếu có check-in và check-out logs, tính toán thời gian làm việc thực tế
    if (checkInLog && checkOutLog) {
      const checkInTime = new Date(checkInLog.timestamp);
      const checkOutTime = new Date(checkOutLog.timestamp);

      // Tính thời gian làm việc thực tế (theo giờ)
      const actualWorkTime = (checkOutTime - checkInTime) / (1000 * 60 * 60);

      // Kiểm tra đi muộn
      const lateMinutes = (checkInTime - shiftStartTime) / (1000 * 60);
      const isLate = lateMinutes > TIME_THRESHOLDS.LATE_THRESHOLD;

      // Kiểm tra về sớm
      const earlyMinutes = (shiftEndTime - checkOutTime) / (1000 * 60);
      const isEarly = earlyMinutes > TIME_THRESHOLDS.EARLY_THRESHOLD;

      // Tính tăng ca
      let overtime = 0;
      if (checkOutTime > shiftEndTime) {
        overtime = (checkOutTime - shiftEndTime) / (1000 * 60 * 60);
      }

      // Làm tròn giá trị
      const roundedActualWorkTime = Math.round(actualWorkTime * 10) / 10;
      const roundedOvertime = Math.round(overtime * 10) / 10;

      // Xác định trạng thái
      let status = WORK_STATUS.FULL_WORK;
      let statusDisplay = STATUS_ICONS[WORK_STATUS.FULL_WORK];
      let remarks = "Chấm công đầy đủ và đúng giờ";

      // Nếu đi muộn hoặc về sớm
      if (isLate || isEarly) {
        status = WORK_STATUS.LATE_EARLY;
        statusDisplay = STATUS_ICONS[WORK_STATUS.LATE_EARLY];

        if (isLate && isEarly) {
          remarks = `Vào muộn ${Math.round(
            lateMinutes
          )} phút & Ra sớm ${Math.round(earlyMinutes)} phút`;
        } else if (isLate) {
          remarks = `Vào muộn ${Math.round(lateMinutes)} phút`;
        } else {
          remarks = `Ra sớm ${Math.round(earlyMinutes)} phút`;
        }
      }

      // Tính tổng giờ công theo chuẩn mới
      let totalStandardHours = 0;

      // Nếu không trễ hoặc sớm (đủ công)
      if (!isLate && !isEarly) {
        totalStandardHours = standardWorkTime;
      } else {
        // Nếu là RV, tính toán giờ công thực tế (trừ đi thời gian đi muộn/về sớm)
        totalStandardHours = standardWorkTime;

        if (isLate) {
          totalStandardHours -= lateMinutes / 60; // Trừ số phút đi muộn (quy đổi ra giờ)
        }

        if (isEarly) {
          totalStandardHours -= earlyMinutes / 60; // Trừ số phút về sớm (quy đổi ra giờ)
        }

        // Làm tròn giá trị
        totalStandardHours = Math.round(totalStandardHours * 10) / 10;
      }

      // Nếu có tăng ca đáng kể (hơn 30 phút)
      if (overtime >= 0.5) {
        remarks +=
          overtime >= 0.5 ? ` Tăng ca ${Math.round(overtime * 60)} phút` : "";
      }

      return {
        status,
        statusDisplay,
        totalWorkTime: totalStandardHours, // Giờ công tính theo chuẩn mới
        actualWorkTime: roundedActualWorkTime, // Thời gian làm việc thực tế
        overtime: roundedOvertime,
        remarks,
        checkInTime: checkInTime.toLocaleTimeString(),
        checkOutTime: checkOutTime.toLocaleTimeString(),
        isLate,
        isEarly,
        lateMinutes: isLate ? Math.round(lateMinutes) : 0,
        earlyMinutes: isEarly ? Math.round(earlyMinutes) : 0,
      };
    } else if (checkInLog && !checkOutLog) {
      // Chỉ chấm công vào, chưa chấm công ra
      const checkInTime = new Date(checkInLog.timestamp);

      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã chấm công vào nhưng chưa chấm công ra",
        checkInTime: checkInTime.toLocaleTimeString(),
      };
    } else if (goWorkLog && !checkInLog) {
      // Chỉ bấm đi làm
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã bấm nút đi làm nhưng chưa chấm công vào",
        goWorkTime: new Date(goWorkLog.timestamp).toLocaleTimeString(),
      };
    }

    // Trường hợp còn lại - không xác định
    return {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Trạng thái làm việc không xác định",
    };
  } catch (error) {
    console.error("Error calculating work status:", error);
    return {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Lỗi khi tính toán trạng thái làm việc",
    };
  }
};

// Check if a reset is needed
export const checkIfResetNeeded = async () => {
  try {
    // Get active shift
    const activeShift = await getActiveShift();
    if (!activeShift || !activeShift.startTime) {
      console.log("No active shift or shift start time found");
      return false;
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Parse shift start time
    const [hours, minutes] = activeShift.startTime.split(":").map(Number);

    // Check if parsing was successful
    if (isNaN(hours) || isNaN(minutes)) {
      console.log("Invalid shift start time format:", activeShift.startTime);
      return false;
    }

    // Create Date object for shift start time
    const shiftStartTime = new Date(today);
    shiftStartTime.setHours(hours, minutes, 0, 0);

    // Calculate reset time (6 hours before shift start)
    const resetTime = new Date(shiftStartTime);
    resetTime.setHours(resetTime.getHours() - 6);

    // Get current time
    const now = new Date();

    // Get last reset time
    const lastResetTime = await safeGetItem(STORAGE_KEYS.LAST_RESET_TIME, {});
    const lastResetForToday = lastResetTime[today];

    // If current time is within the reset window (between resetTime and shiftStartTime)
    if (now >= resetTime && now < shiftStartTime) {
      // Check if we've already reset today
      if (!lastResetForToday) {
        // Update last reset time
        lastResetTime[today] = now.toISOString();
        await safeSetItem(STORAGE_KEYS.LAST_RESET_TIME, lastResetTime);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking if reset is needed:", error);
    return false;
  }
};

// Update work status based on a new attendance log
export const updateWorkStatusForNewLog = async (date, logType) => {
  try {
    // Get current work status
    let workStatus = (await getDailyWorkStatus(date)) || {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Chưa cập nhật",
    };

    // Update status based on log type
    switch (logType) {
      case "go_work":
        workStatus.status = WORK_STATUS.MISSING_CHECKIN;
        workStatus.statusDisplay = STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN];
        workStatus.remarks = "Đã bấm nút đi làm";
        break;
      case "check_in":
        workStatus.status = WORK_STATUS.MISSING_CHECKIN;
        workStatus.statusDisplay = STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN];
        workStatus.remarks = "Đã chấm công vào";
        break;
      case "check_out":
        // Tính toán lại toàn bộ trạng thái làm việc dựa trên check-in và check-out
        workStatus = await calculateWorkStatus(date);
        break;
      case "complete":
        // Calculate full work status
        workStatus = await calculateWorkStatus(date);
        break;
    }

    // Update work status in database
    await updateDailyWorkStatus(date, workStatus);

    return workStatus;
  } catch (error) {
    console.error("Error updating work status for new log:", error);
    return null;
  }
};

// Tính toán trạng thái làm việc cho một tuần
export const calculateWeeklyStatus = async (startDate, endDate) => {
  try {
    const result = {};

    // Chuyển đổi thành objects Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Lặp qua từng ngày trong tuần
    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      const dateStr = day.toISOString().split("T")[0];

      // Lấy trạng thái làm việc của ngày từ DB
      const dailyStatus = await getDailyWorkStatus(dateStr);

      if (dailyStatus) {
        result[dateStr] = dailyStatus;
      } else {
        // Nếu không có dữ liệu, đặt trạng thái mặc định
        result[dateStr] = {
          status: WORK_STATUS.NOT_UPDATED,
          statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
          totalWorkTime: 0,
          overtime: 0,
          remarks: "Chưa cập nhật",
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Error calculating weekly status:", error);
    return {};
  }
};

// Kiểm tra xem ngày có phải là ngày nghỉ lễ không
export const isHoliday = async (date) => {
  try {
    // Lấy danh sách ngày nghỉ lễ từ lưu trữ
    const holidays = await safeGetItem(STORAGE_KEYS.HOLIDAYS, {});
    const dateString =
      typeof date === "string" ? date : date.toISOString().split("T")[0];

    return holidays[dateString] ? true : false;
  } catch (error) {
    console.error("Lỗi khi kiểm tra ngày nghỉ lễ:", error);
    return false;
  }
};

// Kiểm tra trạng thái nghỉ phép/bệnh
export const getLeaveStatus = async (date) => {
  try {
    // Lấy danh sách ngày nghỉ phép/bệnh từ lưu trữ
    const leaves = await safeGetItem(STORAGE_KEYS.LEAVES, {});
    const dateString =
      typeof date === "string" ? date : date.toISOString().split("T")[0];

    if (leaves[dateString]) {
      return leaves[dateString].type; // Trả về loại nghỉ ("LEAVE" hoặc "SICK_LEAVE")
    }

    return null;
  } catch (error) {
    console.error("Lỗi khi kiểm tra nghỉ phép/bệnh:", error);
    return null;
  }
};

/**
 * Thiết lập ngày nghỉ lễ với mô tả tùy chọn
 *
 * @param {string|Date} date - Ngày cần thiết lập là nghỉ lễ
 * @param {string} description - Mô tả về ngày lễ
 * @returns {Promise<boolean>} - Kết quả thành công hay không
 */
export const setHolidayDate = async (date, description = "") => {
  try {
    const dateString =
      typeof date === "string" ? date : date.toISOString().split("T")[0];

    // Cập nhật ngày nghỉ lễ
    const holidays = await safeGetItem(STORAGE_KEYS.HOLIDAYS, {});
    holidays[dateString] = { description };

    // Lưu lại thông tin
    const success = await safeSetItem(STORAGE_KEYS.HOLIDAYS, holidays);

    // Nếu có trạng thái công việc cho ngày này, cập nhật lại
    if (success) {
      const workStatus = await getDailyWorkStatus(dateString);
      if (workStatus) {
        await updateDailyWorkStatus(dateString, {
          status: WORK_STATUS.HOLIDAY,
          statusDisplay: STATUS_ICONS[WORK_STATUS.HOLIDAY],
          totalWorkTime: 0,
          overtime: 0,
          remarks: description || "Ngày nghỉ lễ",
        });
      }
    }

    return success;
  } catch (error) {
    console.error("Lỗi khi thiết lập ngày nghỉ lễ:", error);
    return false;
  }
};

/**
 * Thiết lập ngày nghỉ phép hoặc nghỉ bệnh
 *
 * @param {string|Date} date - Ngày cần thiết lập
 * @param {string} leaveType - Loại nghỉ (LEAVE hoặc SICK_LEAVE)
 * @param {string} description - Mô tả tùy chọn
 * @returns {Promise<boolean>} - Kết quả thành công hay không
 */
export const setLeaveDate = async (date, leaveType, description = "") => {
  try {
    if (
      leaveType !== WORK_STATUS.LEAVE &&
      leaveType !== WORK_STATUS.SICK_LEAVE
    ) {
      console.error("Loại nghỉ không hợp lệ:", leaveType);
      return false;
    }

    const dateString =
      typeof date === "string" ? date : date.toISOString().split("T")[0];

    // Cập nhật ngày nghỉ phép/bệnh
    const leaves = await safeGetItem(STORAGE_KEYS.LEAVES, {});
    leaves[dateString] = {
      type: leaveType,
      description,
    };

    // Lưu lại thông tin
    const success = await safeSetItem(STORAGE_KEYS.LEAVES, leaves);

    // Nếu có trạng thái công việc cho ngày này, cập nhật lại
    if (success) {
      const workStatus = await getDailyWorkStatus(dateString);
      if (workStatus) {
        await updateDailyWorkStatus(dateString, {
          status: leaveType,
          statusDisplay: STATUS_ICONS[leaveType],
          totalWorkTime: 0,
          overtime: 0,
          remarks:
            description ||
            (leaveType === WORK_STATUS.LEAVE ? "Nghỉ phép" : "Nghỉ bệnh"),
        });
      }
    }

    return success;
  } catch (error) {
    console.error("Lỗi khi thiết lập ngày nghỉ phép/bệnh:", error);
    return false;
  }
};
