import Swal from "sweetalert2";

import "../styles/Alerts.css";

// تنسيق نوافذ SweetAlert بخطوط وأزرار التطبيق بدل تنسيق المكتبة الافتراضي
const classesFor = (tone) => ({
  popup: "gt-swal",
  title: "gt-swal-title",
  htmlContainer: "gt-swal-text",
  actions: "gt-swal-actions",
  confirmButton: `gt-swal-btn gt-swal-confirm gt-swal-confirm-${tone}`,
  cancelButton: "gt-swal-btn gt-swal-cancel",
  validationMessage: "gt-swal-error",
});

/**
 * يفتح نافذة SweetAlert موحّدة التنسيق.
 * tone: "primary" للإجراءات العادية أو "danger" للإجراءات الخطرة كالحذف.
 */
export const showAlert = ({ tone = "primary", ...options } = {}) =>
  Swal.fire({
    buttonsStyling: false,
    reverseButtons: true,
    ...options,
    customClass: classesFor(tone),
  });

export { Swal };
