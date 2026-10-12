import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CiLock, CiUser } from "react-icons/ci";
import { FaCalendarAlt, FaInfoCircle, FaUniversity } from "react-icons/fa";

import { completeStudentOnboarding, getSpecializations, getStudentOnboarding } from "../services/studentService";
import { useAuth } from "../../shared/auth/useAuth";
import { userMessage } from "../../shared/utils/apiErrors";

import HeroAuthForm from "../../shared/components/HeroAuthForm";
import InputFileds from "../../shared/components/InputFileds";
import StepIndicator from "../../shared/components/StepIndicator";
import SelectField from "../../shared/components/SelectField";
import PhoneField, { COUNTRY_CODES } from "../../shared/components/PhoneField";
import SkillChipsInput from "../components/SkillChipsInput";
import SpecializationPicker from "../components/SpecializationPicker";

import "../../shared/styles/AuthForm.css";
import "../styles/StudentOnboarding.css";
import logo from "../../shared/assets/logo.svg";

import { UNIVERSITIES, getGraduationYears } from "../constants/academicOptions";
import {
  MAX_SKILLS,
  ONBOARDING_STEPS,
  findSpecialization,
  joinPhone,
  keepSkillsWithin,
  serverFieldErrors,
  splitPhone,
  stepOfErrors,
  validateStep,
} from "../utils/onboarding";

const LAST_STEP = ONBOARDING_STEPS.length - 1;

const focusField = (field) => {
  const id = field === "skills" ? "skills" : field;
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
};

function StudentOnboarding() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();

  const [step, setStep] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    phone_code: COUNTRY_CODES[0],
    university: "",
    graduation_year: "",
    professional_specialization: "",
    skills: [],
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [skillsNotice, setSkillsNotice] = useState("");

  // قائمة التخصصات ومهارات كل تخصص من الخادم
  const [specializations, setSpecializations] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");

  const loadCatalog = useCallback(async () => {
    setCatalogStatus("loading");
    try {
      const list = await getSpecializations();
      setSpecializations(Array.isArray(list) ? list : []);
      setCatalogStatus("ready");
      return Array.isArray(list) ? list : [];
    } catch {
      setCatalogStatus("error");
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [profile, catalog] = await Promise.all([getStudentOnboarding().catch(() => null), loadCatalog()]);
      if (!active) return;

      if (profile) {
        const specialization = findSpecialization(catalog, profile.professional_specialization);
        setForm((prev) => ({
          ...prev,
          email: profile.email || "",
          name: profile.name || "",
          ...splitPhone(profile.phone, COUNTRY_CODES),
          university: profile.university || "",
          graduation_year: profile.graduation_year || "",
          // تخصص محفوظ لم يعد في القائمة يُعامل كغير مختار
          professional_specialization: specialization ? specialization.key : "",
          skills: specialization ? keepSkillsWithin(profile.skills, specialization.skills) : [],
        }));
      } else {
        try {
          const storedUser = JSON.parse(localStorage.getItem("auth_user"));
          if (storedUser) {
            setForm((prev) => ({ ...prev, email: storedUser.email || "", name: storedUser.name || "" }));
          }
        } catch {
          // بيانات محلية تالفة: يكتب الطالب بياناته يدويًا
        }
      }
      setLoadingProfile(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [loadCatalog]);

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleChange = (event) => setField(event.target.name, event.target.value);

  const handleSpecialization = (key) => {
    const specialization = findSpecialization(specializations, key);
    const kept = keepSkillsWithin(form.skills, specialization?.skills);
    const dropped = form.skills.length - kept.length;
    setSkillsNotice(
      dropped > 0 ? `أُزيلت ${dropped === 1 ? "مهارة واحدة لا تتبع" : `${dropped} مهارات لا تتبع`} تخصص ${specialization?.title || ""}.` : "",
    );
    setForm((prev) => ({ ...prev, professional_specialization: key, skills: kept }));
    clearError("professional_specialization");
  };

  const handleSkills = (skills) => {
    setSkillsNotice("");
    setField("skills", skills);
  };

  const goTo = (index) => {
    setStep(index);
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout from onboarding:", error);
    } finally {
      navigate("/", { replace: true });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    const firstInvalid = Object.keys(stepErrors)[0];
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    if (step < LAST_STEP) {
      goTo(step + 1);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await completeStudentOnboarding({
        name: form.name.trim(),
        phone: joinPhone(form.phone_code, form.phone),
        university: form.university,
        graduation_year: form.graduation_year,
        professional_specialization: form.professional_specialization,
        skill_ids: form.skills.map((skill) => skill.id),
      });
      await refreshUser();
      navigate("/loading", { replace: true });
    } catch (error) {
      const fields = serverFieldErrors(error);
      const target = stepOfErrors(fields);
      if (target >= 0) {
        setErrors(fields);
        setStep(target);
        setSubmitError("راجع الحقول المظللة ثم أعد المحاولة.");
        focusField(Object.keys(fields).find((field) => ONBOARDING_STEPS[target].fields.includes(field)));
      } else {
        setSubmitError(userMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const current = ONBOARDING_STEPS[step];
  const specialization = findSpecialization(specializations, form.professional_specialization);
  const universities =
    form.university && !UNIVERSITIES.includes(form.university) ? [form.university, ...UNIVERSITIES] : UNIVERSITIES;

  return (
    <>
      <div className="background-image"></div>

      <main className={`signin-page student-onboarding ${step === 0 ? "" : "resize-height"}`}>
        <HeroAuthForm isProfile={true} currentStep={step === 0 ? 1 : 2} />

        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <img src={logo} alt="GoTrainee Logo" className="profile-logo" />

              <StepIndicator currentStep={step + 1} steps={ONBOARDING_STEPS.map((item) => item.title)} />

              <header className="onboarding-head animate-element delay-100">
                <span className="onboarding-eyebrow">
                  الخطوة {step + 1} من {ONBOARDING_STEPS.length}
                </span>
                <h1 className="profile-step-title">{current.heading}</h1>
                <p className="onboarding-hint">{current.hint}</p>
              </header>

              {loadingProfile ? (
                <div className="onboarding-loading" role="status">
                  <span className="auth-spinner auth-spinner-dark" aria-hidden="true" />
                  جارٍ تحميل بياناتك...
                </div>
              ) : (
                <form
                  id={`studentProfileStep${step + 1}`}
                  className="signin-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  {step === 0 && (
                    <>
                      <InputFileds
                        label="الاسم الكامل"
                        icon={<CiUser className="input-icon" />}
                        placeholder="أحمد محمد النجار"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        error={errors.name}
                        autoComplete="name"
                      />

                      <InputFileds
                        label="البريد الإلكتروني"
                        icon={<CiLock className="input-icon" />}
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={true}
                      />

                      <PhoneField
                        label="رقم الجوال (اختياري)"
                        name="phone"
                        value={form.phone}
                        phoneCode={form.phone_code}
                        onChange={handleChange}
                        onCodeChange={(event) => setField("phone_code", event.target.value)}
                        error={errors.phone}
                      />
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <SelectField
                        label="الجامعة / الكلية"
                        icon={<FaUniversity className="input-icon" />}
                        name="university"
                        value={form.university}
                        onChange={handleChange}
                        options={universities}
                        error={errors.university}
                        placeholder="اختر جامعتك أو كليتك"
                      />

                      <SelectField
                        label="سنة التخرج أو السنة المتوقعة"
                        icon={<FaCalendarAlt className="input-icon" />}
                        name="graduation_year"
                        value={form.graduation_year}
                        onChange={handleChange}
                        options={getGraduationYears()}
                        error={errors.graduation_year}
                        placeholder="اختر السنة"
                      />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <SpecializationPicker
                        specializations={specializations}
                        value={form.professional_specialization}
                        onChange={handleSpecialization}
                        error={errors.professional_specialization}
                        status={catalogStatus}
                        onRetry={loadCatalog}
                      />

                      <SkillChipsInput
                        label="المهارات"
                        options={specialization?.skills ?? []}
                        selected={form.skills}
                        onChange={handleSkills}
                        max={MAX_SKILLS}
                        error={errors.skills}
                        disabled={!specialization}
                        disabledHint="اختر تخصصك أولًا لتظهر مهاراته."
                        contextLabel={specialization ? `تخصص ${specialization.title || specialization.label}` : ""}
                      />

                      {skillsNotice && (
                        <p className="onboarding-note" role="status">
                          {skillsNotice}
                        </p>
                      )}

                      <p className="onboarding-note">
                        <FaInfoCircle aria-hidden="true" />
                        <span>
                          اختيار المهارة هنا لا يعني أنها مُثبتة؛ ستثبتها لاحقًا من صفحة تقييم المهارات لتظهر لك
                          المشاريع المناسبة.
                        </span>
                      </p>
                    </>
                  )}

                  {submitError && (
                    <div className="auth-alert" role="alert">
                      {submitError}
                    </div>
                  )}

                  <div className="form-step-actions">
                    {step === 0 ? (
                      <button className="signin-button cancel-button" type="button" onClick={handleLogout}>
                        تسجيل الخروج
                      </button>
                    ) : (
                      <button
                        className="signin-button prev-button"
                        type="button"
                        onClick={() => goTo(step - 1)}
                        disabled={submitting}
                      >
                        السابق
                      </button>
                    )}

                    <button className="signin-button next-button" type="submit" disabled={submitting}>
                      {step < LAST_STEP ? (
                        "التالي"
                      ) : submitting ? (
                        <>
                          <span className="auth-spinner" aria-hidden="true" />
                          جارٍ الحفظ...
                        </>
                      ) : (
                        "إنهاء وحفظ"
                      )}
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
