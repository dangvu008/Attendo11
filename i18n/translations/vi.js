export default {
  common: {
    appName: "Attendo",
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    edit: "Sửa",
    add: "Thêm",
    confirm: "Xác nhận",
    yes: "Có",
    no: "Không",
    ok: "OK",
    loading: "Đang tải...",
    error: "Lỗi",
    success: "Thành công",
    retry: "Thử lại",
    warning: "Cảnh báo",
  },
  home: {
    todayShifts: "Ca làm việc hôm nay",
    weeklySchedule: "Lịch tuần này",
    weather: "Thời tiết",
    notes: "Ghi chú công việc",
    noShiftsToday: "Không có ca làm việc nào hôm nay",
    addNewShift: "Thêm ca mới",
    noNotes: "Không có ghi chú nào",
    addNewNote: "Thêm ghi chú mới",
    checkInStatus: {
      notCheckedIn: "Chưa check-in",
      checkedInNotOut: "Đã check-in, chưa check-out",
      checkedInAndOut: "Đã check-in và check-out",
    },
    goWork: "Đi Làm",
    waitingCheckIn: "Chờ Check-in",
    checkIn: "Chấm Công Vào",
    checkOut: "Chấm Công Ra",
    punch: "Ký Công",
    complete: "Hoàn Tất",
    completed: "Đã Hoàn Tất",
    activeShift: "Ca làm việc",
    todayLogs: "Lịch sử hôm nay",
    resetConfirmation:
      "Bạn có muốn reset lại trạng thái chấm công hôm nay không? Mọi dữ liệu bấm nút hôm nay sẽ bị xóa.",
    noActiveShift: "Không có ca làm việc nào được chọn",
    logGoWork: "Đi Làm",
    logCheckIn: "Chấm Công Vào",
    logPunch: "Ký Công",
    logCheckOut: "Chấm Công Ra",
    logComplete: "Hoàn Tất",
  },
  shifts: {
    shiftList: "Danh sách ca làm việc",
    shiftDetails: "Chi tiết ca làm việc",
    addShift: "Thêm ca làm việc",
    shiftName: "Tên ca làm việc",
    startTime: "Thời gian bắt đầu",
    endTime: "Thời gian kết thúc tối đa",
    maxEndTime: "Thời gian kết thúc tối đa",
    departureTime: "Thời gian xuất phát",
    officeEndTime: "Thời gian kết thúc giờ hành chính",
    breakMinutes: "Thời gian nghỉ (phút)",
    remindBeforeStart: "Nhắc trước khi vào ca (phút)",
    remindAfterEnd: "Nhắc sau khi kết thúc ca (phút)",
    penaltyRoundingMinutes: "Làm tròn phút phạt (phút)",
    requirePunch: "Yêu cầu ký công",
    daysApplied: "Ngày áp dụng",
    noShifts: "Chưa có ca làm việc nào",
    addShiftPrompt: "Nhấn nút bên dưới để thêm ca mới",
    deleteConfirm: "Bạn có chắc chắn muốn xóa ca",
    validation: {
      nameRequired: "Vui lòng nhập tên ca làm việc",
      daysRequired: "Vui lòng chọn ít nhất một ngày trong tuần",
      startBeforeEnd: "Thời gian bắt đầu phải trước thời gian kết thúc giờ hành chính",
      officeEndBeforeMax: "Thời gian kết thúc giờ hành chính phải trước hoặc bằng thời gian kết thúc tối đa",
    },
    days: {
      mon: "T2",
      tue: "T3",
      wed: "T4",
      thu: "T5",
      fri: "T6",
      sat: "T7",
      sun: "CN",
    },
  },
  attendance: {
    checkIn: "Check In",
    checkOut: "Check Out",
    attendanceHistory: "Lịch sử chấm công",
    noAttendanceData: "Chưa có dữ liệu chấm công",
    checkInSuccess: "Check-in thành công",
    checkOutSuccess: "Check-out thành công",
    alreadyCheckedIn: "Bạn đã check-in cho ca làm việc này rồi",
    alreadyCheckedOut: "Bạn đã check-out cho ca làm việc này rồi",
    needCheckInFirst: "Bạn cần check-in trước khi check-out",
    noShiftsToCheckIn: "Không có ca làm việc nào được lên lịch cho hôm nay",
    chooseShift: "Chọn ca làm việc",
    multipleShiftsPrompt: "Bạn có nhiều ca làm việc hôm nay. Vui lòng chọn ca để check-in:",
    multipleCheckInsPrompt: "Bạn đã check-in cho nhiều ca làm việc. Vui lòng chọn ca để check-out:",
  },
  settings: {
    settings: "Cài đặt",
    interface: "Giao diện",
    notifications: "Thông báo",
    weather: "Thời tiết",
    data: "Dữ liệu",
    other: "Khác",
    multiButtonMode: "Chế độ nút đa năng",
    firstDayOfWeek: "Ngày bắt đầu tuần",
    timeFormat: "Định dạng giờ",
    theme: "Giao diện",
    alarmSound: "Âm thanh báo thức",
    alarmVibration: "Rung báo thức",
    shiftChangeReminder: "Nhắc đổi ca",
    weatherWarning: "Cảnh báo thời tiết",
    updateLocation: "Cập nhật vị trí",
    backupData: "Sao lưu dữ liệu",
    restoreData: "Phục hồi dữ liệu",
    language: "Ngôn ngữ",
    about: "Về ứng dụng",
    onlyGoWorkMode: "Chế độ Chỉ Đi Làm",
    options: {
      full: "Đầy đủ",
      simple: "Đơn giản",
      monday: "Thứ Hai",
      sunday: "Chủ Nhật",
      hour24: "24 giờ",
      hour12: "12 giờ",
      light: "Sáng",
      dark: "Tối",
      askWeekly: "Hỏi hàng tuần",
      autoRotate: "Tự động luân chuyển",
      disabled: "Tắt",
      vietnamese: "Tiếng Việt",
      english: "English",
      enabled: "Bật",
    },
    descriptions: {
      multiButton: "Chọn kiểu hiển thị của nút đa năng",
      alarmSound: "Bật/tắt âm thanh cho các thông báo dạng báo thức",
      alarmVibration: "Bật/tắt rung cho các thông báo dạng báo thức",
      weatherWarning: "Bật/tắt cảnh báo về điều kiện thời tiết cực đoan",
      updateLocation: "Sử dụng vị trí hiện tại để cập nhật dự báo thời tiết",
      backupData: "Xuất dữ liệu để sao lưu hoặc chuyển sang thiết bị khác",
      restoreData: "Nhập dữ liệu từ bản sao lưu",
      onlyGoWorkMode: "Chỉ hiển thị và cho phép bấm nút Đi Làm",
    },
  },
  weather: {
    currentLocation: "Vị trí hiện tại",
    updatedAt: "Cập nhật lúc",
    humidity: "Độ ẩm",
    wind: "Gió",
    loadingWeather: "Đang tải dữ liệu thời tiết...",
    locationDenied: "Quyền truy cập vị trí bị từ chối",
    weatherError: "Không thể lấy dữ liệu thời tiết. Vui lòng thử lại sau.",
    noWeatherData: "Không có dữ liệu thời tiết",
    loadData: "Tải dữ liệu",
    update: "Cập nhật",
    warnings: {
      highTemp: "Nhiệt độ cao bất thường, hãy uống nhiều nước",
      lowTemp: "Nhiệt độ thấp, hãy mặc ấm",
      thunderstorm: "Có giông bão, hãy cẩn thận khi di chuyển",
      heavyRain: "Mưa lớn, có thể gây ngập lụt",
    },
  },
  backup: {
    backupRestore: "Sao lưu & Phục hồi",
    backupData: "Sao lưu dữ liệu",
    restoreData: "Phục hồi dữ liệu",
    backupDescription:
      "Xuất dữ liệu của bạn để sao lưu hoặc chuyển sang thiết bị khác. Tệp sao lưu sẽ bao gồm tất cả cài đặt, ca làm việc, dữ liệu chấm công và ghi chú.",
    restoreDescription:
      "Nhập dữ liệu từ tệp sao lưu đã xuất trước đó. Lưu ý: Dữ liệu hiện tại sẽ bị ghi đè khi bạn nhập dữ liệu mới.",
    exportData: "Xuất dữ liệu",
    importData: "Nhập dữ liệu",
    backupWarning:
      "Hãy sao lưu dữ liệu thường xuyên để tránh mất dữ liệu khi thay đổi thiết bị hoặc gỡ cài đặt ứng dụng.",
    confirmRestore: "Xác nhận nhập dữ liệu",
    confirmRestoreMessage: "Dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
    importSuccess: "Dữ liệu đã được nhập thành công.",
    importError: "Không thể nhập dữ liệu. Tệp có thể bị hỏng hoặc không đúng định dạng.",
    sharingNotAvailable: "Chia sẻ không khả dụng",
    sharingNotAvailableMessage: "Thiết bị của bạn không hỗ trợ chia sẻ tệp.",
    processing: "Đang xử lý...",
  },
  alarm: {
    alarm: "Báo thức",
    timeToWork: "Đến giờ làm việc",
    shiftStartingSoon: "Ca {name} sẽ bắt đầu trong {minutes} phút nữa.",
    shiftEndingSoon: "Ca {name} sẽ kết thúc trong {minutes} phút nữa.",
    dismissAlarm: "Tắt báo thức",
    displayTime: "Thời gian hiển thị",
  },
  notes: {
    notes: "Ghi chú",
    addNote: "Thêm ghi chú",
    editNote: "Sửa ghi chú",
    title: "Tiêu đề",
    content: "Nội dung",
    reminderTime: "Thời gian nhắc nhở",
    associatedShifts: "Liên kết ca làm việc (Tùy chọn)",
    reminderDays: "Ngày nhắc nhở (nếu không theo ca)",
    noNotes: "Không có ghi chú nào",
    addNotePrompt: "Thêm ghi chú mới",
    deleteConfirm: "Bạn có chắc chắn muốn xóa ghi chú này?",
    saveConfirm: "Bạn có chắc muốn lưu ghi chú này?",
    validation: {
      titleRequired: "Vui lòng nhập tiêu đề (tối đa 100 ký tự).",
      contentRequired: "Vui lòng nhập nội dung (tối đa 300 ký tự).",
      reminderTimeRequired: "Vui lòng chọn thời gian nhắc nhở.",
      reminderDaysRequired: "Vui lòng chọn ít nhất 1 ngày nhắc nhở.",
      duplicateNote: "Ghi chú có tiêu đề và nội dung này đã tồn tại.",
    },
    characterCount: "{current}/{max}",
    nextReminder: "Nhắc nhở tiếp theo",
    today: "Hôm nay",
    tomorrow: "Ngày mai",
  },
}
