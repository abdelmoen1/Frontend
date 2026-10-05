import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Factory,
  Globe2,
  Mail,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import { getOrganizationProfile } from "../services/organizationService";
import "../styles/OrganizationProfile.css";

function ProfileField({ icon: Icon, label, children }) {
  return (
    <div className="organization-profile-field">
      <span className="organization-profile-field-icon">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div>
        <span className="organization-profile-field-label">{label}</span>
        <div className="organization-profile-field-value">{children}</div>
      </div>
    </div>
  );
}

function OrganizationProfilePage() {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getOrganizationProfile()
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((requestError) => {
        console.error("تعذر تحميل الملف التعريفي للمؤسسة:", requestError);
        if (isMounted) {
          setError(requestError.message || "تعذر تحميل الملف التعريفي.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main
        className="organization-profile-page"
        aria-busy="true"
        aria-label="جارٍ تحميل الملف التعريفي"
      >
        <div className="organization-profile-skeleton" />
        <div className="organization-profile-skeleton details" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="organization-profile-page">
        <div className="organization-profile-error" role="alert">
          <p>{error || "لم يتم العثور على بيانات الملف التعريفي."}</p>
          <Link to="/organization/dashboard">العودة إلى لوحة التحكم</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="organization-profile-page" dir="rtl">
      <div className="organization-profile-toolbar">
        <Link className="organization-profile-back" to="/organization/dashboard">
          <ArrowRight size={16} aria-hidden="true" />
          لوحة التحكم
        </Link>
        <Link
          className="organization-profile-edit"
          to="/organization/profile/edit"
        >
          <Pencil size={15} aria-hidden="true" />
          تعديل الملف
        </Link>
      </div>

      {location.state?.profileSaved && (
        <p className="organization-profile-saved" role="status">
          تم حفظ تعديلات الملف التعريفي بنجاح.
        </p>
      )}

      <section className="organization-profile-hero">
        <div className="organization-profile-avatar" aria-hidden="true">
          <Building2 size={28} />
        </div>
        <div className="organization-profile-identity">
          <span className="organization-profile-eyebrow">الملف التعريفي</span>
          <h1>{profile.organization_name || "مؤسستك"}</h1>
          <div className="organization-profile-tags">
            {profile.organization_type && (
              <span>{profile.organization_type}</span>
            )}
            {profile.industry && <span>{profile.industry}</span>}
            {profile.location && (
              <span>
                <MapPin size={13} aria-hidden="true" />
                {profile.location}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="organization-profile-content">
        <section className="organization-profile-section">
          <div className="organization-profile-section-heading">
            <div>
              <span className="organization-profile-eyebrow">نبذة</span>
              <h2>عن المؤسسة</h2>
            </div>
          </div>
          <p className="organization-profile-description">
            {profile.description?.trim() || "لم تتم إضافة نبذة عن المؤسسة بعد."}
          </p>
        </section>

        <section className="organization-profile-section">
          <div className="organization-profile-section-heading">
            <div>
              <span className="organization-profile-eyebrow">معلومات التواصل</span>
              <h2>بيانات المؤسسة</h2>
            </div>
          </div>
          <div className="organization-profile-fields">
            <ProfileField icon={Factory} label="مجال العمل">
              {profile.industry || "لم تتم الإضافة"}
            </ProfileField>
            <ProfileField icon={MapPin} label="الموقع">
              {profile.location || "لم تتم الإضافة"}
            </ProfileField>
            <ProfileField icon={Mail} label="البريد الإلكتروني">
              {profile.email ? (
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              ) : (
                "لم تتم الإضافة"
              )}
            </ProfileField>
            <ProfileField icon={UserRound} label="الشخص المسؤول">
              {profile.contact_person || "لم تتم الإضافة"}
            </ProfileField>
            <ProfileField icon={Globe2} label="الموقع الإلكتروني">
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer">
                  {profile.website}
                  <ExternalLink size={13} aria-label="يفتح في نافذة جديدة" />
                </a>
              ) : (
                "لم تتم الإضافة"
              )}
            </ProfileField>
          </div>
        </section>
      </div>
    </main>
  );
}

export default OrganizationProfilePage;
