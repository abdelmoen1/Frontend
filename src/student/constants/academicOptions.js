export const UNIVERSITIES = [
  "الجامعة الإسلامية بغزة",
  "جامعة الأزهر - غزة",
  "جامعة الأقصى",
  "جامعة فلسطين",
  "جامعة القدس المفتوحة",
  "الكلية الجامعية للعلوم التطبيقية",
  "أخرى",
];

export const ACADEMIC_MAJORS = [
  "هندسة الحاسوب",
  "علوم الحاسوب",
  "نظم المعلومات",
  "هندسة البرمجيات",
  "هندسة حاسوب واتصالات",
  "إدارة الأعمال",
  "المحاسبة والتمويل",
  "الهندسة الكهربائية",
  "أخرى",
];
export const getGraduationYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y <= currentYear + 6; y++) {
    years.push(String(y));
  }
  return years;
};
