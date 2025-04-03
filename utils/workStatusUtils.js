import {
  getActiveShift,
  getAttendanceLogs,
  updateDailyWorkStatus,
  getDailyWorkStatus,
  safeGetItem,
  safeSetItem,
  STORAGE_KEYS,
  getShiftConfig,
} from "./database";

import {
  isNightShift,
  createShiftTimestamps,
  adjustCheckTimes,
  calculateTimeDeviations,
  calculateAdjustedWorkHours,
  generateStatusRemarks,
  calculateWorkTimeStatus,
} from "./timeRules";

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
  OVERTIME_THRESHOLD: 30, // Số phút tối thiểu để tính tăng ca
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

    // Lấy cấu hình ca làm việc
    const shiftConfig = await getShiftConfig();

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

    // Nếu có check-in và check-out logs, tính toán thời gian làm việc thực tế
    if (checkInLog && checkOutLog) {
      const checkInTime = new Date(checkInLog.timestamp);
      const checkOutTime = new Date(checkOutLog.timestamp);

      // Xác định xem có phải ca đêm hay không
      let isNightShiftType = false;

      if (
        activeShift.isNightShift === true ||
        (shiftConfig.nightShiftDetection === "auto" &&
          isNightShift(activeShift.startTime, activeShift.officeEndTime))
      ) {
        isNightShiftType = true;
      }

      // Cấu hình ngưỡng thời gian
      const thresholds = {
        late:
          shiftConfig.timeThresholds?.lateThreshold ||
          TIME_THRESHOLDS.LATE_THRESHOLD,
        early:
          shiftConfig.timeThresholds?.earlyThreshold ||
          TIME_THRESHOLDS.EARLY_THRESHOLD,
        overtime:
          shiftConfig.timeThresholds?.overtimeThreshold ||
          TIME_THRESHOLDS.OVERTIME_THRESHOLD,
      };

      // Tạo đối tượng ca làm việc
      const shiftTimes = createShiftTimestamps(
        date,
        activeShift.startTime,
        activeShift.officeEndTime,
        isNightShiftType
      );

      // Điều chỉnh thời gian check-in và check-out
      const adjustedTimes = adjustCheckTimes(checkInTime, checkOutTime);

      // Tính toán thời gian đi muộn, về sớm và tăng ca
      const timeDeviations = calculateTimeDeviations(
        adjustedTimes.checkIn,
        adjustedTimes.checkOut,
        shiftTimes.start,
        shiftTimes.end
      );

      // Xác định có đi muộn hay về sớm không
      const isLate = timeDeviations.lateMinutes > thresholds.late;
      const isEarly = timeDeviations.earlyMinutes > thresholds.early;

      // Tính tổng thời gian làm việc chuẩn sau khi trừ thời gian đi muộn/về sớm
      const totalWorkHours = calculateAdjustedWorkHours(
        shiftTimes.duration,
        isLate ? timeDeviations.lateMinutes : 0,
        isEarly ? timeDeviations.earlyMinutes : 0
      );

      // Tính tăng ca, chỉ khi vượt qua ngưỡng
      const overtimeHours =
        timeDeviations.overtimeMinutes >= thresholds.overtime
          ? timeDeviations.overtimeHours
          : 0;

      // Tạo ghi chú
      const remarks = generateStatusRemarks(
        isLate,
        isEarly,
        timeDeviations.lateMinutes,
        timeDeviations.earlyMinutes,
        timeDeviations.overtimeMinutes
      );

      // Xác định trạng thái
      let status = WORK_STATUS.FULL_WORK;
      let statusDisplay = STATUS_ICONS[WORK_STATUS.FULL_WORK];

      if (isLate || isEarly) {
        status = WORK_STATUS.LATE_EARLY;
        statusDisplay = STATUS_ICONS[WORK_STATUS.LATE_EARLY];
      }

      // Làm tròn số
      const roundedOvertimeHours = Math.round(overtimeHours * 10) / 10;
      const roundedActualWorkHours =
        Math.round(timeDeviations.actualWorkHours * 10) / 10;

      // Log thông tin để debug
      console.log("DEBUG - Tính công mới:", {
        date,
        isNightShift: isNightShiftType,
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toISOString(),
        shiftStartTime: shiftTimes.start.toISOString(),
        shiftEndTime: shiftTimes.end.toISOString(),
        adjustedCheckInTime: adjustedTimes.checkIn.toISOString(),
        adjustedCheckOutTime: adjustedTimes.checkOut.toISOString(),
        lateMinutes: timeDeviations.lateMinutes,
        earlyMinutes: timeDeviations.earlyMinutes,
        overtimeMinutes: timeDeviations.overtimeMinutes,
        isLate,
        isEarly,
        totalWorkHours,
        roundedActualWorkHours,
        roundedOvertimeHours,
        thresholds,
      });

      return {
        status,
        statusDisplay,
        totalWorkTime: totalWorkHours,
        actualWorkTime: roundedActualWorkHours,
        overtime: roundedOvertimeHours,
        remarks,
        checkInTime: checkInTime.toLocaleTimeString(),
        checkOutTime: checkOutTime.toLocaleTimeString(),
        isLate,
        isEarly,
        lateMinutes: isLate ? Math.round(timeDeviations.lateMinutes) : 0,
        earlyMinutes: isEarly ? Math.round(timeDeviations.earlyMinutes) : 0,
        isNightShift: isNightShiftType,
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
