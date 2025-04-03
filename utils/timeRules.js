/**
 * Time Rules Enforcement Module
 *
 * This module contains utility functions for enforcing time rules between attendance actions.
 * It implements business logic for minimum time intervals between different attendance actions
 * and provides validation functions to enforce these rules.
 */

// Constants for time intervals (in milliseconds)
export const TIME_INTERVALS = {
  // Minimum time between "Go to Work" and "Check-in" actions (5 minutes)
  GO_WORK_TO_CHECK_IN: 5 * 60 * 1000,

  // Minimum time between "Check-in" and "Check-out" actions (2 hours)
  CHECK_IN_TO_CHECK_OUT: 2 * 60 * 60 * 1000,
};

/**
 * Validates if the minimum time interval between actions has been met
 *
 * This function checks if enough time has passed between two attendance actions
 * based on predefined business rules. If the minimum time hasn't passed,
 * it returns an invalid result with an appropriate message.
 *
 * @param {string} previousActionType - The type of the previous action (e.g., "go_work", "check_in")
 * @param {Date|string} previousActionTime - The timestamp when the previous action occurred
 * @param {string} currentActionType - The type of the current action being attempted
 * @returns {Object} - Object containing:
 *   - isValid: Boolean indicating if the time interval is valid
 *   - message: Error message if invalid, null otherwise
 */
export const validateTimeInterval = (
  previousActionType,
  previousActionTime,
  currentActionType
) => {
  // If no previous action, no validation needed
  if (!previousActionTime) {
    return { isValid: true, message: null };
  }

  const now = new Date();
  const timeDifference = now - new Date(previousActionTime);

  // Check interval between "Go to Work" and "Check-in"
  if (previousActionType === "go_work" && currentActionType === "check_in") {
    if (timeDifference < TIME_INTERVALS.GO_WORK_TO_CHECK_IN) {
      // Calculate remaining time to wait in seconds
      const remainingSeconds = Math.ceil(
        (TIME_INTERVALS.GO_WORK_TO_CHECK_IN - timeDifference) / 1000
      );
      return {
        isValid: false,
        message: `You should wait at least 5 minutes between "Go to Work" and "Check-in". Please wait ${remainingSeconds} more seconds.`,
      };
    }
  }

  // Check interval between "Check-in" and "Check-out"
  if (previousActionType === "check_in" && currentActionType === "check_out") {
    if (timeDifference < TIME_INTERVALS.CHECK_IN_TO_CHECK_OUT) {
      // Calculate remaining time to wait in minutes
      const remainingMinutes = Math.ceil(
        (TIME_INTERVALS.CHECK_IN_TO_CHECK_OUT - timeDifference) / (60 * 1000)
      );
      return {
        isValid: false,
        message: `You should work at least 2 hours before checking out. Please wait ${remainingMinutes} more minutes.`,
      };
    }
  }

  // If all checks pass, return valid
  return { isValid: true, message: null };
};

/**
 * Formats a timestamp for display in the UI
 *
 * @param {Date|string} timestamp - The timestamp to format
 * @returns {string} - Formatted time string (HH:MM:SS)
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "--:--:--";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * Calculates the duration between two timestamps
 *
 * @param {Date|string} startTime - The start timestamp
 * @param {Date|string} endTime - The end timestamp
 * @returns {string} - Formatted duration string (HH:MM:SS)
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "--:--:--";

  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;

  const durationMs = end - start;

  // Convert to hours, minutes, seconds
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Returns an emoji indicator for a given action type
 * Used to visually represent different attendance actions in the history list
 *
 * @param {string} actionType - The action type
 * @returns {string} - Status indicator emoji
 */
export const getStatusIndicator = (actionType) => {
  switch (actionType) {
    case "go_work":
      return "🚶";
    case "check_in":
      return "✅";
    case "check_out":
      return "🔚";
    case "complete":
      return "🏆";
    default:
      return "❓";
  }
};

/**
 * Time Rules Utilities Module
 *
 * Module này cung cấp các hàm xử lý logic tính giờ công và phát hiện vấn đề
 * về việc đi muộn, về sớm, tăng ca, đặc biệt là xử lý trường hợp ca đêm.
 */

/**
 * Kiểm tra xem một ca làm việc có phải là ca đêm hay không
 *
 * @param {string} startTime - Thời gian bắt đầu (định dạng "HH:MM")
 * @param {string} endTime - Thời gian kết thúc (định dạng "HH:MM")
 * @returns {boolean} - True nếu là ca đêm
 */
export const isNightShift = (startTime, endTime) => {
  if (!startTime || !endTime) return false;

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  // Nếu giờ kết thúc nhỏ hơn giờ bắt đầu, hoặc cùng giờ nhưng phút kết thúc nhỏ hơn,
  // thì đây là ca đêm (kéo dài qua 00:00)
  return (
    endHours < startHours ||
    (endHours === startHours && endMinutes < startMinutes)
  );
};

/**
 * Tạo đối tượng Date cho thời gian bắt đầu và kết thúc ca làm việc
 *
 * @param {string|Date} baseDate - Ngày làm việc
 * @param {string} startTime - Thời gian bắt đầu (định dạng "HH:MM")
 * @param {string} endTime - Thời gian kết thúc (định dạng "HH:MM")
 * @param {boolean} handleNightShift - Xử lý ca đêm tự động hay không
 * @returns {object} - Đối tượng chứa thời gian bắt đầu và kết thúc ca làm
 */
export const createShiftTimestamps = (
  baseDate,
  startTime,
  endTime,
  handleNightShift = true
) => {
  // Đảm bảo baseDate là chuỗi ngày YYYY-MM-DD
  const dateStr =
    typeof baseDate === "string"
      ? baseDate.split("T")[0]
      : baseDate.toISOString().split("T")[0];

  // Parse thời gian
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  // Tạo đối tượng Date
  const shiftStartTime = new Date(
    `${dateStr}T${startHours.toString().padStart(2, "0")}:${startMinutes
      .toString()
      .padStart(2, "0")}:00`
  );

  let shiftEndTime = new Date(
    `${dateStr}T${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}:00`
  );

  // Xử lý ca đêm
  if (handleNightShift && isNightShift(startTime, endTime)) {
    shiftEndTime.setDate(shiftEndTime.getDate() + 1);
  }

  return {
    start: shiftStartTime,
    end: shiftEndTime,
    isNightShift: handleNightShift && isNightShift(startTime, endTime),
    duration: (shiftEndTime - shiftStartTime) / (1000 * 60 * 60), // Thời lượng theo giờ
  };
};

/**
 * Điều chỉnh thời gian check-out nếu cần thiết (cho ca đêm)
 *
 * @param {Date} checkInTime - Thời gian check-in
 * @param {Date} checkOutTime - Thời gian check-out
 * @returns {object} - Đối tượng chứa thời gian check-in và check-out đã điều chỉnh
 */
export const adjustCheckTimes = (checkInTime, checkOutTime) => {
  const adjustedCheckInTime = new Date(checkInTime);
  let adjustedCheckOutTime = new Date(checkOutTime);

  // Nếu thời gian check-out nhỏ hơn check-in, giả định đã chuyển sang ngày hôm sau
  if (adjustedCheckOutTime < adjustedCheckInTime) {
    adjustedCheckOutTime.setDate(adjustedCheckOutTime.getDate() + 1);
  }

  return {
    checkIn: adjustedCheckInTime,
    checkOut: adjustedCheckOutTime,
    duration: (adjustedCheckOutTime - adjustedCheckInTime) / (1000 * 60 * 60), // Thời lượng theo giờ
  };
};

/**
 * Tính toán số phút đi muộn, về sớm và tăng ca
 *
 * @param {Date} adjustedCheckIn - Thời gian check-in đã điều chỉnh
 * @param {Date} adjustedCheckOut - Thời gian check-out đã điều chỉnh
 * @param {Date} shiftStart - Thời gian bắt đầu ca
 * @param {Date} shiftEnd - Thời gian kết thúc ca
 * @returns {object} - Đối tượng chứa các thông số tính toán
 */
export const calculateTimeDeviations = (
  adjustedCheckIn,
  adjustedCheckOut,
  shiftStart,
  shiftEnd
) => {
  // Tính phút đi muộn
  const lateMinutes = Math.max(0, (adjustedCheckIn - shiftStart) / (1000 * 60));

  // Tính phút về sớm
  const earlyMinutes = Math.max(0, (shiftEnd - adjustedCheckOut) / (1000 * 60));

  // Tính phút tăng ca
  const overtimeMinutes = Math.max(
    0,
    (adjustedCheckOut - shiftEnd) / (1000 * 60)
  );

  return {
    lateMinutes,
    earlyMinutes,
    overtimeMinutes,
    overtimeHours: overtimeMinutes / 60,
    actualWorkHours: (adjustedCheckOut - adjustedCheckIn) / (1000 * 60 * 60),
  };
};

/**
 * Tính toán tổng giờ công sau khi trừ đi thời gian đi muộn/về sớm
 *
 * @param {number} standardHours - Số giờ tiêu chuẩn của ca làm việc
 * @param {number} lateMinutes - Số phút đi muộn
 * @param {number} earlyMinutes - Số phút về sớm
 * @returns {number} - Tổng giờ công sau khi điều chỉnh
 */
export const calculateAdjustedWorkHours = (
  standardHours,
  lateMinutes,
  earlyMinutes
) => {
  // Từ giờ tiêu chuẩn, trừ đi thời gian đi muộn và về sớm
  let adjustedHours = standardHours - lateMinutes / 60 - earlyMinutes / 60;

  // Đảm bảo không âm
  adjustedHours = Math.max(0, adjustedHours);

  // Làm tròn đến 1 chữ số thập phân
  return Math.round(adjustedHours * 10) / 10;
};

/**
 * Tạo thông báo ghi chú dựa trên kết quả tính toán
 *
 * @param {boolean} isLate - Có đi muộn không
 * @param {boolean} isEarly - Có về sớm không
 * @param {number} lateMinutes - Số phút đi muộn
 * @param {number} earlyMinutes - Số phút về sớm
 * @param {number} overtimeMinutes - Số phút tăng ca
 * @returns {string} - Thông báo ghi chú
 */
export const generateStatusRemarks = (
  isLate,
  isEarly,
  lateMinutes,
  earlyMinutes,
  overtimeMinutes
) => {
  let remarks = "";

  if (isLate && isEarly) {
    remarks = `Vào muộn ${Math.round(lateMinutes)} phút & Ra sớm ${Math.round(
      earlyMinutes
    )} phút`;
  } else if (isLate) {
    remarks = `Vào muộn ${Math.round(lateMinutes)} phút`;
  } else if (isEarly) {
    remarks = `Ra sớm ${Math.round(earlyMinutes)} phút`;
  } else {
    remarks = "Chấm công đầy đủ và đúng giờ";
  }

  // Thêm thông báo tăng ca nếu có
  if (overtimeMinutes >= 30) {
    remarks += ` Tăng ca ${Math.round(overtimeMinutes)} phút`;
  }

  return remarks;
};

/**
 * Tính toán đầy đủ trạng thái thời gian làm việc
 *
 * @param {object} options - Các tham số đầu vào
 * @returns {object} - Kết quả tính toán trạng thái
 */
export const calculateWorkTimeStatus = ({
  checkInTime,
  checkOutTime,
  shiftStartTime,
  shiftEndTime,
  isNightShift = false,
  thresholds = { late: 5, early: 5, overtime: 30 },
}) => {
  // Đảm bảo các tham số đều là đối tượng Date
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const shiftStart = new Date(shiftStartTime);
  let shiftEnd = new Date(shiftEndTime);

  // Điều chỉnh thời gian ca làm việc nếu là ca đêm
  if (isNightShift) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  // Điều chỉnh thời gian check-out
  const { checkIn: adjustedCheckIn, checkOut: adjustedCheckOut } =
    adjustCheckTimes(checkIn, checkOut);

  // Tính toán các thông số
  const {
    lateMinutes,
    earlyMinutes,
    overtimeMinutes,
    overtimeHours,
    actualWorkHours,
  } = calculateTimeDeviations(
    adjustedCheckIn,
    adjustedCheckOut,
    shiftStart,
    shiftEnd
  );

  // Kiểm tra có đi muộn/về sớm không, dựa trên ngưỡng được cấu hình
  const isLate = lateMinutes > thresholds.late;
  const isEarly = earlyMinutes > thresholds.early;

  // Tính toán giờ làm việc tiêu chuẩn
  const standardWorkHours = (shiftEnd - shiftStart) / (1000 * 60 * 60);

  // Tính toán giờ công sau điều chỉnh
  const totalWorkHours = calculateAdjustedWorkHours(
    standardWorkHours,
    isLate ? lateMinutes : 0,
    isEarly ? earlyMinutes : 0
  );

  // Tính toán tăng ca, chỉ tính khi vượt qua ngưỡng
  const overtime = overtimeMinutes >= thresholds.overtime ? overtimeHours : 0;
  const roundedOvertime = Math.round(overtime * 10) / 10;

  // Tạo thông báo ghi chú
  const remarks = generateStatusRemarks(
    isLate,
    isEarly,
    lateMinutes,
    earlyMinutes,
    overtimeMinutes
  );

  return {
    totalWorkHours,
    actualWorkHours: Math.round(actualWorkHours * 10) / 10,
    overtime: roundedOvertime,
    isLate,
    isEarly,
    lateMinutes: isLate ? Math.round(lateMinutes) : 0,
    earlyMinutes: isEarly ? Math.round(earlyMinutes) : 0,
    remarks,
    debug: {
      originalCheckIn: checkIn,
      originalCheckOut: checkOut,
      adjustedCheckIn,
      adjustedCheckOut,
      shiftStart,
      shiftEnd,
      standardWorkHours,
      lateMinutes,
      earlyMinutes,
      overtimeMinutes,
    },
  };
};
