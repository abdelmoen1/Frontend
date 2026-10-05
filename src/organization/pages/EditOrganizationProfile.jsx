import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Factory,
  Globe2,
  Mail,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../shared/auth/useAuth";
import {
  getOrganizationProfile,
  updateOrganizationProfile,
} from "../services/organizationService";
import { ORGANIZATION_TYPES } from "../constants/organizationOptions";
import "../styles/OrganizationProfile.css";

const INITIAL_FORM = {
  email: "",
  organization_name: "",
  organization_type: "",
  industry: "",
  organization_description: "",
  location: "",
  website: "",
  contact_person: "",
};

function EditOrganizationProfile() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getOrganizationProfile()
      .then((profile) => {
        if (!isMounted) return;
        setForm({
          email: profile.email || "",
          organization_name: profile.organization_name || "",
          organization_type: profile.organization_type || "",
          industry: profile.industry || "",
          organization_description: profile.description || "",
          location: profile.location || "",
          website: profile.website || "",
          contact_person: profile.contact_person || "",
        });
      })
      .catch((requestError) => {
        console.error("تعذر تحميل بيانات المؤسسة للتعديل:", requestError);
        if (isMounted) {
          setError(requestError.message || "تعذر تحميل بيانات المؤسسة.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await updateOrganizationProfile({
        organization_name: form.organization_name.trim(),
        organization_type: form.organization_type,
        industry: form.industry.trim(),
        organization_description: form.organization_description.trim(),
        location: form.location.trim(),
        website: form.website.trim() || null,
        contact_person: form.contact_person.trim() || null,
      });
      await refreshUser();
      navigate("/organization/profile", {
        replace: true,
        state: { profileSaved: true },
      });
    } catch (saveError) {
      console.error("تعذر حفظ تعديلات ملف المؤسسة:", saveError);
      setError(saveError.message || "تعذر حفظ التعديلات. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="organization-profile-page organization-profile-edit-page" dir="rtl">
      <div className="organization-profile-toolbar">
        <Link className="organization-profile-back" to="/organization/profile">
          <ArrowRight size={16} aria-hidden="true" />
          العودة إلى الملف
        </Link>
      </div>

      <section className="organization-edit-card">
        <header className="organization-edit-header">
          <span className="organization-profile-avatar small">
            <Building2 size={22} aria-hidden="true" />
          </span>
          <div>
            <span className="organization-profile-eyebrow">إعدادات المؤسسة</span>
            <h1>تعديل الملف التعريفي</h1>
            <p>حدّث معلومات مؤسستك وبيانات التواصل الأساسية.</p>
          </div>
        </header>

        {isLoading ? (
          <div
            className="organization-edit-loading"
            aria-busy="true"
            aria-label="جارٍ تحميل بيانات المؤسسة"
          >
            <span />
            <span />
            <span />
          </div>
        ) : error && !form.organization_name ? (
          <div className="organization-profile-error" role="alert">
            <p>{error}</p>
            <Link to="/organization/profile">العودة إلى الملف التعريفي</Link>
          </div>
        ) : (
          <form className="organization-edit-form" onSubmit={handleSubmit}>
            <div className="organization-edit-section-title">
              <h2>المعلومات الأساسية</h2>
              <p>الحقول المعلّمة بنجمة مطلوبة.</p>
            </div>

            <div className="organization-edit-grid">
              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <Building2 size={15} aria-hidden="true" /> اسم المؤسسة *
                </span>
                <input
                  name="organization_name"
                  value={form.organization_name}
                  onChange={setField}
                  maxLength={255}
                  required
                />
              </label>

              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <Building2 size={15} aria-hidden="true" /> نوع المؤسسة *
                </span>
                <select
                  name="organization_type"
                  value={form.organization_type}
                  onChange={setField}
                  required
                >
                  <option value="">اختر نوع المؤسسة</option>
                  {ORGANIZATION_TYPES.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <Factory size={15} aria-hidden="true" /> مجال العمل *
                </span>
                <input
                  name="industry"
                  value={form.industry}
                  onChange={setField}
                  maxLength={255}
                  required
                />
              </label>

              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <MapPin size={15} aria-hidden="true" /> الموقع *
                </span>
                <input
                  name="location"
                  value={form.location}
                  onChange={setField}
                  maxLength={255}
                  required
                />
              </label>

              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <Globe2 size={15} aria-hidden="true" /> الموقع الإلكتروني
                </span>
                <input
                  name="website"
                  type="url"
                  value={form.website}
                  onChange={setField}
                  maxLength={255}
                  placeholder="https://example.com"
                />
              </label>

              <label className="organization-edit-field">
                <span className="organization-edit-label">
                  <UserRound size={15} aria-hidden="true" /> الشخص المسؤول
                </span>
                <input
                  name="contact_person"
                  value={form.contact_person}
                  onChange={setField}
                  maxLength={255}
                />
              </label>
            </div>

            <label className="organization-edit-field organization-edit-description">
              <span className="organization-edit-label">
                <Factory size={15} aria-hidden="true" /> نبذة عن المؤسسة *
              </span>
              <textarea
                name="organization_description"
                value={form.organization_description}
                onChange={setField}
                rows={5}
                maxLength={5000}
                required
              />
            </label>

            <div className="organization-edit-contact">
              <span className="organization-edit-label">
                <Mail size={15} aria-hidden="true" />
                البريد الإلكتروني للحساب
              </span>
              <span>{form.email || "غير متوفر"}</span>
              <small>يتم تغيير البريد الإلكتروني من إعدادات الحساب.</small>
            </div>

            {error && (
              <p className="organization-edit-error" role="alert">
                {error}
              </p>
            )}

            <div className="organization-edit-actions">
              <Link
                className="organization-edit-cancel"
                to="/organization/profile"
                aria-disabled={isSaving}
                onClick={(event) => {
                  if (isSaving) event.preventDefault();
                }}
              >
                إلغاء
              </Link>
              <button
                className="organization-profile-edit"
                type="submit"
                disabled={isSaving}
              >
                <Save size={16} aria-hidden="true" />
                {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default EditOrganizationProfile;
