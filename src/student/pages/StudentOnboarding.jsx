import {
  getStudentOnboarding,
  updateStudentOnboarding,
  addStudentSkill,
  completeStudentOnboarding,
} from "../services/studentService";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";

import { CiLock, CiUser } from "react-icons/ci";
import { FaUniversity, FaGraduationCap, FaCalendarAlt } from "react-icons/fa";

import HeroAuthForm from "../../shared/components/HeroAuthForm";
import InputFileds from "../../shared/components/InputFileds";
import StepIndicator from "../../shared/components/StepIndicator";
import SelectField from "../../shared/components/SelectField";
import PhoneField, { COUNTRY_CODES } from "../../shared/components/PhoneField";
import SkillsSelect from "../components/SkillsSelect";

import "../../shared/styles/AuthForm.css";
import logo from "../../shared/assets/logo.svg";

import {
  UNIVERSITIES,
  ACADEMIC_MAJORS,
  getGraduationYears,
} from "../constants/academicOptions";

const STEPS = ["البيانات الشخصية", "البيانات الأكاديمية والمهارات"];

function splitPhone(fullPhone) {
  if (!fullPhone) return { phone_code: "+970", phone: "" };

  const matchedCode = COUNTRY_CODES.find((code) => fullPhone.startsWith(code));

  if (matchedCode) {
    return {
      phone_code: matchedCode,
      phone: fullPhone.slice(matchedCode.length),
    };
  }

  return { phone_code: "+970", phone: fullPhone };
}

function StudentOnboarding() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    university: "",
    academic_major: "",
    graduation_year: "",
    phone: "",
    phone_code: "+970",
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [errorMsg, setErrorMsg] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getStudentOnboarding();
        const { phone_code, phone } = splitPhone(data.phone);

        setFormData((prev) => ({
          ...prev,
          email: data.email || "",
          name: data.name || "",
          university: data.university || "",
          academic_major: data.academic_major || "",
          graduation_year: data.graduation_year || "",
          phone_code,
          phone,
        }));
      } catch (error) {
        console.log("بيانات وهمية", error);

        try {
          const storedUser = JSON.parse(localStorage.getItem("auth_user"));

          if (storedUser) {
            setFormData((prev) => ({
              ...prev,
              email: storedUser.email || "",
              name: storedUser.name || "",
            }));
          }
        } catch (innerError) {
          console.log(innerError);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhoneCodeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      phone_code: e.target.value,
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.name) {
      newErrors.name = "الاسم الكامل مطلوب";
    }

    setErrorMsg(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setCurrentStep(2);
  };

  const handlePrevious = () => {
    setErrorMsg({});
    setCurrentStep(1);
  };

  const handleCancel = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout on cancel:", error);
    } finally {
      navigate("/", { replace: true });
    }
  };

  const handleSubmitStep2 = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.university) {
      newErrors.university = "الجامعة/الكلية مطلوبة";
    } else if (!formData.academic_major) {
      newErrors.academic_major = "التخصص الجامعي مطلوب";
    } else if (!formData.graduation_year) {
      newErrors.graduation_year = "سنة التخرج مطلوبة";
    } else if (formData.phone && !/^\d{7,9}$/.test(formData.phone)) {
      newErrors.phone = "رقم الهاتف غير صحيح";
    } else if (selectedSkills.length === 0) {
      newErrors.skills = "الرجاء إضافة مهارة واحدة على الأقل";
    }

    setErrorMsg(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setErrorMsg({});

    try {
      await updateStudentOnboarding({
        university: formData.university,
        academic_major: formData.academic_major,
        graduation_year: formData.graduation_year,
        phone: formData.phone
          ? `${formData.phone_code}${formData.phone}`
          : null,
      });

      await Promise.all(
        selectedSkills.map((skill) => addStudentSkill(skill.id)),
      );
      await completeStudentOnboarding();
      await refreshUser();
      navigate("/loading", { replace: true });
    } catch (error) {
      console.error("Failed to save student profile:", error);

      setErrorMsg({
        submit: error.message || "حدث خطأ أثناء حفظ البيانات، حاول مرة أخرى",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="background-image"></div>

      <main
        className={`signin-page ${currentStep === 1 ? "" : "resize-height"}`}
      >
        <HeroAuthForm isProfile={true} currentStep={currentStep} />

        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <img src={logo} alt="GoTrainee Logo" className="profile-logo" />

              <StepIndicator currentStep={currentStep} steps={STEPS} />

              <h1 className="animate-element delay-100 profile-step-title">
                إكمال الملف الشخصي للطالب <span>{formData.email}</span>
              </h1>

              {currentStep === 1 && (
                <form
                  id="studentProfileStep1"
                  className="signin-form"
                  onSubmit={handleNext}
                >
                  <InputFileds
                    label={"البريد الإلكتروني"}
                    icon={<CiLock className="input-icon" />}
                    type={"email"}
                    placeholder={"student@iugaza.edu.ps"}
                    name={"email"}
                    value={formData.email}
                    onChange={handleChange}
                    disabled={true}
                  />

                  <InputFileds
                    label={"الاسم الكامل"}
                    icon={<CiUser className="input-icon" />}
                    type={"text"}
                    placeholder={"أحمد محمد النجار"}
                    name={"name"}
                    value={formData.name}
                    onChange={handleChange}
                    error={errorMsg.name}
                  />

                  <div className="form-step-actions">
                    <button
                      className="signin-button cancel-button animate-element delay-600"
                      type="button"
                      onClick={handleCancel}
                    >
                      إلغاء
                    </button>
                    <button
                      className="signin-button next-button animate-element delay-600"
                      type="submit"
                    >
                      التالي
                    </button>
                  </div>
                </form>
              )}

              {currentStep === 2 && (
                <form
                  id="studentProfileStep2"
                  className="signin-form"
                  onSubmit={handleSubmitStep2}
                >
                  <SelectField
                    label="الجامعة / الكلية"
                    icon={<FaUniversity className="input-icon" />}
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    options={UNIVERSITIES}
                    error={errorMsg.university}
                    placeholder="اختر جامعتك أو كليتك"
                  />

                  <SelectField
                    label="التخصص الجامعي"
                    icon={<FaGraduationCap className="input-icon" />}
                    name="academic_major"
                    value={formData.academic_major}
                    onChange={handleChange}
                    options={ACADEMIC_MAJORS}
                    error={errorMsg.academic_major}
                    placeholder="اختر تخصصك الجامعي"
                  />

                  <SelectField
                    label="سنة التخرج / المتوقعة"
                    icon={<FaCalendarAlt className="input-icon" />}
                    name="graduation_year"
                    value={formData.graduation_year}
                    onChange={handleChange}
                    options={getGraduationYears()}
                    error={errorMsg.graduation_year}
                    placeholder=" سنة التخرج "
                  />
                  <PhoneField
                    label="رقم الهاتف المحمول"
                    name="phone"
                    value={formData.phone}
                    phoneCode={formData.phone_code}
                    onChange={handleChange}
                    onCodeChange={handlePhoneCodeChange}
                    error={errorMsg.phone}
                  />

                  <SkillsSelect
                    label="المهارات"
                    selectedSkills={selectedSkills}
                    onChange={setSelectedSkills}
                    error={errorMsg.skills}
                  />

                  {errorMsg.submit && (
                    <span className="error-message">{errorMsg.submit}</span>
                  )}

                  <div className="form-step-actions">
                    <button
                      type="button"
                      className="signin-button prev-button animate-element delay-600"
                      onClick={handlePrevious}
                      disabled={submitting}
                    >
                      السابق
                    </button>
                    <button
                      className="signin-button next-button animate-element delay-600"
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? "يتم الحفظ" : "إنهاء"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default StudentOnboarding;
