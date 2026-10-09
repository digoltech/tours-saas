"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileImage,
  Upload,
  Eye,
  Trash2,
  Save,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  getTeamMemberProfile,
  getUserDocuments,
  readUserDocument,
  uploadUserDocument,
  deleteUserDocument,
  saveUserPersonalDetails,
  type TeamMemberProfile,
  type UserDocument,
  type UserPersonalDetails,
} from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import {
  RecordPage,
  RecordSection,
  RecordFields,
  EditRecordLink,
} from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { useConfirmation } from "../../ui/ConfirmationModal";
import "../../styles/member-profile.css";
const personalFields = [
  "dateOfBirth",
  "gender",
  "jobTitle",
  "address",
  "city",
  "state",
  "country",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;
const labels: Record<keyof UserPersonalDetails, string> = {
  dateOfBirth: "Date of birth",
  gender: "Gender",
  jobTitle: "Job title",
  address: "Address",
  city: "City",
  state: "State",
  country: "Country",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
};
const documentTypeLabels: Record<string, string> = {
  IDENTITY: "Identity document",
  ADDRESS: "Address proof",
  EMPLOYMENT: "Employment document",
  OTHER: "Other document",
};

export function MemberProfile({
  id,
  editPersonal = false,
}: {
  id: string;
  editPersonal?: boolean;
}) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  const { user } = useAuth();
  const confirm = useConfirmation();
  const [member, setMember] = useState<TeamMemberProfile | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview");
  const [details, setDetails] = useState<UserPersonalDetails>({
    dateOfBirth: null,
    gender: null,
    jobTitle: null,
    address: null,
    city: null,
    state: null,
    country: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
  });
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [documentType, setDocumentType] = useState("IDENTITY");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const canWrite =
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.permissions.includes("agent:update"));
  useEffect(() => {
    let active = true;
    void Promise.all([getTeamMemberProfile(id), getUserDocuments(id)])
      .then(([profile, files]) => {
        if (!active) return;
        setMember(profile);
        setDocuments(files);
        if (profile.personalDetails)
          setDetails({
            ...profile.personalDetails,
            dateOfBirth:
              profile.personalDetails.dateOfBirth?.slice(0, 10) ?? null,
          });
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load team member",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveUserPersonalDetails(id, details);
      setMember((current) =>
        current ? { ...current, personalDetails: saved } : current,
      );
      setSuccess(t("Personal information saved."));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save personal information",
      );
    } finally {
      setSaving(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || saving) return;
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    if (
      file.size > 1048576 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setError(t("Choose a PNG, JPEG or WebP image up to 1 MB."));
      return;
    }
    setSaving(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read image"));
        reader.readAsDataURL(file);
      });
      const document = await uploadUserDocument(id, {
        label: label.trim(),
        documentType,
        fileName: file.name,
        mimeType: file.type,
        base64: data,
      });
      setDocuments((current) => [document, ...current]);
      setPreviews((current) => ({
        ...current,
        [document.id]: `data:${file.type};base64,${data}`,
      }));
      setFile(null);
      setLabel("");
      setDocumentType("IDENTITY");
      form.reset();
      setSuccess(t("Document uploaded."));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to upload document",
      );
    } finally {
      setSaving(false);
    }
  }
  async function preview(document: UserDocument) {
    setActiveDocumentId(document.id);
    if (previews[document.id]) return;
    setPreviewing(document.id);
    setError("");
    try {
      const result = await readUserDocument(id, document.id);
      setPreviews((current) => ({ ...current, [document.id]: result.dataUrl }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to preview document",
      );
    } finally {
      setPreviewing(null);
    }
  }
  async function remove(document: UserDocument) {
    if (
      !(await confirm({
        title: "Delete document?",
        description: "This removes the uploaded image from this user profile.",
        confirmLabel: "Delete document",
        destructive: true,
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await deleteUserDocument(id, document.id);
      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      if (activeDocumentId === document.id) setActiveDocumentId(null);
      setPreviews((current) => {
        const next = { ...current };
        delete next[document.id];
        return next;
      });
      setSuccess(t("Document deleted."));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete document",
      );
    } finally {
      setSaving(false);
    }
  }
  const fullName = member
    ? `${member.firstName} ${member.lastName}`
    : "Team member";
  return (
    <RecordPage
      title={editPersonal ? "Edit personal information" : fullName}
      description="Personal information, organization details, access and documents."
      eyebrow="User profile"
      backHref={editPersonal ? `/dashboard/team/${id}` : "/dashboard/team"}
      backLabel={editPersonal ? "Back to details" : "Back to list"}
      actions={
        !editPersonal && member ? (
          <>
            <Badge>{t(member.status)}</Badge>
            {canWrite && member.id !== user?.id && (
              <EditRecordLink href={`/dashboard/team/${id}/edit`} />
            )}
          </>
        ) : undefined
      }
      summary={
        !editPersonal && member
          ? [
              { label: "Role", value: t(member.role.name) },
              { label: "Agency", value: member.agency.name },
              {
                label: "Branch",
                value: member.branch?.name ?? t("Agency wide"),
              },
              { label: "Documents", value: documents.length },
            ]
          : undefined
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {success && (
        <div className="state-message" role="status">
          {success}
        </div>
      )}
      {loading ? (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      ) : (
        member &&
        (editPersonal ? (
          canWrite ? (
            <form className="record-form" onSubmit={saveDetails}>
              <RecordSection
                title="Personal information"
                description="Keep contact, address and emergency details up to date."
              >
                <div className="record-form-grid">
                  {personalFields.map((field) => (
                    <label key={field}>
                      {t(labels[field])}
                      {field === "gender" ? (
                        <select
                          value={details[field] ?? ""}
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              [field]: event.target.value || null,
                            }))
                          }
                        >
                          <option value="">{t("Select gender")}</option>
                          {["Female", "Male", "Other", "Prefer not to say"].map(
                            (value) => (
                              <option key={value} value={value}>
                                {t(value)}
                              </option>
                            ),
                          )}
                        </select>
                      ) : field === "address" ? (
                        <textarea
                          value={details[field] ?? ""}
                          maxLength={500}
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              [field]: event.target.value || null,
                            }))
                          }
                        />
                      ) : (
                        <input
                          type={
                            field === "dateOfBirth"
                              ? "date"
                              : field === "emergencyContactPhone"
                                ? "tel"
                                : "text"
                          }
                          value={details[field] ?? ""}
                          max={
                            field === "dateOfBirth"
                              ? new Date().toISOString().slice(0, 10)
                              : undefined
                          }
                          maxLength={
                            field === "emergencyContactPhone" ? 16 : 160
                          }
                          pattern={
                            field === "emergencyContactPhone"
                              ? "\\+?[0-9]{7,15}"
                              : undefined
                          }
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              [field]: event.target.value || null,
                            }))
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
              </RecordSection>
              <div className="record-form-footer">
                <Link
                  className="button button-secondary"
                  href={`/dashboard/team/${id}`}
                >
                  {t("Cancel")}
                </Link>
                <Button type="submit" loading={saving}>
                  <Save size={15} />
                  {t("Save changes")}
                </Button>
              </div>
            </form>
          ) : (
            <p>{t("You cannot edit this record.")}</p>
          )
        ) : (
          <>
            <nav
              className="member-tabs"
              aria-label={t("User profile sections")}
            >
              {[
                ["overview", "Overview"],
                ["documents", "Documents"],
                ["access", "Role & permissions"],
              ].map(([key, title]) => (
                <button
                  key={key}
                  type="button"
                  aria-current={tab === key ? "page" : undefined}
                  className={tab === key ? "active" : ""}
                  onClick={() => setTab(key)}
                >
                  {t(title)}
                  {key === "documents" && <span>{documents.length}</span>}
                </button>
              ))}
            </nav>
            {tab === "overview" && (
              <>
                <RecordSection title="Personal information">
                  <div className="member-section-heading">
                    <p className="record-help">
                      {t("Contact and identity details for this team member.")}
                    </p>
                    {canWrite && (
                      <Link
                        className="button button-secondary"
                        href={`/dashboard/team/${id}/edit?section=personal`}
                      >
                        {t("Edit personal information")}
                      </Link>
                    )}
                  </div>
                  <RecordFields
                    fields={[
                      { label: "First name", value: member.firstName },
                      { label: "Last name", value: member.lastName },
                      { label: "Email", value: member.email },
                      { label: "Phone", value: member.phone },
                      ...personalFields.map((field) => ({
                        label: labels[field],
                        value:
                          field === "dateOfBirth" &&
                          member.personalDetails?.dateOfBirth
                            ? new Date(
                                member.personalDetails.dateOfBirth,
                              ).toLocaleDateString(locale, { timeZone: "UTC" })
                            : member.personalDetails?.[field],
                      })),
                    ]}
                  />
                </RecordSection>
                <div className="member-organization">
                  <RecordSection title="Agency information">
                    <RecordFields
                      fields={[
                        { label: "Agency", value: member.agency.name },
                        { label: "Email", value: member.agency.email },
                        { label: "Phone", value: member.agency.phone },
                        {
                          label: "Address",
                          value: [
                            member.agency.address,
                            member.agency.city,
                            member.agency.state,
                            member.agency.country,
                          ]
                            .filter(Boolean)
                            .join(", "),
                        },
                      ]}
                    />
                  </RecordSection>
                  <RecordSection title="Branch information">
                    {member.branch ? (
                      <RecordFields
                        fields={[
                          { label: "Branch", value: member.branch.name },
                          { label: "Code", value: member.branch.code },
                          { label: "Email", value: member.branch.email },
                          { label: "Phone", value: member.branch.phone },
                          {
                            label: "Address",
                            value: [
                              member.branch.address,
                              member.branch.city,
                              member.branch.state,
                              member.branch.country,
                            ]
                              .filter(Boolean)
                              .join(", "),
                          },
                        ]}
                      />
                    ) : (
                      <p className="record-help">{t("Agency wide")}</p>
                    )}
                  </RecordSection>
                </div>
                <RecordSection title="Account information">
                  <RecordFields
                    fields={[
                      { label: "Status", value: t(member.status) },
                      {
                        label: "Email verified",
                        value: t(member.emailVerifiedAt ? "Yes" : "No"),
                      },
                      {
                        label: "Onboarding completed",
                        value: t(member.onboardingCompleted ? "Yes" : "No"),
                      },
                      {
                        label: "Created",
                        value: new Date(member.createdAt).toLocaleDateString(
                          locale,
                        ),
                      },
                      {
                        label: "Last updated",
                        value: new Date(member.updatedAt).toLocaleDateString(
                          locale,
                        ),
                      },
                    ]}
                  />
                </RecordSection>
              </>
            )}
            {tab === "access" && (
              <RecordSection title="Role & permissions">
                <RecordFields
                  fields={[
                    { label: "Role", value: t(member.role.name) },
                    {
                      label: "Data scope",
                      value: t(
                        member.role.scope === "BRANCH"
                          ? "Assigned branch only"
                          : "All agency branches",
                      ),
                    },
                    {
                      label: "Role type",
                      value: t(
                        member.role.isSystem ? "Standard role" : "Custom role",
                      ),
                    },
                  ]}
                />
                {(user?.role === "AGENCY_ADMIN" ||
                  user?.role === "SUPER_ADMIN") && (
                  <div className="member-access-actions">
                    <Link
                      className="button button-secondary"
                      href={`/dashboard/roles/${member.role.id}?agencyId=${member.agencyId}`}
                    >
                      {t("View role")}
                      <ArrowUpRight size={15} />
                    </Link>
                    {member.id !== user.id && (
                      <Link
                        className="button button-primary"
                        href={`/dashboard/roles/members/${id}/edit?agencyId=${member.agencyId}`}
                      >
                        {t("Change role & permissions")}
                      </Link>
                    )}
                  </div>
                )}
                <div className="member-permissions">
                  {member.role.permissions.map(({ permission }) => (
                    <article key={permission.code}>
                      <strong>
                        {t(permission.code.split(":")[1].replaceAll("_", " "))}{" "}
                        · {t(permission.code.split(":")[0])}
                      </strong>
                      <p>{t(permission.description)}</p>
                    </article>
                  ))}
                </div>
              </RecordSection>
            )}
            {tab === "documents" && (
              <>
                <RecordSection
                  title="Documents"
                  description="Document images are visible only to authorized team managers."
                >
                  {documents.length ? (
                    <div className="member-document-grid">
                      {documents.map((document) => (
                        <article key={document.id} className="member-document">
                          <div className="member-document-image">
                            {previews[document.id] ? (
                              <Image
                                src={previews[document.id]}
                                alt={document.label}
                                width={500}
                                height={320}
                                unoptimized
                              />
                            ) : (
                              <FileImage size={40} />
                            )}
                          </div>
                          <h3>{document.label}</h3>
                          <p>
                            {t(
                              documentTypeLabels[document.documentType] ??
                                document.documentType,
                            )}{" "}
                            · {Math.ceil(document.size / 1024)} KB
                          </p>
                          <small>
                            {document.fileName} ·{" "}
                            {new Date(document.createdAt).toLocaleDateString(
                              locale,
                            )}
                          </small>
                          <div className="member-document-actions">
                            <Button
                              variant="secondary"
                              loading={previewing === document.id}
                              onClick={() => void preview(document)}
                            >
                              <Eye size={15} />
                              {t("Preview image")}
                            </Button>
                            {canWrite && (
                              <Button
                                variant="secondary"
                                disabled={saving}
                                onClick={() => void remove(document)}
                                aria-label={`${t("Delete document")}: ${document.label}`}
                              >
                                <Trash2 size={15} />
                              </Button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="member-document-empty">
                      <FileImage size={36} />
                      <h3>{t("No documents uploaded")}</h3>
                      <p>
                        {t(
                          "Add identity, address or employment document images.",
                        )}
                      </p>
                    </div>
                  )}
                </RecordSection>
                {activeDocumentId && previews[activeDocumentId] && (
                  <RecordSection title="Document preview">
                    <div className="member-access-actions">
                      <Button
                        variant="secondary"
                        onClick={() => setActiveDocumentId(null)}
                      >
                        {t("Close preview")}
                      </Button>
                      <a
                        className="button button-primary"
                        href={previews[activeDocumentId]}
                        download={
                          documents.find((item) => item.id === activeDocumentId)
                            ?.fileName
                        }
                      >
                        {t("Download image")}
                      </a>
                    </div>
                    <Image
                      className="member-document-full"
                      src={previews[activeDocumentId]}
                      alt={
                        documents.find((item) => item.id === activeDocumentId)
                          ?.label ?? t("Document preview")
                      }
                      width={1200}
                      height={900}
                      unoptimized
                    />
                  </RecordSection>
                )}
                {canWrite && documents.length < 10 && (
                  <RecordSection
                    title="Add document image"
                    description="PNG, JPEG or WebP · Up to 1 MB per image · Maximum 10 documents."
                  >
                    <form className="record-form" onSubmit={upload}>
                      <div className="record-form-grid">
                        <label>
                          {t("Document title")} *
                          <input
                            value={label}
                            required
                            minLength={2}
                            maxLength={100}
                            onChange={(event) => setLabel(event.target.value)}
                          />
                        </label>
                        <label>
                          {t("Document type")}
                          <select
                            value={documentType}
                            onChange={(event) =>
                              setDocumentType(event.target.value)
                            }
                          >
                            {["IDENTITY", "ADDRESS", "EMPLOYMENT", "OTHER"].map(
                              (value) => (
                                <option key={value} value={value}>
                                  {t(documentTypeLabels[value])}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </div>
                      <label className="member-upload">
                        <Upload size={25} />
                        <strong>{t("Choose document image")}</strong>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          required
                          onChange={(event) =>
                            setFile(event.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      <Button
                        type="submit"
                        loading={saving}
                        disabled={!file || !label.trim()}
                      >
                        <Plus size={16} />
                        {t("Upload document")}
                      </Button>
                    </form>
                  </RecordSection>
                )}
              </>
            )}
          </>
        ))
      )}
    </RecordPage>
  );
}
