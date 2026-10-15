import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Code2,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Quote,
  Search,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FaGithub as Github, FaLinkedinIn as Linkedin } from "react-icons/fa";
import {
  addStudentSkill,
  deleteStudentSkill,
  getAssessments,
  getAvailableSkills,
  getSpecializations,
  getStudentProfile,
  getStudentSkills,
  updateStudentProfile,
  updateStudentSkill,
} from "../services/studentService";
import { resolveMediaUrl } from "../../shared/utils/resolveMediaUrl";
import { ACADEMIC_MAJORS } from "../constants/academicOptions";
import {
  ASSESSMENTS_PATH,
  COOLDOWN_MESSAGE,
  markSkillAssessed,
  profileSkillsView,
  sessionPath,
} from "../utils/assessments";
import "../styles/UpdateStudentProfile.css";

const EMPTY_PROFILE = {
  name: "",
  bio: "",
  status: "student",
  phone: "",
  university: "",
  academic_major: "",
  professional_specialization: "",
  professional_specialization_label: "",
  graduation_year: "",
  linkedin_url: "",
  github_url: "",
  // ساعات التفرغ الأسبوعية للمشاريع؛ مدخل "التوفر" في مطابقة المرشحين ("" = غير محدد)
  weekly_availability_hours: "",
  email: "",
  image_url: "",
  location: "",
  portfolio: [],
  external_links: [],
  certifications: [],
  testimonials: [],
};

const normalizeProfile = (profile = {}) => {
  const normalized = { ...EMPTY_PROFILE, ...profile };

  for (const field of [
    "name",
    "bio",
    "phone",
    "university",
    "academic_major",
    "professional_specialization",
    "professional_specialization_label",
    "linkedin_url",
    "github_url",
    "email",
    "image_url",
    "location",
  ]) {
    if (typeof normalized[field] !== "string") normalized[field] = "";
  }

  if (typeof normalized.status !== "string" || !normalized.status) {
    normalized.status = EMPTY_PROFILE.status;
  }

  for (const field of [
    "portfolio",
    "external_links",
    "certifications",
    "testimonials",
  ]) {
    if (!Array.isArray(normalized[field])) normalized[field] = [];
  }

  normalized.image_url = resolveMediaUrl(normalized.image_url);
  normalized.portfolio = normalized.portfolio.map((project) => ({
    ...project,
    image_url: resolveMediaUrl(project.image_url),
  }));

  return normalized;
};

// التخصص الجامعي يُختار من قائمة المنصة (مطابقة المشاريع تعتمد على المسار المهني لا عليه). قيمة قديمة
// مكتوبة نصًا حرًا تبقى ظاهرة كخيار مستقل حتى لا تُفقد عند الحفظ، مع توضيح أنها خارج القائمة.
function majorOptions(current) {
  const options = ACADEMIC_MAJORS.map((major) => major.trim());
  const value = (current || "").trim();
  if (!value || options.includes(value)) return options.map((major) => ({ value: major, label: major }));
  return [
    ...options.map((major) => ({ value: major, label: major })),
    { value, label: `${value} (غير موجود في القائمة)` },
  ];
}

const PROFICIENCY_LABELS = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  expert: "خبير",
};

function ProfileSkeleton() {
  return (
    <main
      className="student-profile-page"
      aria-busy="true"
      aria-label="جارٍ تحميل الملف الشخصي"
    >
      <div className="student-profile-skeleton student-profile-skeleton-hero" />
      <div className="student-profile-skeleton-grid">
        <div className="student-profile-skeleton student-profile-skeleton-main" />
        <div className="student-profile-skeleton student-profile-skeleton-side" />
      </div>
    </main>
  );
}

function ProficiencyIndicator({ proficiency }) {
  const level = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  }[proficiency] || 2;

  return (
    <span
      className="student-skill-proficiency"
      aria-label={`مستوى الإتقان: ${PROFICIENCY_LABELS[proficiency] || "متوسط"}`}
    >
      <span className="student-skill-proficiency-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((dot) => (
          <span
            className={dot <= level ? "active" : ""}
            key={dot}
          />
        ))}
      </span>
      <span>{PROFICIENCY_LABELS[proficiency] || "متوسط"}</span>
    </span>
  );
}

// شارة حالة التقييم بألوان صفحة التقييم نفسها (success/danger/warning/neutral)
function SkillBadge({ tone = "neutral", icon: Icon, children }) {
  return (
    <span className={`sp-badge sp-badge-${tone}`}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}

function SkillAssessmentCard({ skill }) {
  const { latest, availability } = skill;

  return (
    <li className={`sp-skill sp-skill-${availability.state}`}>
      <div className="sp-skill-head">
        <span className="sp-skill-icon" aria-hidden="true">
          <Code2 size={18} />
        </span>
        <div className="sp-skill-title">
          <h3>
            <bdi>{skill.name}</bdi>
          </h3>
          {skill.selfLevelLabel && <small>تقديرك الذاتي: {skill.selfLevelLabel}</small>}
        </div>
        {skill.verifiedLevel ? (
          <SkillBadge tone="success" icon={BadgeCheck}>
            مستوى مثبت: {skill.verifiedLevelLabel}
          </SkillBadge>
        ) : (
          availability.state !== "unknown" && <SkillBadge>غير مثبتة بعد</SkillBadge>
        )}
      </div>

      {latest ? (
        <>
          <dl className="sp-skill-result" aria-label={`آخر تقييم لمهارة ${skill.name}`}>
            <div>
              <dt>آخر نتيجة</dt>
              <dd>
                <SkillBadge tone={latest.tone}>{latest.label}</SkillBadge>
              </dd>
            </div>
            <div>
              <dt>صعوبة الاختبار</dt>
              <dd>{latest.levelLabel || "—"}</dd>
            </div>
            <div>
              <dt>الدرجة</dt>
              <dd>{latest.score !== null ? `${latest.score}%` : "—"}</dd>
            </div>
            <div>
              <dt>تاريخ التقييم</dt>
              <dd>{latest.assessedAt || "—"}</dd>
            </div>
          </dl>
          {latest.reason && <p className="sp-skill-note">{latest.reason}</p>}
        </>
      ) : (
        ["ready", "cooldown"].includes(availability.state) && (
          <p className="sp-skill-note">لم تُقيَّم هذه المهارة بعد.</p>
        )
      )}
      {skill.practicalPending && (
        <p className="sp-skill-note">اجتزت الجانب المعرفي؛ هذه مهارة عملية تحتاج تحققًا من إدارة المنصة لتُثبت.</p>
      )}

      {(availability.state !== "unknown" || latest?.sessionId) && (
        <div className="sp-skill-foot">
          {availability.state === "cooldown" && (
            <span className="sp-skill-wait">
              <Clock3 size={14} aria-hidden="true" />
              متاحة لإعادة التقييم في {availability.availableAt}
              {availability.remaining ? ` (بعد ${availability.remaining})` : ""}
            </span>
          )}
          {availability.state === "unavailable" && <span className="sp-skill-muted">{availability.text}</span>}
          {availability.state === "ready" && (
            <Link className="sp-skill-action" to={availability.link}>
              <ClipboardCheck size={14} aria-hidden="true" />
              {availability.label}
            </Link>
          )}
          {latest?.sessionId && (
            <Link className="sp-skill-link" to={sessionPath(latest.sessionId)}>
              <MessageSquareText size={14} aria-hidden="true" />
              النتيجة وملاحظات المصحح
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function StudentProfileView({ profile, skills, assessments, onEdit }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const filters = [
    { id: "all", label: "الكل" },
    { id: "web", label: "تطوير الويب" },
    { id: "design", label: "تصميم" },
    { id: "other", label: "أخرى" },
  ];
  const projects =
    activeFilter === "all"
      ? profile.portfolio
      : profile.portfolio.filter((project) => project.category === activeFilter);
  const skillViews = profileSkillsView(skills, assessments.state === "ready" ? assessments.skills : null);
  const verifiedCount = skillViews.filter((skill) => skill.verifiedLevel).length;
  const coolingCount = skillViews.filter((skill) => skill.availability.state === "cooldown").length;
  const details = [
    { icon: Building2, label: "الجامعة / الكلية", value: profile.university },
    { icon: GraduationCap, label: "التخصص الجامعي", value: profile.academic_major },
    { icon: CalendarDays, label: "سنة التخرج", value: profile.graduation_year },
    {
      icon: Clock3,
      label: "التفرغ للمشاريع",
      value: profile.weekly_availability_hours ? `${profile.weekly_availability_hours} ساعة أسبوعيًا` : "",
    },
    { icon: MapPin, label: "الموقع", value: profile.location },
  ].filter((item) => item.value);
  const hasContact =
    profile.email || profile.phone || profile.linkedin_url || profile.github_url || profile.external_links.length > 0;

  return (
    <main className="student-profile-page sp" dir="rtl">
      <section className="sp-hero" aria-labelledby="sp-name">
        <div className="sp-hero-cover" aria-hidden="true" />
        <div className="sp-hero-body">
          {profile.image_url ? (
            <img className="sp-avatar" src={profile.image_url} alt={`صورة ${profile.name}`} />
          ) : (
            <span className="sp-avatar sp-avatar-fallback">
              <UserRound size={34} aria-hidden="true" />
            </span>
          )}
          <div className="sp-identity">
            <h1 id="sp-name">{profile.name || "ملفي الشخصي"}</h1>
            <p className="sp-role">
              {profile.professional_specialization_label || "لم تحدد مسارك المهني بعد"}
            </p>
            <span className="sp-chip">{profile.status === "graduated" ? "خريج" : "طالب"}</span>
          </div>
          <button className="student-profile-primary-button sp-edit" type="button" onClick={onEdit}>
            <Pencil size={15} aria-hidden="true" />
            تعديل الملف
          </button>
        </div>
      </section>

      <div className="sp-layout">
        <aside className="sp-side">
          <section className="sp-card sp-about-card" aria-labelledby="sp-about-title">
            <h2 id="sp-about-title">نبذة تعريفية</h2>
            <p className="sp-bio">{profile.bio || "لم تتم إضافة نبذة تعريفية بعد."}</p>
            {details.length > 0 && (
              <dl className="sp-details">
                {details.map((item) => (
                  <div key={item.label}>
                    <dt>
                      <item.icon size={15} aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="sp-card sp-contact-card" aria-labelledby="sp-contact-title">
            <h2 id="sp-contact-title">التواصل</h2>
            {hasContact ? (
              <div className="sp-contact">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}>
                    <Mail size={16} aria-hidden="true" />
                    <span dir="ltr">{profile.email}</span>
                  </a>
                )}
                {profile.phone && (
                  <a href={`tel:${profile.phone}`}>
                    <Phone size={16} aria-hidden="true" />
                    <span dir="ltr">{profile.phone}</span>
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                    <Linkedin size={16} aria-hidden="true" />
                    <span>LinkedIn</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noreferrer">
                    <Github size={16} aria-hidden="true" />
                    <span>GitHub</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
                {profile.external_links.map((link, index) => (
                  <a href={link.url} key={`${link.label}-${index}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden="true" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="sp-empty">لم تُضف وسائل تواصل بعد.</p>
            )}
          </section>
        </aside>

        <div className="sp-main">
          <section className="sp-card" aria-labelledby="sp-skills-title">
            <header className="sp-card-head">
              <div>
                <h2 id="sp-skills-title">المهارات والتقييمات</h2>
                <p className="sp-summary">
                  {skillViews.length} مهارات
                  {assessments.state === "ready" && ` · ${verifiedCount} مثبتة`}
                  {assessments.state === "ready" && coolingCount > 0 && ` · ${coolingCount} في فترة الانتظار`}
                </p>
              </div>
              <Link className="student-profile-secondary-button" to={ASSESSMENTS_PATH}>
                <ShieldCheck size={15} aria-hidden="true" />
                صفحة التقييم
              </Link>
            </header>

            {assessments.state === "loading" && (
              <p className="sp-status" role="status">
                جارٍ تحميل نتائج التقييم…
              </p>
            )}
            {assessments.state === "error" && (
              <p className="student-profile-alert error sp-status" role="alert">
                تعذر تحميل نتائج التقييم، فالمهارات معروضة دون حالتها.{" "}
                <button type="button" className="sp-inline-button" onClick={assessments.retry}>
                  إعادة المحاولة
                </button>
              </p>
            )}
            {assessments.state === "ready" && coolingCount > 0 && <p className="sp-cooldown-note">{COOLDOWN_MESSAGE}</p>}

            {skillViews.length ? (
              <ul className="sp-skills">
                {skillViews.map((skill) => (
                  <SkillAssessmentCard key={skill.id} skill={skill} />
                ))}
              </ul>
            ) : (
              <div className="sp-empty-state">
                <p>لم تتم إضافة مهارات بعد. أضف مهاراتك من تعديل الملف ثم قيّمها لتظهر نتائجها هنا.</p>
                <button type="button" className="student-profile-secondary-button" onClick={onEdit}>
                  <Plus size={14} aria-hidden="true" />
                  إضافة مهارات
                </button>
              </div>
            )}
          </section>

          <section className="sp-card" id="student-portfolio" aria-labelledby="sp-portfolio-title">
            <header className="sp-card-head">
              <h2 id="sp-portfolio-title">معرض الأعمال</h2>
              <span className="sp-summary">{profile.portfolio.length} مشاريع</span>
            </header>
            {profile.portfolio.length > 0 && (
              <div className="student-portfolio-filters" aria-label="تصفية المشاريع">
                {filters.map((filter) => (
                  <button
                    type="button"
                    key={filter.id}
                    className={activeFilter === filter.id ? "active" : ""}
                    aria-pressed={activeFilter === filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
            {projects.length ? (
              <div className="student-portfolio-grid">
                {projects.map((project, index) => (
                  <article className="student-portfolio-card" key={`${project.title}-${index}`}>
                    {project.image_url ? (
                      <img src={project.image_url} alt="" loading="lazy" />
                    ) : (
                      <div className="student-portfolio-placeholder" aria-hidden="true">
                        <BriefcaseBusiness size={23} />
                      </div>
                    )}
                    <div>
                      <h3>{project.title}</h3>
                      {project.description && <p>{project.description}</p>}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`عرض مشروع ${project.title} في نافذة جديدة`}
                        >
                          عرض المشروع <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sp-empty">
                {profile.portfolio.length ? "لا توجد مشاريع ضمن هذا التصنيف." : "لم تُضف مشاريع بعد."}
              </p>
            )}
          </section>

          {profile.certifications.length > 0 && (
            <section className="sp-card" aria-labelledby="sp-certificates-title">
              <h2 id="sp-certificates-title">الشهادات والدورات</h2>
              <div className="student-profile-certifications">
                {profile.certifications.map((certificate, index) => (
                  <article key={`${certificate.name}-${index}`}>
                    <span className="student-profile-certificate-icon">
                      <Award size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{certificate.name}</h3>
                      <p>{[certificate.issuer, certificate.issued_at].filter(Boolean).join(" · ")}</p>
                    </div>
                    {certificate.credential_url && (
                      <a
                        href={certificate.credential_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`عرض شهادة ${certificate.name}`}
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {profile.testimonials.length > 0 && (
            <section className="sp-card" aria-labelledby="sp-testimonials-title">
              <h2 id="sp-testimonials-title">التوصيات</h2>
              <div className="student-profile-testimonials">
                {profile.testimonials.map((testimonial, index) => (
                  <blockquote key={`${testimonial.author}-${index}`}>
                    <Quote size={17} aria-hidden="true" />
                    <p>{testimonial.quote}</p>
                    <footer>
                      <strong>{testimonial.author}</strong>
                      {testimonial.role && <span>{testimonial.role}</span>}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function UpdateStudentProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [skills, setSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  // المسارات المهنية من الخادم؛ عليها تُبنى التقييمات ومطابقة المشاريع
  const [specializations, setSpecializations] = useState([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillSearchOpen, setSkillSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingSkillId, setRemovingSkillId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("view");
  const [activeEditorSection, setActiveEditorSection] = useState("basic");
  const [selectedImage, setSelectedImage] = useState(null);
  const imageInputRef = useRef(null);
  const savedProfileRef = useRef(null);
  const savedSkillsRef = useRef([]);
  // نتائج التقييم المحفوظة وفترات الانتظار من نظرة التقييم (بلا ذكاء اصطناعي)؛ فشلها لا يمنع عرض الملف
  const [assessments, setAssessments] = useState({ state: "loading", skills: [] });
  const fetchAssessments = useCallback(
    () =>
      getAssessments()
        .then((data) =>
          setAssessments({ state: "ready", skills: Array.isArray(data?.skills) ? data.skills : [] }),
        )
        .catch((loadError) => {
          console.error("تعذر تحميل نتائج التقييم:", loadError);
          setAssessments({ state: "error", skills: [] });
        }),
    [],
  );
  const retryAssessments = () => {
    setAssessments({ state: "loading", skills: [] });
    fetchAssessments();
  };
  // مهارات لها تقييم مكتمل في نظرة التقييم: يُقفل حذفها حتى لو كانت قائمة المهارات أقدم (الخادم يرفض الحذف أيضًا)
  const assessedSkillIds = useMemo(
    () =>
      new Set(
        assessments.skills
          .filter((item) => item?.latest_assessment)
          .map((item) => item.id),
      ),
    [assessments.skills],
  );

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);
  const isSkillLocked = (studentSkill) =>
    studentSkill.has_assessment === true || assessedSkillIds.has(studentSkill.skill_id);

  const visibleSkillOptions = useMemo(
    () =>
      availableSkills.filter(
        (item) =>
          !skills.some((selected) => selected.skill_id === item.id) &&
          !selectedSkillIds.includes(String(item.id)),
      ),
    [availableSkills, selectedSkillIds, skills],
  );
  const filteredSkillOptions = useMemo(() => {
    const query = skillSearch.trim().toLocaleLowerCase();
    return visibleSkillOptions.filter((skill) =>
      skill.name.toLocaleLowerCase().includes(query),
    );
  }, [skillSearch, visibleSkillOptions]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getStudentProfile(), getStudentSkills(), getAvailableSkills()])
      .then(([nextProfile, nextSkills, skillOptions]) => {
        if (!isMounted) return;
        const normalizedProfile = normalizeProfile(nextProfile);
        setProfile(normalizedProfile);
        savedProfileRef.current = normalizedProfile;
        setSkills(nextSkills);
        savedSkillsRef.current = nextSkills;
        setAvailableSkills(skillOptions);
        setLoaded(true);
      })
      .catch((loadError) => {
        console.error("تعذر تحميل ملف الطالب:", loadError);
        if (isMounted) setError("تعذر تحميل بيانات الملف الشخصي.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    getSpecializations()
      .then((list) => isMounted && setSpecializations(Array.isArray(list) ? list : []))
      .catch(() => isMounted && setSpecializations([]));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (selectedImage?.preview) URL.revokeObjectURL(selectedImage.preview);
    },
    [selectedImage],
  );

  const setField = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  };

  const setArrayItem = (collection, index, key, value) => {
    setProfile((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addArrayItem = (collection, item) => {
    setProfile((current) => ({
      ...current,
      [collection]: [...current[collection], item],
    }));
  };

  const removeArrayItem = (collection, index) => {
    setProfile((current) => ({
      ...current,
      [collection]: current[collection].filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!profile.name.trim()) {
      setError("الاسم الكامل مطلوب.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated = await updateStudentProfile({
        name: profile.name.trim(),
        bio: profile.bio || null,
        status: profile.status,
        phone: profile.phone || null,
        university: profile.university || null,
        academic_major: profile.academic_major || null,
        professional_specialization: profile.professional_specialization || null,
        graduation_year: profile.graduation_year || null,
        linkedin_url: profile.linkedin_url || null,
        github_url: profile.github_url || null,
        weekly_availability_hours:
          profile.weekly_availability_hours === "" || profile.weekly_availability_hours == null
            ? null
            : Number(profile.weekly_availability_hours),
        portfolio: profile.portfolio,
        external_links: profile.external_links,
        certifications: profile.certifications,
        testimonials: profile.testimonials,
      });

      const updatedProfile = normalizeProfile({ ...profile, ...updated });
      updatedProfile.image_url = updatedProfile.image_url || profile.image_url;
      setProfile(updatedProfile);
      savedProfileRef.current = updatedProfile;
      savedSkillsRef.current = skills;
      setMode("view");
      setNotice("تم حفظ تعديلات ملفك الشخصي.");

      if (selectedImage?.file) {
        try {
          const updatedImage = await updateStudentProfile(
            {},
            selectedImage.file,
          );
          setProfile((current) =>
            normalizeProfile({
              ...current,
              image_url: updatedImage.image_url || current.image_url,
            }),
          );
          savedProfileRef.current = normalizeProfile({
            ...savedProfileRef.current,
            image_url:
              updatedImage.image_url || savedProfileRef.current.image_url,
          });
          setSelectedImage(null);
          setNotice("تم حفظ التعديلات وتحديث الصورة الشخصية.");
        } catch (imageError) {
          console.error("تعذر تحديث صورة الطالب:", imageError);
          setError(
            "تم حفظ بيانات الملف، لكن تعذر تحديث الصورة. حاول رفع الصورة مرة أخرى.",
          );
        }
      }
    } catch (saveError) {
      console.error("تعذر تحديث ملف الطالب:", saveError);
      setError(saveError.message || "تعذر حفظ التعديلات.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");

    if (file.size > 5 * 1024 * 1024) {
      setError("يجب ألا يتجاوز حجم الصورة 5 ميغابايت.");
      event.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.");
      event.target.value = "";
      return;
    }

    setSelectedImage({ file, preview: URL.createObjectURL(file) });
    event.target.value = "";
  };

  const handleAddSkill = async () => {
    if (selectedSkillIds.length === 0) return;
    setSaving(true);
    setError("");
    setNotice("");

    const results = await Promise.allSettled(
      selectedSkillIds.map((skillId) => addStudentSkill(Number(skillId))),
    );
    const addedSkills = [];
    const failedSkillIds = [];
    const addErrors = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        addedSkills.push(result.value);
      } else {
        failedSkillIds.push(selectedSkillIds[index]);
        addErrors.push(result.reason);
      }
    });

    if (addedSkills.length > 0) {
      // رد الإضافة لا يحمل has_assessment؛ القائمة من الخادم هي المرجع (وإلا تُلحق المهارات المضافة)
      const fresh = await getStudentSkills().catch(() => null);
      const nextSkills = Array.isArray(fresh)
        ? fresh
        : [...savedSkillsRef.current, ...addedSkills];
      setSkills(nextSkills);
      savedSkillsRef.current = nextSkills;
    }

    setSelectedSkillIds(failedSkillIds);
    setSkillSearch("");

    if (failedSkillIds.length > 0) {
      console.error("تعذر إضافة بعض مهارات الطالب:", addErrors);
      const errorMessage =
        addErrors[0] instanceof Error ? ` ${addErrors[0].message}` : "";
      setError(
        `تمت إضافة ${addedSkills.length} مهارة، وتعذرت إضافة ${failedSkillIds.length}.${errorMessage}`,
      );
    } else {
      setNotice(
        addedSkills.length === 1
          ? "تمت إضافة المهارة."
          : `تمت إضافة ${addedSkills.length} مهارات.`,
      );
    }
    setSaving(false);
  };

  const handleSkillLevelChange = async (skillId, proficiency) => {
    setError("");
    try {
      const result = await updateStudentSkill(skillId, proficiency);
      setSkills((current) =>
        current.map((item) =>
          item.skill_id === skillId ? { ...item, ...result } : item,
        ),
      );
      savedSkillsRef.current = savedSkillsRef.current.map((item) =>
        item.skill_id === skillId ? { ...item, ...result } : item,
      );
      setNotice("تم تحديث مستوى المهارة.");
    } catch (updateError) {
      console.error("تعذر تحديث مستوى المهارة:", updateError);
      setError(updateError.message || "تعذر تحديث مستوى المهارة.");
    }
  };

  const handleRemoveSkill = async (skillId) => {
    setRemovingSkillId(skillId);
    setError("");
    try {
      await deleteStudentSkill(skillId);
      setSkills((current) =>
        current.filter((item) => item.skill_id !== skillId),
      );
      savedSkillsRef.current = savedSkillsRef.current.filter(
        (item) => item.skill_id !== skillId,
      );
      setNotice("تمت إزالة المهارة.");
    } catch (removeError) {
      console.error("تعذر حذف المهارة:", removeError);
      // قائمة الصفحة قديمة (اكتمل تقييم بعد تحميلها): يُقفل زر الحذف بدل أن يبقى مفعّلًا
      if (removeError?.code === "skill_has_assessment") {
        setSkills((current) => markSkillAssessed(current, skillId));
        savedSkillsRef.current = markSkillAssessed(savedSkillsRef.current, skillId);
      }
      setError(removeError.message || "تعذر إزالة المهارة.");
    } finally {
      setRemovingSkillId(null);
    }
  };

  const discardChanges = () => {
    if (savedProfileRef.current) setProfile(savedProfileRef.current);
    setSkills(savedSkillsRef.current);
    setSelectedImage(null);
    setError("");
    setMode("view");
  };

  if (loading) return <ProfileSkeleton />;

  if (!loaded) {
    return (
      <main className="student-profile-page">
        <p className="student-profile-alert error" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="student-profile-primary-button"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </button>
      </main>
    );
  }

  if (mode === "view") {
    return (
      <div className="student-profile-shell" dir="rtl">
        {error && (
          <p className="student-profile-alert error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="student-profile-alert success" role="status">
            {notice}
          </p>
        )}
        <StudentProfileView
          profile={profile}
          skills={skills}
          assessments={{ ...assessments, retry: retryAssessments }}
          onEdit={() => setMode("edit")}
        />
      </div>
    );
  }

  const editorTabs = [
    { id: "basic", label: "الأساسية" },
    { id: "education", label: "التعليم" },
    { id: "skills", label: "المهارات" },
    { id: "portfolio", label: "الأعمال" },
    { id: "other", label: "الشهادات والروابط" },
  ];

  const renderCollection = ({
    collection,
    title,
    description,
    itemName,
    emptyItem,
    fields,
  }) => (
    <section className="student-edit-collection">
      <header className="student-edit-collection-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => addArrayItem(collection, emptyItem)}
          className="student-profile-secondary-button"
        >
          <Plus size={14} aria-hidden="true" />
          إضافة
        </button>
      </header>
      {profile[collection].length === 0 ? (
        <p className="student-profile-empty">لم تتم إضافة {itemName} بعد.</p>
      ) : (
        <div className="student-edit-items">
          {profile[collection].map((item, index) => (
            <article key={`${collection}-${index}`}>
              <div className="student-edit-item-grid">
                {fields.map((field) => {
                  const id = `${collection}-${index}-${field.name}`;
                  return (
                    <label
                      className="student-edit-field"
                      htmlFor={id}
                      key={field.name}
                    >
                      <span>{field.label}</span>
                      {field.type === "textarea" ? (
                        <textarea
                          id={id}
                          value={item[field.name] || ""}
                          onChange={(event) =>
                            setArrayItem(
                              collection,
                              index,
                              field.name,
                              event.target.value,
                            )
                          }
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          rows={3}
                          required={field.required}
                        />
                      ) : (
                        <input
                          id={id}
                          type={field.type || "text"}
                          value={item[field.name] || ""}
                          onChange={(event) =>
                            setArrayItem(
                              collection,
                              index,
                              field.name,
                              event.target.value,
                            )
                          }
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          required={field.required}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                className="student-profile-delete-button"
                onClick={() => removeArrayItem(collection, index)}
                aria-label={`حذف ${itemName} رقم ${index + 1}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                حذف
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="student-profile-page student-profile-editor" dir="rtl">
      <header className="student-editor-page-header">
        <div>
          <span className="student-profile-eyebrow">إعدادات الحساب</span>
          <h1>تعديل الملف الشخصي</h1>
          <p>أضف تفاصيلك وخبراتك ليتمكن الآخرون من التعرف على قدراتك.</p>
        </div>
        <button
          type="button"
          className="student-profile-quiet-button"
          onClick={discardChanges}
          disabled={saving}
        >
          <X size={16} aria-hidden="true" />
          إلغاء
        </button>
      </header>

      {error && (
        <p className="student-profile-alert error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSave}>
        <nav className="student-editor-tabs" aria-label="أقسام تعديل الملف">
          {editorTabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeEditorSection === tab.id ? "active" : ""}
              aria-pressed={activeEditorSection === tab.id}
              onClick={() => setActiveEditorSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeEditorSection === "basic" && (
          <section className="student-editor-card">
            <h2>المعلومات الأساسية</h2>
            <div className="student-edit-avatar-row">
              {selectedImage?.preview || profile.image_url ? (
                <img
                  src={selectedImage?.preview || profile.image_url}
                  alt="معاينة صورة الملف"
                />
              ) : (
                <span>
                  <UserRound size={26} aria-hidden="true" />
                </span>
              )}
              <div>
                <strong>الصورة الشخصية</strong>
                <p>JPG أو PNG أو WEBP، حتى 5 ميغابايت.</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  aria-label="اختيار صورة الملف الشخصي"
                />
              </div>
            </div>
            <div className="student-edit-form-grid">
              <label className="student-edit-field">
                <span>الاسم الكامل *</span>
                <input
                  name="name"
                  value={profile.name}
                  onChange={setField}
                  maxLength={255}
                  required
                />
              </label>
              <label className="student-edit-field">
                <span>الحالة</span>
                <select name="status" value={profile.status} onChange={setField}>
                  <option value="student">طالب</option>
                  <option value="graduated">خريج</option>
                </select>
              </label>
              <label className="student-edit-field full">
                <span>نبذة تعريفية</span>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={setField}
                  rows={5}
                  maxLength={2000}
                  placeholder="اكتب نبذة قصيرة عن اهتماماتك وأهدافك"
                />
                <small>{profile.bio.length}/2000 حرف</small>
              </label>
            </div>
          </section>
        )}

        {activeEditorSection === "education" && (
          <section className="student-editor-card">
            <h2>التعليم ومعلومات التواصل</h2>
            <div className="student-edit-form-grid">
              {[
                ["university", "الجامعة / الكلية"],
                ["academic_major", "التخصص الجامعي"],
                ["professional_specialization", "المسار المهني"],
                ["graduation_year", "سنة التخرج"],
                ["phone", "رقم الهاتف"],
                ["linkedin_url", "رابط LinkedIn"],
                ["github_url", "رابط GitHub"],
              ].map(([name, label]) => (
                <label className="student-edit-field" key={name}>
                  <span>{label}</span>
                  {name === "professional_specialization" ? (
                    <>
                      <select name={name} value={profile[name] || ""} onChange={setField}>
                        <option value="">اختر مسارك المهني</option>
                        {specializations.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <small>تُبنى عليه أسئلة تقييم المهارات ومطابقة أدوار المشاريع.</small>
                    </>
                  ) : name === "academic_major" ? (
                    <>
                      <select
                        name={name}
                        value={(profile[name] || "").trim()}
                        onChange={setField}
                      >
                        <option value="">اختر تخصصك</option>
                        {majorOptions(profile[name]).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <input
                      name={name}
                      type={
                        name === "linkedin_url" || name === "github_url"
                          ? "url"
                          : "text"
                      }
                      value={profile[name]}
                      onChange={setField}
                      maxLength={name.endsWith("_url") ? 2048 : 255}
                    />
                  )}
                </label>
              ))}
              <label className="student-edit-field">
                <span>ساعات التفرغ الأسبوعية للمشاريع</span>
                <input
                  name="weekly_availability_hours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={profile.weekly_availability_hours ?? ""}
                  onChange={setField}
                  placeholder="مثال: 15"
                />
                <small>تراها المؤسسات عند مطابقة المرشحين مع وقت المشروع المطلوب.</small>
              </label>
              <label className="student-edit-field full">
                <span>البريد الإلكتروني</span>
                <input value={profile.email} disabled readOnly />
                <small>لتغييره، استخدم إعدادات الحساب.</small>
              </label>
            </div>
          </section>
        )}

        {activeEditorSection === "skills" && (
          <section className="student-editor-card">
            <h2>المهارات ومستوى الإتقان</h2>
            <div className="student-add-skill">
              <div
                className="student-skill-picker"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setSkillSearchOpen(false);
                  }
                }}
              >
                <label className="student-edit-field" htmlFor="student-skill-search">
                  <span>ابحث عن المهارات</span>
                </label>
                <div className="student-skill-picker-control">
                  {selectedSkillIds.map((skillId) => {
                    const skill = availableSkills.find(
                      (item) => String(item.id) === skillId,
                    );
                    if (!skill) return null;

                    return (
                      <span className="student-selected-skill" key={skillId}>
                        {skill.name}
                        <button
                          type="button"
                          aria-label={`إزالة ${skill.name} من الاختيار`}
                          onClick={() =>
                            setSelectedSkillIds((current) =>
                              current.filter((id) => id !== skillId),
                            )
                          }
                          disabled={saving}
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                  <Search size={16} aria-hidden="true" />
                  <input
                    id="student-skill-search"
                    type="search"
                    value={skillSearch}
                    onChange={(event) => {
                      setSkillSearch(event.target.value);
                      setSkillSearchOpen(true);
                    }}
                    onFocus={() => setSkillSearchOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSkillSearchOpen(false);
                      } else if (
                        event.key === "Enter" &&
                        skillSearchOpen &&
                        filteredSkillOptions.length > 0
                      ) {
                        event.preventDefault();
                        const skillId = String(filteredSkillOptions[0].id);
                        setSelectedSkillIds((current) => [...current, skillId]);
                        setSkillSearch("");
                      }
                    }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={
                      skillSearchOpen && visibleSkillOptions.length > 0
                    }
                    aria-controls="student-skill-search-results"
                    aria-label="ابحث واختر مهارات"
                    placeholder={
                      visibleSkillOptions.length > 0
                        ? "اكتب اسم المهارة..."
                        : "تم اختيار جميع المهارات المتاحة"
                    }
                    disabled={saving || visibleSkillOptions.length === 0}
                  />
                </div>
                {skillSearchOpen && visibleSkillOptions.length > 0 && (
                  <ul
                    className="student-skill-search-results"
                    id="student-skill-search-results"
                    role="listbox"
                    aria-label="نتائج البحث عن المهارات"
                  >
                    {filteredSkillOptions.length > 0 ? (
                      filteredSkillOptions.map((skill) => (
                        <li key={skill.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() => {
                              setSelectedSkillIds((current) => [
                                ...current,
                                String(skill.id),
                              ]);
                              setSkillSearch("");
                            }}
                            disabled={saving}
                          >
                            <Plus size={14} aria-hidden="true" />
                            {skill.name}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="student-skill-search-empty">
                        لا توجد مهارات مطابقة للبحث.
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <button
                className="student-profile-secondary-button"
                type="button"
                onClick={handleAddSkill}
                disabled={selectedSkillIds.length === 0 || saving}
              >
                <Plus size={15} aria-hidden="true" />
                إضافة المهارات
              </button>
            </div>
            <div className="student-skill-list student-edit-skill-list">
              {skills.map((studentSkill) => (
                <article className="student-skill-row" key={studentSkill.skill_id}>
                  <span className="student-skill-icon" aria-hidden="true">
                    <Code2 size={18} />
                  </span>
                  <strong className="student-skill-name">
                    {studentSkill.skill?.name || "مهارة"}
                  </strong>
                  <ProficiencyIndicator
                    proficiency={studentSkill.proficiency}
                  />
                  <label className="student-skill-level-control">
                    <span className="sr-only">
                      مستوى {studentSkill.skill?.name}
                    </span>
                    <select
                      value={studentSkill.proficiency || "intermediate"}
                      onChange={(event) =>
                        handleSkillLevelChange(
                          studentSkill.skill_id,
                          event.target.value,
                        )
                      }
                      aria-label={`تعديل مستوى إتقان ${studentSkill.skill?.name}`}
                    >
                      <option value="beginner">مبتدئ</option>
                      <option value="intermediate">متوسط</option>
                      <option value="advanced">متقدم</option>
                      <option value="expert">خبير</option>
                    </select>
                  </label>
                  {/* مهارة لها تقييم محفوظ لا تُحذف (الخادم يرفض الحذف أيضًا) */}
                  <button
                    type="button"
                    className="student-profile-delete-button icon"
                    aria-label={
                      isSkillLocked(studentSkill)
                        ? `لا يمكن حذف ${studentSkill.skill?.name}: لها سجل تقييم محفوظ`
                        : `حذف ${studentSkill.skill?.name}`
                    }
                    title={
                      isSkillLocked(studentSkill)
                        ? "لا يمكن حذف هذه المهارة لأن لها سجل تقييم محفوظ."
                        : undefined
                    }
                    disabled={
                      saving ||
                      removingSkillId === studentSkill.skill_id ||
                      isSkillLocked(studentSkill)
                    }
                    onClick={() => handleRemoveSkill(studentSkill.skill_id)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </article>
              ))}
              {skills.length === 0 && (
                <p className="student-profile-empty">لم تتم إضافة مهارات بعد.</p>
              )}
            </div>
          </section>
        )}

        {activeEditorSection === "portfolio" && (
          <section className="student-editor-card">
            <h2>معرض الأعمال</h2>
            {renderCollection({
              collection: "portfolio",
              title: "المشاريع",
              description: "اعرض نماذج مختارة من أعمالك الدراسية أو الشخصية.",
              itemName: "مشاريع",
              emptyItem: {
                title: "",
                description: "",
                url: "",
                image_url: "",
                category: "other",
              },
              fields: [
                { name: "title", label: "اسم المشروع", required: true, maxLength: 150 },
                { name: "url", label: "رابط المشروع", type: "url" },
                { name: "image_url", label: "رابط صورة", type: "url" },
                {
                  name: "category",
                  label: "التصنيف",
                  placeholder: "web أو design أو other",
                  maxLength: 30,
                },
                {
                  name: "description",
                  label: "وصف المشروع",
                  type: "textarea",
                  maxLength: 1000,
                },
              ],
            })}
          </section>
        )}

        {activeEditorSection === "other" && (
          <section className="student-editor-card">
            <h2>الشهادات والروابط والتوصيات</h2>
            {renderCollection({
              collection: "certifications",
              title: "الشهادات والدورات",
              description: "أضف مؤهلاتك المهنية أو الدورات المكتملة.",
              itemName: "الشهادات",
              emptyItem: { name: "", issuer: "", issued_at: "", credential_url: "" },
              fields: [
                { name: "name", label: "اسم الشهادة", required: true, maxLength: 160 },
                { name: "issuer", label: "الجهة المانحة", maxLength: 160 },
                { name: "issued_at", label: "تاريخ الإصدار", type: "month" },
                { name: "credential_url", label: "رابط الشهادة", type: "url" },
              ],
            })}
            {renderCollection({
              collection: "external_links",
              title: "روابط خارجية",
              description: "أضف رابطًا لملفك أو أعمالك على منصات أخرى.",
              itemName: "الروابط",
              emptyItem: { label: "", url: "" },
              fields: [
                { name: "label", label: "اسم الرابط", required: true, maxLength: 80 },
                { name: "url", label: "الرابط", type: "url", required: true },
              ],
            })}
            {renderCollection({
              collection: "testimonials",
              title: "التوصيات",
              description: "أضف توصيات حقيقية بموافقة أصحابها.",
              itemName: "التوصيات",
              emptyItem: { author: "", role: "", quote: "" },
              fields: [
                { name: "author", label: "اسم صاحب التوصية", required: true, maxLength: 120 },
                { name: "role", label: "الصفة", maxLength: 150 },
                {
                  name: "quote",
                  label: "نص التوصية",
                  type: "textarea",
                  required: true,
                  maxLength: 1000,
                },
              ],
            })}
          </section>
        )}

        <footer className="student-editor-actions">
          <button
            className="student-profile-quiet-button"
            type="button"
            onClick={discardChanges}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="student-profile-primary-button"
            type="submit"
            disabled={saving || removingSkillId !== null}
          >
            <Save size={15} aria-hidden="true" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </footer>
      </form>
    </main>
  );
}
