import {
  getOrganizationProfile,
  updateOrganizationProfile,
} from "../services/organizationService";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CiLock } from "react-icons/ci";
import {
  FaRegBuilding,
  FaIndustry,
  FaMapMarkerAlt,
  FaGlobe,
  FaUserTie,
} from "react-icons/fa";

import InputFileds from "../components/common/InputFileds";
import TextareaField from "../components/common/TextareaField";
import StepIndicator from "../components/common/StepIndicator";
import SelectField from "../components/common/SelectField";

import "../AuthForm.css";
import logo from "../assets/logo.svg";

import { ORGANIZATION_TYPES } from "../constants/organizationOptions";

const STEPS = ["البيانات الأساسية", "بيانات الشركة"];

function OrganizationProfile() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    organization_name: "",
    organization_type: "",
    industry: "",
    organization_description: "",
    location: "",
    website: "",
    contact_person: "",
  });

  const [errorMsg, setErrorMsg] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getOrganizationProfile();

        setFormData((prev) => ({
          ...prev,
          email: data.email || "",
          organization_name: data.organization_name || "",
          organization_type: data.organization_type || "",
          industry: data.industry || "",
          organization_description: data.description || data.organization_description || "",
          location: data.location || "",
          website: data.website || "",
          contact_person: data.contact_person || "",
        }));
      } catch (error) {
        console.log("بيانات وهمية", error);

        try {
          const storedUser = JSON.parse(localStorage.getItem("auth_user"));

          if (storedUser) {
            setFormData((prev) => ({
              ...prev,
              email: storedUser.email || "",
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

  const handleNext = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.organization_name) {
      newErrors.organization_name = "اسم المؤسسة أو الشركة مطلوب";
    }

    setErrorMsg(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setCurrentStep(2);
  };

  const handlePrevious = () => {
    setErrorMsg({});
    setCurrentStep(1);
  };

  const handleSubmitStep2 = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.organization_type) newErrors.organization_type = "نوع الشركة مطلوب";
    if (!formData.industry) newErrors.industry = "مجالات الشركة مطلوبة";
    if (!formData.organization_description)
      newErrors.organization_description = "وصف الشركة مطلوب";
    if (!formData.location) newErrors.location = "موقع الشركة مطلوب";

    setErrorMsg(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    try {
      await updateOrganizationProfile({
        organization_name: formData.organization_name,
        organization_type: formData.organization_type,
        industry: formData.industry,
        organization_description: formData.organization_description,
        location: formData.location,
        website: formData.website,
        contact_person: formData.contact_person,
      });
      navigate("/");
    } catch (error) {
      console.log("فشل حفظ بيانات المؤسسة:", error);
      setErrorMsg({ submit: error.message || "حدث خطأ أثناء الحفظ، حاول مرة أخرى" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="background-image"></div>

      <main className="signin-page no-hero">
        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <img src={logo} alt="GoTrainee Logo" className="profile-logo" />

              <StepIndicator currentStep={currentStep} steps={STEPS} />

              <h1 className="animate-element delay-100 profile-step-title">
                إكمال ملف الشركة <span>{formData.email}</span>
              </h1>

              {currentStep === 1 && (
                <form
                  id="organizationProfileStep1"
                  className="signin-form"
                  onSubmit={handleNext}
                >
                  <InputFileds
                    label={"اسم المؤسسة أو الشركة الرسمي"}
                    icon={<FaRegBuilding className="input-icon" />}
                    type={"text"}
                    placeholder={"اسم المنشأة أو المؤسسة"}
                    name={"organization_name"}
                    value={formData.organization_name}
                    onChange={handleChange}
                    error={errorMsg.organization_name}
                  />

                  <InputFileds
                    label={"البريد الإلكتروني"}
                    icon={<CiLock className="input-icon" />}
                    type={"email"}
                    placeholder={"info@yourcompany.com"}
                    name={"email"}
                    value={formData.email}
                    onChange={handleChange}
                    disabled={true}
                  />

                  <div className="form-step-actions">
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
                  id="organizationProfileStep2"
                  className="signin-form"
                  onSubmit={handleSubmitStep2}
                >
                  <SelectField
                    label="نوع الشركة"
                    name="organization_type"
                    value={formData.organization_type}
                    onChange={handleChange}
                    options={ORGANIZATION_TYPES}
                    error={errorMsg.organization_type}
                    placeholder="اختر نوع الشركة"
                  />

                  <InputFileds
                    label={"مجالات الشركة"}
                    icon={<FaIndustry className="input-icon" />}
                    type={"text"}
                    placeholder={"مثال: تكنولوجيا المعلومات"}
                    name={"industry"}
                    value={formData.industry}
                    onChange={handleChange}
                    error={errorMsg.industry}
                  />

                  <TextareaField
                    label={"وصف الشركة"}
                    name={"organization_description"}
                    placeholder={"نبذة مختصرة عن الشركة ونشاطها"}
                    value={formData.organization_description}
                    onChange={handleChange}
                    error={errorMsg.organization_description}
                  />

                  <InputFileds
                    label={"موقع الشركة"}
                    icon={<FaMapMarkerAlt className="input-icon" />}
                    type={"text"}
                    placeholder={"غزة، فلسطين"}
                    name={"location"}
                    value={formData.location}
                    onChange={handleChange}
                    error={errorMsg.location}
                  />

                  <InputFileds
                    label={"الموقع الإلكتروني الخاص بالشركة"}
                    icon={<FaGlobe className="input-icon" />}
                    type={"url"}
                    placeholder={"https://example.com"}
                    name={"website"}
                    value={formData.website}
                    onChange={handleChange}
                    error={errorMsg.website}
                  />

                  <InputFileds
                    label={"مدير الشركة"}
                    icon={<FaUserTie className="input-icon" />}
                    type={"text"}
                    placeholder={"اسم الشخص المسؤول"}
                    name={"contact_person"}
                    value={formData.contact_person}
                    onChange={handleChange}
                    error={errorMsg.contact_person}
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
                      {submitting ? "...يتم الحفظ" : "إنهاء"}
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

export default OrganizationProfile;